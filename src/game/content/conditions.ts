import type { WorldState } from "@/game/simulation/state/world-state";
import type {
  CompiledContentCondition,
  ContentCondition,
  ContentFact,
  KnowledgeLens,
} from "@/game/content/definitions";

/** Unknown is epistemic absence, never an alias for false. */
export type ConditionValue = true | false | "unknown";
export type ConditionReason =
  | "matched"
  | "not-met"
  | "not-observed"
  | "invalid-reference"
  | "unsupported-lens"
  | "reported-match"
  | "reported-mismatch"
  | "conflicting-reports";

export interface ConditionEvaluation {
  value: ConditionValue;
  reason: ConditionReason;
}

const UNKNOWN_OBSERVATION: ConditionEvaluation = {
  value: "unknown",
  reason: "not-observed",
};
const UNSUPPORTED_LENS: ConditionEvaluation = {
  value: "unknown",
  reason: "unsupported-lens",
};

function matches(value: boolean): ConditionEvaluation {
  return { value, reason: value ? "matched" : "not-met" };
}

function knownTargetMachines(
  world: Readonly<WorldState>,
  fact: Extract<ContentFact, { kind: "player.known-active-target-machines" }>,
  lens: KnowledgeLens,
): ConditionEvaluation {
  if (lens.kind === "observer-report") return UNSUPPORTED_LENS;

  const target = world.targets.find((entry) => entry.id === fact.target.id);
  if (!target) {
    // Non-authoritative callers must not distinguish a hidden target from
    // an invalid guessed ID. Never return machine IDs or hidden counts.
    return lens.kind === "authority"
      ? { value: "unknown", reason: "invalid-reference" }
      : UNKNOWN_OBSERVATION;
  }

  const liveObservations = world.evidence.filter(
    (record) =>
      record.kind === "machine-presence" &&
      record.worldMinute <= world.worldMinute &&
      record.retiredWorldMinute === undefined,
  );
  const observedIds = new Set(liveObservations.map((record) => record.subjectId));
  const count = target.machines.filter((machine) =>
    observedIds.has(machine.id),
  ).length;

  if (lens.kind === "player-known") {
    const discovered =
      world.knownTargetIds.includes(target.id) ||
      count > 0 ||
      world.evidence.some(
        (record) =>
          record.kind === "target-profile" &&
          record.subjectId === target.id &&
          record.worldMinute <= world.worldMinute &&
          record.retiredWorldMinute === undefined,
      );

    if (!discovered) return UNKNOWN_OBSERVATION;
  }
  return matches(count >= fact.min);
}

function actualIncidentOutcome(
  world: Readonly<WorldState>,
  fact: Extract<ContentFact, { kind: "incident.actual-outcome" }>,
  lens: KnowledgeLens,
): ConditionEvaluation {
  if (lens.kind === "observer-report") return UNKNOWN_OBSERVATION;
  const incident = world.underground.incidents.find(
    (item) => item.id === fact.source.id && item.worldMinute <= world.worldMinute,
  );
  if (!incident) {
    return lens.kind === "authority"
      ? { value: "unknown", reason: "invalid-reference" }
      : UNKNOWN_OBSERVATION;
  }
  // A private incident remains unverified even when a false or accurate
  // rumor about it was delivered to the player.
  if (lens.kind === "player-known" && !incident.public) {
    return UNKNOWN_OBSERVATION;
  }
  return matches(incident.outcome === fact.equals);
}

function reportedIncidentOutcome(
  world: Readonly<WorldState>,
  fact: Extract<ContentFact, { kind: "incident.reported-outcome" }>,
  lens: KnowledgeLens,
): ConditionEvaluation {
  // A transmitted report is not authority truth. No incoming NPC inbox or
  // NPC belief graph exists yet; we can only attribute the actual sender of
  // a message delivered to the player, NOT infer every NPC has heard it.
  if (lens.kind === "authority") return UNSUPPORTED_LENS;
  if (
    lens.kind === "observer-report" &&
    !world.underground.actors.some((actor) => actor.id === lens.observer.id)
  ) {
    return UNKNOWN_OBSERVATION;
  }

  const rumorsById = new Map(
    world.underground.rumors.map((rumor) => [rumor.id, rumor]),
  );
  const claimedOutcomes = new Set<"succeeded" | "repelled">();

  for (const message of world.underground.messages) {
    if (message.worldMinute > world.worldMinute) continue;
    if (
      lens.kind === "observer-report" &&
      message.fromId !== lens.observer.id
    ) continue;

    const rumor = rumorsById.get(message.rumorId);
    if (
      !rumor ||
      rumor.kind !== "incident-leak" ||
      rumor.sourceId !== fact.source.id ||
      rumor.relayId !== message.fromId ||
      rumor.worldMinute > world.worldMinute ||
      !rumor.claim
    ) continue;

    claimedOutcomes.add(rumor.claim.outcome);
  }

  if (claimedOutcomes.size === 0) return UNKNOWN_OBSERVATION;
  if (claimedOutcomes.size > 1) {
    return { value: "unknown", reason: "conflicting-reports" };
  }
  const reported = claimedOutcomes.has(fact.equals);
  return {
    value: reported,
    reason: reported ? "reported-match" : "reported-mismatch",
  };
}

function evaluateFact(
  world: Readonly<WorldState>,
  fact: ContentFact,
  lens: KnowledgeLens,
): ConditionEvaluation {
  switch (fact.kind) {
    case "player.known-active-target-machines":
      return knownTargetMachines(world, fact, lens);
    case "incident.actual-outcome":
      return actualIncidentOutcome(world, fact, lens);
    case "incident.reported-outcome":
      return reportedIncidentOutcome(world, fact, lens);
  }
}

function evaluate(
  world: Readonly<WorldState>,
  condition: ContentCondition,
  lens: KnowledgeLens,
): ConditionEvaluation {
  if (condition.op === "fact") {
    return evaluateFact(world, condition.fact, lens);
  }
  if (condition.op === "not") {
    const result = evaluate(world, condition.term, lens);
    return result.value === "unknown"
      ? result
      : matches(!result.value);
  }
  if (condition.op === "all") {
    let firstUnknown: ConditionEvaluation | undefined;
    for (const term of condition.terms) {
      const result = evaluate(world, term, lens);
      if (result.value === false) return result;
      if (result.value === "unknown") firstUnknown ??= result;
    }
    return firstUnknown ?? matches(true);
  }
  let firstUnknown: ConditionEvaluation | undefined;
  for (const term of condition.terms) {
    const result = evaluate(world, term, lens);
    if (result.value === true) return result;
    if (result.value === "unknown") firstUnknown ??= result;
  }
  return firstUnknown ?? matches(false);
}

/**
 * Trusted simulation-only query. Do not expose this function directly to
 * UI, Ink or terminal; they must receive an authorized projection instead.
 * This evaluator is pure and never grants permission to perform an effect.
 */
export function evaluateContentCondition(
  world: Readonly<WorldState>,
  compiled: CompiledContentCondition,
  lens: KnowledgeLens,
): ConditionEvaluation {
  return evaluate(world, compiled.definition, lens);
}
