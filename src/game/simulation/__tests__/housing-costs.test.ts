import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  LANDLORD_COUNTERPARTY,
  HOUSING_CATALOG,
} from "@/content/housing-catalog";
import {
  deriveLeaseCapability,
  effectiveCapability,
} from "@/game/simulation/systems/housing";
import { advanceUpkeep } from "@/game/simulation/systems/upkeep";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

const DAY_MINUTES = 24 * 60;

function stateWithLease(
  housingId: string | null,
  credits = 1_000,
): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  state.economy.housing = housingId;
  return state;
}

function upkeepCharges(
  events: SimulationEvent[],
): Extract<SimulationEvent, { type: "ValueTransferred" }>[] {
  return events.filter(
    (event): event is Extract<SimulationEvent, { type: "ValueTransferred" }> =>
      event.type === "ValueTransferred" && event.causeKind === "upkeep",
  );
}

function openOp(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
}

describe("lease capability", () => {
  it("adds nothing at the free baseline", () => {
    const economy = stateWithLease(null).economy;

    expect(deriveLeaseCapability(economy)).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(effectiveCapability(economy)).toEqual(
      effectiveCapability({ ...economy, housing: "unknown-home" }),
    );
  });

  it("lifts the rig while the lease is held", () => {
    const bare = effectiveCapability(stateWithLease(null).economy);
    const lifted = effectiveCapability(
      stateWithLease("housing-cowork-loft").economy,
    );

    expect(lifted.network).toBe(bare.network + 2);
    // The lease never subtracts from hardware capability.
    expect(lifted.compute).toBe(bare.compute);
    expect(lifted.memory).toBe(bare.memory);
  });
});

describe("housing commands", () => {
  it("signs a lease without moving credits and records the change", () => {
    const bus = new CommandBus(stateWithLease(null, 100));

    const result = bus.execute({
      type: "rentHousing",
      housingId: "housing-cowork-loft",
    });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "HousingChanged",
        housingId: "housing-cowork-loft",
        dailyCost: 30,
        worldMinute: 0,
      },
    ]);
    const world = bus.snapshot();
    expect(world.economy.housing).toBe("housing-cowork-loft");
    expect(world.economy.credits).toBe(100);
    expect(world.economy.ledger).toEqual([]);
  });

  it("rejects unknown listings and redundant moves", () => {
    const bus = new CommandBus(stateWithLease(null, 100));

    expect(
      bus.execute({ type: "rentHousing", housingId: "ghost-penthouse" }).error,
    ).toBe("HOUSING_NOT_FOUND");

    bus.execute({ type: "rentHousing", housingId: "housing-cowork-loft" });
    expect(
      bus.execute({ type: "rentHousing", housingId: "housing-cowork-loft" })
        .error,
    ).toBe("ALREADY_RENTED");
  });

  it("switching leases is free and emits a single change event", () => {
    const bus = new CommandBus(stateWithLease("housing-cowork-loft", 100));

    const result = bus.execute({
      type: "rentHousing",
      housingId: "housing-rented-lab",
    });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "HousingChanged",
        housingId: "housing-rented-lab",
        dailyCost: 60,
        worldMinute: 0,
      },
    ]);
    const world = bus.snapshot();
    expect(world.economy.housing).toBe("housing-rented-lab");
    expect(world.economy.credits).toBe(100);
    expect(world.economy.ledger).toEqual([]);
  });

  it("breaking the lease returns to the free baseline and stops charges", () => {
    const bus = new CommandBus(stateWithLease("housing-cowork-loft", 1_000));

    const result = bus.execute({ type: "breakLease" });
    expect(result.events).toEqual([
      {
        type: "HousingChanged",
        housingId: null,
        dailyCost: 0,
        worldMinute: 0,
      },
    ]);

    bus.execute({ type: "advanceTime", minutes: DAY_MINUTES * 3 });
    expect(bus.snapshot().economy.credits).toBe(1_000);

    expect(bus.execute({ type: "breakLease" }).error).toBe("NO_ACTIVE_LEASE");
  });
});

