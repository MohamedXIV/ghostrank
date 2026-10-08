import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  MAX_PUMP_MINUTES,
  type CommandResult,
} from "@/game/simulation/command-bus";
import {
  classifyEvent,
  type TimeJobKind,
} from "@/game/simulation/systems/time-jobs";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";
import {
  describeLiveEvent,
  describeTimeJobEvent,
  type ClockNotice,
} from "@/game/runtime/time-notices";

/**
 * Runtime clock driver (Game-First G1, #77; live time D056).
 *
 * Presentation only. The driver decides how fast the world's time passes on
 * the real clock; it never decides what the simulation does. Every step is a
 * command through the same session the terminal and the desktop use:
 *
 * - idle, on LIVE: one bounded `advanceLive` step at a time;
 * - a time job owns the clock: bounded `pumpTime` steps until it ends.
 *
 * Pacing can therefore never skip, reorder or invent a boundary.
 */

export const CLOCK_SPEEDS = ["paused", "1x", "4x", "16x"] as const;

export type ClockSpeed = (typeof CLOCK_SPEEDS)[number];

/** Multiplier on whatever is moving the clock. Zero is a tactical pause. */
export const CLOCK_MULTIPLIER: Record<ClockSpeed, number> = {
  paused: 0,
  "1x": 1,
  "4x": 4,
  "16x": 16,
};

/**
 * Base pace at 1x, in game minutes per real second, per thing that moves the
 * clock. LIVE is the design candidate of one game minute per 1.5 real seconds.
 * Sleep and fast-forward play so a normal rest takes seconds, not minutes.
 * These are provisional tuning values; changing them only changes pacing.
 */
export const CLOCK_BASE_MINUTES_PER_SECOND = {
  live: 2 / 3,
  wait: 120,
  sleep: 30,
  "fast-forward": 120,
} as const;

export type ClockPace = keyof typeof CLOCK_BASE_MINUTES_PER_SECOND;

/** Real milliseconds between playback frames. */
export const CLOCK_FRAME_MS = 250;

/**
 * Live time is requested in whole game minutes, so the store is written about
 * once a game minute rather than every frame.
 */
export const LIVE_STEP_MINUTES = 1;

/**
 * The most real time a stall may replay, in playback seconds at the current
 * pace and speed. Time a stalled timer missed beyond this is forfeited, never
 * replayed in a burst, so pacing never owes the player anything (D056). Two
 * seconds covers a normal frame and a short hitch; one live minute is 1.5 s.
 */
export const CLOCK_CATCHUP_MS = 2_000;

/** Absorbs binary floating error in the pacing arithmetic (2/3 of a minute). */
const PACE_EPSILON = 1e-9;

function whole(minutes: number): number {
  return Math.floor(minutes + PACE_EPSILON);
}

export interface ClockJobView {
  /** Identifies one job across frames, so a newly started job can be noticed. */
  key: string;
  kind: TimeJobKind;
}

export interface ClockDriverPort {
  execute: (command: SimulationCommand) => CommandResult;
  /** Events recorded so far. */
  eventCount: () => number;
  /** Events recorded at or after `index`. */
  eventsSince: (index: number) => readonly SimulationEvent[];
  /** The world's current minute. */
  worldMinute: () => number;
  /** The time job owning the clock, if any. */
  clockJob: () => ClockJobView | null;
}

export interface ClockTimer {
  start: (callback: () => void, intervalMs: number) => unknown;
  stop: (handle: unknown) => void;
}

export interface ClockDriverOptions {
  port: ClockDriverPort;
  onNotice: (notice: ClockNotice) => void;
  onSpeedChange?: (speed: ClockSpeed) => void;
  timer?: ClockTimer;
  /** Real time in milliseconds. Injected so pacing is exact under test. */
  now?: () => number;
  speed?: ClockSpeed;
  frameMs?: number;
}

export interface ClockFrame {
  /** What moved the clock this frame, or `idle` when nothing did. */
  mode: "idle" | ClockPace;
  /** World minutes the frame advanced. */
  advancedMinutes: number;
}

export interface ClockDriver {
  speed: () => ClockSpeed;
  setSpeed: (speed: ClockSpeed) => void;
  /**
   * Tab visibility. A hidden tab holds the world still and never catches up
   * when it returns: time is only ever played, never owed (no hidden losses).
   */
  setVisible: (visible: boolean) => void;
  /** Starts the real-time timer. Idempotent. */
  start: () => void;
  /** Stops the real-time timer. The world is left where it stands. */
  dispose: () => void;
  /** Advances playback by `elapsedMs` of real time. */
  frame: (elapsedMs: number) => ClockFrame;
}

const IDLE: ClockFrame = { mode: "idle", advancedMinutes: 0 };

