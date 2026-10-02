import { createStore, type Store } from "tinybase";

import type { WorldProjection } from "@/game/simulation/projection/project-world";

export type WorldProjectionStore = Store;

export function createWorldProjectionStore(): WorldProjectionStore {
  return createStore();
}

export function syncWorldProjection(
  store: WorldProjectionStore,
  projection: WorldProjection,
): void {
  const targetRows = Object.fromEntries(
    projection.targets.map((target) => [
      target.id,
      {
        handle: target.handle,
        rank: target.rank,
        known: target.known,
      },
    ]),
  );

  const machineRows = Object.fromEntries(
    projection.machines.map((machine) => [
      machine.id,
      {
        targetId: machine.targetId,
        label: machine.label,
        role: machine.role,
      },
    ]),
  );

  const serviceRows = Object.fromEntries(
    projection.services.map((service) => [
      service.id,
      {
        targetId: service.targetId,
        machineId: service.machineId,
        label: service.label,
        kind: service.kind,
        state: service.state,
      },
    ]),
  );

  store.transaction(() => {
    store.setTable("player", {
      current: {
        handle: projection.player.handle,
        rank: projection.player.rank,
      },
    });
    store.setTable("targets", targetRows);
    store.setTable("machines", machineRows);
    store.setTable("services", serviceRows);

    if (projection.operation) {
      store.setTable("operation", {
        active: {
          targetId: projection.operation.targetId,
          stage: projection.operation.stage,
          openedWorldMinute: projection.operation.openedWorldMinute,
          ...(projection.operation.escalatedWorldMinute === undefined
            ? {}
            : {
                escalatedWorldMinute:
                  projection.operation.escalatedWorldMinute,
              }),
        },
      });
    } else {
      store.setTable("operation", {});
    }

    store.setCell("meta", "world", "worldMinute", projection.worldMinute);
  });
}
