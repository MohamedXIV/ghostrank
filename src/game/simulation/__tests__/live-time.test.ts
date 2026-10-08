import { describe, expect, it } from "vitest";

import { CommandBus, MAX_ADVANCE_MINUTES } from "@/game/simulation/command-bus";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  createInitialWorldState,
  type WorldState,
} from "@/game/simulation/state/world-state";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  clockJobs,
  worldWithoutJobQueue,
} from "@/game/simulation/__tests__/clock-helpers";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";

const DAY = 24 * 60;

/** Live time is a stream of player-invisible steps; WorldTimeAdvanced marks each one. */
function simulationEvents(events: SimulationEvent[]): SimulationEvent[] {
  return events.filter((event) => event.type !== "WorldTimeAdvanced");
}

function quietWorld(): WorldState {
  return createInitialWorldState({ player: { handle: "CobaltXZ", rank: 100_256 } });
}

function strandedWorld(atMinute: number): WorldState {
  const state = quietWorld();
  state.compromises = [
    {
      id: "compromise:stranded-live",
      kind: "stranded",
      sourceThreatId: "threat:live",
      sourceProbeId: "probe:live",
      sourceInvestigationIds: [],
      locationId: "location:live",
      worldMinute: atMinute,
    },
  ];
  return state;
}

/** Deliberately misaligned step sizes, so splits fall off every boundary. */
function irregularSteps(total: number): number[] {
  const pattern = [97, TICK_MINUTES, 1, 263, 359];
  const steps: number[] = [];
  let left = total;

  for (let i = 0; left > 0; i += 1) {
    const step = Math.min(pattern[i % pattern.length]!, left);
    steps.push(step);
    left -= step;
  }

  return steps;
}

describe("idle live time (Game-First G1, D056)", () => {
  it("runs the same world as one wait, however the live steps are split", () => {
    const stepped = new CommandBus(createSliceWorldState());
    const steppedEvents: SimulationEvent[] = [];

    for (const minutes of irregularSteps(3 * DAY)) {
      const result = stepped.execute({ type: "advanceLive", minutes });
      expect(result.ok).toBe(true);
      steppedEvents.push(...result.events);
    }

    const waited = new CommandBus(createSliceWorldState());
    const waitEvents = waited.execute({ type: "advanceTime", minutes: 3 * DAY }).events;

    expect(stepped.snapshot().worldMinute).toBe(3 * DAY);
    expect(worldWithoutJobQueue(stepped.snapshot())).toEqual(
      worldWithoutJobQueue(waited.snapshot()),
    );
    expect(simulationEvents(steppedEvents)).toEqual(simulationEvents(waitEvents));
  });

  it("accepts exactly one ecosystem boundary per step and refuses anything outside 1..360", () => {
    const bus = new CommandBus(createSliceWorldState());
    const before = bus.snapshot();

    for (const minutes of [0, -5, TICK_MINUTES + 1, 1.5]) {
      expect(bus.execute({ type: "advanceLive", minutes })).toEqual({
        ok: false,
        events: [],
        error: "INVALID_TIME_DELTA",
      });
    }
    expect(bus.snapshot()).toEqual(before);

    expect(bus.execute({ type: "advanceLive", minutes: TICK_MINUTES }).ok).toBe(true);
    expect(bus.snapshot().worldMinute).toBe(TICK_MINUTES);
  });

  it("is refused while a time job owns the clock", () => {
    const bus = new CommandBus(quietWorld());
    bus.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + DAY });

    expect(bus.execute({ type: "advanceLive", minutes: 1 })).toEqual({
      ok: false,
      events: [],
      error: "TIME_JOB_ACTIVE",
    });
    expect(clockJobs(bus.snapshot())).toHaveLength(1);
  });

  it("runs during retirement cooling, as waiting does", () => {
    const bus = new CommandBus(quietWorld());
    bus.execute({ type: "startRetirement" });
    expect(bus.execute({ type: "commitRetirement" }).ok).toBe(true);
    expect(bus.snapshot().retirement?.stage).toBe("cooling");

    expect(bus.execute({ type: "advanceLive", minutes: 30 }).ok).toBe(true);
  });

  it("freezes at a run's ending and refuses live time afterwards", () => {
    const live = new CommandBus(strandedWorld(2 * DAY));
    const endingEvents: SimulationEvent[] = [];

    for (let i = 0; i < 9; i += 1) {
      const result = live.execute({ type: "advanceLive", minutes: TICK_MINUTES });
      endingEvents.push(...result.events);
    }

    expect(endingEvents).toContainEqual(
      expect.objectContaining({ type: "RunEnded", status: "stranded", worldMinute: 2 * DAY }),
    );
    expect(live.snapshot().worldMinute).toBe(2 * DAY);
    expect(live.execute({ type: "advanceLive", minutes: 1 })).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });

    const direct = new CommandBus(strandedWorld(2 * DAY));
    direct.execute({ type: "advanceTime", minutes: 5 * DAY });
    expect(worldWithoutJobQueue(live.snapshot())).toEqual(
      worldWithoutJobQueue(direct.snapshot()),
    );
  });

  it("resumes live time from a save exactly as an uninterrupted run would", () => {
    const steps = irregularSteps(2 * DAY);
    const cut = Math.floor(steps.length / 2);

    const first = new CommandBus(createSliceWorldState());
    for (const minutes of steps.slice(0, cut)) {
      first.execute({ type: "advanceLive", minutes });
    }

    const resumed = new CommandBus(
      parsePortableRunSave(serializePortableRunSave(first.snapshot())),
    );
    for (const minutes of steps.slice(cut)) {
      expect(resumed.execute({ type: "advanceLive", minutes }).ok).toBe(true);
    }

    const straight = new CommandBus(createSliceWorldState());
    for (const minutes of steps) {
      straight.execute({ type: "advanceLive", minutes });
    }

    expect(resumed.snapshot()).toEqual(straight.snapshot());
  });
});
