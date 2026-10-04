import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  MACHINE_CATALOG,
  MACHINE_LABEL_MAX_LENGTH,
  MACHINE_RESALE_RATE,
  findMachineItem,
  machineCapabilityOf,
  machineResaleValue,
} from "@/content/machine-catalog";
import { deriveMachineCapability } from "@/game/simulation/systems/hardware";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { FENCE_COUNTERPARTY } from "@/content/player-tool-catalog";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

const BURNER = "box-burner";
const NODE = "box-analysis-node";
const CLUSTER = "box-attack-cluster";
const DAY_MINUTES = 24 * 60;

function stateWithCredits(credits: number): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  return state;
}

function machineMovements(
  events: SimulationEvent[],
): Extract<SimulationEvent, { type: "ValueTransferred" }>[] {
  return events.filter(
    (event): event is Extract<SimulationEvent, { type: "ValueTransferred" }> =>
      event.type === "ValueTransferred" && event.causeKind === "machine",
  );
}

describe("machine catalog", () => {
  it("lists complete named boxes with one-time costs and capability", () => {
    expect(MACHINE_CATALOG.length).toBeGreaterThan(1);

    for (const item of MACHINE_CATALOG) {
      expect(item.id.startsWith("box-")).toBe(true);
      expect(item.cost).toBeGreaterThan(0);
      for (const value of Object.values(item.capability)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("findMachineItem resolves listings and skips unknown ids", () => {
    expect(findMachineItem(NODE)?.label).toBe("Analysis Node");
    expect(findMachineItem("box-nonexistent")).toBeUndefined();
    expect(machineCapabilityOf("box-nonexistent")).toBeNull();
  });

  it("resale is a fraction of the actually-paid price", () => {
    expect(MACHINE_RESALE_RATE).toBeGreaterThan(0);
    expect(MACHINE_RESALE_RATE).toBeLessThanOrEqual(1);
    expect(machineResaleValue(1_000)).toBe(Math.floor(1_000 * MACHINE_RESALE_RATE));
    // Odd prices floor to a whole credit, so a resale never produces a
    // fractional balance.
    expect(machineResaleValue(101)).toBe(Math.floor(101 * MACHINE_RESALE_RATE));
  });

  it("an empty rack is identity: zero machine lift", () => {
    expect(deriveMachineCapability(stateWithCredits(0).economy)).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });
});

describe("buying a machine", () => {
  it("charges the market once and adds a named box with its paid price", () => {
    const bus = new CommandBus(stateWithCredits(2_000));

    const result = bus.execute({ type: "buyMachine", catalogId: NODE });

    expect(result.ok).toBe(true);
    const debits = machineMovements(result.events);
    expect(debits).toHaveLength(1);
    expect(debits[0].direction).toBe("debit");
    expect(debits[0].amount).toBe(1_500);
    expect(debits[0].causeId).toBe(NODE);
    expect(debits[0].counterparty).toBe("market");
    expect(result.events).toContainEqual({
      type: "MachineAcquired",
      machineId: "machine:1",
      catalogId: NODE,
      label: "Analysis Node",
      cost: 1_500,
      worldMinute: 0,
    });

    const world = bus.snapshot();
    expect(world.economy.credits).toBe(500);
    expect(world.economy.ownedMachines).toEqual([
      {
        id: "machine:1",
        catalogId: NODE,
        label: "Analysis Node",
        paidCost: 1_500,
        acquiredWorldMinute: 0,
      },
    ]);
  });

  it("rejects unknown machines and unaffordable buys without moving money", () => {
    const bus = new CommandBus(stateWithCredits(400));

    expect(
      bus.execute({ type: "buyMachine", catalogId: "box-nope" }).error,
    ).toBe("MACHINE_NOT_FOUND");

    const denied = bus.execute({ type: "buyMachine", catalogId: CLUSTER });
    expect(denied.ok).toBe(false);
    expect(denied.error).toBe("INSUFFICIENT_CREDITS");
    expect(denied.events).toEqual([]);
    expect(bus.snapshot().economy.credits).toBe(400);
    expect(bus.snapshot().economy.ownedMachines).toEqual([]);
  });

  it("multiple machines stack — the rack multiplies capability", () => {
    const bus = new CommandBus(stateWithCredits(5_000));
    bus.execute({ type: "buyMachine", catalogId: NODE }); // c4 m3 st2 net1
    bus.execute({ type: "buyMachine", catalogId: BURNER }); // c1 m1 st1 net1

    const lift = deriveMachineCapability(bus.snapshot().economy);
    expect(lift).toEqual({
      compute: 5,
      memory: 4,
      vram: 0,
      storage: 3,
      network: 2,
    });
  });

  it("ids stay unique across a buy/sell/rebuy cycle", () => {
    const bus = new CommandBus(stateWithCredits(6_000));
    bus.execute({ type: "buyMachine", catalogId: BURNER }); // machine:1
    const second = bus.execute({ type: "buyMachine", catalogId: NODE }); // machine:2
    expect(second.ok).toBe(true);
    bus.execute({ type: "sellMachine", machineId: "machine:1" });

    const third = bus.execute({ type: "buyMachine", catalogId: CLUSTER });
    expect(third.ok).toBe(true);
    const owned = bus.snapshot().economy.ownedMachines.map((box) => box.id);
    expect(owned).toEqual(["machine:2", "machine:3"]);
  });
});

describe("selling a machine", () => {
  it("removes the box, credits the fence, and drops its lift", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });

    const result = bus.execute({ type: "sellMachine", machineId: "machine:1" });

    expect(result.ok).toBe(true);
    const proceeds = machineMovements(result.events);
    expect(proceeds).toHaveLength(1);
    expect(proceeds[0].direction).toBe("credit");
    expect(proceeds[0].amount).toBe(machineResaleValue(1_500));
    expect(proceeds[0].causeId).toBe(NODE);
    expect(proceeds[0].counterparty).toBe(FENCE_COUNTERPARTY);
    expect(result.events).toContainEqual({
      type: "MachineSold",
      machineId: "machine:1",
      catalogId: NODE,
      label: "Analysis Node",
      proceeds: machineResaleValue(1_500),
      worldMinute: 0,
    });

    const world = bus.snapshot();
    expect(world.economy.ownedMachines).toEqual([]);
    expect(world.economy.credits).toBe(500 + machineResaleValue(1_500));
    expect(deriveMachineCapability(world.economy).compute).toBe(0);
  });

  it("resale values the paid price, not the current catalog price", () => {
    // Simulate a save whose paidCost differs from the catalog's current cost.
    const state = stateWithCredits(2_000);
    state.economy.ownedMachines = [
      {
        id: "machine:1",
        catalogId: BURNER,
        label: "Burner Laptop",
        paidCost: 500, // historic price
        acquiredWorldMinute: 0,
      },
    ];
    const bus = new CommandBus(state);

    const sold = bus.execute({ type: "sellMachine", machineId: "machine:1" });
    const credit = machineMovements(sold.events)[0];

    expect(credit.amount).toBe(machineResaleValue(500));
    expect(credit.amount).not.toBe(
      machineResaleValue(findMachineItem(BURNER)!.cost),
    );
  });

  it("refuses to sell a machine the player does not own", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: BURNER });

    expect(
      bus.execute({ type: "sellMachine", machineId: "machine:99" }).error,
    ).toBe("MACHINE_NOT_OWNED");
  });
});