describe("recurring upkeep", () => {
  it("charges once per crossed world-day boundary at the boundary minute", () => {
    const bus = new CommandBus(stateWithLease("housing-cowork-loft", 1_000));

    const result = bus.execute({ type: "advanceTime", minutes: 3 * DAY_MINUTES });

    const charges = upkeepCharges(result.events);
    expect(charges).toHaveLength(3);
    expect(charges.map((event) => event.amount)).toEqual([30, 30, 30]);
    expect(charges.map((event) => event.worldMinute)).toEqual([
      DAY_MINUTES,
      2 * DAY_MINUTES,
      3 * DAY_MINUTES,
    ]);
    expect(charges.map((event) => event.balanceAfter)).toEqual([970, 940, 910]);
    for (const charge of charges) {
      expect(charge.counterparty).toBe(LANDLORD_COUNTERPARTY);
      expect(charge.causeId).toBe("housing-cowork-loft");
    }

    const ledger = bus.snapshot().economy.ledger;
    expect(ledger).toHaveLength(3);
    // Boundary ledger ids stay unique even within one call.
    expect(new Set(ledger.map((entry) => entry.id)).size).toBe(3);
  });

  it("is split-invariant: chunked waits bill the same boundaries", () => {
    const straight = new CommandBus(
      stateWithLease("housing-rented-lab", 1_000),
    );
    straight.execute({ type: "advanceTime", minutes: 2 * DAY_MINUTES + 300 });

    const chunked = new CommandBus(stateWithLease("housing-rented-lab", 1_000));
    chunked.execute({ type: "advanceTime", minutes: 900 });
    chunked.execute({ type: "advanceTime", minutes: DAY_MINUTES });
    chunked.execute({ type: "advanceTime", minutes: DAY_MINUTES - 600 });

    const ledgerOf = (state: WorldState) =>
      state.economy.ledger.map((entry) => [
        entry.worldMinute,
        entry.amount,
        entry.balanceAfter,
      ]);

    expect(ledgerOf(chunked.snapshot())).toEqual(ledgerOf(straight.snapshot()));
    expect(chunked.snapshot().economy.credits).toBe(
      straight.snapshot().economy.credits,
    );
  });

  it("evicts at an unpayable boundary without debt or penalty", () => {
    const bus = new CommandBus(stateWithLease("housing-cowork-loft", 50));

    const result = bus.execute({ type: "advanceTime", minutes: 2 * DAY_MINUTES });

    const charges = upkeepCharges(result.events);
    expect(charges).toHaveLength(1);
    expect(charges[0].balanceAfter).toBe(20);
    expect(
      result.events.filter(
        (event) =>
          event.type === "HousingChanged" &&
          event.housingId === null &&
          event.worldMinute === 2 * DAY_MINUTES,
      ),
    ).toHaveLength(1);

    const world = bus.snapshot();
    expect(world.economy.housing).toBeNull();
    // Only the affordable boundary was charged; credits never went negative.
    expect(world.economy.credits).toBe(20);
    expect(world.economy.ledger).toHaveLength(1);
  });

  it("no lease means no upkeep at all", () => {
    const events = advanceUpkeep(
      stateWithLease(null, 1_000),
      0,
      10 * DAY_MINUTES,
    );
    expect(events).toEqual([]);
  });

  it("an empty wallet can still sign a lease — the lift is free until a day passes", () => {
    const bus = new CommandBus(stateWithLease(null, 0));

    expect(
      bus.execute({ type: "rentHousing", housingId: "housing-rented-lab" }).ok,
    ).toBe(true);

    bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const world = bus.snapshot();
    expect(world.economy.housing).toBeNull();
    expect(world.economy.credits).toBe(0);
    expect(world.economy.ledger).toEqual([]);
  });
});

