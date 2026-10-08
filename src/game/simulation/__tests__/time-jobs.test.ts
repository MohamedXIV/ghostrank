import { describe, expect, it } from "vitest";

import {
  CommandBus,
  MAX_ADVANCE_MINUTES,
  MAX_PUMP_MINUTES,
} from "@/game/simulation/command-bus";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  createInitialWorldState,
  type WorldState,
} from "@/game/simulation/state/world-state";
import {
  classifyEvent,
  firstStopEvent,
  stopClassesFor,
} from "@/game/simulation/systems/time-jobs";
import {
  clockJobs,
  drainClock,
  pumpUntil,
  runToCompletion,
  worldWithoutJobQueue,
} from "@/game/simulation/__tests__/clock-helpers";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { findHousingItem } from "@/content/housing-catalog";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import { worldStateSchema } from "@/persistence/world-state-schema";

const DAY = 24 * 60;
const LEASE = "housing-basement-cot";
const RENT = findHousingItem(LEASE)!.dailyCost;

/** A world with no ecosystem, so only the clock itself can stop or move it. */
function quietWorld(rank = 100_256): WorldState {
  return createInitialWorldState({
    player: { handle: "CobaltXZ", rank },
  });
}

/** A quiet world whose lease lapses on the first day after `paidDays` are covered. */
function leaseWorld(paidDays: number): WorldState {
  const state = quietWorld();
  state.economy.housing = LEASE;
  state.economy.credits = RENT * paidDays;
  return state;
}

/** A quiet world with a stranded compromise already recorded at `atMinute`. */
function strandedWorld(atMinute: number): WorldState {
  const state = quietWorld();
  state.compromises = [
    {
      id: "compromise:stranded-test",
      kind: "stranded",
      sourceThreatId: "threat:test",
      sourceProbeId: "probe:test",
      sourceInvestigationIds: [],
      locationId: "location:test",
      worldMinute: atMinute,
    },
  ];
  return state;
}

/** Pumps the clock to completion and returns every event the pumps emitted. */
function pumpCollectingEvents(
  bus: CommandBus,
  minutes: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  for (let pumps = 0; clockJobs(bus.snapshot()).length > 0; pumps += 1) {
    if (pumps > 10_000) {
      throw new Error("clock job did not drain");
    }

    const result = bus.execute({ type: "pumpTime", minutes });
    expect(result.ok).toBe(true);
    events.push(...result.events);
  }

  return events;
}

describe("time job classification (D055)", () => {
  it("gives each kind its own stop classes", () => {
    expect(stopClassesFor("wait")).toEqual([]);
    expect(stopClassesFor("sleep")).toEqual(["interrupt"]);
    expect(stopClassesFor("fast-forward")).toEqual(["interrupt", "notice"]);
  });

  it("treats a run ending and a lapsed lease as interrupts, and a new lease as silent", () => {
    const ended: SimulationEvent = {
      type: "RunEnded",
      status: "stranded",
      causeKind: "compromise",
      causeId: "compromise:x",
      worldMinute: 0,
    };
    const lapsed: SimulationEvent = {
      type: "HousingChanged",
      housingId: null,
      dailyCost: 0,
      worldMinute: 0,
    };
    const signed: SimulationEvent = {
      type: "HousingChanged",
      housingId: LEASE,
      dailyCost: RENT,
      worldMinute: 0,
    };

    expect(classifyEvent(ended)).toBe("interrupt");
    expect(classifyEvent(lapsed)).toBe("interrupt");
    expect(classifyEvent(signed)).toBe("silent");
  });

  it("never stops a wait, whatever happens inside it", () => {
    const ended: SimulationEvent = {
      type: "RunEnded",
      status: "stranded",
      causeKind: "compromise",
      causeId: "compromise:x",
      worldMinute: 0,
    };

    expect(firstStopEvent("wait", [ended])).toBeNull();
  });

  it("reports the first stopping event in chronological order", () => {
    const trace: SimulationEvent = {
      type: "TraceRecorded",
      traceId: "trace:1",
      targetId: "nightshade",
      cause: "operation-escalation",
      severity: "high",
      worldMinute: 360,
    };
    const lapsed: SimulationEvent = {
      type: "HousingChanged",
      housingId: null,
      dailyCost: 0,
      worldMinute: 720,
    };
    const events = [trace, lapsed];

    expect(firstStopEvent("fast-forward", events)).toBe(trace);
    expect(firstStopEvent("sleep", events)).toBe(lapsed);
  });
});

