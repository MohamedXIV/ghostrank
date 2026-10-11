import type { SimulationEvent } from "@/game/simulation/events/types";
import type { OpportunityLead, OpportunityApproach, WorldState } from "@/game/simulation/state/world-state";
import { compileContentCondition } from "@/game/content/definitions";
import { evaluateContentCondition } from "@/game/content/conditions";
import { applyOpportunityRelationship } from "@/game/simulation/systems/underground";
import { transferValue } from "@/game/simulation/systems/economy";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";

const LIFETIME = 2 * 1440;
const COOLDOWN = 1440;
type Result = { ok: boolean; events: SimulationEvent[]; error?: string };
const failure = (error: string): Result => ({ ok: false, error, events: [] });
const enabled = (world: WorldState): boolean =>
  (world.scenario === "fresh-scene" || world.scenario === "high-pressure") && !world.ending;
const actionable = (lead: OpportunityLead, minute: number): boolean =>
  (lead.status === "open" || lead.status === "mapped") && minute <= lead.expiresWorldMinute;

/** Never assume an incident or a rumor gives the player an owned target. */
function sourceOf(world: WorldState, id: string) {
  const incident = world.underground.incidents.find((entry) => entry.id === id);
  if (!incident) return null;
  const counterpart = world.underground.actors.find((a) => a.id === incident.counterpartId);
  const initiator = world.underground.actors.find((a) => a.id === incident.actorId);
  const owner = [counterpart, initiator].find((a) =>
    a?.targetId && world.targets.some((t) => t.id === a.targetId));
  return owner?.targetId ? { incident, subjectActorId: owner.id, targetId: owner.targetId } : null;
}
function insert(world: WorldState, input: Omit<OpportunityLead, "status" | "expiresWorldMinute">): SimulationEvent[] {
  if (!enabled(world)) return [];
  const rows = world.opportunities ?? [];
  if (rows.some((entry) => entry.id === input.id)) return [];
  if (rows.filter((entry) => actionable(entry, input.worldMinute)).length >= 3 ||
      rows.length >= 128) return [];
  if (rows.some((entry) => entry.subjectActorId === input.subjectActorId &&
    input.worldMinute >= entry.worldMinute && input.worldMinute - entry.worldMinute < COOLDOWN)) return [];
  const entry: OpportunityLead = {
    ...input, status: "open", expiresWorldMinute: input.worldMinute + LIFETIME,
  };
  if (!world.opportunities) world.opportunities = [];
  world.opportunities.push(entry);
  return [{ type: "OpportunityDiscovered", leadId: entry.id, origin: entry.origin,
    worldMinute: input.worldMinute }];
}

/** Producer 1: public NPC incident at the world clock boundary; never a broker. */
export function captureWorldOpportunities(
  world: WorldState, events: readonly SimulationEvent[],
): SimulationEvent[] {
  if (!enabled(world)) return [];
  return events.flatMap((event) => {
    if (event.type !== "UndergroundActivity" || !event.public) return [];
    const source = sourceOf(world, event.incidentId);
    if (!source || !source.incident.public ||
        source.incident.worldMinute !== event.worldMinute ||
        source.incident.actorId !== event.actorId ||
        source.incident.counterpartId !== event.counterpartId ||
        source.incident.outcome !== event.outcome) return [];
    return insert(world, {
      id: `lead:public:${event.incidentId}`, origin: "public-incident",
      sourceId: event.incidentId, incidentId: event.incidentId,
      subjectActorId: source.subjectActorId, targetId: source.targetId,
      worldMinute: event.worldMinute,
    });
  });
}

/** Producer 2: an NPC report delivered as a rumor, actually read by the player. */
export function discoverReportedOpportunity(
  world: WorldState, event: Extract<SimulationEvent, { type: "MessageRead" }>,
): SimulationEvent[] {
  if (!enabled(world) || event.worldMinute !== world.worldMinute) return [];
  const message = world.underground.messages.find((m) =>
    m.id === event.messageId && m.read && m.worldMinute <= event.worldMinute);
  const rumor = world.underground.rumors.find((r) =>
    r.id === message?.rumorId && r.kind === "incident-leak" &&
    r.relayId === message?.fromId && r.claim &&
    r.worldMinute <= event.worldMinute);
  if (!message || !rumor) return [];
  const source = sourceOf(world, rumor.sourceId);
  if (!source || source.incident.public) return [];
  return insert(world, {
    id: `lead:report:${message.id}`, origin: "relay-report", sourceId: message.id,
    incidentId: source.incident.id, subjectActorId: source.subjectActorId,
    targetId: source.targetId, worldMinute: event.worldMinute,
  });
}

/** Stable world pulse expiry. No UI timer and no separate random state. */
export function expireOpportunities(world: WorldState, minute: number): SimulationEvent[] {
  if (!enabled(world)) return [];
  const result: SimulationEvent[] = [];
  for (const lead of world.opportunities ?? []) {
    if ((lead.status === "open" || lead.status === "mapped") && lead.expiresWorldMinute < minute) {
      lead.status = "expired";
      lead.resolvedWorldMinute = lead.expiresWorldMinute;
      result.push({ type: "OpportunityExpired", leadId: lead.id, worldMinute: minute });
    }
  }
  return result;
}

