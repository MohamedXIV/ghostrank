import { describe, expect, it } from "vitest";

import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  compromiseTick,
  IDENTITY_EXPOSURE_PROGRESS,
} from "@/game/simulation/systems/compromise";
import { derivePresence } from "@/game/simulation/systems/location";
import {
  physicalThreatPercent,
} from "@/game/simulation/systems/physical-retaliation";
import {
  PLAYER_ACTOR_ID,
  type PhysicalThreat,
  type WorldState,
} from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

const ACTOR_ID = "kestrel";
const PROBE_ID = "probe:p4";
const LAB = "housing-rented-lab";

function propertyThreat(
  state: WorldState,
  overrides: Partial<PhysicalThreat> = {},
): PhysicalThreat {
  return {
    id: "physical:1",
    actorId: ACTOR_ID,
    kind: "property-hit",
    signalKind: "strange-vehicle",
    sourceProbeId: PROBE_ID,
    sourceInvestigationIds: [],
    locationId: derivePresence(state.economy.housing).locationId,
    worldMinute: 360,
    affectedBuildIds: [],
    destroyedHardwareIds: ["hw:1"],
    ...overrides,
  };
}

function p4World(): WorldState {
  const state = createSliceWorldState();
  state.economy.housing = LAB;
  state.probes = [
    {
      id: PROBE_ID,
      actorId: ACTOR_ID,
      subject: "dwelling",
      correct: true,
      locationId: LAB,
      worldMinute: 0,
    },
  ];
  state.investigations = [];
  state.physicalThreats = [];
  state.compromises = [];
  return state;
}

function applyFinalPropertyLoss(
  state: WorldState,
  overrides: Partial<PhysicalThreat> = {},
): PhysicalThreat {
  const threat = propertyThreat(state, overrides);
  state.economy.hardware = [];
  state.physicalThreats.push(threat);
  return threat;
}

function armedIntegratedWorld(): WorldState {
  const state = p4World();
  const actor = state.underground.actors.find((entry) => entry.id === ACTOR_ID);
  if (!actor) {
    throw new Error("slice world lost kestrel");
  }

  actor.activity = 0;
  delete actor.modelId;
  state.underground.relationships = [
    {
      id: `relationship:${ACTOR_ID}:player`,
      fromId: ACTOR_ID,
      toId: PLAYER_ACTOR_ID,
      trust: 0,
      fear: 0,
      grudge: 100,
      updatedWorldMinute: 0,
    },
  ];

  const percent = physicalThreatPercent(state, actor);
  for (let seed = 1; seed < 50_000; seed += 1) {
    if (
      hashUnit(seed, "physical-retaliation", PROBE_ID, ACTOR_ID) * 100 <
      percent
    ) {
      state.underground.seed = seed;
      return state;
    }
  }

  throw new Error("no deterministic P4 seed found");
}