describe("renaming a machine", () => {
  it("stores the trimmed label and proves the capability never moved", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });
    const before = deriveMachineCapability(bus.snapshot().economy);

    const result = bus.execute({
      type: "renameMachine",
      machineId: "machine:1",
      label: "  vault-cracker  ",
    });

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({
      type: "MachineRenamed",
      machineId: "machine:1",
      label: "vault-cracker",
      worldMinute: 0,
    });

    const owned = bus.snapshot().economy.ownedMachines[0];
    expect(owned.label).toBe("vault-cracker");
    // A name is identity, not power: catalogId and lift are untouched.
    expect(owned.catalogId).toBe(NODE);
    expect(deriveMachineCapability(bus.snapshot().economy)).toEqual(before);
  });

  it("rejects an empty or over-long label and an unowned box", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: BURNER });

    expect(
      bus.execute({ type: "renameMachine", machineId: "machine:1", label: "   " })
        .error,
    ).toBe("INVALID_MACHINE_LABEL");
    expect(
      bus.execute({
        type: "renameMachine",
        machineId: "machine:1",
        label: "x".repeat(MACHINE_LABEL_MAX_LENGTH + 1),
      }).error,
    ).toBe("INVALID_MACHINE_LABEL");
    expect(
      bus.execute({ type: "renameMachine", machineId: "machine:9", label: "ok" })
        .error,
    ).toBe("MACHINE_NOT_OWNED");

    // A failed rename left the original label untouched.
    expect(bus.snapshot().economy.ownedMachines[0].label).toBe(
      findMachineItem(BURNER)!.label,
    );

    // The valid boundary still works, and the stored label is exactly the
    // max-length name.
    expect(
      bus.execute({
        type: "renameMachine",
        machineId: "machine:1",
        label: "x".repeat(MACHINE_LABEL_MAX_LENGTH),
      }).ok,
    ).toBe(true);
    expect(bus.snapshot().economy.ownedMachines[0].label).toBe(
      "x".repeat(MACHINE_LABEL_MAX_LENGTH),
    );
  });
});

