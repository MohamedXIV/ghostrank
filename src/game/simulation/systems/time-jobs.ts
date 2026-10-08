import type { SimulationEvent } from "@/game/simulation/events/types";

/**
 * Player-queued work that owns the clock until it finishes (Game-First G1,
 * #77). Each kind differs only in what may stop it early:
 *
 * - `wait` is a non-interruptible advance. It stops at the target or at a run
 *   ending, and nothing else.
 * - `sleep` is interrupted by anything that threatens the run or demands a
 *   decision (`interrupt`), and ignores ordinary notices.
 * - `fast-forward` is interrupted by `interrupt` and also by `notice`, so the
 *   player watches time pass and stops at anything they would want to see.
 *
 * Stops are decided per ecosystem boundary, never per command window, so a
 * stop lands on the same minute however the work is batched (D055).
 */
export type TimeJobKind = "wait" | "sleep" | "fast-forward";

export const TIME_JOB_KINDS: readonly TimeJobKind[] = [
  "wait",
  "sleep",
  "fast-forward",
];

/** Lower runs first when two time jobs share a due minute. */
export const TIME_JOB_PHASE: Record<TimeJobKind, number> = {
  wait: 0,
  sleep: 1,
  "fast-forward": 2,
};

export type NotificationClass = "interrupt" | "notice" | "silent";

export function isInterruptibleKind(kind: TimeJobKind): boolean {
  return kind !== "wait";
}

/**
 * The notification classes that stop a job of this kind. An empty set means the
 * job is never stopped early.
 */
export function stopClassesFor(kind: TimeJobKind): readonly NotificationClass[] {
  switch (kind) {
    case "wait":
      return [];
    case "sleep":
      return ["interrupt"];
    case "fast-forward":
      return ["interrupt", "notice"];
  }
}

/**
 * How a simulation event reaches the player. `interrupt` events threaten the
 * run or require a decision; `notice` events are worth seeing but not worth
 * waking for; everything else is silent. Classification reads only public event
 * fields, so it never depends on hidden truth.
 */
export function classifyEvent(event: SimulationEvent): NotificationClass {
  switch (event.type) {
    case "RunEnded":
    case "PhysicalThreat":
    case "CompromiseRecorded":
    case "Retaliation":
    case "OpponentReactionTriggered":
    case "InvestigationAdvanced":
    case "ContractExpired":
    case "BuildAborted":
      return "interrupt";

    case "HousingChanged":
      // A lapsed lease ends housing; a new lease is ordinary.
      return event.housingId === null ? "interrupt" : "silent";

    case "BuildCompleted":
    case "ContractOffered":
    case "ContractDelivered":
    case "MessageDelivered":
    case "PlayerRankChanged":
    case "RetirementCoolingStarted":
    case "TraceRecorded":
      return "notice";

    default:
      return "silent";
  }
}

/**
 * The first event in chronological order that stops a job of this kind, or
 * null when the window passes quietly.
 */
export function firstStopEvent(
  kind: TimeJobKind,
  events: readonly SimulationEvent[],
): SimulationEvent | null {
  const stopClasses = stopClassesFor(kind);

  if (stopClasses.length === 0) {
    return null;
  }

  return (
    events.find((event) => stopClasses.includes(classifyEvent(event))) ?? null
  );
}
