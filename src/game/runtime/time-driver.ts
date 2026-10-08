import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  MAX_PUMP_BOUNDARIES,
  type CommandResult,
} from "@/game/simulation/command-bus";
import {
  describeTimeJobEvent,
  type ClockNotice,
} from "@/game/runtime/time-notices";

/**
 * Runtime clock driver (Game-First G1, #77).
 *
 * Presentation only. The driver decides how fast a running time job plays
 * back on the real clock; it never decides what the simulation does. Every
 * step is a `pumpTime` command through the same session the terminal and the
 * desktop use, so pacing cannot skip, reorder or invent a boundary.
 */

export const CLOCK_SPEEDS = ["paused", "live", "x4", "sprint"] as const;

export type ClockSpeed = (typeof CLOCK_SPEEDS)[number];

/**
 * Tunable playback rates, in ecosystem boundaries (six world hours each) per
 * real second. `paused` holds the job where it stands without cancelling it.
 */
export const CLOCK_SPEED_BOUNDARIES_PER_SECOND: Record<ClockSpeed, number> = {
  paused: 0,
  live: 0.5,
  x4: 2,
  sprint: 8,
};

/** Real milliseconds between playback frames. */
export const CLOCK_FRAME_MS = 250;

export interface ClockDriverPort {
  execute: (command: SimulationCommand) => CommandResult;
  /** Events recorded so far. */
  eventCount: () => number;
  /** Events recorded at or after `index`. */
  eventsSince: (index: number) => readonly SimulationEvent[];
  /** True while a time job owns the clock. */
  clockBusy: () => boolean;
}

export interface ClockTimer {
  start: (callback: () => void, intervalMs: number) => unknown;
  stop: (handle: unknown) => void;
}

export interface ClockDriverOptions {
  port: ClockDriverPort;
  onNotice: (notice: ClockNotice) => void;
  timer?: ClockTimer;
  speed?: ClockSpeed;
  frameMs?: number;
}

export interface ClockFrame {
  /** Ecosystem boundaries this frame asked the simulation to run. */
  pumped: number;
}

export interface ClockDriver {
  speed: () => ClockSpeed;
  setSpeed: (speed: ClockSpeed) => void;
  /** Starts the real-time timer. Idempotent. */
  start: () => void;
  /** Stops the real-time timer. The job is left where it stands. */
  dispose: () => void;
  /**
   * Advances playback by `elapsedMs` of real time. The timer calls this; tests
   * call it directly so pacing is exact and needs no real clock.
   */
  frame: (elapsedMs: number) => ClockFrame;
}

const defaultTimer: ClockTimer = {
  start: (callback, intervalMs) => globalThis.setInterval(callback, intervalMs),
  stop: (handle) => globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

export function createClockDriver(options: ClockDriverOptions): ClockDriver {
  const { port, onNotice } = options;
  const timer = options.timer ?? defaultTimer;
  const frameMs = options.frameMs ?? CLOCK_FRAME_MS;
  let speed: ClockSpeed = options.speed ?? "live";
  let carry = 0;
  let cursor = port.eventCount();
  let handle: unknown = null;

  const deliverNotices = () => {
    const fresh = port.eventsSince(cursor);
    cursor += fresh.length;

    for (const event of fresh) {
      const notice = describeTimeJobEvent(event);

      if (notice) {
        onNotice(notice);
      }
    }
  };

  const frame = (elapsedMs: number): ClockFrame => {
    // Events from a terminal command or a previous frame reach the player here,
    // whoever issued them, so nothing is shown twice or missed.
    deliverNotices();

    if (!port.clockBusy() || speed === "paused") {
      carry = 0;
      return { pumped: 0 };
    }

    carry = Math.min(
      carry + (CLOCK_SPEED_BOUNDARIES_PER_SECOND[speed] * elapsedMs) / 1000,
      MAX_PUMP_BOUNDARIES,
    );
    const boundaries = Math.floor(carry);

    if (boundaries < 1) {
      return { pumped: 0 };
    }

    carry -= boundaries;
    port.execute({ type: "pumpTime", maxBoundaries: boundaries });
    deliverNotices();

    return { pumped: boundaries };
  };

  return {
    speed: () => speed,

    setSpeed(next) {
      speed = next;
      carry = 0;
    },

    start() {
      if (handle !== null) {
        return;
      }

      handle = timer.start(() => {
        frame(frameMs);
      }, frameMs);
    },

    dispose() {
      if (handle !== null) {
        timer.stop(handle);
        handle = null;
      }
    },

    frame,
  };
}
