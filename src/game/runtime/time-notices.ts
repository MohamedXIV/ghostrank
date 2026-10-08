import type { SimulationEvent } from "@/game/simulation/events/types";

/**
 * Player-safe wording for time-job events (Game-First G1, #77).
 *
 * Only public event fields are read. A stop says that something needs
 * attention; it never names the hidden actor, probe or trace behind it, so the
 * notice cannot leak what the player has not earned.
 */

export interface ClockNotice {
  tone: "interrupt" | "notice";
  text: string;
  worldMinute: number;
}

const MINUTES_PER_DAY = 24 * 60;

/** `Day 3 · 06:00`: the calendar the player reads, derived from world minutes. */
export function formatClockMinute(worldMinute: number): string {
  const day = Math.floor(worldMinute / MINUTES_PER_DAY) + 1;
  const minuteOfDay = worldMinute % MINUTES_PER_DAY;
  const hours = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minutes = String(minuteOfDay % 60).padStart(2, "0");

  return `Day ${day} · ${hours}:${minutes}`;
}

/**
 * The notice a time-job event deserves, or null when it passes quietly. Starts,
 * progress and completions are the clock doing its job, so they stay silent.
 */
export function describeTimeJobEvent(event: SimulationEvent): ClockNotice | null {
  switch (event.type) {
    case "TimeJobCancelled":
      return {
        tone: "notice",
        text: `Clock halted at ${formatClockMinute(event.worldMinute)}.`,
        worldMinute: event.worldMinute,
      };

    case "TimeJobInterrupted":
      if (event.cause === "HousingChanged") {
        return {
          tone: "interrupt",
          text: `Your lease ended at ${formatClockMinute(event.worldMinute)}. Time stopped there.`,
          worldMinute: event.worldMinute,
        };
      }

      return {
        tone: "interrupt",
        text: `Something needs your attention. Time stopped at ${formatClockMinute(event.worldMinute)}.`,
        worldMinute: event.worldMinute,
      };

    default:
      return null;
  }
}