describe("Phase 6 P4 — catastrophic compromise", () => {
  it("starts empty and legacy saves default to no compromise", () => {
    expect(createSliceWorldState().compromises).toEqual([]);

    const legacy = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "cobaltxz", rank: 100_000 },
      targets: [],
      knownTargetIds: [],
    });
    expect(legacy.compromises).toEqual([]);
  });

  it("records final rig loss from an actual destructive property hit", () => {
    const state = p4World();
    applyFinalPropertyLoss(state);

    const events = compromiseTick(state, 360);

    expect(state.compromises).toContainEqual(
      expect.objectContaining({
        id: "compromise:1",
        kind: "rig-lost",
        sourceThreatId: "physical:1",
        sourceProbeId: PROBE_ID,
        worldMinute: 360,
      }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "CompromiseRecorded",
        kind: "rig-lost",
        worldMinute: 360,
      }),
    );
  });

  it("attributes rig loss only to the final destructive hit on a shared boundary", () => {
    const state = p4World();
    state.economy.hardware = [];
    state.physicalThreats = [
      propertyThreat(state, {
        id: "physical:1",
        actorId: "nightshade",
        destroyedHardwareIds: ["hw:1"],
      }),
      propertyThreat(state, {
        id: "physical:2",
        actorId: ACTOR_ID,
        destroyedHardwareIds: ["hw:2"],
      }),
    ];

    compromiseTick(state, 360);

    const rigLosses = state.compromises.filter(
      (entry) => entry.kind === "rig-lost",
    );
    expect(rigLosses).toEqual([
      expect.objectContaining({
        sourceThreatId: "physical:2",
      }),
    ]);
    expect(
      state.compromises.filter((entry) => entry.kind === "stranded"),
    ).toEqual([
      expect.objectContaining({
        sourceThreatId: "physical:2",
      }),
    ]);
  });

  it("does not call the rig lost while a complete owned machine survives", () => {
    const state = p4World();
    state.economy.hardware = [];
    state.economy.ownedMachines = [
      {
        id: "machine:1",
        catalogId: "box-burner",
        label: "Burner Laptop",
        paidCost: 600,
        acquiredWorldMinute: 0,
      },
    ];
    state.physicalThreats.push(propertyThreat(state));

    compromiseTick(state, 360);

    expect(state.compromises.some((entry) => entry.kind === "rig-lost")).toBe(
      false,
    );
    expect(state.compromises.some((entry) => entry.kind === "stranded")).toBe(
      false,
    );
  });

  it("does not call ordinary property damage catastrophic while hardware survives", () => {
    const state = p4World();
    state.economy.hardware.push({
      id: "hw:2",
      catalogId: "cpu-overclock",
      acquiredWorldMinute: 0,
    });
    // P3 destroyed one copy, but another owned instance remains.
    state.economy.hardware = state.economy.hardware.filter(
      (entry) => entry.id !== "hw:1",
    );
    state.physicalThreats.push(propertyThreat(state));

    compromiseTick(state, 360);

    expect(state.compromises.some((entry) => entry.kind === "rig-lost")).toBe(
      false,
    );
  });

  it("burns the lease only when the hit landed at the currently held dwelling", () => {
    const state = p4World();
    applyFinalPropertyLoss(state);

    const events = compromiseTick(state, 360);

    expect(state.economy.housing).toBeNull();
    expect(state.compromises).toContainEqual(
      expect.objectContaining({
        kind: "dwelling-lost",
        locationId: LAB,
      }),
    );
    expect(events).toContainEqual({
      type: "HousingChanged",
      housingId: null,
      dailyCost: 0,
      worldMinute: 360,
    });
  });

  it("bills the lease at a day boundary before a same-tick physical eviction", () => {
    const state = armedIntegratedWorld();
    state.worldMinute = 3 * 360;
    state.underground.lastTickMinute = 3 * 360;
    state.probes[0]!.worldMinute = 2 * 360;
    state.economy.credits = 100;

    const bus = new CommandBus(state);
    const result = bus.execute({ type: "advanceTime", minutes: 360 });
    const after = bus.snapshot();

    expect(after.worldMinute).toBe(24 * 60);
    expect(after.economy.housing).toBeNull();
    expect(after.economy.credits).toBe(40);
    expect(
      after.economy.ledger.filter(
        (entry) => entry.cause.kind === "upkeep" && entry.cause.id === LAB,
      ),
    ).toHaveLength(1);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "HousingChanged",
        housingId: null,
        worldMinute: 24 * 60,
      }),
    );

    // Once the physical event burned the lease, the next full day cannot bill
    // the old room again.
    bus.execute({ type: "advanceTime", minutes: 24 * 60 });
    expect(bus.snapshot().economy.credits).toBe(40);
  });

  it("never evicts a new safehouse because an old location was hit", () => {
    const state = p4World();
    const oldThreat = propertyThreat(state, { locationId: LAB });
    state.economy.housing = "housing-sleeper-unit";
    state.economy.hardware = [];
    state.physicalThreats.push(oldThreat);

    compromiseTick(state, 360);

    expect(state.economy.housing).toBe("housing-sleeper-unit");
    expect(
      state.compromises.some((entry) => entry.kind === "dwelling-lost"),
    ).toBe(false);
  });

  it("identity exposure requires a correct current dwelling read and converging cited case", () => {
    const state = p4World();
    state.investigations = [
      {
        id: "investigation:nightshade",
        targetId: "nightshade",
        openedWorldMinute: 0,
        progress: IDENTITY_EXPOSURE_PROGRESS,
        sourceIds: ["trace:1"],
        signals: [],
      },
    ];
    applyFinalPropertyLoss(state, {
      sourceInvestigationIds: ["investigation:nightshade"],
    });

    compromiseTick(state, 360);

    expect(state.compromises).toContainEqual(
      expect.objectContaining({
        kind: "identity-exposed",
        sourceProbeId: PROBE_ID,
        sourceInvestigationIds: ["investigation:nightshade"],
      }),
    );
  });

  it("does not fabricate identity exposure when any causal leg is missing", () => {
    const variants = [
      { correct: false, progress: IDENTITY_EXPOSURE_PROGRESS, cited: true },
      { correct: true, progress: IDENTITY_EXPOSURE_PROGRESS - 1, cited: true },
      { correct: true, progress: IDENTITY_EXPOSURE_PROGRESS, cited: false },
    ];

    for (const variant of variants) {
      const state = p4World();
      state.probes[0]!.correct = variant.correct;
      state.investigations = [
        {
          id: "investigation:nightshade",
          targetId: "nightshade",
          openedWorldMinute: 0,
          progress: variant.progress,
          sourceIds: ["trace:1"],
          signals: [],
        },
      ];
      applyFinalPropertyLoss(state, {
        sourceInvestigationIds: variant.cited
          ? ["investigation:nightshade"]
          : [],
      });

      compromiseTick(state, 360);
      expect(
        state.compromises.some((entry) => entry.kind === "identity-exposed"),
      ).toBe(false);
    }
  });

  it("records stranded only at the explicit zero-money zero-lease zero-hardware floor", () => {
    const stranded = p4World();
    stranded.economy.credits = 0;
    applyFinalPropertyLoss(stranded);
    compromiseTick(stranded, 360);
    expect(stranded.compromises.some((entry) => entry.kind === "stranded")).toBe(
      true,
    );

    for (const mutate of [
      (state: WorldState) => {
        state.economy.credits = 1;
      },
      (state: WorldState) => {
        state.economy.hardware = [
          {
            id: "hw:2",
            catalogId: "cpu-overclock",
            acquiredWorldMinute: 0,
          },
        ];
      },
    ]) {
      const state = p4World();
      applyFinalPropertyLoss(state);
      mutate(state);
      compromiseTick(state, 360);
      expect(
        state.compromises.some((entry) => entry.kind === "stranded"),
      ).toBe(false);
    }
  });

  it("attributes eviction-only stranded state to the hit that burned the lease", () => {
    const state = p4World();
    state.economy.hardware = [];
    state.economy.credits = 0;
    state.physicalThreats.push(
      propertyThreat(state, { destroyedHardwareIds: [] }),
    );

    compromiseTick(state, 360);

    expect(
      state.compromises.filter((entry) => entry.kind === "stranded"),
    ).toEqual([
      expect.objectContaining({
        sourceThreatId: "physical:1",
      }),
    ]);
  });

  it("does not call the player stranded while a sellable authored tool remains", () => {
    const state = p4World();
    state.economy.credits = 0;
    state.economy.hardware = [];
    state.economy.playerTools = [
      {
        id: "tool:1",
        catalogId: "tool-paranoid-scraper",
        author: "nullbyte",
        paidCost: 500,
        acquiredWorldMinute: 0,
      },
    ];
    state.physicalThreats.push(propertyThreat(state));

    compromiseTick(state, 360);

    expect(state.economy.housing).toBeNull();
    expect(state.compromises.some((entry) => entry.kind === "stranded")).toBe(
      false,
    );
  });

  it("is rank-independent and deterministic", () => {
    const low = p4World();
    low.player.rank = 1;
    applyFinalPropertyLoss(low);

    const high = structuredClone(low);
    high.player.rank = 999_999;

    compromiseTick(low, 360);
    compromiseTick(high, 360);

    expect(high.compromises).toEqual(low.compromises);
    expect(high.economy.housing).toBe(low.economy.housing);
  });

  it("does not retroactively manufacture compromise from historical P3 records", () => {
    const state = p4World();
    applyFinalPropertyLoss(state, { worldMinute: 360 });

    expect(compromiseTick(state, 720)).toEqual([]);
    expect(state.compromises).toEqual([]);
  });

  it("survives save/restore and never duplicates the same causal condition", () => {
    const state = p4World();
    applyFinalPropertyLoss(state);
    compromiseTick(state, 360);

    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(state)),
    );
    expect(restored.compromises).toEqual(state.compromises);

    const before = restored.compromises.length;
    compromiseTick(restored, 360);
    expect(restored.compromises).toHaveLength(before);
  });

  it("whole and split waits produce identical P3→P4 truth", () => {
    const seed = armedIntegratedWorld();

    const whole = new CommandBus(structuredClone(seed));
    const split = new CommandBus(structuredClone(seed));

    whole.execute({ type: "advanceTime", minutes: 720 });
    split.execute({ type: "advanceTime", minutes: 360 });
    split.execute({ type: "advanceTime", minutes: 360 });

    const a = whole.snapshot();
    const b = split.snapshot();

    expect(a.physicalThreats).toEqual(b.physicalThreats);
    expect(a.compromises).toEqual(b.compromises);
    expect(a.economy.housing).toBe(b.economy.housing);
    expect(a.economy.hardware).toEqual(b.economy.hardware);
    expect(a.compromises.length).toBeGreaterThan(0);
  });

  it("projects names and minutes only; causal ids stay hidden from TinyBase", () => {
    const state = p4World();
    applyFinalPropertyLoss(state);
    compromiseTick(state, 360);

    const projection = projectWorld(state);
    expect(projection.compromises.length).toBeGreaterThan(0);
    for (const record of projection.compromises) {
      expect(Object.keys(record).sort()).toEqual(
        ["id", "kind", "label", "worldMinute"].sort(),
      );
    }

    const serialized = JSON.stringify(projection.compromises);
    expect(serialized).not.toContain("sourceThreatId");
    expect(serialized).not.toContain("sourceProbeId");
    expect(serialized).not.toContain("sourceInvestigationIds");
    expect(serialized).not.toContain("locationId");

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);
    const table = store.getTable("compromises");
    expect(Object.keys(table).length).toBe(projection.compromises.length);
    for (const row of Object.values(table)) {
      expect(Object.keys(row).sort()).toEqual(
        ["kind", "label", "worldMinute"].sort(),
      );
    }
  });

  it("records conditions, never a RunEnded, and the command bus remains live", () => {
    const state = p4World();
    applyFinalPropertyLoss(state);
    const events = compromiseTick(state, 360);

    expect(events.map((event) => String(event.type))).not.toContain("RunEnded");

    const bus = new CommandBus(state);
    expect(bus.execute({ type: "observeTarget", targetId: "nightshade" }).ok).toBe(
      true,
    );
    expect(bus.execute({ type: "openOperation", targetId: "nightshade" }).ok).toBe(
      true,
    );
    expect(bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok).toBe(
      true,
    );
  });
});