describe("housing flows through rig speed and scale", () => {
  it("a loft connection shortens survey without any hardware", () => {
    const loft = new CommandBus(stateWithLease("housing-cowork-loft", 1_000));
    openOp(loft);
    loft.execute({ type: "surveyTarget", targetId: "nightshade" });

    const bare = new CommandBus(stateWithLease(null, 1_000));
    openOp(bare);
    bare.execute({ type: "surveyTarget", targetId: "nightshade" });

    // network 1 + 2 => survey 12 / 3 = 4m versus the 12m baseline.
    expect(loft.snapshot().worldMinute).toBe(4);
    expect(bare.snapshot().worldMinute).toBe(12);
  });

  it("lab memory widens discovery", () => {
    const bus = new CommandBus(stateWithLease("housing-rented-lab", 1_000));
    openOp(bus);

    const result = bus.execute({
      type: "surveyTarget",
      targetId: "nightshade",
    });

    // memory 1 + 1 => scope 2 covers both nightshade machines in one pass.
    expect(
      result.events.filter((event) => event.type === "MachineObserved"),
    ).toHaveLength(2);
  });

  it("eviction returns the rig to its hardware baseline", () => {
    const bus = new CommandBus(stateWithLease("housing-cowork-loft", 25));
    openOp(bus);

    bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const world = bus.snapshot();
    expect(world.economy.housing).toBeNull();
    expect(projectWorld(world).economy.actionMinutes.survey).toBe(12);
    expect(projectWorld(world).economy.lease.network).toBe(0);
  });
});

describe("housing projection", () => {
  it("surfaces the baseline with no lease", () => {
    const economy = projectWorld(createSliceWorldState()).economy;

    expect(economy.currentHousingId).toBeNull();
    expect(economy.dailyCost).toBe(0);
    expect(economy.lease).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(economy.housing).toHaveLength(HOUSING_CATALOG.length);
    expect(economy.housing.every((listing) => !listing.active)).toBe(true);
  });

  it("marks the held lease active with its daily cost and lift", () => {
    const economy = projectWorld(
      stateWithLease("housing-cowork-loft", 500),
    ).economy;

    expect(economy.currentHousingId).toBe("housing-cowork-loft");
    expect(economy.dailyCost).toBe(30);
    expect(economy.lease.network).toBe(2);
    expect(economy.capability.network).toBe(3);
    expect(economy.actionMinutes.survey).toBe(4);
    expect(economy.housing.find((listing) => listing.active)?.id).toBe(
      "housing-cowork-loft",
    );
  });
});

describe("housing TinyBase sync", () => {
  it("tracks lease rows, wallet cost and rig lift through the runtime", () => {
    const runtime = createGameRuntime(stateWithLease(null, 1_000));

    expect(runtime.projection.getCell("meta", "wallet", "dailyCost")).toBe(0);
    expect(runtime.projection.getCell("meta", "wallet", "currentHousingId")).toBe(
      "",
    );

    runtime.execute({
      type: "rentHousing",
      housingId: "housing-rented-lab",
    });

    expect(runtime.projection.getRow("rig", "lease")).toEqual({
      compute: 2,
      memory: 1,
      vram: 0,
      storage: 1,
      network: 0,
    });
    expect(runtime.projection.getCell("meta", "wallet", "dailyCost")).toBe(60);
    expect(runtime.projection.getCell("meta", "wallet", "currentHousingId")).toBe(
      "housing-rented-lab",
    );
    expect(
      runtime.projection.getCell(
        "housing",
        "housing-rented-lab",
        "active",
      ),
    ).toBe(true);

    runtime.execute({ type: "breakLease" });

    expect(
      runtime.projection.getCell("housing", "housing-rented-lab", "active"),
    ).toBe(false);
    expect(runtime.projection.getRow("rig", "lease")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });
});
