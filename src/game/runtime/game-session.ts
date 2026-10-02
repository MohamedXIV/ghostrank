import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { CommandResult } from "@/game/simulation/command-bus";
import type { WorldState } from "@/game/simulation/state/world-state";
import {
  createGameRuntime,
  type GameRuntime,
} from "@/game/runtime/game-runtime";
import type { RunPersistence } from "@/persistence/run-persistence";

export interface GameSession extends GameRuntime {
  flush: () => Promise<void>;
}

interface CreateGameSessionOptions {
  initialState: WorldState;
  persistence?: RunPersistence | null;
}

export async function createGameSession({
  initialState,
  persistence = null,
}: CreateGameSessionOptions): Promise<GameSession> {
  const restoredState = persistence
    ? await persistence.loadActiveState()
    : null;
  const runtime = createGameRuntime(restoredState ?? initialState);

  let saveQueue: Promise<void> = Promise.resolve();
  let persistedEventCount = 0;

  const queueSave = () => {
    if (!persistence) {
      return;
    }

    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        const snapshot = runtime.snapshot();
        const allEvents = [...runtime.events()];
        const newEvents: SimulationEvent[] = allEvents.slice(
          persistedEventCount,
        );

        await persistence.saveActiveState(snapshot, newEvents);
        persistedEventCount = allEvents.length;
      });
  };

  if (persistence && !restoredState) {
    queueSave();
  }

  return {
    projection: runtime.projection,

    execute(command: SimulationCommand): CommandResult {
      const result = runtime.execute(command);

      if (result.ok) {
        queueSave();
      }

      return result;
    },

    snapshot() {
      return runtime.snapshot();
    },

    events() {
      return runtime.events();
    },

    async flush() {
      await saveQueue;
    },
  };
}
