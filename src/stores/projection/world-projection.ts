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

  store.transaction(() => {
    store.setTable("player", {
      current: {
        handle: projection.player.handle,
        rank: projection.player.rank,
      },
    });
    store.setTable("targets", targetRows);
    store.setCell("meta", "world", "worldMinute", projection.worldMinute);
  });
}
