import { describe, expect, it } from "vitest";

import type { WorldProjection } from "@/game/simulation/projection/project-world";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

describe("world projection store", () => {
  it("stores only the player-visible projection", () => {
    const store = createWorldProjectionStore();
    const projection: WorldProjection = {
      worldMinute: 45,
      player: {
        handle: "CobaltXZ",
        rank: 100_256,
      },
      targets: [
        {
          id: "ghost",
          handle: "ghost",
          rank: 73_122,
          known: true,
        },
      ],
    };

    syncWorldProjection(store, projection);

    expect(store.getTable("player")).toEqual({
      current: {
        handle: "CobaltXZ",
        rank: 100_256,
      },
    });
    expect(store.getTable("targets")).toEqual({
      ghost: {
        handle: "ghost",
        rank: 73_122,
        known: true,
      },
    });
    expect(store.getCell("meta", "world", "worldMinute")).toBe(45);
  });
});
