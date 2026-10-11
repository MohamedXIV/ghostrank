import {
  INFRASTRUCTURE_MAP_OBJECTIVE,
  type InfrastructureMapObjectiveDefinition,
} from "@/content/contract-objectives";
import { evaluateContentCondition } from "@/game/content/conditions";
import { compileContentCondition } from "@/game/content/definitions";
import type {
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Trusted, bounded binding from a real contract to the same reusable G9 P1
 * fact evaluator. It validates scope and threshold before asking for evidence.
 * Unknown and invalid bindings cannot earn a delivery.
 */
export function evaluateContractObjective(
  world: Readonly<WorldState>,
  contract: Pick<UndergroundContract, "objective" | "targetId" | "requiredMachines">,
  definition: InfrastructureMapObjectiveDefinition = INFRASTRUCTURE_MAP_OBJECTIVE,
): boolean {
  if (
    contract.objective !== definition.objective ||
    definition.condition.op !== "fact" ||
    definition.condition.fact !== "player.known-active-target-machines" ||
    definition.condition.targetBinding !== "contract.targetId" ||
    definition.condition.minimumBinding !== "contract.requiredMachines"
  ) return false;

  const compiled = compileContentCondition({
    op: "fact",
    fact: {
      kind: definition.condition.fact,
      target: { kind: "target", id: contract.targetId },
      min: contract.requiredMachines ?? definition.condition.defaultMinimum,
    },
  });

  if (!compiled.ok) return false;
  // This predicate itself reads only verified player-earned evidence, even
  // under the trusted authority lens. No raw world topology is returned to UI.
  return evaluateContentCondition(world, compiled.compiled, {
    kind: "authority",
  }).value === true;
}