describe("time jobs own the clock (D055)", () => {
  it("refuses every other command while a wait holds the clock", () => {
    const bus = new CommandBus(quietWorld());
    bus.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES + DAY });

    const blocked: SimulationCommand[] = [
      { type: "advanceTime", minutes: 1 },
      { type: "sleep", minutes: 1 },
      { type: "readMessage", messageId: "message:none" },
      { type: "startRetirement" },
    ];

    for (const command of blocked) {
      expect(bus.execute(command)).toEqual({
        ok: false,
        events: [],
        error: "TIME_JOB_ACTIVE",
      });
    }
    expect(bus.snapshot().worldMinute).toBe(MAX_ADVANCE_MINUTES);
    expect(clockJobs(bus.snapshot())).toHaveLength(1);
  });

  it("refuses to cancel a wait and keeps it on the clock", () => {
    const bus = new CommandBus(quietWorld());
    bus.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES + DAY });
    const before = bus.snapshot();

    expect(bus.execute({ type: "cancelAdvance" })).toEqual({
      ok: false,
      events: [],
      error: "ADVANCE_NOT_CANCELLABLE",
    });
    expect(bus.snapshot()).toEqual(before);
  });

  it("releases the clock where it stands when a sleep is cancelled", () => {
    const bus = new CommandBus(quietWorld());
    bus.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + DAY });
    pumpUntil(bus, MAX_ADVANCE_MINUTES);

    const result = bus.execute({ type: "cancelAdvance" });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      expect.objectContaining({
        type: "TimeJobCancelled",
        kind: "sleep",
        worldMinute: MAX_ADVANCE_MINUTES,
        targetWorldMinute: MAX_ADVANCE_MINUTES + DAY,
      }),
    ]);
    expect(clockJobs(bus.snapshot())).toEqual([]);
    expect(bus.execute({ type: "advanceTime", minutes: 1 }).ok).toBe(true);
    expect(bus.snapshot().worldMinute).toBe(MAX_ADVANCE_MINUTES + 1);
  });

  it("reports cancelling with nothing running as a plain refusal", () => {
    const bus = new CommandBus(quietWorld());

    expect(bus.execute({ type: "cancelAdvance" })).toEqual({
      ok: false,
      events: [],
      error: "NO_ACTIVE_TIME_JOB",
    });
  });

  it("treats an idle pump as a no-op and bounds the pump size", () => {
    const bus = new CommandBus(quietWorld());
    const before = bus.snapshot();

    expect(bus.execute({ type: "pumpTime", minutes: 5 })).toEqual({
      ok: true,
      events: [],
    });
    for (const bad of [0, MAX_PUMP_MINUTES + 1, 1.5]) {
      expect(
        bus.execute({ type: "pumpTime", minutes: bad }),
      ).toEqual({ ok: false, events: [], error: "INVALID_TIME_DELTA" });
    }
    expect(bus.snapshot()).toEqual(before);
  });

  it("refuses non-positive or fractional durations before any time moves", () => {
    for (const command of [
      { type: "sleep", minutes: 0 },
      { type: "fastForward", minutes: -5 },
      { type: "sleep", minutes: 1.5 },
    ] as const) {
      const bus = new CommandBus(quietWorld());
      const before = bus.snapshot();

      expect(bus.execute(command)).toEqual({
        ok: false,
        events: [],
        error: "INVALID_TIME_DELTA",
      });
      expect(bus.snapshot()).toEqual(before);
    }
  });

  it("queues a sleep for the runtime clock instead of resolving it in its command", () => {
    const bus = new CommandBus(quietWorld());

    const result = bus.execute({ type: "sleep", minutes: 3 * DAY });

    expect(result.events.map((event) => event.type)).toEqual(["TimeJobStarted"]);
    expect(bus.snapshot().worldMinute).toBe(0);
    expect(clockJobs(bus.snapshot())).toHaveLength(1);
  });

  it("completes an unstopped sleep exactly where a wait would end", () => {
    const sleeper = new CommandBus(quietWorld());
    const events = runToCompletion(sleeper, { type: "sleep", minutes: 3 * DAY });

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "TimeJobCompleted",
        kind: "sleep",
        worldMinute: 3 * DAY,
      }),
    );

    const waiter = new CommandBus(quietWorld());
    waiter.execute({ type: "advanceTime", minutes: 3 * DAY });

    expect(worldWithoutJobQueue(sleeper.snapshot())).toEqual(
      worldWithoutJobQueue(waiter.snapshot()),
    );
  });
});

