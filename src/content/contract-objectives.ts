/**
 * G9 P3 — data-backed objective definitions.
 *
 * These describe what an authored objective means, not executable logic or a
 * command. A finite binding adapter validates them before a trusted
 * WorldState query; new targets and machine requirements require no new
 * branch in underground.ts.
 */
export interface InfrastructureMapObjectiveDefinition {
  readonly id: string;
  readonly version: 1;
  readonly objective: "infrastructure-map";
  readonly condition: {
    readonly op: "fact";
    readonly fact: "player.known-active-target-machines";
    readonly targetBinding: "contract.targetId";
    readonly minimumBinding: "contract.requiredMachines";
    readonly defaultMinimum: number;
  };
}

export const INFRASTRUCTURE_MAP_OBJECTIVE = {
  id: "contract.infrastructure-map.v1",
  version: 1,
  objective: "infrastructure-map",
  condition: {
    op: "fact",
    fact: "player.known-active-target-machines",
    targetBinding: "contract.targetId",
    minimumBinding: "contract.requiredMachines",
    defaultMinimum: 1,
  },
} as const satisfies InfrastructureMapObjectiveDefinition;

/**
 * Two authored configurations prove the *same* predicate binds different
 * requirements. Current offer-generation weights and RNG remain unchanged;
 * the existing requiredMachines field is the runtime parameter.
 */
export const INFRASTRUCTURE_MAP_VARIANTS = [
  { id: "contract.infrastructure-map.basic", requiredMachines: 1 },
  { id: "contract.infrastructure-map.detailed", requiredMachines: 2 },
] as const;
