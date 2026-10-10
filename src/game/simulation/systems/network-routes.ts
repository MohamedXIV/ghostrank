import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import type { WorldState } from "@/game/simulation/state/world-state";

/**
 * Fictional Network Mapping rule primitives (G3).
 * No mission, GUI, terminal, NPC or host-network dependencies.
 * Challenge facts belong to the authoritative world; CommandBus / providers
 * verify the provenance of a clue before recording it.
 */
export type NetworkCarrier = "public" | "sealed";
export type NetworkEcho = "circle" | "triangle";

export interface NetworkRouteCandidate {
  id: string;
  label: string;
  carrier: NetworkCarrier;
  echo: NetworkEcho;
}

export type NetworkRouteObservation =
  | { id: string; kind: "carrier"; value: NetworkCarrier; sourceId: string; epoch: number; worldMinute: number }
  | { id: string; kind: "echo"; value: NetworkEcho; sourceId: string; epoch: number; worldMinute: number };

export interface NetworkRouteTest {
  routeId: string;
  epoch: number;
  result: "confirmed" | "refuted";
  worldMinute: number;
}

export interface NetworkRouteChallenge {
  id: string;
  targetId: string;
  entryMachineId: string;
  objectiveMachineId: string;
  candidates: NetworkRouteCandidate[];
  requiredCarrier: NetworkCarrier;
  requiredEcho: NetworkEcho;
  epoch: number;
  baseMinutes: number;
  traceWeight: number;
  observations: NetworkRouteObservation[];
  tests: NetworkRouteTest[];
}

export type NetworkRouteEligibility =
  | { ok: true }
  | { ok: false; error: "ROUTE_UNKNOWN" | "ROUTE_ALREADY_TESTED" | "CLUES_INCOMPLETE" };

/** This reads authoritative truth; never call it in player-facing UI. */
export function matchingNetworkRoute(
  challenge: NetworkRouteChallenge,
  routeId: string,
): boolean {
  const candidate = challenge.candidates.find((entry) => entry.id === routeId);
  return candidate !== undefined &&
    candidate.carrier === challenge.requiredCarrier &&
    candidate.echo === challenge.requiredEcho;
}

/** Only sourced observations from the current route epoch are actionable. */
export function observedNetworkConstraints(
  challenge: NetworkRouteChallenge,
): { carrier?: NetworkCarrier; echo?: NetworkEcho } {
  const known: { carrier?: NetworkCarrier; echo?: NetworkEcho } = {};

  for (const observation of challenge.observations) {
    if (observation.epoch !== challenge.epoch) continue;
    if (observation.kind === "carrier") known.carrier = observation.value;
    else known.echo = observation.value;
  }

  return known;
}

export function assessNetworkRoute(
  challenge: NetworkRouteChallenge,
  routeId: string,
): NetworkRouteEligibility {
  if (!challenge.candidates.some((candidate) => candidate.id === routeId)) {
    return { ok: false, error: "ROUTE_UNKNOWN" };
  }
  if (challenge.tests.some(
    (attempt) => attempt.epoch === challenge.epoch && attempt.routeId === routeId,
  )) {
    return { ok: false, error: "ROUTE_ALREADY_TESTED" };
  }

  const known = observedNetworkConstraints(challenge);
  if (known.carrier === undefined || known.echo === undefined) {
    return { ok: false, error: "CLUES_INCOMPLETE" };
  }

  return { ok: true };
}

/**
 * Provider-side structural guard. Source authorization belongs to CommandBus;
 * player-supplied observations must never be passed here without verification.
 */