describe("interruption (D055)", () => {
  it("stops a sleep the moment a lapsed lease ends housing, and frees the clock", () => {
    const bus = new CommandBus(leaseWorld(0));

    const events = runToCompletion(bus, { type: "sleep", minutes: 3 * DAY });

    expect(events).toContainEqual(
      expect.objectContaining({
        type: "TimeJobInterrupted",
        kind: "sleep",
        worldMinute: DAY,
        targetWorldMinute: 3 * DAY,
        cause: "HousingChanged",
      }),
    );
    expect(events.some((event) => event.type === "TimeJobCompleted")).toBe(false);
    expect(bus.snapshot().worldMinute).toBe(DAY);
    expect(clockJobs(bus.snapshot())).toEqual([]);
  });

  it("stops a pumped sleep on the same minute for every pump batch size", () => {
    const total = 150 * DAY;
    // Three paid days, so the lease lapses at the start of day four.
    const lapse = 4 * DAY;

    // 97 is deliberately not a boundary: a stop must not depend on where a pump ends.
    const runs = [1, 97, TICK_MINUTES, MAX_PUMP_MINUTES].map((size) => {
      const bus = new CommandBus(leaseWorld(3));
      const started = bus.execute({ type: "sleep", minutes: total });
      expect(started.ok).toBe(true);
      const pumped = pumpCollectingEvents(bus, size);
      const stop = [...started.events, ...pumped].filter(
        (event) => event.type === "TimeJobInterrupted",
      );

      return { stop, world: worldWithoutJobQueue(bus.snapshot()) };
    });

    for (const run of runs) {
      expect(run.stop).toEqual([
        expect.objectContaining({
          kind: "sleep",
          worldMinute: lapse,
          targetWorldMinute: total,
          cause: "HousingChanged",
        }),
      ]);
      expect(run.world.worldMinute).toBe(lapse);
    }
    expect(runs[1]!.world).toEqual(runs[0]!.world);
    expect(runs[2]!.world).toEqual(runs[0]!.world);
  });

  it("a fast-forward stops at the first notice that a sleep runs past", () => {
    const probe = new CommandBus(createSliceWorldState());
    const notice = probe
      .execute({ type: "advanceTime", minutes: 14 * DAY })
      .events.find(
        (event): event is Extract<SimulationEvent, { worldMinute: number }> =>
          classifyEvent(event) === "notice" && "worldMinute" in event,
      );
    expect(notice).toBeDefined();

    const forward = new CommandBus(createSliceWorldState());
    const forwardStop = runToCompletion(forward, {
      type: "fastForward",
      minutes: 14 * DAY,
    }).find((event) => event.type === "TimeJobInterrupted");

    expect(forwardStop).toEqual(
      expect.objectContaining({
        kind: "fast-forward",
        cause: notice!.type,
      }),
    );
    expect(
      forwardStop?.type === "TimeJobInterrupted" &&
        forwardStop.worldMinute >= notice!.worldMinute,
    ).toBe(true);

    const sleeper = new CommandBus(createSliceWorldState());
    const sleepEvents = runToCompletion(sleeper, {
      type: "sleep",
      minutes: 14 * DAY,
    });
    const sleepCauses = sleepEvents.flatMap((event) =>
      event.type === "TimeJobInterrupted" ? [event.cause] : [],
    );

    expect(sleepCauses).not.toContain(notice!.type);
  });
});

