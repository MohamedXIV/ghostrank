import { describe, expect, it } from "vitest";

import {
  CommandBus,
  MAX_ADVANCE_MINUTES,
  MAX_PUMP_MINUTES,
} from "@/game/simulation/command-bus";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";

import {
  clockJobs,
  drainClock,
  worldWithoutJobQueue,
} from "@/game/simulation/__tests__/clock-helpers";

const DAY = 24 * 60;
const SEEDS = [20_261_003, 7, 424_242] as const;

/**
 * `WorldTimeAdvanced` marks how the player split a wait, so it is the one
 * event that legitimately differs between one wait and many. Everything else
 * is a simulation outcome and must match in order (D054).
 */
function simulationEvents(events: SimulationEvent[]): SimulationEvent[] {
  return events.filter((event) => event.type !== "WorldTimeAdvanced");
}

function runSplit(steps: number[], seed: number) {
  const bus = new CommandBus(createSliceWorldState({ seed }));
  const events: SimulationEvent[] = [];

  for (const minutes of steps) {
    const result = bus.execute({ type: "advanceTime", minutes });
    expect(result.ok).toBe(true);
    events.push(...result.events);
  }

  return { snapshot: bus.snapshot(), events: simulationEvents(events) };
}

describe("world clock equivalence (D054)", () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: fourteen 1-day waits equal one 14-day wait`, () => {
      const single = runSplit([14 * DAY], seed);
      const daily = runSplit(Array(14).fill(DAY), seed);

      expect(daily.snapshot).toEqual(single.snapshot);
      expect(daily.events).toEqual(single.events);
    });

    it(`seed ${seed}: thirty 1-day waits equal one 30-day wait`, () => {
      const single = runSplit([30 * DAY], seed);
      const daily = runSplit(Array(30).fill(DAY), seed);

      expect(daily.snapshot).toEqual(single.snapshot);
      expect(daily.events).toEqual(single.events);
    });

    it(`seed ${seed}: irregular splits equal one wait`, () => {
      const total = 14 * DAY;
      const single = runSplit([total], seed);
      const irregular = runSplit([1_000, 360, 7_000, 5_000, total - 13_360], seed);

      expect(irregular.snapshot).toEqual(single.snapshot);
      expect(irregular.events).toEqual(single.events);
    });
  }

  it("a 14-day wait processes the ecosystem through its final boundary", () => {
    const { snapshot } = runSplit([14 * DAY], SEEDS[0]);

    expect(snapshot.worldMinute).toBe(14 * DAY);
    expect(snapshot.underground.lastTickMinute).toBe(14 * DAY);
  });

  it("reaches the synchronous horizon exactly in one command", () => {
    const bus = new CommandBus(createSliceWorldState());

    expect(
      bus.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES }).ok,
    ).toBe(true);
    expect(bus.snapshot().worldMinute).toBe(MAX_ADVANCE_MINUTES);
    expect(clockJobs(bus.snapshot())).toEqual([]);
  });

  it("queues one minute past the horizon and drains it to the same world (D055)", () => {
    const queued = new CommandBus(createSliceWorldState());

    const started = queued.execute({
      type: "advanceTime",
      minutes: MAX_ADVANCE_MINUTES + 1,
    });
    expect(started.ok).toBe(true);
    expect(queued.snapshot().worldMinute).toBe(MAX_ADVANCE_MINUTES);
    expect(clockJobs(queued.snapshot())).toHaveLength(1);

    drainClock(queued);

    expect(queued.snapshot().worldMinute).toBe(MAX_ADVANCE_MINUTES + 1);
    expect(clockJobs(queued.snapshot())).toEqual([]);

    const direct = new CommandBus(createSliceWorldState());
    direct.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES });
    direct.execute({ type: "advanceTime", minutes: 1 });

    expect(worldWithoutJobQueue(queued.snapshot())).toEqual(
      worldWithoutJobQueue(direct.snapshot()),
    );
  });

  it("drains a queued long wait identically for any pump size", () => {
    const total = MAX_ADVANCE_MINUTES * 2 + 977;
    const reference = new CommandBus(createSliceWorldState());
    reference.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES });
    reference.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES });
    reference.execute({ type: "advanceTime", minutes: 977 });

    for (const pumpSize of [TICK_MINUTES, 7 * TICK_MINUTES, 1_000, MAX_PUMP_MINUTES]) {
      const pumped = new CommandBus(createSliceWorldState());
      pumped.execute({ type: "advanceTime", minutes: total });
      drainClock(pumped, pumpSize);

      expect(pumped.snapshot().worldMinute).toBe(total);
      expect(worldWithoutJobQueue(pumped.snapshot())).toEqual(
        worldWithoutJobQueue(reference.snapshot()),
      );
    }
  });

  it("a reloaded world continues exactly as one uninterrupted run", () => {
    const first = new CommandBus(createSliceWorldState());
    first.execute({ type: "advanceTime", minutes: 14 * DAY });

    const resumed = new CommandBus(first.snapshot());
    resumed.execute({ type: "advanceTime", minutes: 3 * DAY });

    const uninterrupted = new CommandBus(createSliceWorldState());
    uninterrupted.execute({ type: "advanceTime", minutes: 17 * DAY });

    expect(resumed.snapshot()).toEqual(uninterrupted.snapshot());
  });
});
