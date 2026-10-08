import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { worldWithoutJobQueue } from "@/game/simulation/__tests__/clock-helpers";
import { settledBuildDueMinute } from "@/game/simulation/systems/builds";
import { derivePresence } from "@/game/simulation/systems/location";
import { reconcileSchedule } from "@/game/simulation/systems/world-schedule";
import type { WorldState } from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";

/**
 * The world's own scheduler (Game-First G1, #77; D057). These tests drive the
 * public command surface and check the two things the scheduler must never get
 * wrong: the queue agrees with world truth at every step, and a deadline lands
 * on its exact minute whether or not an ecosystem tick falls there.
 */

const DAY = 24 * 60;
const TICK = 360;
const CLOUD_FRONTIER = "model-cloud-frontier";
const NET_MONITOR = "workflow-net-monitor"; // 120 base × frontier 0.7 = 84 minutes

/** Every job the world owns on its own schedule (builds, upkeep, releases). */
function systemJobs(state: WorldState) {
  return state.jobQueue.jobs.filter((job) => job.resource !== "clock");
}

function jobsFor(state: WorldState, subjectId: string) {
  return systemJobs(state).filter((job) => job.subjectId === subjectId);
}

function completedBuilds(events: SimulationEvent[]): SimulationEvent[] {
  return events.filter((event) => event.type === "BuildCompleted");
}

/**
 * The invariant the scheduler exists to keep: each running build holds one job at
 * its settled due minute, each paused build holds none, every outage still owed a
 * release holds exactly one, and the upkeep job waits for the next day boundary.
 */
function expectScheduleAgreesWithWorld(state: WorldState): void {
  for (const build of state.builds) {
    const jobs = jobsFor(state, build.id);

    if (build.pausedAtWorldMinute === undefined) {
      expect(jobs).toEqual([
        expect.objectContaining({
          kind: "build",
          resource: "rig",
          dueWorldMinute: settledBuildDueMinute(build),
        }),
      ]);
    } else {
      expect(jobs).toEqual([]);
    }
  }

  for (const job of systemJobs(state).filter((entry) => entry.kind === "build")) {
    expect(state.builds.map((build) => build.id)).toContain(job.subjectId);
  }

  for (const threat of state.physicalThreats) {
    if (threat.kind !== "outage" || threat.endsWorldMinute === undefined) {
      continue;
    }

    const owed =
      threat.endsWorldMinute > state.worldMinute ||
      state.builds.some((build) => build.pausedByThreatId === threat.id);
    const releases = systemJobs(state).filter(
      (job) => job.kind === "outage-release" && job.subjectId === threat.id,
    );

    expect(releases).toHaveLength(owed ? 1 : 0);
    if (owed) {
      expect(releases[0]!.dueWorldMinute).toBe(threat.endsWorldMinute);
    }
  }

  const upkeep = systemJobs(state).filter((job) => job.kind === "upkeep");
  expect(upkeep).toHaveLength(1);
  expect(upkeep[0]!.dueWorldMinute).toBe(
    (Math.floor(state.worldMinute / DAY) + 1) * DAY,
  );
}

/** A slice world at `atMinute` with a running model and nothing else in flight. */
function quietBus(atMinute = 0): CommandBus {
  const bus = new CommandBus(createSliceWorldState());
  if (atMinute > 0) {
    bus.execute({ type: "advanceTime", minutes: atMinute });
  }
  return bus;
}

/**
 * A rig outage that began at `TICK` and ends off every tick, with one build paused
 * by it. Ticks are every 360 minutes, so this release can only be honoured by a
 * deadline of its own, not by the tick that happens to follow it.
 */
function offTickOutageWorld(endsWorldMinute = 500): WorldState {
  const world = createSliceWorldState();
  const locationId = derivePresence(world.economy.housing).locationId;

  world.worldMinute = TICK;
  world.builds = [
    {
      id: "workflow:1",
      specId: NET_MONITOR,
      modelId: CLOUD_FRONTIER,
      startedWorldMinute: 0,
      dueWorldMinute: 400,
      outcome: "clean",
      pausedAtWorldMinute: TICK,
      pausedByThreatId: "physical:1",
    },
  ];
  world.physicalThreats = [
    {
      id: "physical:1",
      actorId: world.underground.actors[0]!.id,
      kind: "outage",
      signalKind: "outage",
      sourceProbeId: "probe:fixture",
      sourceInvestigationIds: [],
      locationId,
      worldMinute: TICK,
      endsWorldMinute,
      affectedBuildIds: ["workflow:1"],
      destroyedHardwareIds: [],
    },
  ];

  return world;
}

