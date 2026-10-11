/**
 * G9 P7 — PRIVILEGED diagnostics. Import only from tests/developer tooling.
 *
 * This module deliberately accepts raw WorldState and can disclose hidden
 * incident truth, owner IDs and institutional membership. NEVER import it
 * from game UI, Ink, TinyBase projection, or a Worker->UI message handler.
 * The player-facing blocked reason remains the CommandBus's own error code.
 */
import type { WorldState } from "@/game/simulation/state/world-state";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { KnowledgeLens, ContentCondition } from "@/game/content/definitions";
import { compileContentCondition } from "@/game/content/definitions";
import { evaluateContentCondition, type ConditionEvaluation } from "@/game/content/conditions";
import { witnessCase } from "@/game/content/institutional-cases";
import { CommandBus } from "@/game/simulation/command-bus";

export interface DiagnosticStep {
  path: string;
  op: ContentCondition["op"];
  factKind?: string;
  result: ConditionEvaluation;
}

export type ConditionDiagnostic =
  | { ok: false; error: "INVALID_CONTENT" | "CONTENT_TOO_COMPLEX" }
  | { ok: true; result: ConditionEvaluation; inspectedNodes: number; steps: DiagnosticStep[] };

/** Bounded by the P1 compile cap (depth <= 8, nodes <= 64). No state mutation. */
export function diagnoseContentCondition(
  world: Readonly<WorldState>, input: unknown, lens: KnowledgeLens,
): ConditionDiagnostic {
  const compiled = compileContentCondition(input);
  if (!compiled.ok) return compiled;
  const steps: DiagnosticStep[] = [];
  const walk = (node: ContentCondition, path: string) => {
    const result = evaluateContentCondition(world, { definition: node }, lens);
    steps.push({
      path, op: node.op,
      ...(node.op === "fact" ? { factKind: node.fact.kind } : {}),
      result,
    });
    if (node.op === "not") walk(node.term, path + ".term");
    if (node.op === "all" || node.op === "any") {
      node.terms.forEach((child, i) => walk(child, path + ".terms[" + i + "]"));
    }
  };
  walk(compiled.compiled.definition, "$");
  return {
    ok: true,
    result: evaluateContentCondition(world, compiled.compiled, lens),
    inspectedNodes: steps.length, steps,
  };
}

export interface ContentCauseDiagnostic {
  kind: "opportunity" | "institutional-case" | "content-reaction";
  sourceId: string;
  actorId?: string;
  status: string;
  worldMinute: number;
  evidence: ConditionEvaluation | null;
  sourceVerified: boolean;
  /** This is the ACTUAL CommandBus refusal, computed on a clone. */
  blockedBy: string | null;
  chronology: { kind: string; worldMinute: number; sourceId: string }[];
}

/** Run a read-only command on a cloned world to get the genuine guard error. */
function commandGuard(world: WorldState, command: SimulationCommand): string | null {
  const result = new CommandBus(world).execute(command);
  return result.ok ? null : result.error ?? "UNKNOWN_BLOCK";
}
function observation(world: WorldState, targetId: string): ConditionEvaluation {
  const result = diagnoseContentCondition(world, {
    op: "fact", fact: {
      kind: "player.known-active-target-machines",
      target: { kind: "target", id: targetId }, min: 1,
    },
  }, { kind: "player-known" });
  return result.ok ? result.result : { value: "unknown", reason: "invalid-reference" };
}
function chronologicalEvents(
  events: readonly SimulationEvent[], sourceId: string,
): ContentCauseDiagnostic["chronology"] {
  const relevant = events.filter(event => (
    ("leadId" in event && event.leadId === sourceId) ||
    ("caseId" in event && event.caseId === sourceId) ||
    ("reactionId" in event && event.reactionId === sourceId) ||
    ("causeId" in event && event.causeId === sourceId)
  ));
  return relevant.slice(-48).map(event => ({
    kind: event.type,
    worldMinute: "worldMinute" in event && typeof event.worldMinute === "number"
      ? event.worldMinute : -1,
    sourceId,
  }));
}

export function diagnoseOpportunity(
  world: WorldState, id: string, events: readonly SimulationEvent[] = [],
): ContentCauseDiagnostic | null {
  const lead = world.opportunities?.find(item => item.id === id);
  if (!lead) return null;
  const incident = world.underground.incidents.find(i => i.id === lead.incidentId);
  const fromPublic = lead.origin === "public-incident" &&
    incident?.public === true && lead.sourceId === incident.id &&
    id === "lead:public:" + incident.id;
  const message = world.underground.messages.find(m => m.id === lead.sourceId);
  const rumor = world.underground.rumors.find(r => r.id === message?.rumorId);
  const fromMessage = lead.origin === "relay-report" &&
    message?.read === true && rumor?.kind === "incident-leak" &&
    rumor.sourceId === incident?.id && rumor.relayId === message.fromId &&
    id === "lead:report:" + message.id;
  return {
    kind: "opportunity", sourceId: lead.id, actorId: lead.subjectActorId,
    status: lead.status, worldMinute: lead.worldMinute,
    evidence: observation(world, lead.targetId),
    sourceVerified: Boolean((fromPublic || fromMessage) && incident &&
      incident.worldMinute <= lead.worldMinute),
    blockedBy: commandGuard(world, {
      type: lead.status === "open" ? "investigateLead" : "resolveLead",
      leadId: id, ...(lead.status === "open" ? {} : { approach: "ignore" }),
    } as SimulationCommand),
    chronology: chronologicalEvents(events, lead.id),
  };
}

export function diagnoseInstitutionalCase(
  world: WorldState, id: string, events: readonly SimulationEvent[] = [],
): ContentCauseDiagnostic | null {
  const entry = world.institutionalCases?.find(item => item.id === id);
  if (!entry) return null;
  const command: SimulationCommand = entry.status === "open"
    ? { type: "mapInstitutionalCase", caseId: id }
    : { type: "resolveInstitutionalCase", caseId: id, choice: "walk-away" };
  return {
    kind: "institutional-case", sourceId: entry.id, actorId: entry.ownerId,
    status: entry.status, worldMinute: entry.openedWorldMinute,
    evidence: observation(world, entry.targetId),
    sourceVerified: witnessCase(world, entry),
    blockedBy: commandGuard(world, command),
    chronology: chronologicalEvents(events, entry.id),
  };
}

export function diagnoseContentReaction(
  world: WorldState, reactionId: string, events: readonly SimulationEvent[] = [],
): ContentCauseDiagnostic | null {
  const pending = world.content?.pending.find(item => item.id === reactionId);
  const resolution = events.find(event =>
    event.type === "ContentReactionResolved" && event.reactionId === reactionId);
  if (!pending && resolution?.type !== "ContentReactionResolved") return null;
  return {
    kind: "content-reaction", sourceId: reactionId,
    ...(pending ? { actorId: pending.issuerId } : {}),
    status: pending ? "scheduled" : resolution?.type === "ContentReactionResolved"
      ? resolution.reason : "missing",
    worldMinute: pending?.sourceWorldMinute ??
      (resolution?.type === "ContentReactionResolved" ? resolution.worldMinute : 0),
    evidence: null,
    sourceVerified: pending
      ? world.underground.contracts.some(c => c.id === pending.sourceContractId &&
          c.issuerId === pending.issuerId &&
          c.acceptedWorldMinute === pending.sourceWorldMinute)
      : resolution?.type === "ContentReactionResolved",
    blockedBy: pending ? null : resolution?.type === "ContentReactionResolved"
      ? resolution.reason : "MISSING_SOURCE",
    chronology: chronologicalEvents(events, reactionId),
  };
}
