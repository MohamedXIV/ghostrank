import { findMachineItem } from "@/content/machine-catalog";
import { deriveLongRunPressure } from "@/game/simulation/systems/long-run-pressure";
import type { WorldState } from "@/game/simulation/state/world-state";

export const EXOTIC_MACHINE_ID = "box-annealing-rack";

export type ExoticMachineAvailability =
  | "available"
  | "not-veteran"
  | "no-clean-workflow"
  | "already-claimed";

/**
 * Phase 7 P6 — the exotic catalog is late and rare because it is earned from
 * this run's history, not because rank crossed a level gate.
 *
 * The one shipped item is a one-shot market opportunity. Veteran pressure
 * proves the run is exceptional; a completed clean self-authored workflow proves
 * the player has actually engaged the capability/AI/tooling loop. Neither
 * condition makes targets easier by itself.
 */
export function exoticMachineAvailability(
  world: WorldState,
): ExoticMachineAvailability {
  const item = findMachineItem(EXOTIC_MACHINE_ID);
  if (!item?.exotic) {
    return "already-claimed";
  }

  const claimed =
    world.economy.ownedMachines.some(
      (machine) => machine.catalogId === EXOTIC_MACHINE_ID,
    ) ||
    world.economy.ledger.some(
      (entry) =>
        entry.cause.kind === "machine" &&
        entry.cause.id === EXOTIC_MACHINE_ID &&
        entry.direction === "debit",
    );

  if (claimed) {
    return "already-claimed";
  }

  if (deriveLongRunPressure(world).band !== "veteran") {
    return "not-veteran";
  }

  const cleanWorkflow = world.economy.ownedWorkflows.some(
    (workflow) => workflow.outcome === "clean",
  );

  if (!cleanWorkflow) {
    return "no-clean-workflow";
  }

  return "available";
}

export function exoticMachineAvailable(world: WorldState): boolean {
  return exoticMachineAvailability(world) === "available";
}

/**
 * Standard catalog machines remain always listed. Exotic stock appears only
 * when it is a valid one-shot offer; an already-owned exotic is represented by
 * the owned-machine projection rather than a permanently rebuyable listing.
 */
export function machineMarketVisible(
  world: WorldState,
  catalogId: string,
): boolean {
  const item = findMachineItem(catalogId);
  if (!item) {
    return false;
  }

  return !item.exotic || exoticMachineAvailable(world);
}
