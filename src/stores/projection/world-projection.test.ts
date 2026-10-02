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
      machines: [
        {
          id: "ghost-relay",
          targetId: "ghost",
          label: "Relay",
          role: "relay",
        },
      ],
      services: [
        {
          id: "ghost-signal",
          targetId: "ghost",
          machineId: "ghost-relay",
          label: "Signal",
          kind: "signal",
          state: "online",
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
    expect(store.getTable("machines")).toEqual({
      "ghost-relay": {
        targetId: "ghost",
        label: "Relay",
        role: "relay",
      },
    });
    expect(store.getTable("services")).toEqual({
      "ghost-signal": {
        targetId: "ghost",
        machineId: "ghost-relay",
        label: "Signal",
        kind: "signal",
        state: "online",
      },
    });
    expect(store.getCell("meta", "world", "worldMinute")).toBe(45);
  });
});
