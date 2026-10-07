import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";
import type { SaveDiagnosticError } from "@/persistence/save-diagnostics";

export type ActiveRunInspectResult =
  | { status: "empty" }
  | { status: "valid"; state: WorldState }
  | { status: "diagnostic_error"; error: SaveDiagnosticError; rawContent?: string };

export interface RunPersistence {
  loadActiveState: () => Promise<WorldState | null>;
  saveActiveState: (
    state: WorldState,
    newEvents: readonly SimulationEvent[],
  ) => Promise<void>;

  /**
   * Non-destructive inspection of the active run slot.
   * Allows distinguishing between empty, valid, or corrupt/incompatible save.
   */
  inspectActiveRun?: () => Promise<ActiveRunInspectResult>;

  /**
   * Safely archives a corrupt active run to a recovery slot without destroying it,
   * clearing the active slot so a fresh run can be started cleanly.
   */
  archiveCorruptActiveRun?: (diagnostic: SaveDiagnosticError) => Promise<void>;

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

