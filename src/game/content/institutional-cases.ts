import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  InstitutionalCase, InstitutionalChoice, UndergroundActor, WorldState,
} from "@/game/simulation/state/world-state";
import { compileContentCondition } from "@/game/content/definitions";
import { evaluateContentCondition } from "@/game/content/conditions";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { transferValue } from "@/game/simulation/systems/economy";
import { applyInstitutionalRelationship } from "@/game/simulation/systems/underground";

/**
 * G9 P6: fictional civic institutions are NOT hacker organizations.
 * A local records office spans one real organization; the fictional federated
 * records commission spans two actually linked organizations. The latter has
 * independently scheduled responses from both member administrations. It is a
 * bounded public-service coordination model, NOT an entire country simulator.
 */
const LIFETIME = 4 * 1440;
const MAX_CASES = 48;
const MAX_ACTIVE = 2;
const RESPONSE_STEPS = 4;
const ARCHIVE_KINDS = new Set(["archive", "records", "ledger"]);
const enabled = (world: WorldState): boolean =>
  !world.ending && (world.scenario === "fresh-scene" || world.scenario === "high-pressure");

function ownerAndArchive(world: WorldState, incidentId: string) {
  const incident = world.underground.incidents.find(i => i.id === incidentId);
  if (!incident || !incident.public || incident.outcome !== "succeeded") return null;
  const owner = world.underground.actors.find(a => a.id === incident.counterpartId);
  const target = world.targets.find(t => t.id === owner?.targetId);
  const org = world.underground.organizations?.find(o => o.id === owner?.organizationId);
  if (!owner || !org || !target || target.organizationId !== org.id ||
      !target.machines.some(m => m.services.some(s => ARCHIVE_KINDS.has(s.kind)))) return null;
  return { incident, owner, target, org };
}

export function witnessCase(world: WorldState, entry: InstitutionalCase): boolean {
  const source = ownerAndArchive(world, entry.incidentId);
  if (!source || entry.id !== `civic:${source.incident.id}` ||
      entry.targetId !== source.target.id ||
      entry.ownerId !== source.owner.id ||
      entry.openedWorldMinute !== source.incident.worldMinute ||
      entry.expiresWorldMinute !== entry.openedWorldMinute + LIFETIME ||
      entry.participatingOrganizationIds[0] !== source.org.id ||
      entry.participatingOrganizationIds.length !==
        (entry.scope === "national-network" ? 2 : 1)) return false;
  if (entry.scope === "district") return true;
  const partner = entry.participatingOrganizationIds[1];
  return Boolean(partner && source.org.rivalIds.includes(partner) &&
    world.underground.organizations?.some(o => o.id === partner));
}

/** Real independently emitted public breach -> a causal civic records case. */
export function captureInstitutionalCases(
  world: WorldState, events: readonly SimulationEvent[], minute: number,
): SimulationEvent[] {
  if (!enabled(world)) return [];
  const results: SimulationEvent[] = [];
  for (const event of events) {
    if (event.type !== "UndergroundActivity" || !event.public ||
        event.outcome !== "succeeded" || event.worldMinute !== minute) continue;
    const source = ownerAndArchive(world, event.incidentId);
    if (!source || source.incident.actorId !== event.actorId ||
        source.incident.counterpartId !== event.counterpartId ||
        source.incident.worldMinute !== minute) continue;
    const cases = world.institutionalCases ?? [];
    if (cases.some(c => c.incidentId === event.incidentId) ||
        cases.length >= MAX_CASES ||
        cases.filter(c => c.status === "open" || c.status === "mapped").length >= MAX_ACTIVE) continue;
    // Seeded public-service escalation check, separate from the NPC incident
    // roll but stateless; does not change any previous random trajectory.
    if (hashUnit(world.underground.seed, "civic-trigger", event.incidentId) >= 0.42) continue;
    const candidate = source.org.rivalIds.find(id =>
      world.underground.organizations?.some(o => o.id === id));
    const network = Boolean(candidate &&
      hashUnit(world.underground.seed, "civic-reach", event.incidentId) < 0.5);
    const caseRecord: InstitutionalCase = {
      id: `civic:${event.incidentId}`,
      scope: network ? "national-network" : "district",
      incidentId: event.incidentId,
      targetId: source.target.id,
      ownerId: source.owner.id,
      participatingOrganizationIds: candidate && network
        ? [source.org.id, candidate] : [source.org.id],
      openedWorldMinute: minute,
      expiresWorldMinute: minute + LIFETIME,
      status: "open",
      disclosure: "unverified",
      publicAttention: 10,
      containment: 0,
      responses: [],
      responseTicks: 0,
    };
    if (!world.institutionalCases) world.institutionalCases = [];
    world.institutionalCases.push(caseRecord);
    results.push({ type: "InstitutionalCaseOpened", caseId: caseRecord.id,
      scope: caseRecord.scope, worldMinute: minute });
  }
  return results;
}

/**
 * Multi-tick, independent NPC responses. There is no player command required:
 * local office reviews first, national-network partner reacts at a later tick,
 * containment grows, and defenses of *actual affected owners* harden.
 */
