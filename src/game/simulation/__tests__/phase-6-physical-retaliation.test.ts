import { describe, expect, it } from "vitest";

import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { settledBuildDueMinute } from "@/game/simulation/systems/builds";
import { derivePresence } from "@/game/simulation/systems/location";
import { SYSTEM_PHASE } from "@/game/simulation/scheduler/system-jobs";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  createScheduleSink,
  dispatchAt,
  reconcileSchedule,
  settleBuildDeadlines,
} from "@/game/simulation/systems/world-schedule";
import {
  applyActiveOutageToBuild,
  PHYSICAL_ASSISTANT_ADOPTION_PERCENT,
  PHYSICAL_MIN_GRUDGE,
  PHYSICAL_OUTAGE_MINUTES,
  physicalRetaliationTick,
  physicalThreatPercent,
} from "@/game/simulation/systems/physical-retaliation";
import {
  PLAYER_ACTOR_ID,
  type RivalProbeSubject,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

const ACTOR_ID = "kestrel";
const PROBE_ID = "probe:p3";

function physicalWorld(
  subject: RivalProbeSubject = "rig",
  correct = true,
): WorldState {
  const state = createSliceWorldState();
  const actor = state.underground.actors.find((entry) => entry.id === ACTOR_ID);

  if (!actor) {
    throw new Error("slice world lost kestrel fixture");
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
  state.probes = [
    {
      id: PROBE_ID,
      actorId: ACTOR_ID,
      subject,
      correct,
      ...(subject === "dwelling"
        ? { locationId: derivePresence(state.economy.housing).locationId }
        : {}),
      worldMinute: 0,
    },
  ];
  state.investigations = [];
  state.physicalThreats = [];

  return state;
}

function actorOf(state: WorldState): UndergroundActor {
  const actor = state.underground.actors.find((entry) => entry.id === ACTOR_ID);
  if (!actor) {
    throw new Error("missing physical actor");
  }
  return actor;
}

function seedThatTriggers(
  state: WorldState,
  { adoption = false }: { adoption?: boolean } = {},
): number {
  const actor = actorOf(state);
  const percent = physicalThreatPercent(state, actor);

  for (let seed = 1; seed < 50_000; seed += 1) {
    const physicalRoll =
      hashUnit(seed, "physical-retaliation", PROBE_ID, ACTOR_ID) * 100;
    const adoptionRoll =
      hashUnit(
        seed,
        "physical-assistant-adoption",
        1,
        ACTOR_ID,
        "physical:1",
      ) * 100;

    if (
      physicalRoll < percent &&
      (!adoption || adoptionRoll < PHYSICAL_ASSISTANT_ADOPTION_PERCENT)
    ) {
      return seed;
    }
  }

  throw new Error("no deterministic P3 seed found");
}

function arm(state: WorldState, options?: { adoption?: boolean }): WorldState {
  state.underground.seed = seedThatTriggers(state, options);
  return state;
}

/**
 * One ecosystem tick in the command bus's order (D057): due outage releases, the
 * tick's own turns, then builds due at that minute. Builds set up directly on
 * the record are queued by the reconcile the bus runs on load.
 */
function tickAt(
  state: WorldState,
  tickIndex: number,
  minute: number,
): SimulationEvent[] {
  const sink = createScheduleSink();
  reconcileSchedule(state);
  dispatchAt(state, minute, SYSTEM_PHASE["outage-release"], sink);
  physicalRetaliationTick(state, tickIndex, minute);
  dispatchAt(state, minute, SYSTEM_PHASE.build, sink);
  return sink.builds;
}

function addBoundaryBuild(state: WorldState, dueWorldMinute = 360): void {
  state.builds = [
    {
      id: "workflow:1",
      specId: "workflow-net-monitor",
      modelId: "model-cloud-frontier",
      startedWorldMinute: 0,
      dueWorldMinute,
      outcome: "clean",
    },
  ];
}

describe("Phase 6 P3 — physical retaliation", () => {
  it("requires social willingness, physical backing, and a prior probe", () => {
    const noGrudge = physicalWorld();
    noGrudge.underground.relationships[0]!.grudge = PHYSICAL_MIN_GRUDGE - 1;
    arm(noGrudge);
    expect(physicalRetaliationTick(noGrudge, 1, 360)).toEqual([]);

    const noBacking = physicalWorld();
    actorOf(noBacking).network = "white";
    arm(noBacking);
    expect(physicalRetaliationTick(noBacking, 1, 360)).toEqual([]);

    const noProbe = physicalWorld();
    noProbe.probes = [];
    arm(noProbe);
    expect(physicalRetaliationTick(noProbe, 1, 360)).toEqual([]);

    const armed = arm(physicalWorld());
    expect(physicalRetaliationTick(armed, 1, 360)).not.toEqual([]);
    expect(armed.physicalThreats).toHaveLength(1);
  });

  it("rank is never an input to the physical outcome", () => {
    const low = physicalWorld("rig", true);
    low.player.rank = 1;
    const seed = seedThatTriggers(low);
    low.underground.seed = seed;

    const high = physicalWorld("rig", true);
    high.player.rank = 999_999;
    high.underground.seed = seed;

    physicalRetaliationTick(low, 1, 360);
    physicalRetaliationTick(high, 1, 360);

    expect(high.physicalThreats).toEqual(low.physicalThreats);
    expect(high.economy.hardware).toEqual(low.economy.hardware);
    expect(actorOf(high).modelId).toBe(actorOf(low).modelId);
  });

  it("consumes P0 anonymity as monotone counterplay", () => {
    const state = physicalWorld();
    const actor = actorOf(state);

    const public_ = physicalThreatPercent(state, actor);
    state.economy.housing = "housing-basement-cot";
    const quiet = physicalThreatPercent(state, actor);
    state.economy.housing = "housing-sleeper-unit";
    const hidden = physicalThreatPercent(state, actor);

    expect(public_).toBeGreaterThan(quiet);
    expect(quiet).toBeGreaterThan(hidden);
  });

  it("consumes accumulated investigation pressure without exposing a meter", () => {
    const state = physicalWorld();
    const actor = actorOf(state);
    const quiet = physicalThreatPercent(state, actor);

    state.investigations = [
      {
        id: "investigation:nightshade",
        targetId: "nightshade",
        openedWorldMinute: 0,
        progress: 20,
        sourceIds: ["trace:1"],
        signals: [],
      },
    ];

    expect(physicalThreatPercent(state, actor)).toBeGreaterThan(quiet);
  });

  it("a wrong rig read produces a warning, not a magically correct outage", () => {
    const state = arm(physicalWorld("rig", false));
    addBoundaryBuild(state);

    const events = physicalRetaliationTick(state, 1, 360);

    expect(state.physicalThreats[0]).toMatchObject({
      kind: "warning",
      signalKind: "unusual-connectivity",
      sourceProbeId: PROBE_ID,
      affectedBuildIds: [],
      destroyedHardwareIds: [],
    });
    expect(state.builds[0]!.pausedAtWorldMinute).toBeUndefined();
    expect(events[0]).toMatchObject({
      type: "PhysicalThreat",
      kind: "warning",
      signalKind: "unusual-connectivity",
    });
  });

  it("a correct rig read starts an outage without rewriting frozen build truth", () => {
    const state = arm(physicalWorld("rig", true));
    addBoundaryBuild(state);
    const frozen = structuredClone(state.builds[0]);

    physicalRetaliationTick(state, 1, 360);

    expect(state.builds[0]).toMatchObject({
      ...frozen,
      pausedAtWorldMinute: 360,
      pausedByThreatId: "physical:1",
    });
    expect(state.builds[0]!.dueWorldMinute).toBe(frozen!.dueWorldMinute);
    expect(state.builds[0]!.outcome).toBe(frozen!.outcome);
    expect(state.physicalThreats[0]).toMatchObject({
      kind: "outage",
      signalKind: "outage",
      endsWorldMinute: 360 + PHYSICAL_OUTAGE_MINUTES,
      affectedBuildIds: ["workflow:1"],
    });
  });

  it("an outage wins an exact-boundary tie, then resumes by accumulated time", () => {
    const state = arm(physicalWorld("rig", true));
    addBoundaryBuild(state, 360);

    physicalRetaliationTick(state, 1, 360);
    expect(settleBuildDeadlines(state, 360)).toEqual([]);
    expect(state.builds[0]!.dueWorldMinute).toBe(360);

    // The release is its own deadline at 720: it fires before that tick's turns.
    const sink = createScheduleSink();
    dispatchAt(state, 720, SYSTEM_PHASE["outage-release"], sink);
    expect(state.builds[0]!.pausedAtWorldMinute).toBeUndefined();
    expect(state.builds[0]!.accumulatedPausedMinutes).toBe(
      PHYSICAL_OUTAGE_MINUTES,
    );
    expect(settledBuildDueMinute(state.builds[0]!)).toBe(720);
    expect(state.builds[0]!.dueWorldMinute).toBe(360);

    // Completion is phase 3, after the tick, and never before the release.
    expect(tickAt(state, 2, 720)).toEqual([
      expect.objectContaining({
        type: "BuildCompleted",
        buildId: "workflow:1",
        worldMinute: 720,
      }),
    ]);
    expect(state.builds).toEqual([]);
    expect(state.economy.ownedWorkflows[0]!.acquiredWorldMinute).toBe(720);
  });

  it("a build commissioned during an outage joins the same pause", () => {
    const state = arm(physicalWorld("rig", true));
    physicalRetaliationTick(state, 1, 360);
    state.worldMinute = 400;

    const build = {
      id: "workflow:late",
      specId: "workflow-net-monitor",
      modelId: "model-cloud-frontier",
      startedWorldMinute: 400,
      dueWorldMinute: 484,
      outcome: "warnings" as const,
    };

    applyActiveOutageToBuild(state, build);
    state.builds.push(build);

    expect(state.builds[0]).toMatchObject({
      dueWorldMinute: 484,
      pausedAtWorldMinute: 400,
      pausedByThreatId: "physical:1",
      outcome: "warnings",
    });
    expect(state.physicalThreats[0]!.affectedBuildIds).toContain(
      "workflow:late",
    );
  });

  it("settles only the outage that owns a pause across sequential outages", () => {
    const state = physicalWorld("rig", true);
    addBoundaryBuild(state, 2_000);
    const locationId = derivePresence(state.economy.housing).locationId;

    // The first outage already settled once, but remains durable provenance.
    // The build is now paused by a later outage. Re-visiting the old record must
    // not steal/clear the newer pause.
    state.physicalThreats = [
      {
        id: "physical:1",
        actorId: ACTOR_ID,
        kind: "outage",
        signalKind: "outage",
        sourceProbeId: "probe:old",
        sourceInvestigationIds: [],
        locationId,
        worldMinute: 360,
        endsWorldMinute: 720,
        affectedBuildIds: ["workflow:1"],
        destroyedHardwareIds: [],
      },
      {
        id: "physical:2",
        actorId: ACTOR_ID,
        kind: "outage",
        signalKind: "outage",
        sourceProbeId: "probe:new",
        sourceInvestigationIds: [],
        locationId,
        worldMinute: 720,
        endsWorldMinute: 1_080,
        affectedBuildIds: ["workflow:1"],
        destroyedHardwareIds: [],
      },
    ];
    state.builds[0]!.pausedAtWorldMinute = 720;
    state.builds[0]!.pausedByThreatId = "physical:2";
    state.builds[0]!.accumulatedPausedMinutes = 360;
    state.probes = [];
    state.underground.relationships = [];

    physicalRetaliationTick(state, 3, 1_080);
    settleBuildDeadlines(state, 1_080);

    expect(state.builds[0]!.pausedAtWorldMinute).toBeUndefined();
    expect(state.builds[0]!.pausedByThreatId).toBeUndefined();
    expect(state.builds[0]!.accumulatedPausedMinutes).toBe(720);
    expect(settledBuildDueMinute(state.builds[0]!)).toBe(2_720);
  });

  it("a mid-outage save restores the same pause and completion", () => {
    const original = arm(physicalWorld("rig", true));
    addBoundaryBuild(original, 360);
    physicalRetaliationTick(original, 1, 360);

    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(original)),
    );
    expect(restored.builds).toEqual(original.builds);
    expect(restored.physicalThreats).toEqual(original.physicalThreats);

    for (const state of [original, restored]) {
      tickAt(state, 2, 720);
    }

    expect(restored.builds).toEqual(original.builds);
    expect(restored.economy.ownedWorkflows).toEqual(
      original.economy.ownedWorkflows,
    );
  });

  it("one wait and split waits reach the same physical/build truth", () => {
    const seedState = arm(physicalWorld("rig", true));
    addBoundaryBuild(seedState, 360);

    const whole = new CommandBus(structuredClone(seedState));
    const split = new CommandBus(structuredClone(seedState));

    whole.execute({ type: "advanceTime", minutes: 720 });
    split.execute({ type: "advanceTime", minutes: 360 });
    split.execute({ type: "advanceTime", minutes: 360 });

    const a = whole.snapshot();
    const b = split.snapshot();

    expect(a.physicalThreats).toEqual(b.physicalThreats);
    expect(a.builds).toEqual(b.builds);
    expect(a.economy.ownedWorkflows).toEqual(b.economy.ownedWorkflows);
    expect(a.underground.relationships).toEqual(b.underground.relationships);
    expect(a.probes).toEqual(b.probes);
    expect(a.physicalThreats.length).toBeGreaterThan(0);
  });

  it("a correct dwelling read may destroy property but never the capability floor", () => {
    const state = physicalWorld("dwelling", true);
    state.economy.housing = "housing-rented-lab";
    state.probes[0]!.locationId = derivePresence(state.economy.housing).locationId;
    arm(state);
    expect(state.economy.hardware).toHaveLength(1);

    physicalRetaliationTick(state, 1, 360);

    expect(state.physicalThreats[0]).toMatchObject({
      kind: "property-hit",
      signalKind: "strange-vehicle",
    });
    expect(state.economy.hardware).toEqual([]);
    // P3 damages property; P4 owns lease loss/catastrophic compromise.
    expect(state.economy.housing).toBe("housing-rented-lab");

    // No hardware is still a valid baseline game, never a hard action gate.
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

  it("relocation invalidates a once-correct dwelling address", () => {
    const state = physicalWorld("dwelling", true);
    state.economy.housing = "housing-rented-lab";
    state.probes[0]!.locationId = derivePresence(state.economy.housing).locationId;
    const hardwareBefore = structuredClone(state.economy.hardware);

    // The player moves after the probe but before the physical tick.
    state.economy.housing = "housing-sleeper-unit";
    arm(state);
    physicalRetaliationTick(state, 1, 360);

    expect(state.physicalThreats[0]).toMatchObject({
      kind: "warning",
      signalKind: "door-camera-motion",
    });
    expect(state.economy.hardware).toEqual(hardwareBefore);
  });

  it("never reuses a hardware instance id after physical destruction", () => {
    const state = physicalWorld("dwelling", true);
    state.economy.housing = "housing-rented-lab";
    state.probes[0]!.locationId = derivePresence(state.economy.housing).locationId;
    state.economy.credits = 2_000;
    state.economy.hardware.push({
      id: "hw:2",
      catalogId: "cpu-overclock",
      acquiredWorldMinute: 0,
    });
    arm(state);

    physicalRetaliationTick(state, 1, 360);
    expect(state.physicalThreats[0]!.destroyedHardwareIds).toHaveLength(1);

    const bus = new CommandBus(state);
    const result = bus.execute({ type: "buyHardware", catalogId: "ram-bank" });
    const acquired = result.events.find(
      (event) => event.type === "HardwareAcquired",
    );

    expect(acquired).toMatchObject({ hardwareId: "hw:3" });
    const ids = bus.snapshot().economy.hardware.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(
      bus.snapshot().physicalThreats[0]!.destroyedHardwareIds[0],
    );
  });

  it("projection/store expose only the ambiguous physical signal", () => {
    const state = arm(physicalWorld("rig", true));
    addBoundaryBuild(state);
    physicalRetaliationTick(state, 1, 360);

    const projection = projectWorld(state);
    expect(projection.physicalSignals).toEqual([
      {
        id: "physical:1",
        kind: "outage",
        worldMinute: 360,
        atCurrentLocation: true,
      },
    ]);
    expect(Object.keys(projection.physicalSignals[0]!).sort()).toEqual([
      "atCurrentLocation",
      "id",
      "kind",
      "worldMinute",
    ]);
    expect(JSON.stringify(projection)).not.toContain("sourceProbeId");
    expect(JSON.stringify(projection)).not.toContain("endsWorldMinute");
    expect(JSON.stringify(projection)).not.toContain("destroyedHardwareIds");

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);
    expect(store.getTable("physicalSignals")).toEqual({
      "physical:1": {
        kind: "outage",
        worldMinute: 360,
        atCurrentLocation: true,
      },
    });

    // Moving later keeps the evidence in ATTENTION history but marks it as an
    // old room's event, so RoomSurface can refuse to render it as current.
    state.economy.housing = "housing-sleeper-unit";
    expect(projectWorld(state).physicalSignals[0]!.atCurrentLocation).toBe(false);
  });

  it("the D030 peer-assistant beat has deterministic provenance", () => {
    const state = physicalWorld("rig", true);
    state.underground.seed = seedThatTriggers(state, { adoption: true });

    const events = physicalRetaliationTick(state, 1, 360);
    const actor = actorOf(state);

    expect(actor.modelId).toBe("model-local-salvage");
    expect(state.physicalThreats[0]!.assistantAdoptedModelId).toBe(
      "model-local-salvage",
    );
    expect(events).toContainEqual({
      type: "NpcAssistantAdopted",
      actorId: ACTOR_ID,
      modelId: "model-local-salvage",
      causeThreatId: "physical:1",
      worldMinute: 360,
    });
  });

  it("legacy saves gain an empty P3 list and no fake pause state", () => {
    const legacy = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "cobaltxz", rank: 100_000 },
      targets: [],
      knownTargetIds: [],
    });

    expect(legacy.physicalThreats).toEqual([]);
    expect(legacy.builds).toEqual([]);
  });

  it("P3 produces consequences and causes, never a run ending", () => {
    const state = arm(physicalWorld("rig", true));
    const events = physicalRetaliationTick(state, 1, 360);

    expect(events.some((event) => event.type === "PhysicalThreat")).toBe(true);
    expect(events.map((event) => String(event.type))).not.toContain("RunEnded");
  });
});
