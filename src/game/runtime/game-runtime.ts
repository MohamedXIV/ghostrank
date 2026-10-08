import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { CommandBus, type CommandResult } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { WorldState } from "@/game/simulation/state/world-state";
import {
  createWorldProjectionStore,
  syncWorldProjection,
  type WorldProjectionStore,
} from "@/stores/projection/world-projection";

export interface GameRuntime {
  readonly projection: WorldProjectionStore;
  execute: (command: SimulationCommand) => CommandResult;
  snapshot: () => WorldState;
  /** Number of events recorded so far, counted from the start of the run. */
  eventCount: () => number;
  /**
   * Events recorded at or after `index`, by the absolute count above. Copies only
   * the new tail. An index before the released boundary yields the retained tail.
   */
  eventsSince: (index: number) => readonly SimulationEvent[];
  /**
   * Drops events before `index` once every reader has consumed them, so the log
   * holds only what is still needed. Absolute indices are unaffected.
   */
  releaseEventsBefore: (index: number) => void;
}

export function createGameRuntime(initialState: WorldState): GameRuntime {
  const bus = new CommandBus(initialState);
  const projection = createWorldProjectionStore();
  // Held events are absolute indices [released, total). Readers pass absolute
  // counts, so releasing consumed events never shifts a cursor.
  const eventLog: SimulationEvent[] = [];
  let released = 0;
  let total = 0;

  const sync = () => {
    syncWorldProjection(projection, projectWorld(bus.snapshot()));
  };

  sync();

  return {
    projection,

    execute(command) {
      const result = bus.execute(command);

      if (result.ok) {
        eventLog.push(...result.events);
        total += result.events.length;
        sync();
      }

      return result;
    },

    snapshot() {
      return bus.snapshot();
    },

    eventCount() {
      return total;
    },

    eventsSince(index) {
      return structuredClone(eventLog.slice(Math.max(0, index - released)));
    },

    releaseEventsBefore(index) {
      const upTo = Math.min(Math.max(index, released), total);
      const drop = upTo - released;

      if (drop > 0) {
        eventLog.splice(0, drop);
        released = upTo;
      }
    },
  };
}