export function advanceInstitutionalCases(world: WorldState, minute: number): SimulationEvent[] {
  if (!enabled(world)) return [];
  const output: SimulationEvent[] = [];
  for (const c of world.institutionalCases ?? []) {
    if (!witnessCase(world, c) || c.responseTicks >= RESPONSE_STEPS) continue;
    if (minute <= c.openedWorldMinute) continue;
    // Walk-away ends the player's intervention, not the public office's response.
    const step = c.responseTicks;
    const orgId = c.participatingOrganizationIds[step % c.participatingOrganizationIds.length];
    if (!orgId) continue;
    const delta = c.disclosure === "public" ? 8 :
      c.disclosure === "sealed" ? 12 : 6;
    c.containment = Math.min(100, c.containment + delta);
    if (c.disclosure === "public") c.publicAttention = Math.min(100, c.publicAttention + 6);
    c.responses.push({ organizationId: orgId, worldMinute: minute, step: step + 1 });
    c.responseTicks++;
    output.push({
      type: "InstitutionalResponse",
      caseId: c.id, responseIndex: c.responseTicks, worldMinute: minute,
    });
    if (c.status === "open" && minute > c.expiresWorldMinute) {
      c.status = "expired";
      output.push({ type: "InstitutionalCaseExpired", caseId: c.id, worldMinute: minute });
    }
  }
  // The player's window closes even for cases whose responses already ended.
  for (const c of world.institutionalCases ?? []) {
    if ((c.status === "open" || c.status === "mapped") && minute > c.expiresWorldMinute) {
      c.status = "expired";
      output.push({ type: "InstitutionalCaseExpired", caseId: c.id, worldMinute: minute });
    }
  }
  return output;
}

/** Actual institutional hardening consumed by NPC combat on subsequent ticks. */
export function institutionalDefenseBonus(world: WorldState, actor: UndergroundActor): number {
  if (!enabled(world) || !actor.organizationId || !actor.targetId) return 0;
  const affected = (world.institutionalCases ?? []).some(c =>
    c.responses.some(r => r.organizationId === actor.organizationId) &&
    c.participatingOrganizationIds.includes(actor.organizationId!) &&
    world.targets.some(t => t.id === actor.targetId && t.organizationId === actor.organizationId));
  return affected ? 5 : 0;
}

const failed = (error: string) => ({ ok: false as const, error, events: [] as SimulationEvent[] });
function eligible(world: WorldState, id: string) {
  const c = world.institutionalCases?.find(entry => entry.id === id);
  if (!c) return null;
  if (!witnessCase(world, c)) return null;
  return c;
}
export function mapInstitutionalCase(world: WorldState, id: string) {
  if (!enabled(world)) return failed("CIVIC_UNAVAILABLE");
  const c = eligible(world, id);
  if (!c || world.worldMinute < c.openedWorldMinute) return failed("CIVIC_SOURCE_INVALID");
  if (c.status !== "open" || world.worldMinute > c.expiresWorldMinute) return failed("CIVIC_NOT_OPEN");
  const compiled = compileContentCondition({
    op: "fact", fact: { kind: "player.known-active-target-machines",
      target: { kind: "target", id: c.targetId }, min: 1 },
  });
  if (!compiled.ok || evaluateContentCondition(world, compiled.compiled,
      { kind: "player-known" }).value !== true) return failed("CIVIC_NEEDS_EVIDENCE");
  c.status = "mapped";
  return { ok: true as const, events: [{
    type: "InstitutionalCaseMapped" as const, caseId: c.id, worldMinute: world.worldMinute,
  }] };
}

/**
 * Choice authority validates the actual source, earned mapping, and the wallet
 * before any mutation; unique terminal receipt makes repeat payouts impossible.
 */
export function resolveInstitutionalCase(
  world: WorldState, id: string, choice: InstitutionalChoice,
) {
  if (!enabled(world)) return failed("CIVIC_UNAVAILABLE");
  const c = eligible(world, id);
  if (!c || world.worldMinute < c.openedWorldMinute) return failed("CIVIC_SOURCE_INVALID");
  if ((c.status !== "open" && c.status !== "mapped") ||
      world.worldMinute > c.expiresWorldMinute) return failed("CIVIC_CLOSED");
  if (choice !== "walk-away" && c.status !== "mapped") return failed("CIVIC_NEEDS_MAPPING");

  const source = ownerAndArchive(world, c.incidentId);
  if (!source) return failed("CIVIC_SOURCE_INVALID");
  const credit = choice === "sell" ? (c.scope === "national-network" ? 180 : 95) : 0;
  const fee = choice === "suppress" ? 35 : 0;
  if (fee > world.economy.credits) return failed("CIVIC_INSUFFICIENT_FUNDS");
  const events: SimulationEvent[] = [];
  const change = credit || fee;
  if (change) {
    const v = transferValue(world, {
      direction: credit ? "credit" : "debit",
      amount: change, causeKind: "institutional-case", causeId: c.id,
      counterparty: "fictional-records-service", worldMinute: world.worldMinute,
    });
    if (!v) return failed("CIVIC_INSUFFICIENT_FUNDS");
    events.push(v);
  }
  const delta = choice === "disclose"
    ? { trust: 6, grudge: 11 } :
    choice === "handoff" ? { trust: 9, grudge: 2 } :
    choice === "sell" ? { trust: -6, grudge: 19 } :
    choice === "suppress" ? { trust: -12, grudge: 25 } : null;
  if (delta) {
    const relation = applyInstitutionalRelationship(
      world, c.ownerId, c.id, delta, world.worldMinute);
    if (relation) events.push(relation);
  }
  c.disclosure = choice === "disclose" ? "public" :
    choice === "handoff" || choice === "suppress" ? "sealed" : "unverified";
  c.publicAttention = Math.max(0, Math.min(100, c.publicAttention +
    (choice === "disclose" ? 32 : choice === "sell" ? 12 : choice === "suppress" ? -8 : 0)));
  c.status = choice === "walk-away" ? "withdrawn" : "resolved";
  c.resolution = choice;
  c.resolvedWorldMinute = world.worldMinute;
  events.push({ type: "InstitutionalCaseResolved", caseId: c.id,
    choice, worldMinute: world.worldMinute });
  return { ok: true as const, events };
}
