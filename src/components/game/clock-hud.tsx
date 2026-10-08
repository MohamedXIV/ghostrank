"use client";

import { useState } from "react";
import { useCell } from "tinybase/ui-react";

import type { GameSession } from "@/game/runtime/game-session";
import {
  CLOCK_SPEEDS,
  type ClockDriver,
  type ClockDriverPort,
  type ClockSpeed,
} from "@/game/runtime/time-driver";
import {
  formatClockMinute,
  type ClockNotice,
} from "@/game/runtime/time-notices";

const SPEED_LABEL: Record<ClockSpeed, string> = {
  paused: "Pause",
  live: "Live",
  x4: "×4",
  sprint: "Sprint",
};

const JOB_LABEL: Record<string, string> = {
  wait: "Waiting",
  sleep: "Sleeping",
  "fast-forward": "Fast-forwarding",
};

/** The driver's view of the session: the same commands the terminal sends. */
export function createSessionClockPort(session: GameSession): ClockDriverPort {
  return {
    execute: (command) => session.execute(command),
    eventCount: () => session.eventCount(),
    eventsSince: (index) => session.eventsSince(index),
    clockBusy: () => session.projection.getCell("meta", "clock", "jobKind") !== "",
  };
}

/**
 * The visible clock (Game-First G1). It renders projections only: the calendar
 * minute, the job holding the clock with its progress, playback controls and the
 * latest player-safe notice. Halt sends `cancelAdvance`, the same command the
 * terminal's `halt` produces.
 */
export function ClockHud({
  session,
  driver,
  notice,
  onDismissNotice,
}: {
  session: GameSession;
  driver: ClockDriver;
  notice: ClockNotice | null;
  onDismissNotice: () => void;
}) {
  const store = session.projection;
  const worldMinute = Number(useCell("meta", "world", "worldMinute", store) ?? 0);
  const jobKind = String(useCell("meta", "clock", "jobKind", store) ?? "");
  const startedMinute = Number(
    useCell("meta", "clock", "jobStartedWorldMinute", store) ?? 0,
  );
  const targetMinute = Number(
    useCell("meta", "clock", "jobTargetWorldMinute", store) ?? 0,
  );
  const interruptible = useCell("meta", "clock", "interruptible", store) === true;
  const [speed, setSpeedState] = useState<ClockSpeed>(driver.speed());

  const setSpeed = (next: ClockSpeed) => {
    driver.setSpeed(next);
    setSpeedState(next);
  };

  const span = targetMinute - startedMinute;
  const progress =
    span > 0 ? Math.min(1, Math.max(0, (worldMinute - startedMinute) / span)) : 1;

  return (
    <section className="clock-hud" aria-label="World clock">
      <span className="clock-hud__time">{formatClockMinute(worldMinute)}</span>

      {jobKind ? (
        <>
          <span className="clock-hud__job">
            {JOB_LABEL[jobKind] ?? "Running"} until {formatClockMinute(targetMinute)}
          </span>
          <progress
            className="clock-hud__progress"
            value={progress}
            max={1}
            aria-label="Clock job progress"
          />
          <div className="clock-hud__speeds" role="group" aria-label="Playback speed">
            {CLOCK_SPEEDS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={speed === option}
                onClick={() => setSpeed(option)}
              >
                {SPEED_LABEL[option]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="clock-hud__halt"
            disabled={!interruptible}
            title={
              interruptible
                ? "Halt where the clock stands"
                : "This wait finishes on its own"
            }
            onClick={() => {
              session.execute({ type: "cancelAdvance" });
            }}
          >
            Halt
          </button>
        </>
      ) : null}

      {notice ? (
        <p
          role="status"
          className={`clock-hud__notice clock-hud__notice--${notice.tone}`}
        >
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss clock notice" onClick={onDismissNotice}>
            ×
          </button>
        </p>
      ) : null}
    </section>
  );
}
