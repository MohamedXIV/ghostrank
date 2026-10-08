import { describe, expect, it, vi } from "vitest";

import { MAX_ADVANCE_MINUTES, MAX_PUMP_BOUNDARIES } from "@/game/simulation/command-bus";
import { runningJobFor } from "@/game/simulation/scheduler/job-queue";
import { createInitialWorldState, type WorldState } from "@/game/simulation/state/world-state";
import { createGameRuntime, type GameRuntime } from "@/game/runtime/game-runtime";
import {
  CLOCK_FRAME_MS,
  CLOCK_SPEED_BOUNDARIES_PER_SECOND,
  createClockDriver,
  type ClockDriverPort,
} from "@/game/runtime/time-driver";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { findHousingItem } from "@/content/housing-catalog";
import {
  formatClockMinute,
  type ClockNotice,
} from "@/game/runtime/time-notices";

const DAY = 24 * 60;
const TICK = 360;
const LEASE = "housing-basement-cot";

function quietWorld(): WorldState {
  return createInitialWorldState({ player: { handle: "CobaltXZ", rank: 100_256 } });
}

function portFor(runtime: GameRuntime): ClockDriverPort {
  return {
    execute: (command) => runtime.execute(command),
    eventCount: () => runtime.eventCount(),
    eventsSince: (index) => runtime.eventsSince(index),
    clockBusy: () => runningJobFor(runtime.snapshot().jobQueue, "clock") !== null,
  };
}

function setup(world: WorldState = quietWorld(), speed?: "paused" | "live" | "x4" | "sprint") {
  const runtime = createGameRuntime(world);
  const notices: ClockNotice[] = [];
  const driver = createClockDriver({
    port: portFor(runtime),
    onNotice: (notice) => notices.push(notice),
    speed,
  });

  return { runtime, driver, notices };
}

/** A wait past the synchronous horizon, so the clock owns the rest. */
function startLongWait(runtime: GameRuntime) {
  runtime.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES + 10 * DAY });
}

describe("clock driver pacing (Game-First G1)", () => {
  it("plays live by default", () => {
    const { driver } = setup();

    expect(driver.speed()).toBe("live");
  });

  it("holds a paused job where it stands without cancelling it", () => {
    const { runtime, driver } = setup(quietWorld(), "paused");
    startLongWait(runtime);
    const before = runtime.snapshot().worldMinute;

    expect(driver.frame(60_000).pumped).toBe(0);

    expect(runtime.snapshot().worldMinute).toBe(before);
    expect(runningJobFor(runtime.snapshot().jobQueue, "clock")).not.toBeNull();
  });

  it("accumulates fractional boundaries across frames rather than dropping them", () => {
    const { runtime, driver } = setup(quietWorld(), "live");
    startLongWait(runtime);
    const start = runtime.snapshot().worldMinute;

    // Live plays half a boundary per second, so one 250 ms frame is an eighth of one.
    const perFrame = (CLOCK_SPEED_BOUNDARIES_PER_SECOND.live * CLOCK_FRAME_MS) / 1000;
    const framesPerBoundary = Math.round(1 / perFrame);
    const pumps: number[] = [];
    for (let i = 0; i < framesPerBoundary; i += 1) {
      pumps.push(driver.frame(CLOCK_FRAME_MS).pumped);
    }

    expect(pumps.slice(0, -1).every((count) => count === 0)).toBe(true);
    expect(pumps.at(-1)).toBe(1);
    expect(runtime.snapshot().worldMinute).toBe(start + TICK);
  });

  it("speeds playback by the tunable per-second rates", () => {
    const { runtime, driver } = setup(quietWorld(), "sprint");
    startLongWait(runtime);
    const start = runtime.snapshot().worldMinute;

    const expected = CLOCK_SPEED_BOUNDARIES_PER_SECOND.sprint;
    expect(driver.frame(1_000).pumped).toBe(expected);

    expect(runtime.snapshot().worldMinute).toBe(start + expected * TICK);
  });

  it("caps one frame at the pump bound so a backgrounded tab cannot stall the page", () => {
    const { runtime, driver } = setup(quietWorld(), "x4");
    startLongWait(runtime);

    expect(driver.frame(10 * 60 * 60 * 1000).pumped).toBe(MAX_PUMP_BOUNDARIES);
  });

  it("does nothing while the clock is free", () => {
    const { runtime, driver } = setup(quietWorld(), "sprint");
    const count = runtime.eventCount();

    expect(driver.frame(1_000).pumped).toBe(0);
    expect(runtime.eventCount()).toBe(count);
  });

  it("runs a long wait to completion through the same pump command the terminal uses", () => {
    const { runtime, driver } = setup(quietWorld(), "sprint");
    const target = MAX_ADVANCE_MINUTES + 3 * DAY;
    runtime.execute({ type: "advanceTime", minutes: target });

    let frames = 0;
    while (runningJobFor(runtime.snapshot().jobQueue, "clock") && frames < 10_000) {
      driver.frame(1_000);
      frames += 1;
    }

    expect(runtime.snapshot().worldMinute).toBe(target);
    expect(runtime.snapshot().jobQueue.jobs).toEqual([]);
    expect(
      runtime.events().filter((event) => event.type === "TimeJobCompleted"),
    ).toHaveLength(1);
  });
});

