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
    type === "readMessage" ||
    type === "cancelRetirement"
  );
}
