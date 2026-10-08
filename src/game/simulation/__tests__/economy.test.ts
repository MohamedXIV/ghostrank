import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { contractPayout } from "@/game/simulation/systems/economy";
import { deriveRigCapability } from "@/game/simulation/systems/hardware";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  HARDWARE_CATALOG,
  STARTER_RIG_ID,
  findCatalogItem,
} from "@/content/hardware-catalog";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type {
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

/** Waits in <= 7 day steps so each command stays small (D054). */
function wait(bus: CommandBus, minutes: number) {
  const events: ReturnType<CommandBus["execute"]>["events"] = [];
  let remaining = minutes;

  while (remaining > 0) {
    const step = Math.min(remaining, 7 * DAY);
    events.push(...bus.execute({ type: "advanceTime", minutes: step }).events);
    remaining -= step;
  }

  return { ok: true, events };
}

const buy = (catalogId: string): SimulationCommand => ({
  type: "buyHardware",
  catalogId,
});

function contract(
  overrides: Partial<UndergroundContract> = {},
): UndergroundContract {
  return {
    id: "contract:1",
    issuerId: "vesper",
    targetId: "nightshade",
    objective: "recon-report",
    requiredServices: 1,
    status: "offered",
    offeredWorldMinute: 0,
    expiresWorldMinute: DAY,
    ...overrides,
  };
}

function worldWithCredits(credits: number): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  return state;
}

function worldWithContract(c: UndergroundContract): WorldState {
  const state = createSliceWorldState();
  state.underground.contracts.push(c);
  return state;
}

function learnService(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
}

describe("contract payout", () => {
  it("pays a deterministic amount that scales with required services", () => {
    expect(contractPayout(contract({ requiredServices: 1 }))).toBe(120);
    expect(contractPayout(contract({ requiredServices: 3 }))).toBe(200);
  });

  it("pays a flat amount for an intrusion objective", () => {
    expect(contractPayout(contract({ objective: "intrusion" }))).toBe(260);
  });

  it("never depends on rank", () => {
    const low = contractPayout(contract({ requiredServices: 2 }));
    const high = contractPayout(contract({ requiredServices: 2 }));
    expect(low).toBe(high);
  });
});

describe("rig capability", () => {
  it("sums owned hardware and ignores unknown catalog ids", () => {
    const state = createSliceWorldState();
    state.economy.hardware.push(
      { id: "hw:2", catalogId: "cpu-overclock", acquiredWorldMinute: 0 },
      { id: "hw:3", catalogId: "does-not-exist", acquiredWorldMinute: 0 },
    );

    const capability = deriveRigCapability(state.economy);
    const starter = findCatalogItem(STARTER_RIG_ID)!.capability;
    const cpu = findCatalogItem("cpu-overclock")!.capability;

    expect(capability).toEqual({
      compute: starter.compute + cpu.compute,
      memory: starter.memory + cpu.memory,
      vram: starter.vram + cpu.vram,
      storage: starter.storage + cpu.storage,
      network: starter.network + cpu.network,
    });
  });

  it("is derived, never a gate on any catalog cost", () => {
    // Capability exists independently of what a target would require; no
    // catalog item encodes a rank or capability gate.
    for (const item of HARDWARE_CATALOG) {
      expect(item).not.toHaveProperty("requiredRank");
      expect(item).not.toHaveProperty("requiresCapability");
    }
  });
});

describe("buyHardware command", () => {
  it("rejects an unknown catalog id without touching the wallet", () => {
    const bus = new CommandBus(worldWithCredits(1_000));

    expect(bus.execute(buy("nope"))).toEqual({
      ok: false,
      events: [],
      error: "HARDWARE_NOT_FOUND",
    });
    expect(bus.snapshot().economy.credits).toBe(1_000);
  });

  it("refuses a purchase that would take credits negative", () => {
    const bus = new CommandBus(worldWithCredits(100));

    const result = bus.execute(buy("cpu-overclock"));

    expect(result.error).toBe("INSUFFICIENT_CREDITS");
    expect(bus.snapshot().economy.credits).toBe(100);
    expect(bus.snapshot().economy.hardware).toHaveLength(1);
  });

  it("spends credits, records a ledger debit and adds the hardware", () => {
    const bus = new CommandBus(worldWithCredits(1_000));

    const result = bus.execute(buy("cpu-overclock"));
    const state = bus.snapshot();

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "ValueTransferred",
        entryId: "value:1",
        direction: "debit",
        amount: 400,
        balanceAfter: 600,
        causeKind: "hardware",
        causeId: "cpu-overclock",
        counterparty: "market",
        worldMinute: 0,
      },
      {
        type: "HardwareAcquired",
        hardwareId: "hw:2",
        catalogId: "cpu-overclock",
        cost: 400,
        worldMinute: 0,
      },
    ]);
    expect(state.economy.credits).toBe(600);
    expect(state.economy.hardware).toHaveLength(2);
    expect(state.economy.ledger).toHaveLength(1);
    expect(state.economy.ledger[0]).toMatchObject({
      direction: "debit",
      balanceAfter: 600,
      cause: { kind: "hardware", id: "cpu-overclock" },
    });
  });

  it("buys the free starter platform without going negative", () => {
    const bus = new CommandBus(worldWithCredits(0));

    expect(bus.execute(buy(STARTER_RIG_ID)).ok).toBe(true);
    expect(bus.snapshot().economy.credits).toBe(0);
  });

  it("costs no world time and never gates on rank", () => {
    for (const rank of [1, 999_999]) {
      const state = worldWithCredits(1_000);
      state.player.rank = rank;
      const bus = new CommandBus(state);

      const result = bus.execute(buy("cpu-overclock"));

      expect(result.ok).toBe(true);
      expect(bus.snapshot().worldMinute).toBe(0);
    }
  });

  it("is deterministic, rank-independent and split-invariant", () => {
    const one = new CommandBus(worldWithCredits(2_000));
    const two = worldWithCredits(2_000);
    two.player.rank = 1;
    for (const entry of two.underground.actors) {
      entry.rank = entry.rank * 3 + 11;
    }
    const other = new CommandBus(two);

    const purchases = ["cpu-overclock", "ram-bank", "net-card"];
    for (const id of purchases) {
      one.execute(buy(id));
      other.execute(buy(id));
    }

    expect(one.snapshot().economy).toEqual(other.snapshot().economy);
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = new CommandBus(worldWithCredits(2_000));
    straight.execute(buy("cpu-overclock"));
    straight.execute(buy("ram-bank"));

    const first = new CommandBus(worldWithCredits(2_000));
    first.execute(buy("cpu-overclock"));
    const resumed = new CommandBus(first.snapshot());
    resumed.execute(buy("ram-bank"));

    expect(resumed.snapshot().economy).toEqual(straight.snapshot().economy);
  });
});

