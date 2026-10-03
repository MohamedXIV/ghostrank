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
      operation: {
        targetId: "ghost",
        stage: "intrusive",
        openedWorldMinute: 10,
        escalatedWorldMinute: 40,
      },
      footprint: {
        score: 3,
        level: "elevated",
        traceCount: 1,
      },
      reactions: [
        {
          id: "reaction:1",
          targetId: "ghost",
          kind: "defensive-watch",
          status: "active",
          sourceTraceIds: ["trace:1"],
          footprintScore: 5,
          triggeredWorldMinute: 45,
        },
      ],
      descriptors: [],
      underground: {
        board: [],
        feed: [],
        stances: [],
        inbox: { messages: [], unread: 0 },
        contracts: [],
        retaliations: [],
        forum: [],
      },
      economy: {
        credits: 320,
        capability: {
          compute: 4,
          memory: 5,
          vram: 0,
          storage: 1,
          network: 1,
        },
        hardware: [
          {
            id: "hw:1",
            catalogId: "rig-starter",
            label: "Secondhand Workstation",
            category: "workstation",
            acquiredWorldMinute: 0,
          },
          {
            id: "hw:2",
            catalogId: "cpu-overclock",
            label: "Overclocked CPU",
            category: "cpu",
            acquiredWorldMinute: 30,
          },
        ],
        catalog: [
          {
            id: "cpu-overclock",
            label: "Overclocked CPU",
            category: "cpu",
            cost: 400,
            capability: {
              compute: 3,
              memory: 0,
              vram: 0,
              storage: 0,
              network: 0,
            },
            owned: 1,
          },
        ],
        ledger: [
          {
            id: "value:2",
            worldMinute: 30,
            direction: "debit",
            amount: 400,
            balanceAfter: 320,
            causeKind: "hardware",
            causeId: "hw:2",
            counterparty: "market",
          },
        ],
      },
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
    expect(store.getTable("operation")).toEqual({
      active: {
        targetId: "ghost",
        stage: "intrusive",
        openedWorldMinute: 10,
        escalatedWorldMinute: 40,
      },
    });
    expect(store.getTable("footprint")).toEqual({
      current: {
        score: 3,
        level: "elevated",
        traceCount: 1,
      },
    });
    expect(store.getTable("reactions")).toEqual({
      "reaction:1": {
        targetId: "ghost",
        kind: "defensive-watch",
        status: "active",
        sourceTraceIds: "trace:1",
        footprintScore: 5,
        triggeredWorldMinute: 45,
      },
    });
    expect(store.getCell("meta", "world", "worldMinute")).toBe(45);
    expect(store.getCell("meta", "wallet", "credits")).toBe(320);
    expect(store.getRow("rig", "capability")).toEqual({
      compute: 4,
      memory: 5,
      vram: 0,
      storage: 1,
      network: 1,
    });
    expect(store.getTable("hardware")).toEqual({
      "hw:1": {
        catalogId: "rig-starter",
        label: "Secondhand Workstation",
        category: "workstation",
        acquiredWorldMinute: 0,
      },
      "hw:2": {
        catalogId: "cpu-overclock",
        label: "Overclocked CPU",
        category: "cpu",
        acquiredWorldMinute: 30,
      },
    });
    expect(store.getTable("catalog")).toEqual({
      "cpu-overclock": {
        label: "Overclocked CPU",
        category: "cpu",
        cost: 400,
        compute: 3,
        memory: 0,
        vram: 0,
        storage: 0,
        network: 0,
        owned: 1,
      },
    });
    expect(store.getTable("ledger")).toEqual({
      "value:2": {
        worldMinute: 30,
        direction: "debit",
        amount: 400,
        balanceAfter: 320,
        causeKind: "hardware",
        causeId: "hw:2",
        counterparty: "market",
      },
    });
  });
});
