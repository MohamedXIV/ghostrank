import { expect } from "vitest";

import {
  MAX_PUMP_MINUTES,
  type CommandBus,
} from "@/game/simulation/command-bus";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

/**
 * Shared helpers for the clock suites (Game-First G1, D055/D056). They only
 * inspect or drive the public command surface, so they test the same contract
 * the runtime clock uses.
 */

const MAX_PUMPS = 10_000;

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
  maxMinutes: number = MAX_PUMP_MINUTES,
): void {
  for (let pumps = 0; clockJobs(bus.snapshot()).length > 0; pumps += 1) {
    if (pumps > MAX_PUMPS) {
      throw new Error("clock job did not drain");
    }

    expect(bus.execute({ type: "pumpTime", minutes: maxMinutes }).ok).toBe(true);
  }
}

/**
 * Runs a command, then pumps whatever time job it started until the clock is
 * free. Returns every event in the order it happened, as a player would see it.
 */
export function runToCompletion(
  bus: CommandBus,
  command: SimulationCommand,
  maxMinutes: number = MAX_PUMP_MINUTES,
): SimulationEvent[] {
  const started = bus.execute(command);
  expect(started.ok).toBe(true);
  const events = [...started.events];

  for (let pumps = 0; clockJobs(bus.snapshot()).length > 0; pumps += 1) {
    if (pumps > MAX_PUMPS) {
      throw new Error("clock job did not drain");
    }

    const pumped = bus.execute({ type: "pumpTime", minutes: maxMinutes });
    expect(pumped.ok).toBe(true);
    events.push(...pumped.events);
  }

  return events;
}

/**
 * Pumps the clock job until the world reaches `worldMinute` or the job ends.
 * Each pump is sized to land exactly on the target, never past it.
 */
export function pumpUntil(
  bus: CommandBus,
  worldMinute: number,
  maxMinutes: number = MAX_PUMP_MINUTES,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  for (let pumps = 0; clockJobs(bus.snapshot()).length > 0; pumps += 1) {
    const now = bus.snapshot().worldMinute;
    if (now >= worldMinute || pumps > MAX_PUMPS) {
      break;
    }

    const minutes = Math.min(maxMinutes, worldMinute - now);
    const pumped = bus.execute({ type: "pumpTime", minutes });
    expect(pumped.ok).toBe(true);
    events.push(...pumped.events);
  }

  return events;
}
