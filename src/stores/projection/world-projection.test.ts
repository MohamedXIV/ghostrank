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
          compute: 6,
          memory: 6,
          vram: 0,
          storage: 2,
          network: 1,
        },
        actionMinutes: {
          survey: 12,
          inspect: 2,
          escalate: 1,
          disengage: 3,
        },
        discoveryScope: 6,
        actionDurationFactor: 0.595,
        activeModelId: "model-cloud-frontier",
        lease: {
          compute: 2,
          memory: 1,
          vram: 0,
          storage: 1,
          network: 0,
        },
        currentHousingId: "housing-rented-lab",
        dailyCost: 280,
        housing: [
          {
            id: "housing-cowork-loft",
            label: "Co-working Loft",
            dailyCost: 30,
            capability: {
              compute: 0,
              memory: 0,
              vram: 0,
              storage: 0,
              network: 2,
            },
            active: false,
          },
          {
            id: "housing-rented-lab",
            label: "Rented Lab Bench",
            dailyCost: 60,
            capability: {
              compute: 2,
              memory: 1,
              vram: 0,
              storage: 1,
              network: 0,
            },
            active: true,
          },
        ],
        software: {
          compute: 0,
          memory: 0,
          vram: 0,
          storage: 0,
          network: 0,
        },
        playerTools: {
          compute: 2,
          memory: 1,
          vram: 0,
          storage: 0,
          network: 0,
        },
        ownedMachineCapability: {
          compute: 4,
          memory: 3,
          vram: 0,
          storage: 2,
          network: 1,
        },
        softwareListings: [
          {
            id: "software-net-monitor",
            label: "Commercial Monitoring Suite",
            dailyCost: 40,
            capability: {
              compute: 0,
              memory: 0,
              vram: 0,
              storage: 0,
              network: 2,
            },
            discountFactor: null,
            active: false,
          },
          {
            id: "software-analysis-pipeline",
            label: "Optimized Analysis Pipeline",
            dailyCost: 100,
            capability: null,
            discountFactor: 0.85,
            active: true,
          },
        ],
        ownedTools: [
          {
            id: "tool:1",
            catalogId: "tool-ghost-loader",
            label: "Ghost Loader",
            author: "hexwidow",
            paidCost: 1200,
            resaleValue: 600,
            acquiredWorldMinute: 25,
            capability: {
              compute: 2,
              memory: 1,
              vram: 0,
              storage: 0,
              network: 0,
            },
            discountFactor: null,
          },
        ],
        toolListings: [
          {
            id: "tool-ghost-loader",
            label: "Ghost Loader",
            author: "hexwidow",
            cost: 1200,
            ownedCount: 1,
            capability: {
              compute: 2,
              memory: 1,
              vram: 0,
              storage: 0,
              network: 0,
            },
            discountFactor: null,
          },
          {
            id: "tool-silent-dedup",
            label: "Silent Dedup Daemon",
            author: "cipher-priest",
            cost: 900,
            ownedCount: 0,
            capability: null,
            discountFactor: 0.9,
          },
        ],
        ownedMachines: [
          {
            id: "machine:1",
            catalogId: "box-analysis-node",
            label: "vault-cracker",
            paidCost: 1_500,
            resaleValue: 750,
            acquiredWorldMinute: 40,
            capability: {
              compute: 4,
              memory: 3,
              vram: 0,
              storage: 2,
              network: 1,
            },
          },
        ],
        machineListings: [
          {
            id: "box-analysis-node",
            label: "Analysis Node",
            cost: 1_500,
            ownedCount: 1,
            capability: {
              compute: 4,
              memory: 3,
              vram: 0,
              storage: 2,
              network: 1,
            },
          },
          {
            id: "box-burner",
            label: "Burner Laptop",
            cost: 600,
            ownedCount: 0,
            capability: {
              compute: 1,
              memory: 1,
              vram: 0,
              storage: 1,
              network: 1,
            },
          },
        ],
        modelListings: [
          {
            id: "model-cloud-frontier",
            label: "Frontier Class API",
            source: "cloud",
            cost: 0,
            dailyCost: 120,
            factor: 0.7,
            // Cloud runs on the provider's hardware: no rig footprint, so no
            // contention — it delivers its advertised shortcut on any rig.
            deliveredFactor: 0.7,
            footprint: { vram: 0, storage: 0 },
            owned: false,
            running: true,
          },
          {
            id: "model-local-workhorse",
            label: "Quantized Workhorse 13B",
            source: "local",
            cost: 900,
            dailyCost: 0,
            factor: 0.9,
            // This fixture's rig has vram 0 / storage 2 against a 2/1
            // footprint: VRAM bottlenecks coverage to 0, so the starved local
            // model drifts to the no-model baseline of exactly 1.
            deliveredFactor: 1,
            footprint: { vram: 2, storage: 1 },
            owned: true,
            running: false,
          },
        ],
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
        valueGraph: {
          counterparties: 1,
          totalInflow: 0,
          totalOutflow: 400,
          net: -400,
          nodes: [
            {
              id: "market",
              kind: "institution",
              received: 0,
              paid: 400,
              net: -400,
              interactions: 1,
              firstWorldMinute: 30,
              lastWorldMinute: 30,
              causeKinds: ["hardware"],
            },
          ],
        },
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
    expect(store.getCell("meta", "wallet", "dailyCost")).toBe(280);
    expect(store.getCell("meta", "wallet", "currentHousingId")).toBe(
      "housing-rented-lab",
    );
    expect(store.getRow("rig", "capability")).toEqual({
      compute: 6,
      memory: 6,
      vram: 0,
      storage: 2,
      network: 1,
    });
    expect(store.getRow("rig", "actionMinutes")).toEqual({
      survey: 12,
      inspect: 2,
      escalate: 1,
      disengage: 3,
    });
    expect(store.getRow("rig", "scale")).toEqual({ discoveryScope: 6 });
    expect(store.getRow("rig", "lease")).toEqual({
      compute: 2,
      memory: 1,
      vram: 0,
      storage: 1,
      network: 0,
    });
    expect(store.getRow("rig", "softwareLift")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(store.getRow("rig", "playerToolLift")).toEqual({
      compute: 2,
      memory: 1,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(store.getRow("rig", "machineLift")).toEqual({
      compute: 4,
      memory: 3,
      vram: 0,
      storage: 2,
      network: 1,
    });
    expect(store.getRow("rig", "assistant")).toEqual({
      modelId: "model-cloud-frontier",
      factor: 0.595,
    });
    expect(store.getTable("modelListings")).toEqual({
      "model-cloud-frontier": {
        label: "Frontier Class API",
        source: "cloud",
        cost: 0,
        dailyCost: 120,
        factor: 0.7,
        deliveredFactor: 0.7,
        vram: 0,
        storage: 0,
        owned: false,
        running: true,
      },
      "model-local-workhorse": {
        label: "Quantized Workhorse 13B",
        source: "local",
        cost: 900,
        dailyCost: 0,
        factor: 0.9,
        deliveredFactor: 1,
        vram: 2,
        storage: 1,
        owned: true,
        running: false,
      },
    });
    expect(store.getTable("ownedMachines")).toEqual({
      "machine:1": {
        catalogId: "box-analysis-node",
        label: "vault-cracker",
        paidCost: 1_500,
        resaleValue: 750,
        acquiredWorldMinute: 40,
        compute: 4,
        memory: 3,
        vram: 0,
        storage: 2,
        network: 1,
      },
    });
    expect(store.getTable("machineListings")).toEqual({
      "box-analysis-node": {
        label: "Analysis Node",
        cost: 1_500,
        ownedCount: 1,
        compute: 4,
        memory: 3,
        vram: 0,
        storage: 2,
        network: 1,
      },
      "box-burner": {
        label: "Burner Laptop",
        cost: 600,
        ownedCount: 0,
        compute: 1,
        memory: 1,
        vram: 0,
        storage: 1,
        network: 1,
      },
    });
    expect(store.getTable("ownedTools")).toEqual({
      "tool:1": {
        catalogId: "tool-ghost-loader",
        label: "Ghost Loader",
        author: "hexwidow",
        paidCost: 1200,
        resaleValue: 600,
        acquiredWorldMinute: 25,
        compute: 2,
        memory: 1,
        vram: 0,
        storage: 0,
        network: 0,
        discountFactor: 1,
      },
    });
    expect(store.getTable("toolListings")).toEqual({
      "tool-ghost-loader": {
        label: "Ghost Loader",
        author: "hexwidow",
        cost: 1200,
        ownedCount: 1,
        compute: 2,
        memory: 1,
        vram: 0,
        storage: 0,
        network: 0,
        discountFactor: 1,
      },
      "tool-silent-dedup": {
        label: "Silent Dedup Daemon",
        author: "cipher-priest",
        cost: 900,
        ownedCount: 0,
        compute: 0,
        memory: 0,
        vram: 0,
        storage: 0,
        network: 0,
        discountFactor: 0.9,
      },
    });
    expect(store.getTable("software")).toEqual({
      "software-net-monitor": {
        label: "Commercial Monitoring Suite",
        dailyCost: 40,
        compute: 0,
        memory: 0,
        vram: 0,
        storage: 0,
        network: 2,
        discountFactor: 1,
        active: false,
      },
      "software-analysis-pipeline": {
        label: "Optimized Analysis Pipeline",
        dailyCost: 100,
        compute: 0,
        memory: 0,
        vram: 0,
        storage: 0,
        network: 0,
        discountFactor: 0.85,
        active: true,
      },
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
    expect(store.getTable("valueNodes")).toEqual({
      market: {
        kind: "institution",
        received: 0,
        paid: 400,
        net: -400,
        interactions: 1,
        firstWorldMinute: 30,
        lastWorldMinute: 30,
        causeKinds: "hardware",
      },
    });
    expect(store.getCell("meta", "wallet", "valueInflow")).toBe(0);
    expect(store.getCell("meta", "wallet", "valueOutflow")).toBe(400);
    expect(store.getCell("meta", "wallet", "valueCounterparties")).toBe(1);
    expect(store.getTable("housing")).toEqual({
      "housing-cowork-loft": {
        label: "Co-working Loft",
        dailyCost: 30,
        compute: 0,
        memory: 0,
        vram: 0,
        storage: 0,
        network: 2,
        active: false,
      },
      "housing-rented-lab": {
        label: "Rented Lab Bench",
        dailyCost: 60,
        compute: 2,
        memory: 1,
        vram: 0,
        storage: 1,
        network: 0,
        active: true,
      },
    });
  });
});