describe("world scheduler — deadlines are exact (Game-First G1, D057)", () => {
  it("releases an outage at its own minute, between ticks, and completes the build after it", () => {
    const bus = new CommandBus(offTickOutageWorld());
    expectScheduleAgreesWithWorld(bus.snapshot());

    // Up to the release, the build is still paused and owes nothing yet.
    bus.execute({ type: "advanceTime", minutes: 140 });
    const mid = bus.snapshot();
    expect(mid.worldMinute).toBe(500);
    expect(mid.builds[0]!.pausedAtWorldMinute).toBeUndefined();
    expect(mid.builds[0]).toMatchObject({
      accumulatedPausedMinutes: 140,
      dueWorldMinute: 400,
    });
    expect(settledBuildDueMinute(mid.builds[0]!)).toBe(540);
    expectScheduleAgreesWithWorld(mid);

    const done = bus.execute({ type: "advanceTime", minutes: 100 });
    expect(completedBuilds(done.events)).toEqual([
      expect.objectContaining({ buildId: "workflow:1", worldMinute: 540 }),
    ]);
    expect(bus.snapshot().builds).toEqual([]);
    expect(bus.snapshot().economy.ownedWorkflows[0]!.acquiredWorldMinute).toBe(540);
    expectScheduleAgreesWithWorld(bus.snapshot());
  });

  it("splitting a span that covers an off-tick outage changes nothing", () => {
    const whole = new CommandBus(offTickOutageWorld());
    const split = new CommandBus(offTickOutageWorld());

    const wholeEvents = whole.execute({ type: "advanceTime", minutes: 240 }).events;
    const splitEvents = [7, 133, 100].flatMap(
      (minutes) => split.execute({ type: "advanceTime", minutes }).events,
    );

    expect(worldWithoutJobQueue(split.snapshot())).toEqual(
      worldWithoutJobQueue(whole.snapshot()),
    );
    expect(completedBuilds(splitEvents)).toEqual(completedBuilds(wholeEvents));
    expect(completedBuilds(wholeEvents)).toHaveLength(1);
  });

  it("a build due on the exact minute of an ecosystem tick completes after that tick", () => {
    // Commission so the build is due precisely on the 360 boundary.
    const probe = quietBus();
    probe.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    probe.execute({ type: "startBuild", specId: NET_MONITOR });
    const duration = probe.snapshot().builds[0]!.dueWorldMinute;

    const bus = quietBus(TICK - duration);
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "startBuild", specId: NET_MONITOR });
    expect(bus.snapshot().builds[0]!.dueWorldMinute).toBe(TICK);
    expectScheduleAgreesWithWorld(bus.snapshot());

    const events = bus.execute({ type: "advanceTime", minutes: TICK }).events;

    expect(completedBuilds(events)).toEqual([
      expect.objectContaining({ buildId: "workflow:1", worldMinute: TICK }),
    ]);
    expectScheduleAgreesWithWorld(bus.snapshot());
  });

  it("an ending on the minute a build is due freezes it: nothing completes after the run ends", () => {
    const world = createSliceWorldState();
    world.compromises = [
      {
        id: "compromise:stranded-schedule",
        kind: "stranded",
        sourceThreatId: "threat:schedule",
        sourceProbeId: "probe:schedule",
        sourceInvestigationIds: [],
        locationId: "location:schedule",
        worldMinute: TICK,
      },
    ];

    const probe = quietBus();
    probe.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    probe.execute({ type: "startBuild", specId: NET_MONITOR });
    const duration = probe.snapshot().builds[0]!.dueWorldMinute;

    const bus = new CommandBus(world);
    bus.execute({ type: "advanceTime", minutes: TICK - duration });
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "startBuild", specId: NET_MONITOR });
    expect(bus.snapshot().builds[0]!.dueWorldMinute).toBe(TICK);

    const events = bus.execute({ type: "advanceTime", minutes: 2 * DAY }).events;
    const after = bus.snapshot();

    expect(events).toContainEqual(
      expect.objectContaining({ type: "RunEnded", worldMinute: TICK }),
    );
    expect(completedBuilds(events)).toEqual([]);
    expect(after.worldMinute).toBe(TICK);
    expect(after.builds).toHaveLength(1);
    expect(after.economy.ownedWorkflows).toEqual([]);
    expect(bus.execute({ type: "advanceTime", minutes: 1 }).error).toBe(
      "RUN_ENDED",
    );
  });

  it("aborting a build removes its job, so the build never completes", () => {
    const bus = quietBus();
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "startBuild", specId: NET_MONITOR });
    expect(jobsFor(bus.snapshot(), "workflow:1")).toHaveLength(1);

    const aborted = bus.execute({ type: "abortBuild", buildId: "workflow:1" });
    expect(aborted.events).toEqual([
      expect.objectContaining({ type: "BuildAborted", buildId: "workflow:1" }),
    ]);
    expect(jobsFor(bus.snapshot(), "workflow:1")).toEqual([]);
    expectScheduleAgreesWithWorld(bus.snapshot());

    const later = bus.execute({ type: "advanceTime", minutes: DAY });
    expect(completedBuilds(later.events)).toEqual([]);
    expect(bus.snapshot().economy.ownedWorkflows).toEqual([]);
  });

  it("keeps one upkeep job, due at the next day boundary, through every kind of wait", () => {
    const bus = quietBus();
    expect(systemJobs(bus.snapshot()).filter((job) => job.kind === "upkeep")).toEqual([
      expect.objectContaining({ dueWorldMinute: DAY }),
    ]);

    for (const minutes of [53, 360, 7, 211, 2 * DAY]) {
      bus.execute({ type: "advanceLive", minutes });
      expectScheduleAgreesWithWorld(bus.snapshot());
    }
  });

  it("a build commissioned before a day boundary completes on its minute across that boundary", () => {
    const bus = quietBus(DAY - 10);
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "startBuild", specId: NET_MONITOR });
    const due = bus.snapshot().builds[0]!.dueWorldMinute;

    const events = bus.execute({ type: "advanceTime", minutes: due + 2 * DAY }).events;

    expect(events).toContainEqual(
      expect.objectContaining({ type: "BuildCompleted", worldMinute: due }),
    );
    expectScheduleAgreesWithWorld(bus.snapshot());
  });

  it("a save made mid-outage restores the same release and completion", () => {
    const original = new CommandBus(offTickOutageWorld()).snapshot();
    const restored = worldStateSchema.parse(JSON.parse(JSON.stringify(original)));

    expect(restored.jobQueue).toEqual(original.jobQueue);
    expect(systemJobs(restored)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "release:physical:1",
          kind: "outage-release",
          resource: "system",
          subjectId: "physical:1",
          dueWorldMinute: 500,
        }),
      ]),
    );

    const fromSave = new CommandBus(restored);
    const fromLive = new CommandBus(structuredClone(original));
    const saveEvents = fromSave.execute({ type: "advanceTime", minutes: 240 }).events;
    const liveEvents = fromLive.execute({ type: "advanceTime", minutes: 240 }).events;

    expect(saveEvents).toEqual(liveEvents);
    expect(worldWithoutJobQueue(fromSave.snapshot())).toEqual(
      worldWithoutJobQueue(fromLive.snapshot()),
    );
  });

  it("a save from before the scheduler re-derives its builds and outage release", () => {
    const modern = new CommandBus(offTickOutageWorld()).snapshot();
    const second = structuredClone(modern);
    second.builds.push({
      id: "workflow:2",
      specId: NET_MONITOR,
      modelId: CLOUD_FRONTIER,
      startedWorldMinute: TICK,
      dueWorldMinute: 700,
      outcome: "warnings",
    });

    // Pre-D057 saves carry no system jobs at all.
    const legacy = { ...structuredClone(second), jobQueue: { nextSequence: 0, jobs: [] } };
    const derived = new CommandBus(legacy).snapshot();
    const reference = new CommandBus(second).snapshot();

    const shape = (state: WorldState) =>
      systemJobs(state).map((job) => ({
        id: job.id,
        kind: job.kind,
        resource: job.resource,
        dueWorldMinute: job.dueWorldMinute,
        subjectId: job.subjectId,
      }));

    expect(shape(derived)).toEqual(shape(reference));
    expect(shape(derived)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "release:physical:1", dueWorldMinute: 500 }),
        expect.objectContaining({ id: "workflow:2", dueWorldMinute: 700 }),
      ]),
    );
    expectScheduleAgreesWithWorld(derived);
  });

  it("reconciling a settled schedule again changes nothing", () => {
    const bus = new CommandBus(offTickOutageWorld());
    const before = structuredClone(bus.snapshot().jobQueue);

    const again = structuredClone(bus.snapshot());
    reconcileSchedule(again);
    reconcileSchedule(again);

    expect(again.jobQueue).toEqual(before);
  });
});
