import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

export interface RunPersistence {
  loadActiveState: () => Promise<WorldState | null>;
  saveActiveState: (
    state: WorldState,
    newEvents: readonly SimulationEvent[],
  ) => Promise<void>;
}