export function recordNetworkObservation(
  challenge: NetworkRouteChallenge,
  observation: NetworkRouteObservation,
): void {
  const values = observation.kind === "carrier"
    ? ["public", "sealed"]
    : ["circle", "triangle"];

  if (
    (observation.kind !== "carrier" && observation.kind !== "echo") ||
    !values.includes(observation.value)
  ) {
    throw new RangeError("Invalid network clue kind/value");
  }
  if (
    !observation.id ||
    !observation.sourceId ||
    !Number.isInteger(observation.worldMinute) ||
    observation.worldMinute < 0
  ) {
    throw new RangeError("Invalid network clue provenance");
  }
  if (observation.epoch !== challenge.epoch) {
    throw new RangeError("Network clue epoch is stale or future");
  }
  if (challenge.observations.some((entry) => entry.id === observation.id)) {
    throw new RangeError("Duplicate network clue ID");
  }
  challenge.observations.push(observation);
}

/** Defender changes the live route epoch without deleting historical clues. */
export function rotateNetworkRoute(
  challenge: NetworkRouteChallenge,
  nextEcho: NetworkEcho,
): void {
  if (nextEcho !== "circle" && nextEcho !== "triangle") {
    throw new RangeError("Invalid echo mark");
  }
  const matches = challenge.candidates.filter(
    (entry) =>
      entry.carrier === challenge.requiredCarrier && entry.echo === nextEcho,
  );
  if (matches.length !== 1) {
    throw new RangeError(
      "Network rotation must leave exactly one unique correct route",
    );
  }
  if (!Number.isInteger(challenge.epoch) || challenge.epoch < 0) {
    throw new RangeError("Invalid network epoch");
  }
  challenge.requiredEcho = nextEcho;
  challenge.epoch += 1;
}

/** Changes only presentation order; never mutates network truth or NPC RNG. */
export function seededNetworkRouteOrder(
  seed: number,
  challenge: NetworkRouteChallenge,
): NetworkRouteCandidate[] {
  const weight = (id: string) =>
    hashUnit(seed, "g3-network-route", challenge.targetId, challenge.id, id);
  return [...challenge.candidates].sort(
    (a, b) => weight(a.id) - weight(b.id) || a.id.localeCompare(b.id),
  );
}

export type NetworkRoutePreview =
  | { ok: true; minutes: number; traceWeight: number; footprintAfter: number }
  | { ok: false; error:
      | "RUN_ENDED"
      | "NO_ACTIVE_OPERATION"
      | "OPERATION_TARGET_MISMATCH"
      | "CHALLENGE_UNKNOWN"
      | "ENTRY_UNOBSERVED"
      | "ROUTE_UNKNOWN"
      | "ROUTE_ALREADY_TESTED"
      | "CLUES_INCOMPLETE" };

/**
 * Authoritative cost preview; intentional rejection before truth evaluation.
 * An incorrect candidate previews exactly the same charge as a correct one.
 */
export function previewNetworkRoute(
  world: WorldState,
  targetId: string,
  challengeId: string,
  routeId: string,
): NetworkRoutePreview {
  if (world.ending !== null) return { ok: false, error: "RUN_ENDED" };
  if (!world.operation) return { ok: false, error: "NO_ACTIVE_OPERATION" };
  if (world.operation.targetId !== targetId) {
    return { ok: false, error: "OPERATION_TARGET_MISMATCH" };
  }
  const challenge = world.networkChallenges?.find(
    candidate => candidate.id === challengeId && candidate.targetId === targetId,
  );
  if (!challenge) return { ok: false, error: "CHALLENGE_UNKNOWN" };
  if (!world.evidence.some(record =>
    record.kind === "machine-presence" &&
    record.subjectId === challenge.entryMachineId &&
    record.retiredWorldMinute === undefined)) {
    return { ok: false, error: "ENTRY_UNOBSERVED" };
  }
  const eligibility = assessNetworkRoute(challenge, routeId);
  if (!eligibility.ok) return eligibility;
  const footprint = world.traces
    .filter(trace => trace.targetId === targetId)
    .reduce((sum, trace) => sum + trace.weight, 0);
  return {
    ok: true,
    minutes: challenge.baseMinutes,
    traceWeight: challenge.traceWeight,
    footprintAfter: footprint + challenge.traceWeight,
  };
}