describe("first ending wins over a time job (D054, D055)", () => {
  it("freezes a queued wait at the ending minute and refuses later time", () => {
    const queued = new CommandBus(strandedWorld(2 * DAY));

    const started = queued.execute({
      type: "advanceTime",
      minutes: MAX_ADVANCE_MINUTES + 5 * DAY,
    });

    expect(started.ok).toBe(true);
    expect(started.events).toContainEqual(
      expect.objectContaining({
        type: "RunEnded",
        status: "stranded",
        worldMinute: 2 * DAY,
      }),
    );
    expect(queued.snapshot().worldMinute).toBe(2 * DAY);
    expect(queued.snapshot().ending).toEqual(
      expect.objectContaining({ status: "stranded", worldMinute: 2 * DAY }),
    );
    expect(clockJobs(queued.snapshot())).toEqual([]);
    expect(queued.execute({ type: "pumpTime", minutes: 1 })).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });

    const direct = new CommandBus(strandedWorld(2 * DAY));
    direct.execute({ type: "advanceTime", minutes: 5 * DAY });

    expect(worldWithoutJobQueue(queued.snapshot())).toEqual(
      worldWithoutJobQueue(direct.snapshot()),
    );
  });

  it("an ending mid-sleep freezes it at its boundary, whatever the pump size", () => {
    // Endings resolve on ecosystem boundaries. 1080 is one, and pumps of 97
    // minutes land on every kind of offset around it.
    const endingMinute = 3 * TICK_MINUTES;
    const runs = [97, TICK_MINUTES, MAX_PUMP_MINUTES].map((size) => {
      const bus = new CommandBus(strandedWorld(endingMinute));
      const started = bus.execute({ type: "sleep", minutes: 10 * DAY });
      const events = [...started.events, ...pumpCollectingEvents(bus, size)];

      return { events, snapshot: bus.snapshot() };
    });

    for (const run of runs) {
      expect(run.events).toContainEqual(
        expect.objectContaining({ type: "RunEnded", worldMinute: endingMinute }),
      );
      expect(
        run.events.some(
          (event) =>
            event.type === "TimeJobInterrupted" ||
            event.type === "TimeJobCompleted",
        ),
      ).toBe(false);
      expect(run.snapshot.worldMinute).toBe(endingMinute);
      expect(clockJobs(run.snapshot)).toEqual([]);
    }
    expect(worldWithoutJobQueue(runs[1]!.snapshot)).toEqual(
      worldWithoutJobQueue(runs[0]!.snapshot),
    );
    expect(worldWithoutJobQueue(runs[2]!.snapshot)).toEqual(
      worldWithoutJobQueue(runs[0]!.snapshot),
    );
  });

  it("an ending that shares a minute with a lapsed lease wins, and the lapse is not an interruption", () => {
    const state = strandedWorld(DAY);
    state.economy.housing = LEASE;
    state.economy.credits = 0;
    const bus = new CommandBus(state);

    const events = runToCompletion(bus, { type: "sleep", minutes: 3 * DAY }, 97);

    expect(events).toContainEqual(
      expect.objectContaining({ type: "RunEnded", worldMinute: DAY }),
    );
    expect(events.some((event) => event.type === "TimeJobInterrupted")).toBe(false);
    expect(bus.snapshot().worldMinute).toBe(DAY);
    expect(clockJobs(bus.snapshot())).toEqual([]);
  });

  it("records no completion or interruption for a sleep that the ending cuts short", () => {
    const bus = new CommandBus(strandedWorld(2 * DAY));

    const events = runToCompletion(bus, { type: "sleep", minutes: 10 * DAY });

    expect(events).toContainEqual(
      expect.objectContaining({ type: "RunEnded", worldMinute: 2 * DAY }),
    );
    expect(
      events.some(
        (event) =>
          event.type === "TimeJobCompleted" ||
          event.type === "TimeJobInterrupted",
      ),
    ).toBe(false);
    expect(clockJobs(bus.snapshot())).toEqual([]);
  });
});