/**
 * Authoritative provenance check for resumed or hand-edited saves. A lead ID
 * can never be repointed to a different real incident or another actor.
 */
function sourced(world: WorldState, lead: OpportunityLead): boolean {
  const source = sourceOf(world, lead.incidentId);
  if (!source || source.subjectActorId !== lead.subjectActorId ||
      source.targetId !== lead.targetId ||
      source.incident.worldMinute > lead.worldMinute) return false;
  if (lead.origin === "public-incident") {
    return source.incident.public &&
      lead.id === `lead:public:${source.incident.id}` &&
      lead.sourceId === source.incident.id &&
      lead.worldMinute === source.incident.worldMinute;
  }
  const message = world.underground.messages.find((m) => m.id === lead.sourceId);
  const rumor = world.underground.rumors.find((r) => r.id === message?.rumorId);
  return Boolean(message?.read && rumor?.claim && !source.incident.public &&
    lead.id === `lead:report:${message.id}` &&
    message.worldMinute <= lead.worldMinute &&
    rumor.worldMinute <= lead.worldMinute &&
    rumor.kind === "incident-leak" &&
    rumor.sourceId === lead.incidentId &&
    rumor.relayId === message.fromId);
}

/** Earn one actual host observation before acting; it does NOT validate the rumor. */
export function investigateOpportunity(world: WorldState, id: string): Result {
  if (!enabled(world)) return failure("LEAD_UNAVAILABLE");
  const lead = world.opportunities?.find((entry) => entry.id === id);
  if (!lead) return failure("LEAD_NOT_FOUND");
  if (!actionable(lead, world.worldMinute)) return failure("LEAD_EXPIRED_OR_RESOLVED");
  if (lead.status !== "open") return failure("LEAD_ALREADY_MAPPED");
  if (!sourced(world, lead)) return failure("LEAD_SOURCE_INVALID");
  const compiled = compileContentCondition({
    op: "fact", fact: {
      kind: "player.known-active-target-machines",
      target: { kind: "target", id: lead.targetId }, min: 1,
    },
  });
  if (!compiled.ok || evaluateContentCondition(world, compiled.compiled,
    { kind: "player-known" }).value !== true) return failure("LEAD_NEEDS_OBSERVED_HOST");
  lead.status = "mapped";
  return { ok: true, events: [{
    type: "OpportunityInvestigated", leadId: lead.id, worldMinute: world.worldMinute,
  }] };
}

function accurateClaim(world: WorldState, lead: OpportunityLead): boolean {
  if (lead.origin === "public-incident") return true;
  const message = world.underground.messages.find((m) => m.id === lead.sourceId);
  const rumor = world.underground.rumors.find((r) => r.id === message?.rumorId);
  const actual = world.underground.incidents.find((i) => i.id === lead.incidentId);
  return Boolean(rumor?.claim && actual &&
    rumor.claim.actorId === actual.actorId &&
    rumor.claim.counterpartId === actual.counterpartId &&
    rumor.claim.outcome === actual.outcome);
}

/** Resolution changes real wallet/reputational state, sourced to a single lead. */
export function resolveOpportunity(
  world: WorldState, id: string, approach: OpportunityApproach | "ignore",
): Result {
  if (!enabled(world)) return failure("LEAD_UNAVAILABLE");
  const lead = world.opportunities?.find((entry) => entry.id === id);
  if (!lead) return failure("LEAD_NOT_FOUND");
  if (!actionable(lead, world.worldMinute)) return failure("LEAD_EXPIRED_OR_RESOLVED");
  if (approach !== "ignore" && lead.status !== "mapped") {
    return failure("LEAD_NEEDS_INVESTIGATION");
  }
  if (!sourced(world, lead)) return failure("LEAD_SOURCE_INVALID");

  const events: SimulationEvent[] = [];
  if (approach !== "ignore") {
    const reliable = accurateClaim(world, lead);
    const worth = hashUnit(world.underground.seed, "lead-price", lead.sourceId, lead.subjectActorId);
    const amount = approach === "trade" ? 65 + Math.floor(worth * 56) :
      approach === "exploit" ? 110 + Math.floor(worth * 91) : 0;
    if (amount) {
      const transfer = transferValue(world, { direction: "credit", amount,
        causeKind: "opportunity", causeId: lead.id,
        counterparty: "anonymous-intel-exchange", worldMinute: world.worldMinute });
      if (!transfer) return failure("LEAD_TRADE_BLOCKED");
      events.push(transfer);
    }
    const delta = approach === "disclose"
      ? reliable ? { trust: 7, grudge: 9 } : { trust: -12, grudge: 20 }
      : approach === "trade" ? { trust: -5, grudge: 11 }
      : { trust: -16, grudge: 29 };
    const changed = applyOpportunityRelationship(world, lead.subjectActorId,
      lead.id, delta, world.worldMinute);
    if (changed) events.push(changed);
  }
  lead.status = approach === "ignore" ? "ignored" : "resolved";
  if (approach !== "ignore") lead.resolution = approach;
  lead.resolvedWorldMinute = world.worldMinute;
  events.push({ type: "OpportunityResolved", leadId: lead.id,
    approach, worldMinute: world.worldMinute });
  return { ok: true, events };
}
