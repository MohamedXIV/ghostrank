import { expect } from "vitest";

import type { CommandBus } from "@/game/simulation/command-bus";
import { MAX_PUMP_BOUNDARIES } from "@/game/simulation/command-bus";
import type { WorldState } from "@/game/simulation/state/world-state";

/**
 * Shared helpers for the clock suites (Game-First G1, D055). They only inspect
 * or drive the public command surface, so they test the same contract the
 * runtime clock uses.
 */

/** Jobs still owning the clock. The queue's sequence counter is bookkeeping, not world truth. */
export function clockJobs(state: WorldState) {
  return state.jobQueue.jobs.filter((job) => job.resource === "clock");
}

/**
 * Compares world truth only. The queue is excluded because it records how a
 * wait was scheduled (its sequence counter advances), not what happened.
 */
export function worldWithoutJobQueue(state: WorldState) {
  return { ...state, jobQueue: null };
}

/** Pumps the clock job until the queue is empty, failing loudly if it never drains. */
export function drainClock(
  bus: CommandBus,
  maxBoundaries: number = MAX_PUMP_BOUNDARIES,
): void {
  for (let pumps = 0; clockJobs(bus.snapshot()).length > 0; pumps += 1) {
    if (pumps > 10_000) {
      throw new Error("clock job did not drain");
    }

    expect(bus.execute({ type: "pumpTime", maxBoundaries }).ok).toBe(true);
  }
}
