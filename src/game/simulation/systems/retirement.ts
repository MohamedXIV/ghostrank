import { deriveReputationDescriptors } from "@/game/simulation/systems/reputation";
import type { WorldState } from "@/game/simulation/state/world-state";

export const RETIREMENT_COMMIT_MINUTES = 60;
export const RETIREMENT_COOLING_MINUTES = 2 * 24 * 60;

export type RetirementBlocker =
  | "active-operation"
  | "accepted-contract"
  | "in-flight-build"
  | "active-model"
  | "active-software"
  | "active-lease";

export type RetirementStatus = "idle" | "planning" | "cooling" | "ready";

export type RetirementVariant =
  | "vanished"
  | "white-quiet"
  | "black-prosperous"
  | "black-watchful"
  | "black-quiet"
  | "mixed-exit";

export interface RetirementOutcome {
  status: "retired" | "vanished";
  variant: RetirementVariant;
  detail: string;
}

export const VANISHED_WHITE_COMPLETIONS = 3;
export const BLACK_PROSPEROUS_CREDITS = 500;

export function retirementBlockers(world: WorldState): RetirementBlocker[] {
  const blockers: RetirementBlocker[] = [];

  if (world.operation) blockers.push("active-operation");
  if (
    world.underground.contracts.some(
      (contract) => contract.status === "accepted",
    )
  ) {
    blockers.push("accepted-contract");
  }
  if (world.builds.length > 0) blockers.push("in-flight-build");
  if (world.economy.activeModel !== null) blockers.push("active-model");
  if (world.economy.software.length > 0) blockers.push("active-software");
  if (world.economy.housing !== null) blockers.push("active-lease");

  return blockers;
}

export function retirementStatus(world: WorldState): RetirementStatus {
  const plan = world.retirement;
  if (!plan) return "idle";
  if (plan.stage === "planning") return "planning";

  return plan.coolingUntilWorldMinute !== undefined &&
    world.worldMinute >= plan.coolingUntilWorldMinute
    ? "ready"
    : "cooling";
}

export function retirementReady(world: WorldState): boolean {
  return retirementStatus(world) === "ready";
}

export function beginRetirementPlan(world: WorldState): void {
  world.retirement = {
    stage: "planning",
    startedWorldMinute: world.worldMinute,
  };
}

export function commitRetirementPlan(world: WorldState): void {
  if (!world.retirement) {
    return;
  }

  world.retirement = {
    stage: "cooling",
    startedWorldMinute: world.retirement.startedWorldMinute,
    committedWorldMinute: world.worldMinute,
    coolingUntilWorldMinute: world.worldMinute + RETIREMENT_COOLING_MINUTES,
  };
}

export function cancelRetirementPlan(world: WorldState): void {
  world.retirement = null;
}

export function commandAllowedDuringRetirementCooling(type: string): boolean {
  return (
    type === "advanceTime" ||
    type === "sleep" ||
    type === "fastForward" ||
    type === "cancelAdvance" ||
    type === "pumpTime" ||
    type === "readMessage" ||
    type === "cancelRetirement" ||
    type === "finishRetirement"
  );
}

function completedContractsByNetwork(
  world: WorldState,
  network: "white" | "black",
): number {
  const actors = new Map(
    world.underground.actors.map((actor) => [actor.id, actor.network]),
  );

  return world.underground.contracts.filter(
    (contract) =>
      contract.status === "completed" &&
      actors.get(contract.issuerId) === network,
  ).length;
}

function visibleRetirementPressure(world: WorldState): boolean {
  return (
    world.underground.retaliations.length > 0 ||
    world.physicalThreats.length > 0 ||
    world.compromises.length > 0
  );
}

/**
 * Phase 7 P3 — derive retirement identity from actual run history, never from
 * the starting White/Black package and never from player rank.
 *
 * VANISHED is deliberately narrow: sustained White-scene work, no Black-scene
 * completed work, no failed accepted obligation, no Predator-level escalation
 * pattern, no catastrophic compromise, and no social unmasking incident.
 * Everything else still retires successfully; the variant changes only the
 * closing tone.
 */
export function deriveRetirementOutcome(
  world: WorldState,
): RetirementOutcome | null {
  if (!retirementReady(world)) {
    return null;
  }

  const whiteCompleted = completedContractsByNetwork(world, "white");
  const blackCompleted = completedContractsByNetwork(world, "black");
  const descriptors = new Set(
    deriveReputationDescriptors(world).map((descriptor) => descriptor.id),
  );
  const unmasked = world.underground.retaliations.some(
    (retaliation) => retaliation.kind === "unmasking",
  );

  if (
    whiteCompleted >= VANISHED_WHITE_COMPLETIONS &&
    blackCompleted === 0 &&
    !descriptors.has("opportunist") &&
    !descriptors.has("predator") &&
    world.compromises.length === 0 &&
    !unmasked
  ) {
    return {
      status: "vanished",
      variant: "vanished",
      detail: "the old handle stays silent; nothing calls it back",
    };
  }

  if (blackCompleted >= 2 && blackCompleted > whiteCompleted) {
    if (visibleRetirementPressure(world)) {
      return {
        status: "retired",
        variant: "black-watchful",
        detail: "the work stops; the habit of watching the door does not",
      };
    }

    if (world.economy.credits >= BLACK_PROSPEROUS_CREDITS) {
      return {
        status: "retired",
        variant: "black-prosperous",
        detail: "the handle closes with money left after the last job",
      };
    }

    return {
      status: "retired",
      variant: "black-quiet",
      detail: "the market loses a handle without getting a final story",
    };
  }

  if (whiteCompleted > blackCompleted && whiteCompleted > 0) {
    return {
      status: "retired",
      variant: "white-quiet",
      detail: "the handle goes quiet after leaving more promises kept than broken",
    };
  }

  return {
    status: "retired",
    variant: "mixed-exit",
    detail: "the handle closes without belonging cleanly to either side",
  };
}
