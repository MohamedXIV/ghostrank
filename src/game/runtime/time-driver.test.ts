import { describe, expect, it, vi } from "vitest";

import {
  MAX_ADVANCE_MINUTES,
  MAX_PUMP_MINUTES,
} from "@/game/simulation/command-bus";
import { runningJobFor } from "@/game/simulation/scheduler/job-queue";
import {
  createInitialWorldState,
  type WorldState,
} from "@/game/simulation/state/world-state";
import type { TimeJobKind } from "@/game/simulation/systems/time-jobs";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";
import { createGameRuntime, type GameRuntime } from "@/game/runtime/game-runtime";
import {
  CLOCK_BASE_MINUTES_PER_SECOND,
  CLOCK_CATCHUP_MS,
  CLOCK_FRAME_MS,
  createClockDriver,
  type ClockDriverPort,
  type ClockSpeed,
} from "@/game/runtime/time-driver";
import {
  formatClockMinute,
  type ClockNotice,
} from "@/game/runtime/time-notices";
import { findHousingItem } from "@/content/housing-catalog";

const DAY = 24 * 60;
const LEASE = "housing-basement-cot";

function quietWorld(): WorldState {
  return createInitialWorldState({ player: { handle: "CobaltXZ", rank: 100_256 } });
}

/** A quiet world whose lease lapses on the first day, with no credits to pay it. */
function lapsingLeaseWorld(): WorldState {
  const world = quietWorld();
  world.economy.housing = LEASE;
  world.economy.credits = 0;
  expect(findHousingItem(LEASE)!.dailyCost).toBeGreaterThan(0);
  return world;
}

function portFor(runtime: GameRuntime): ClockDriverPort {
  return {
    execute: (command) => runtime.execute(command),
    eventCount: () => runtime.eventCount(),
    eventsSince: (index) => runtime.eventsSince(index),
    worldMinute: () => runtime.snapshot().worldMinute,
    clockJob: () => {
      const job = runningJobFor(runtime.snapshot().jobQueue, "clock");

      return job ? { key: job.id, kind: job.kind as TimeJobKind } : null;
    },
  };
}

/** A driver on a fake clock. Each frame is stepped by hand, so pacing is exact. */
function setup(
  world: WorldState = quietWorld(),
  speed?: ClockSpeed,
) {
  const runtime = createGameRuntime(world);
  const notices: ClockNotice[] = [];
  const speeds: ClockSpeed[] = [];
  const driver = createClockDriver({
    port: portFor(runtime),
    onNotice: (notice) => notices.push(notice),
    onSpeedChange: (next) => speeds.push(next),
    now: () => 0,
    speed,
  });

  return { runtime, driver, notices, speeds };
}

function framesOf(driver: { frame: (ms: number) => { advancedMinutes: number } }, ms: number, count: number): number {
  let advanced = 0;

  for (let i = 0; i < count; i += 1) {
    advanced += driver.frame(ms).advancedMinutes;
  }

  return advanced;
}