describe("clock driver notices (Game-First G1)", () => {
  it("tells the player when a lapsed lease stops a sleep, exactly once", () => {
    const world = quietWorld();
    world.economy.housing = LEASE;
    world.economy.credits = 0;
    const { runtime, driver, notices } = setup(world);
    const rent = findHousingItem(LEASE)!.dailyCost;
    expect(rent).toBeGreaterThan(0);

    runtime.execute({ type: "sleep", minutes: 3 * DAY });
    driver.frame(CLOCK_FRAME_MS);
    driver.frame(CLOCK_FRAME_MS);

    expect(notices).toEqual([
      {
        tone: "interrupt",
        text: "Your lease ended at Day 2 · 00:00. Time stopped there.",
        worldMinute: DAY,
      },
    ]);
  });

  it("delivers notices from a command issued outside the driver, such as the terminal", () => {
    const { runtime, driver, notices } = setup();
    runtime.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + 10 * DAY });
    runtime.execute({ type: "cancelAdvance" });

    driver.frame(0);

    expect(notices).toEqual([
      {
        tone: "notice",
        text: `Clock halted at ${formatClockMinute(MAX_ADVANCE_MINUTES)}.`,
        worldMinute: MAX_ADVANCE_MINUTES,
      },
    ]);
  });

  it("never replays history that predates the driver", () => {
    const world = quietWorld();
    world.economy.housing = LEASE;
    world.economy.credits = 0;
    const runtime = createGameRuntime(world);
    runtime.execute({ type: "advanceTime", minutes: 2 * DAY });
    const notices: ClockNotice[] = [];

    createClockDriver({ port: portFor(runtime), onNotice: (n) => notices.push(n) }).frame(0);

    expect(notices).toEqual([]);
  });
});

describe("clock driver lifecycle (Game-First G1)", () => {
  it("starts one timer, drives it at the frame rate, and stops it on dispose", () => {
    const { runtime, driver } = setup(quietWorld(), "sprint");
    startLongWait(runtime);

    const callbacks: Array<() => void> = [];
    const intervals: number[] = [];
    const stop = vi.fn();
    const start = vi.fn((callback: () => void, intervalMs: number) => {
      callbacks.push(callback);
      intervals.push(intervalMs);
      return callbacks.length;
    });
    const timed = createClockDriver({
      port: portFor(runtime),
      onNotice: () => undefined,
      timer: { start, stop },
      speed: "sprint",
    });

    timed.start();
    timed.start();
    expect(start).toHaveBeenCalledTimes(1);
    expect(intervals).toEqual([CLOCK_FRAME_MS]);

    const before = runtime.snapshot().worldMinute;
    callbacks[0]!();
    expect(runtime.snapshot().worldMinute).toBeGreaterThan(before);

    timed.dispose();
    expect(stop).toHaveBeenCalledWith(1);
    driver.dispose();
  });
});

describe("clock driver over a real slice world", () => {
  it("keeps the notices a slice interruption produces in the event log order", () => {
    const { runtime, driver, notices } = setup(createSliceWorldState());
    runtime.execute({ type: "fastForward", minutes: 14 * DAY });
    driver.frame(0);

    const stops = runtime
      .events()
      .filter((event) => event.type === "TimeJobInterrupted");

    expect(notices.filter((notice) => notice.tone === "interrupt")).toHaveLength(
      stops.length,
    );
  });
});
