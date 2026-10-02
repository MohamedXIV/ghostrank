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
  events: () => readonly SimulationEvent[];
}

export function createGameRuntime(initialState: WorldState): GameRuntime {
  const bus = new CommandBus(initialState);
  const projection = createWorldProjectionStore();
  const eventLog: SimulationEvent[] = [];

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
        sync();
      }

      return result;
    },

    snapshot() {
      return bus.snapshot();
    },

    events() {
      return structuredClone(eventLog);
    },
  };
}