describe("live time pacing (Game-First G1, D056)", () => {
  it("starts on 1x, the live pace", () => {
    expect(setup().driver.speed()).toBe("1x");
  });

  it("plays idle live time at one game minute per 1.5 real seconds", () => {
    const { runtime, driver } = setup();

    // Six 250 ms frames are 1.5 s: exactly one game minute.
    expect(framesOf(driver, CLOCK_FRAME_MS, 6)).toBe(1);
    expect(runtime.snapshot().worldMinute).toBe(1);

    // Another 1.5 s is another minute, so the rate holds rather than drifting.
    expect(framesOf(driver, CLOCK_FRAME_MS, 6)).toBe(1);
    expect(runtime.snapshot().worldMinute).toBe(2);
    expect(CLOCK_BASE_MINUTES_PER_SECOND.live).toBeCloseTo(2 / 3);
  });

  it("holds the world exactly still while the player has paused", () => {
    const { runtime, driver } = setup(quietWorld(), "paused");

    expect(framesOf(driver, 60_000, 5)).toBe(0);
    expect(runtime.snapshot().worldMinute).toBe(0);
  });

  it("holds a hidden tab still and owes it nothing when it returns", () => {
    const { runtime, driver } = setup();

    driver.setVisible(false);
    expect(framesOf(driver, 60_000, 5)).toBe(0);
    expect(runtime.snapshot().worldMinute).toBe(0);

    driver.setVisible(true);
    expect(driver.frame(0).advancedMinutes).toBe(0);
    expect(runtime.snapshot().worldMinute).toBe(0);
  });

  it("forfeits a long stall rather than replaying it in a burst", () => {
    const { runtime, driver } = setup();
    const allowance = Math.floor(
      (CLOCK_CATCHUP_MS / 1000) * CLOCK_BASE_MINUTES_PER_SECOND.live,
    );

    // Ten minutes in one frame replays only the catch-up allowance.
    expect(driver.frame(10 * 60 * 1000).advancedMinutes).toBe(allowance);
    expect(driver.frame(0).advancedMinutes).toBe(0);
    expect(runtime.snapshot().worldMinute).toBe(allowance);
  });

  it("runs every live boundary in order while it plays", () => {
    const { runtime, driver } = setup();
    const start = runtime.snapshot().worldMinute;

    // 250 ms frames at 1x: six frames are one game minute, so 360 frames span
    // one ecosystem boundary, and that boundary runs in its place in order.
    framesOf(driver, CLOCK_FRAME_MS, 6 * TICK_MINUTES);

    expect(runtime.snapshot().worldMinute).toBe(start + TICK_MINUTES);
  });

  it("reports speed changes once, and only when the speed really changes", () => {
    const { driver, speeds } = setup();

    driver.setSpeed("4x");
    driver.setSpeed("4x");
    driver.setSpeed("paused");

    expect(speeds).toEqual(["4x", "paused"]);
  });
});

describe("time job pacing (Game-First G1, D056)", () => {
  it("plays a sleep through the clock at the sleep pace, not inside its command", () => {
    const { runtime, driver } = setup(quietWorld(), "16x");
    runtime.execute({ type: "sleep", minutes: 3 * DAY });

    const frames = [];
    while (runningJobFor(runtime.snapshot().jobQueue, "clock") && frames.length < 10_000) {
      frames.push(driver.frame(CLOCK_FRAME_MS).advancedMinutes);
    }

    expect(runtime.snapshot().worldMinute).toBe(3 * DAY);
    expect(frames.some((minutes) => minutes > 0)).toBe(true);
    expect(frames.length).toBeGreaterThan(2);
  });

  it("stops a sleep at a lapsed lease, shows why, and pauses for the player", () => {
    const { runtime, driver, notices, speeds } = setup(lapsingLeaseWorld(), "16x");
    runtime.execute({ type: "sleep", minutes: 3 * DAY });

    for (let i = 0; i < 10_000 && runningJobFor(runtime.snapshot().jobQueue, "clock"); i += 1) {
      driver.frame(CLOCK_FRAME_MS);
    }

    expect(runtime.snapshot().worldMinute).toBe(DAY);
    expect(runningJobFor(runtime.snapshot().jobQueue, "clock")).toBeNull();
    expect(notices).toEqual([
      {
        tone: "interrupt",
        text: `Your lease ended at ${formatClockMinute(DAY)}. Time stopped there.`,
        worldMinute: DAY,
      },
    ]);
    expect(speeds.at(-1)).toBe("paused");
  });

  it("wakes a paused clock to 1x when the player asks for time to pass", () => {
    const { runtime, driver, speeds } = setup(quietWorld(), "paused");
    runtime.execute({ type: "fastForward", minutes: 2 * DAY });

    driver.frame(0);

    expect(driver.speed()).toBe("1x");
    expect(speeds).toEqual(["1x"]);
  });

  it("shows a halt once, and live time owes nothing from the sleep it replaces", () => {
    const { runtime, driver, notices } = setup(quietWorld(), "1x");
    runtime.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + DAY });
    framesOf(driver, CLOCK_FRAME_MS, 10);

    runtime.execute({ type: "cancelAdvance" });
    const before = runtime.snapshot().worldMinute;

    // Whatever the sleep had not yet spent is forfeited, not handed to live time.
    expect(driver.frame(0).advancedMinutes).toBe(0);
    expect(runtime.snapshot().worldMinute).toBe(before);

    // Live time then plays at its own pace: six frames make one minute.
    expect(framesOf(driver, CLOCK_FRAME_MS, 6)).toBe(1);
    expect(runtime.snapshot().worldMinute).toBe(before + 1);
    expect(notices.map((notice) => notice.tone)).toEqual(["notice"]);
  });

  it("paces a long wait in bounded pumps and never past the pump bound", () => {
    const { runtime, driver } = setup(quietWorld(), "16x");
    runtime.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES + 10 * DAY });

    const start = runtime.snapshot().worldMinute;
    const perFrame = driver.frame(60_000).advancedMinutes;

    expect(perFrame).toBeGreaterThan(0);
    expect(perFrame).toBeLessThanOrEqual(MAX_PUMP_MINUTES);
    expect(runtime.snapshot().worldMinute).toBe(start + perFrame);
  });

  it("plays a sleep one minute at a time, so its pace is smooth rather than boundary-sized", () => {
    const { runtime, driver } = setup(quietWorld(), "1x");
    runtime.execute({ type: "sleep", minutes: 3 * DAY });

    // Four 250 ms frames of sleep (30 game minutes per second) play 30 minutes.
    const advanced = framesOf(driver, CLOCK_FRAME_MS, 4);

    expect(advanced).toBe(30);
    expect(runtime.snapshot().worldMinute).toBe(30);
  });
});

