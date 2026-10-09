/**
 * The scenario a run was started under (Game-First G2, #78; GAME_FIRST_REBOOT §4).
 *
 * `canonical` is the authored roster in `src/content/world-content.ts`, exactly
 * as before G2. The generated scenarios draw their people, networks and
 * infrastructure from the run's seed. The id lives in the simulation state so a
 * save can say how its world was made; presentation and generation data live
 * in `src/content/world-scenarios.ts`.
 *
 * A saved world with no scenario was made before G2, so it is canonical.
 */
export const RUN_SCENARIOS = [
  "canonical",
  "fresh-scene",
  "high-pressure",
] as const;

export type RunScenario = (typeof RUN_SCENARIOS)[number];

export const DEFAULT_RUN_SCENARIO: RunScenario = "canonical";

export function isRunScenario(value: unknown): value is RunScenario {
  return (
    typeof value === "string" &&
    (RUN_SCENARIOS as readonly string[]).includes(value)
  );
}
