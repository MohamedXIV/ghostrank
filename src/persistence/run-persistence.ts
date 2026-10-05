import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

export interface RunPersistence {
  loadActiveState: () => Promise<WorldState | null>;
  saveActiveState: (
    state: WorldState,
    newEvents: readonly SimulationEvent[],
  ) => Promise<void>;

  /**
   * Phase 7 P4 — optional completed-run history boundary.
   *
   * Browser persistence implements both methods. The deferred desktop adapter
   * may keep only the terminal active snapshot until Phase 10 / #19 reconciles
   * native history storage; ending eligibility never depends on archive support.
   */
  loadCompletedStates?: () => Promise<WorldState[]>;
  completeRun?: (
    state: WorldState,
    newEvents: readonly SimulationEvent[],
  ) => Promise<void>;
}