describe("machines have no upkeep", () => {
  it("a whole day of waiting bills nothing for owned machines", () => {
    const bus = new CommandBus(stateWithCredits(5_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });

    const wait = bus.execute({ type: "advanceTime", minutes: 3 * DAY_MINUTES });

    expect(machineMovements(wait.events)).toHaveLength(0);
    expect(
      wait.events.some(
        (event) => event.type === "ValueTransferred" && event.direction === "debit",
      ),
    ).toBe(false);
    expect(bus.snapshot().economy.credits).toBe(3_500);
  });

  it("the projection reports zero daily cost when only machines are held", () => {
    const bus = new CommandBus(stateWithCredits(5_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });
    bus.execute({ type: "buyMachine", catalogId: BURNER });

    expect(projectWorld(bus.snapshot()).economy.dailyCost).toBe(0);
  });
});

describe("machines flow through rig speed and scale", () => {
  it("a machine widens discovery like a component does", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: NODE }); // memory +3
    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });

    // starter memory 1 + node 3 = 4, but the slice target has two machines,
    // so one survey pass discovers them both.
    const result = bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    expect(
      result.events.filter((event) => event.type === "MachineObserved"),
    ).toHaveLength(2);
    expect(projectWorld(bus.snapshot()).economy.discoveryScope).toBe(4);
  });

  it("a burner box shortens survey through the network axis", () => {
    const bus = new CommandBus(stateWithCredits(1_000));
    bus.execute({ type: "buyMachine", catalogId: BURNER }); // network +1

    // starter network 1 + burner 1 = 2, so survey 12 → ceil(12 / 2) = 6.
    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.actionMinutes.survey).toBe(6);
    // compute stays at baseline 2 (starter 1 + burner 1 is above 1): inspect
    // 8 → ceil(8 * 1 / 2) = 4.
    expect(economy.actionMinutes.inspect).toBe(4);
  });

  it("effectiveCapability folds machines under lease, licenses and tools", () => {
    const state = stateWithCredits(5_000);
    state.economy.hardware.push({
      id: "hw:2",
      catalogId: "cpu-overclock", // component: compute +3
      acquiredWorldMinute: 0,
    });
    state.economy.housing = "housing-cowork-loft"; // network +2
    state.economy.software = ["software-net-monitor"]; // network +2
    state.economy.playerTools = [
      {
        id: "tool:1",
        catalogId: "tool-paranoid-scraper",
        author: "nullbyte",
        paidCost: 500,
        acquiredWorldMinute: 0,
      }, // network +1, memory +1
    ];
    state.economy.ownedMachines = [
      {
        id: "machine:1",
        catalogId: NODE,
        label: "Analysis Node",
        paidCost: 1_500,
        acquiredWorldMinute: 0,
      }, // compute +4, memory +3, storage +2, network +1
    ];

    // compute: starter 1 + component 3 + machine 4 = 8
    expect(effectiveCapability(state.economy).compute).toBe(8);
    // network: starter 1 + lease 2 + license 2 + tool 1 + machine 1 = 7
    expect(effectiveCapability(state.economy).network).toBe(7);
    // memory: starter 1 + tool 1 + machine 3 = 5
    expect(effectiveCapability(state.economy).memory).toBe(5);
  });

  it("selling a machine returns durations and scope to the baseline", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });
    expect(projectWorld(bus.snapshot()).economy.discoveryScope).toBe(4);

    bus.execute({ type: "sellMachine", machineId: "machine:1" });

    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.discoveryScope).toBe(1);
    expect(economy.actionMinutes.survey).toBe(12);
    expect(economy.ownedMachineCapability).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });
});

