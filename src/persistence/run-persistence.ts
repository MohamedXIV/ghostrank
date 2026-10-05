import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

export interface RunPersistence {
  loadActiveState: () => Promise<WorldState | null>;
  saveActiveState: (
    state: WorldState,
    newEvents: readonly SimulationEvent[],
  ) => Promise<void>;

  /**
   * Phase 7 P0 optional completed-run boundary.
   *
   * The browser adapter implements both methods now. The deferred desktop
   * adapter may continue persisting the terminal active snapshot until #19
   * reconciles final run-history storage; gameplay never depends on history
   * availability to decide an ending.
   */
  loadCompletedStates?: () => Promise<WorldState[]>;
  completeRun?: (
    state: WorldState,
    newEvents: readonly SimulationEvent[],
  ) => Promise<void>;
}