describe("save and reload mid-job (D055)", () => {
  it("resumes a saved mid-wait world to the same result as an uninterrupted run", () => {
    const total = MAX_ADVANCE_MINUTES + 2 * DAY;
    const live = new CommandBus(createSliceWorldState());
    live.execute({ type: "advanceTime", minutes: total });
    const midJob = live.snapshot();
    expect(clockJobs(midJob)).toHaveLength(1);

    const restored = parsePortableRunSave(serializePortableRunSave(midJob));
    expect(restored.jobQueue).toEqual(midJob.jobQueue);

    const resumed = new CommandBus(restored);
    drainClock(resumed, 7 * TICK_MINUTES);
    drainClock(live, MAX_PUMP_MINUTES);

    const straight = new CommandBus(createSliceWorldState());
    straight.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES });
    straight.execute({ type: "advanceTime", minutes: 2 * DAY });

    expect(resumed.snapshot().worldMinute).toBe(total);
    expect(worldWithoutJobQueue(resumed.snapshot())).toEqual(
      worldWithoutJobQueue(straight.snapshot()),
    );
    expect(worldWithoutJobQueue(live.snapshot())).toEqual(
      worldWithoutJobQueue(straight.snapshot()),
    );
  });

  it("resumes a saved mid-sleep world to the same result as an uninterrupted sleep", () => {
    const live = new CommandBus(createSliceWorldState());
    live.execute({ type: "sleep", minutes: 3 * DAY });
    expect(live.execute({ type: "pumpTime", minutes: 1_000 }).ok).toBe(true);
    const midJob = live.snapshot();
    expect(clockJobs(midJob)).toHaveLength(1);
    expect(midJob.worldMinute).toBe(1_000);

    const restored = parsePortableRunSave(serializePortableRunSave(midJob));
    expect(restored.jobQueue).toEqual(midJob.jobQueue);

    const resumed = new CommandBus(restored);
    drainClock(resumed, 37);
    drainClock(live, MAX_PUMP_MINUTES);

    const straight = new CommandBus(createSliceWorldState());
    runToCompletion(straight, { type: "sleep", minutes: 3 * DAY });

    expect(worldWithoutJobQueue(resumed.snapshot())).toEqual(
      worldWithoutJobQueue(straight.snapshot()),
    );
    expect(worldWithoutJobQueue(live.snapshot())).toEqual(
      worldWithoutJobQueue(straight.snapshot()),
    );
  });

  it("loads a pre-G1 save with an empty job queue", () => {
    const legacy: Record<string, unknown> = { ...createSliceWorldState() };
    delete legacy.jobQueue;

    const parsed = worldStateSchema.parse(legacy);

    expect(parsed.jobQueue).toEqual({ nextSequence: 0, jobs: [] });
  });
});

describe("rank independence and replay (D055)", () => {
  it("never lets player rank change how a time job stops or completes", () => {
    const low = createSliceWorldState();
    low.player.rank = 1;
    const high = createSliceWorldState();
    high.player.rank = 999_999;
    const lowBus = new CommandBus(low);
    const highBus = new CommandBus(high);

    const lowEvents = runToCompletion(lowBus, { type: "fastForward", minutes: 14 * DAY });
    const highEvents = runToCompletion(highBus, { type: "fastForward", minutes: 14 * DAY });

    expect(highEvents).toEqual(lowEvents);
    expect(highBus.snapshot().underground).toEqual(lowBus.snapshot().underground);
    expect(highBus.snapshot().worldMinute).toBe(lowBus.snapshot().worldMinute);
  });

  it("replays a mixed sequence of time jobs identically, refusals included", () => {
    const script: SimulationCommand[] = [
      { type: "fastForward", minutes: 10 * DAY },
      { type: "sleep", minutes: 5 * DAY },
      { type: "advanceTime", minutes: 2 * DAY },
      { type: "sleep", minutes: MAX_ADVANCE_MINUTES + DAY },
      { type: "pumpTime", minutes: 9 * TICK_MINUTES },
      { type: "cancelAdvance" },
    ];

    // Every outcome is recorded, including the TIME_JOB_ACTIVE refusals that a
    // command sent while a job still owns the clock produces.
    const run = () => {
      const bus = new CommandBus(createSliceWorldState());
      const outcomes = script.map((command) => bus.execute(command));
      return { outcomes, world: bus.snapshot() };
    };

    const first = run();
    expect(first.outcomes.some((outcome) => outcome.error === "TIME_JOB_ACTIVE")).toBe(true);
    expect(run()).toEqual(first);
  });
});
