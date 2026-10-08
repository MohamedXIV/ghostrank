import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { findHousingItem } from "@/content/housing-catalog";
import { createInitialWorldState } from "@/game/simulation/state/world-state";
import {
  runToCompletion,
  worldWithoutJobQueue,
} from "@/game/simulation/__tests__/clock-helpers";

const DAY = 24 * 60;
const CLOUD_FRONTIER = "model-cloud-frontier";
const NET_MONITOR = "workflow-net-monitor"; // 120 base × frontier 0.7 = 84 minutes
const LEASE = "housing-basement-cot";
const RENT = findHousingItem(LEASE)!.dailyCost;

/** The minute of every daily upkeep charge, in the order the charges were made. */
function upkeepMinutes(events: SimulationEvent[]): number[] {
  return events.flatMap((event) =>
    event.type === "ValueTransferred" && event.causeKind === "upkeep"
      ? [event.worldMinute]
      : [],
  );
}

function simulationEvents(events: SimulationEvent[]): SimulationEvent[] {
  return events.filter((event) => event.type !== "WorldTimeAdvanced");
}

/** Live steps that deliberately fall off every boundary, to cover the whole span. */
function liveSteps(bus: CommandBus, total: number): SimulationEvent[] {
  const pattern = [53, 360, 7, 211];
  const events: SimulationEvent[] = [];
  let left = total;

  for (let i = 0; left > 0; i += 1) {
    const minutes = Math.min(pattern[i % pattern.length]!, left);
    const result = bus.execute({ type: "advanceLive", minutes });
    expect(result.ok).toBe(true);
    events.push(...result.events);
    left -= minutes;
  }

  return events;
}

describe("scheduled work under the clock (Game-First G1, D056)", () => {
  it("completes a build at its exact due minute while live time carries the world", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    const started = bus.execute({ type: "startBuild", specId: NET_MONITOR });
    expect(started.ok).toBe(true);
    const due = bus.snapshot().builds[0]!.dueWorldMinute;

    const events = liveSteps(bus, due + DAY);

    expect(events).toContainEqual(
      expect.objectContaining({ type: "BuildCompleted", buildId: "workflow:1", worldMinute: due }),
    );
    expect(bus.snapshot().builds).toEqual([]);

    // The same span as one wait produces the same world and the same events.
    const waited = new CommandBus(createSliceWorldState());
    waited.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    waited.execute({ type: "startBuild", specId: NET_MONITOR });
    const waitEvents = waited.execute({ type: "advanceTime", minutes: due + DAY }).events;

    expect(worldWithoutJobQueue(bus.snapshot())).toEqual(
      worldWithoutJobQueue(waited.snapshot()),
    );
    expect(simulationEvents(events)).toEqual(simulationEvents(waitEvents));
  });

  it("a fast-forward stops on the exact minute a build completes, for any pump size", () => {
    const probe = new CommandBus(createSliceWorldState());
    probe.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    probe.execute({ type: "startBuild", specId: NET_MONITOR });
    const due = probe.snapshot().builds[0]!.dueWorldMinute;
    // The build is due off every boundary, so a stop here cannot be rounded to one.
    expect(due % 360).not.toBe(0);

    const runs = [1, 7, 97, 1_000].map((size) => {
      const bus = new CommandBus(createSliceWorldState());
      bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
      bus.execute({ type: "startBuild", specId: NET_MONITOR });
      const events = runToCompletion(bus, { type: "fastForward", minutes: DAY }, size);

      return { events, world: worldWithoutJobQueue(bus.snapshot()) };
    });

    for (const run of runs) {
      expect(run.events).toContainEqual(
        expect.objectContaining({
          type: "TimeJobInterrupted",
          kind: "fast-forward",
          worldMinute: due,
          cause: "BuildCompleted",
        }),
      );
      expect(run.world.worldMinute).toBe(due);
    }
    for (const run of runs.slice(1)) {
      expect(run.world).toEqual(runs[0]!.world);
    }
  });

  it("returns every event of a long wait in the order it happened", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "startBuild", specId: NET_MONITOR });

    const events = bus
      .execute({ type: "advanceTime", minutes: 3 * DAY })
      .events.filter((event) => "worldMinute" in event)
      .map((event) => (event as { worldMinute: number }).worldMinute);

    expect(events.length).toBeGreaterThan(0);
    expect(events).toEqual([...events].sort((a, b) => a - b));
  });

  it("charges upkeep on each day boundary crossed by live steps, and no other", () => {
    const world = createInitialWorldState({ player: { handle: "CobaltXZ", rank: 100_256 } });
    world.economy.housing = LEASE;
    world.economy.credits = 10 * RENT;
    const bus = new CommandBus(world);

    const events = liveSteps(bus, 3 * DAY);

    expect(upkeepMinutes(events)).toEqual([DAY, 2 * DAY, 3 * DAY]);
    expect(bus.snapshot().economy.credits).toBe(7 * RENT);
    expect(bus.snapshot().economy.housing).toBe(LEASE);
  });

  it("charges upkeep at the same minutes while a paced sleep carries the world", () => {
    const world = createInitialWorldState({ player: { handle: "CobaltXZ", rank: 100_256 } });
    world.economy.housing = LEASE;
    world.economy.credits = 10 * RENT;
    const bus = new CommandBus(world);

    const events = runToCompletion(bus, { type: "sleep", minutes: 3 * DAY });

    expect(upkeepMinutes(events)).toEqual([DAY, 2 * DAY, 3 * DAY]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "TimeJobCompleted", kind: "sleep", worldMinute: 3 * DAY }),
    );
  });
});