const defaultTimer: ClockTimer = {
  start: (callback, intervalMs) => globalThis.setInterval(callback, intervalMs),
  stop: (handle) =>
    globalThis.clearInterval(handle as ReturnType<typeof setInterval>),
};

const defaultNow = () => globalThis.performance.now();

export function createClockDriver(options: ClockDriverOptions): ClockDriver {
  const { port, onNotice } = options;
  const timer = options.timer ?? defaultTimer;
  const now = options.now ?? defaultNow;
  const frameMs = options.frameMs ?? CLOCK_FRAME_MS;
  let speed: ClockSpeed = options.speed ?? "1x";
  let visible = true;
  let carryMinutes = 0;
  let lastFrameAt = now();
  let lastJobKey: string | null = null;
  let eventCursor = port.eventCount();
  let handle: unknown = null;

  const setSpeed = (next: ClockSpeed) => {
    if (next === speed) {
      return;
    }

    speed = next;
    carryMinutes = 0;
    options.onSpeedChange?.(next);
  };

  /** Shows events from any source that the driver has not shown yet. */
  const deliverNotices = () => {
    const fresh = port.eventsSince(eventCursor);
    eventCursor += fresh.length;

    for (const event of fresh) {
      const notice = describeTimeJobEvent(event);

      if (notice) {
        // An interruption stops playback so the player can read it.
        if (notice.tone === "interrupt") {
          setSpeed("paused");
        }
        onNotice(notice);
      }
    }
  };

  /**
   * Live steps that need attention pause the clock and say why. This is the
   * only place a live step is inspected, because it is the only place its
   * events are returned to the driver.
   */
  const reactToLiveEvents = (events: readonly SimulationEvent[]) => {
    for (const event of events) {
      if (classifyEvent(event) !== "interrupt") {
        continue;
      }

      const notice = describeLiveEvent(event);
      setSpeed("paused");

      if (notice) {
        onNotice(notice);
      }
      return;
    }
  };

  const frame = (elapsedMs: number): ClockFrame => {
    deliverNotices();

    const job = port.clockJob();
    const jobKey = job ? job.key : null;

    if (jobKey !== lastJobKey) {
      // Time owed to one job or to live time is never spent on another. A new
      // job, or the end of one (a halt, a stop or a finish), starts with none.
      lastJobKey = jobKey;
      carryMinutes = 0;

      // Asking for time to pass is a request to play. A paused clock resumes
      // at 1x so the rest the player asked for is not left frozen on screen.
      if (job && speed === "paused") {
        setSpeed("1x");
      }
    }

    if (!visible || speed === "paused") {
      carryMinutes = 0;
      return IDLE;
    }

    const pace: ClockPace = job ? job.kind : "live";
    const rate =
      CLOCK_BASE_MINUTES_PER_SECOND[pace] * CLOCK_MULTIPLIER[speed];
    carryMinutes = Math.min(
      carryMinutes + (rate * elapsedMs) / 1000,
      (rate * CLOCK_CATCHUP_MS) / 1000,
    );

    const before = port.worldMinute();

    if (job) {
      const minutes = Math.min(whole(carryMinutes), MAX_PUMP_MINUTES);

      if (minutes < 1) {
        return { mode: pace, advancedMinutes: 0 };
      }

      const pumped = port.execute({ type: "pumpTime", minutes });
      deliverNotices();

      if (!pumped.ok) {
        setSpeed("paused");
        return { mode: pace, advancedMinutes: 0 };
      }

      // A job that ended inside the pump leaves its unspent time behind.
      carryMinutes = port.clockJob()
        ? Math.max(0, carryMinutes - minutes)
        : 0;
    } else {
      const minutes = Math.min(whole(carryMinutes), TICK_MINUTES);

      if (minutes < LIVE_STEP_MINUTES) {
        return { mode: pace, advancedMinutes: 0 };
      }

      const stepped = port.execute({ type: "advanceLive", minutes });
      carryMinutes = Math.max(0, carryMinutes - minutes);

      if (!stepped.ok) {
        setSpeed("paused");
        return { mode: pace, advancedMinutes: 0 };
      }

      reactToLiveEvents(stepped.events);
      deliverNotices();
    }

    return { mode: pace, advancedMinutes: port.worldMinute() - before };
  };

  return {
    speed: () => speed,

    setSpeed,

    setVisible(next) {
      visible = next;

      if (!next) {
        carryMinutes = 0;
      }
    },

    start() {
      if (handle !== null) {
        return;
      }

      lastFrameAt = now();
      handle = timer.start(() => {
        const at = now();
        const elapsed = at - lastFrameAt;
        lastFrameAt = at;
        frame(elapsed);
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
