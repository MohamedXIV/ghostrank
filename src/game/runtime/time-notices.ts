import type { SimulationEvent } from "@/game/simulation/events/types";
import { classifyEvent } from "@/game/simulation/systems/time-jobs";

/**
 * Player-safe wording for clock events (Game-First G1, #77).
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

/**
 * What a stop may say about itself (G1 closeout, D063). `batch` is the set of
 * events recorded with the stop, so a stop can be traced to the expiry that
 * caused it. `contractKnown` answers whether the player can see a contract.
 */
export interface StopContext {
  batch: readonly SimulationEvent[];
  contractKnown: (contractId: string) => boolean;
}

/** Without a context, nothing is known, so every stop keeps its generic wording. */
export const NO_STOP_CONTEXT: StopContext = {
  batch: [],
  contractKnown: () => false,
};

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
 * Whether a stop at `worldMinute` may name a contract deadline. It may only
 * when a contract that expired at that minute, in the same batch, is one the
 * player knows. A hidden expiry is never named, and the notice never counts
 * expiries, so it reveals nothing the player has not already seen.
 */
function knownExpiryAt(context: StopContext, worldMinute: number): boolean {
  return context.batch.some(
    (event) =>
      event.type === "ContractExpired" &&
      event.worldMinute === worldMinute &&
      context.contractKnown(event.contractId),
  );
}

/** The wording for a stop. A lapsed lease is named; anything else stays generic. */
function interruptNotice(
  cause: string,
  worldMinute: number,
  namesKnownContract: boolean,
): ClockNotice {
  const at = formatClockMinute(worldMinute);

  if (cause === "HousingChanged") {
    return {
      tone: "interrupt",
      text: `Your lease ended at ${at}. Time stopped there.`,
      worldMinute,
    };
  }

  if (cause === "ContractExpired" && namesKnownContract) {
    return {
      tone: "interrupt",
      text: `A known contract deadline passed. Time stopped at ${at}.`,
      worldMinute,
    };
  }

  return {
    tone: "interrupt",
    text: `Something needs your attention. Time stopped at ${at}.`,
    worldMinute,
  };
}

/**
 * The notice a time-job event deserves, or null when it passes quietly. Starts,
 * progress and completions are the clock doing its job, so they stay silent.
 */
export function describeTimeJobEvent(
  event: SimulationEvent,
  context: StopContext = NO_STOP_CONTEXT,
): ClockNotice | null {
  switch (event.type) {
    case "TimeJobCancelled":
      return {
        tone: "notice",
        text: `Clock halted at ${formatClockMinute(event.worldMinute)}.`,
        worldMinute: event.worldMinute,
      };

    case "TimeJobInterrupted":
      return interruptNotice(
        event.cause,
        event.worldMinute,
        event.cause === "ContractExpired" &&
          knownExpiryAt(context, event.worldMinute),
      );

    default:
      return null;
  }
}

/**
 * The notice a live-time step deserves. Only events that need the player's
 * attention qualify. A run ending is not a notice, because the ending screen
 * is its own record.
 */
export function describeLiveEvent(
  event: SimulationEvent,
  context: StopContext = NO_STOP_CONTEXT,
): ClockNotice | null {
  if (event.type === "RunEnded" || classifyEvent(event) !== "interrupt") {
    return null;
  }

  if (!("worldMinute" in event)) {
    return null;
  }

  const namesKnownContract =
    event.type === "ContractExpired" && context.contractKnown(event.contractId);

  return interruptNotice(event.type, event.worldMinute, namesKnownContract);
}