describe("clock driver notices and lifecycle (Game-First G1)", () => {
  it("delivers notices from a command issued outside the driver, such as the terminal", () => {
    const { runtime, driver, notices } = setup();
    runtime.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + 10 * DAY });
    runtime.execute({ type: "cancelAdvance" });

    driver.frame(0);

    expect(notices).toEqual([
      {
        tone: "notice",
        text: `Clock halted at ${formatClockMinute(0)}.`,
        worldMinute: 0,
      },
    ]);
  });

  it("never replays history that predates the driver", () => {
    const runtime = createGameRuntime(lapsingLeaseWorld());
    runtime.execute({ type: "advanceTime", minutes: 2 * DAY });
    const notices: ClockNotice[] = [];

    createClockDriver({
      port: portFor(runtime),
      onNotice: (notice) => notices.push(notice),
      now: () => 0,
    }).frame(0);

    expect(notices).toEqual([]);
  });

  it("starts one timer, drives it at the frame rate, and stops it on dispose", () => {
    let clock = 0;
    const callbacks: Array<() => void> = [];
    const intervals: number[] = [];
    const stop = vi.fn();
    const start = vi.fn((callback: () => void, intervalMs: number) => {
      callbacks.push(callback);
      intervals.push(intervalMs);
      return callbacks.length;
    });
    const runtime = createGameRuntime(quietWorld());
    const driver = createClockDriver({
      port: portFor(runtime),
      onNotice: () => undefined,
      timer: { start, stop },
      now: () => clock,
    });

    driver.start();
    driver.start();
    expect(start).toHaveBeenCalledTimes(1);
    expect(intervals).toEqual([CLOCK_FRAME_MS]);

    clock += CLOCK_FRAME_MS;
    callbacks[0]!();
    expect(runtime.snapshot().worldMinute).toBeGreaterThanOrEqual(0);

    driver.dispose();
    expect(stop).toHaveBeenCalledWith(1);
  });

  it("uses measured frame time, so a slow frame plays the time it really took", () => {
    let clock = 0;
    const callbacks: Array<() => void> = [];
    const runtime = createGameRuntime(quietWorld());
    const driver = createClockDriver({
      port: portFor(runtime),
      onNotice: () => undefined,
      timer: {
        start: (callback) => {
          callbacks.push(callback);
          return 1;
        },
        stop: () => undefined,
      },
      now: () => clock,
    });

    driver.start();
    clock = 1_500;
    callbacks[0]!();

    expect(runtime.snapshot().worldMinute).toBe(1);
  });
});
