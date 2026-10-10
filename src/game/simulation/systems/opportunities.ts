import {
  OBJECTIVE_WEIGHTS,
  type GeneratedRunScenario,
} from "@/content/world-scenarios";
import type {
  ContractObjectiveKind,
  UndergroundActor,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Opportunities in generated scenes (Game-First G2, #78; D069). What work is
 * offered depends on the scene and on the issuer's greed:
 * - each scene weights the four contract objectives (`OBJECTIVE_WEIGHTS`);
 * - a greedy issuer adds weight to `intrusion`, the best-paying objective, so
 *   greed changes what is offered, not only how often.
 *
 * Canonical scenes and saves with no scene keep the uniform objective draw, and
 * an actor with no temperament adds nothing, so their offers are unchanged.
 * Rank is never read here.
 */

/** Greed points per unit of intrusion weight: greed 100 adds 20 weight. */
export const GREED_INTRUSION_DIVISOR = 5;

export interface ObjectiveWeight {
  value: ContractObjectiveKind;
  weight: number;
}

/** The scene of a generated world, or undefined for the canonical roster. */
export function generatedSceneOf(
  world: Pick<WorldState, "scenario">,
): GeneratedRunScenario | undefined {
  const scenario = world.scenario;

  return scenario === "fresh-scene" || scenario === "high-pressure"
    ? scenario
    : undefined;
}

/** The objective weights this issuer draws from in this scene (D069). */
export function objectiveWeightsFor(
  scenario: GeneratedRunScenario,
  issuer: Pick<UndergroundActor, "temperament">,
): ObjectiveWeight[] {
  const greedIntrusion = (issuer.temperament?.greed ?? 0) / GREED_INTRUSION_DIVISOR;

  return OBJECTIVE_WEIGHTS[scenario].map((entry) =>
    entry.value === "intrusion"
      ? { value: entry.value, weight: entry.weight + greedIntrusion }
      : { value: entry.value, weight: entry.weight },
  );
}
