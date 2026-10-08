"use client";

import { useCell } from "tinybase/ui-react";

import type { GameSession } from "@/game/runtime/game-session";
import type { TimeJobKind } from "@/game/simulation/systems/time-jobs";
import {
  CLOCK_SPEEDS,
  type ClockDriverPort,
  type ClockSpeed,
} from "@/game/runtime/time-driver";
import {
  formatClockMinute,
  type ClockNotice,
} from "@/game/runtime/time-notices";

const SPEED_LABEL: Record<ClockSpeed, string> = {
  paused: "Pause",
  "1x": "1×",
  "4x": "4×",
  "16x": "16×",
};

const JOB_LABEL: Record<string, string> = {
  wait: "Waiting",
  sleep: "Sleeping",
  "fast-forward": "Fast-forwarding",
};

/**
 * The driver's view of the session. Every call is a command or a projection
 * read, the same ones the terminal uses, so the HUD cannot see more than it does.
 */
export function createSessionClockPort(session: GameSession): ClockDriverPort {
  const cell = (cellId: string) =>
    session.projection.getCell("meta", "clock", cellId);

  return {
    execute: (command) => session.execute(command),
    eventCount: () => session.eventCount(),
    eventsSince: (index) => session.eventsSince(index),
    worldMinute: () =>
      Number(session.projection.getCell("meta", "world", "worldMinute") ?? 0),
    clockJob: () => {
      const kind = cell("jobKind");

      if (typeof kind !== "string" || kind === "") {
        return null;
      }

      return {
        key: `${kind}:${String(cell("jobStartedWorldMinute"))}:${String(cell("jobTargetWorldMinute"))}`,
        kind: kind as TimeJobKind,
      };
    },
  };
}

/**
 * The visible clock (Game-First G1, D056). It renders projections only: the
 * calendar minute, the job holding the clock with its progress, playback
 * controls and the latest player-safe notice. Halt sends `cancelAdvance`, the
 * same command the terminal's `halt` produces.
 */
export function ClockHud({
  session,
  speed,
  onSpeed,
  notice,
  onDismissNotice,
}: {
  session: GameSession;
  speed: ClockSpeed;
  onSpeed: (speed: ClockSpeed) => void;
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

  const span = targetMinute - startedMinute;
  const progress =
    span > 0 ? Math.min(1, Math.max(0, (worldMinute - startedMinute) / span)) : 1;

  const modeText = jobKind
    ? `${JOB_LABEL[jobKind] ?? "Running"} until ${formatClockMinute(targetMinute)}`
    : speed === "paused"
      ? "Paused"
      : "Live time";

  return (
    <section className="clock-hud" aria-label="World clock">
      <div className="clock-hud__status">
        <span className="clock-hud__time">{formatClockMinute(worldMinute)}</span>
        <span className="clock-hud__job">{modeText}</span>

        {jobKind ? (
          <progress
            className="clock-hud__progress"
            value={progress}
            max={1}
            aria-label="Clock job progress"
          />
        ) : null}
      </div>

      <div className="clock-hud__controls">
        <div className="clock-hud__speeds" role="group" aria-label="Playback speed">
          {CLOCK_SPEEDS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={speed === option}
              onClick={() => onSpeed(option)}
            >
              {SPEED_LABEL[option]}
            </button>
          ))}
        </div>

        {jobKind ? (
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
        ) : null}
      </div>

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