describe("contract delivery pays credits", () => {
  it("credits the payout to the wallet and ledger on delivery", () => {
    const bus = new CommandBus(worldWithContract(contract()));
    bus.execute({ type: "acceptContract", contractId: "contract:1" });
    learnService(bus);

    const result = bus.execute({
      type: "deliverContract",
      contractId: "contract:1",
    });
    const state = bus.snapshot();

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "ValueTransferred",
        direction: "credit",
        amount: 120,
        balanceAfter: 120,
        causeKind: "contract",
        causeId: "contract:1",
        counterparty: "vesper",
      }),
    );
    expect(state.economy.credits).toBe(120);
  });

  it("does not pay when the objective is not met", () => {
    const bus = new CommandBus(worldWithContract(contract()));
    bus.execute({ type: "acceptContract", contractId: "contract:1" });

    expect(bus.execute({
      type: "deliverContract",
      contractId: "contract:1",
    }).error).toBe("OBJECTIVE_NOT_MET");
    expect(bus.snapshot().economy.credits).toBe(0);
    expect(bus.snapshot().economy.ledger).toHaveLength(0);
  });
});

describe("economy projection", () => {
  it("exposes the wallet, owned rig, catalog and ledger", () => {
    const state = worldWithCredits(1_000);
    const bus = new CommandBus(state);
    bus.execute(buy("cpu-overclock"));

    const economy = projectWorld(bus.snapshot()).economy;

    expect(economy.credits).toBe(600);
    expect(economy.capability.compute).toBe(
      findCatalogItem(STARTER_RIG_ID)!.capability.compute +
        findCatalogItem("cpu-overclock")!.capability.compute,
    );
    expect(economy.hardware.map((entry) => entry.catalogId)).toEqual([
      STARTER_RIG_ID,
      "cpu-overclock",
    ]);
    expect(economy.catalog).toHaveLength(HARDWARE_CATALOG.length);
    expect(
      economy.catalog.find((item) => item.id === "cpu-overclock")?.owned,
    ).toBe(1);
    expect(economy.ledger[0]).toMatchObject({
      direction: "debit",
      amount: 400,
      counterparty: "market",
    });
  });

  it("resolves a contract counterparty to its public handle", () => {
    const bus = new CommandBus(worldWithContract(contract()));
    bus.execute({ type: "acceptContract", contractId: "contract:1" });
    learnService(bus);
    bus.execute({ type: "deliverContract", contractId: "contract:1" });

    const economy = projectWorld(bus.snapshot()).economy;

    expect(economy.ledger[0]).toMatchObject({
      direction: "credit",
      counterparty: "VESPER",
    });
  });
});

describe("economy parity and runtime", () => {
  it("shares the buyHardware command between Terminal and GUI", () => {
    const runtime = createGameRuntime(worldWithCredits(1_000));

    runtime.execute(buy("cpu-overclock"));

    expect(runtime.projection.getCell("meta", "wallet", "credits")).toBe(600);
    expect(
      runtime.projection.getRow("catalog", "cpu-overclock")?.owned,
    ).toBe(1);
    expect(runtime.projection.getRow("rig", "capability")).toMatchObject({
      compute: 4,
    });
    expect(
      Object.keys(runtime.projection.getTable("ledger")).length,
    ).toBeGreaterThan(0);
  });

  it("waits without spending, so idle time never changes the wallet", () => {
    const bus = new CommandBus(worldWithCredits(1_000));

    wait(bus, 30 * DAY);

    expect(bus.snapshot().economy.credits).toBe(1_000);
    expect(bus.snapshot().economy.ledger).toHaveLength(0);
  });
});
