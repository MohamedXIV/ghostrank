import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { CommandResult } from "@/game/simulation/command-bus";
import type { WorldState } from "@/game/simulation/state/world-state";
import {
  deriveCompletedRunSummary,
  type CompletedRunSummary,
} from "@/game/simulation/systems/run-history";
import {
  createGameRuntime,
  type GameRuntime,
} from "@/game/runtime/game-runtime";
import type { RunPersistence } from "@/persistence/run-persistence";

export interface GameSession extends GameRuntime {
  /** Resolves once every queued save has settled, or rejects with the first failure. */
  flush: () => Promise<void>;
  history: () => Promise<CompletedRunSummary[]>;
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

  if (persistence && !restoredState) {
    await persistence.saveActiveState(runtime.snapshot(), []);
  }

  // Recovery path: if a prior/fallback write left the immutable terminal
  // snapshot in the active slot, finish the active→history move now. The
  // in-memory session intentionally remains ended for this boot; a later boot
  // sees no active slot and creates a fresh run separately.
  if (persistence?.completeRun && restoredState?.ending) {
    try {
      await persistence.completeRun(restoredState, []);
    } catch {
      // Atomic browser completion leaves the terminal active snapshot intact.
      // Keep the ended session visible and retry recovery on the next boot.
    }
  }

  let saveQueue: Promise<void> = Promise.resolve();
  // Absolute count of events the adapter has accepted. A failed save leaves it
  // behind, so the next save carries the unpersisted events again.
  let persistedEventCount = 0;
  // Absolute count of events a cursor-based reader (the clock) has consumed.
  let readCursor = 0;
  // A save is queued but has not taken its snapshot yet. Any command that lands
  // before that point is already in the snapshot, so it queues no second save.
  let saveQueued = false;

  /**
   * Drops events nothing still needs: every reader has read them and the adapter
   * has them. Without a persistence adapter only the reader matters.
   */
  const releaseConsumedEvents = () => {
    runtime.releaseEventsBefore(
      persistence
        ? Math.min(readCursor, persistedEventCount)
        : readCursor,
    );
  };

  const queueSave = () => {
    if (!persistence || saveQueued) {
      return;
    }

    saveQueued = true;
    saveQueue = saveQueue
      .catch(() => undefined)
      .then(async () => {
        saveQueued = false;

        const snapshot = runtime.snapshot();
        const totalEvents = runtime.eventCount();
        const newEvents: SimulationEvent[] = [
          ...runtime.eventsSince(persistedEventCount),
        ];

        if (snapshot.ending && persistence.completeRun) {
          try {
            await persistence.completeRun(snapshot, newEvents);
          } catch (error) {
            // Never let an archive failure resurrect the run after reload. If
            // the atomic move fails, persist the terminal snapshot back to the
            // active slot so boot recovery can try the archive again.
            await persistence.saveActiveState(snapshot, newEvents);
            throw error;
          }
        } else {
          await persistence.saveActiveState(snapshot, newEvents);
        }

        persistedEventCount = totalEvents;
        releaseConsumedEvents();
      });
  };

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

    eventCount() {
      return runtime.eventCount();
    },
    eventsSince(index: number) {
      // The index is the count the reader had consumed before this call. Events
      // before it are released now, so at most the batch just read is held until
      // the next call. The tail is copied before the release.
      readCursor = Math.max(readCursor, index);
      const tail = runtime.eventsSince(index);
      releaseConsumedEvents();

      return tail;
    },
    releaseEventsBefore(index: number) {
      runtime.releaseEventsBefore(index);
    },

    async flush() {
      await saveQueue;
    },

    async history() {
      await saveQueue;

      if (!persistence?.loadCompletedStates) {
        return [];
      }

      const states = await persistence.loadCompletedStates();
      return states.map(deriveCompletedRunSummary);
    },
  };
}