describe("machine persistence", () => {
  it("round-trips owned boxes with their labels and paid prices intact", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 30,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
      economy: {
        credits: 100,
        ledger: [
          {
            id: "value:1",
            worldMinute: 30,
            direction: "debit",
            amount: 1_500,
            balanceAfter: 100,
            cause: { kind: "machine", id: NODE },
            counterparty: "market",
          },
        ],
        hardware: [],
        housing: null,
        software: [],
        playerTools: [],
        ownedMachines: [
          {
            id: "machine:1",
            catalogId: NODE,
            label: "vault-cracker",
            paidCost: 1_500,
            acquiredWorldMinute: 30,
          },
        ],
      },
    });

    expect(parsed.economy.ownedMachines).toHaveLength(1);
    expect(parsed.economy.ownedMachines[0]).toMatchObject({
      label: "vault-cracker",
      paidCost: 1_500,
    });
    expect(parsed.economy.ledger[0].cause).toEqual({ kind: "machine", id: NODE });
  });

  it("a legacy economy without ownedMachines loads as an empty rack", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
      economy: {
        credits: 0,
        ledger: [],
        hardware: [],
        housing: null,
        software: [],
      },
    });

    expect(parsed.economy.ownedMachines).toEqual([]);
  });

  it("rejects a non-array ownedMachines list and a malformed box", () => {
    const base = {
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
    };

    expect(
      worldStateSchema.safeParse({
        ...base,
        economy: {
          credits: 0,
          ledger: [],
          hardware: [],
          housing: null,
          software: [],
          ownedMachines: NODE,
        },
      }).success,
    ).toBe(false);

    expect(
      worldStateSchema.safeParse({
        ...base,
        economy: {
          credits: 0,
          ledger: [],
          hardware: [],
          housing: null,
          software: [],
          ownedMachines: [{ id: "machine:1", catalogId: NODE }],
        },
      }).success,
    ).toBe(false);
  });

  it("a save→load round-trip preserves a buy/rename/sell history byte-for-byte", () => {
    const bus = new CommandBus(stateWithCredits(5_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });
    bus.execute({ type: "renameMachine", machineId: "machine:1", label: "big-box" });
    bus.execute({ type: "buyMachine", catalogId: BURNER });
    bus.execute({ type: "sellMachine", machineId: "machine:2" });
    bus.execute({ type: "buyMachine", catalogId: CLUSTER });

    const snapshot = bus.snapshot();
    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(snapshot)),
    ) as WorldState;

    expect(restored.economy.ownedMachines).toEqual(
      snapshot.economy.ownedMachines,
    );
    expect(restored.economy.credits).toBe(snapshot.economy.credits);
    expect(restored.economy.ledger).toEqual(snapshot.economy.ledger);
  });
});

describe("machine projection", () => {
  it("surfaces an empty rack and full listings by default", () => {
    const economy = projectWorld(createSliceWorldState()).economy;
    expect(economy.ownedMachines).toEqual([]);
    expect(economy.machineListings).toHaveLength(MACHINE_CATALOG.length);
    expect(economy.ownedMachineCapability).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });

  it("shows the player's chosen label with resale value and owned counts", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyMachine", catalogId: NODE });
    bus.execute({ type: "renameMachine", machineId: "machine:1", label: "desk-2" });

    const economy = projectWorld(bus.snapshot()).economy;

    const owned = economy.ownedMachines.find((box) => box.id === "machine:1");
    expect(owned?.label).toBe("desk-2");
    expect(owned?.paidCost).toBe(1_500);
    expect(owned?.resaleValue).toBe(machineResaleValue(1_500));
    expect(owned?.capability?.compute).toBe(4);

    const listing = economy.machineListings.find((box) => box.id === NODE);
    expect(listing?.ownedCount).toBe(1);
    expect(listing?.label).toBe("Analysis Node");
  });
});

describe("machines through the runtime", () => {
  it("syncs ownedMachines + listings + lift through TinyBase", () => {
    const runtime = createGameRuntime(stateWithCredits(2_000));

    expect(runtime.projection.getRow("rig", "machineLift")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });

    runtime.execute({ type: "buyMachine", catalogId: NODE });

    expect(
      runtime.projection.getCell("ownedMachines", "machine:1", "catalogId"),
    ).toBe(NODE);
    expect(
      runtime.projection.getRow("rig", "machineLift"),
    ).toMatchObject({ compute: 4, memory: 3 });
    expect(
      runtime.projection.getCell("machineListings", NODE, "ownedCount"),
    ).toBe(1);

    runtime.execute({ type: "renameMachine", machineId: "machine:1", label: "lab" });
    expect(
      runtime.projection.getCell("ownedMachines", "machine:1", "label"),
    ).toBe("lab");

    runtime.execute({ type: "sellMachine", machineId: "machine:1" });

    expect(runtime.projection.getRow("rig", "machineLift")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(
      runtime.projection.getCell("machineListings", NODE, "ownedCount"),
    ).toBe(0);
  });
});
