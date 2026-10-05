import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";

const DAY = 24 * 60;
const TICK = 360;
const SAMPLE_SEEDS = 64;

function recklessCycle(bus: CommandBus): void {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });
  bus.execute({ type: "disengageOperation" });
}

function firstCompromiseBy(
  bus: CommandBus,
  endMinute: number,
): number | null {
  while (bus.snapshot().worldMinute < endMinute) {
    const remaining = endMinute - bus.snapshot().worldMinute;
    bus.execute({ type: "advanceTime", minutes: Math.min(TICK, remaining) });
    const first = bus.snapshot().compromises[0];
    if (first) {
      return first.worldMinute;
    }
  }

  return null;
}

function sampledWorld(seed: number): CommandBus {
  const state = createSliceWorldState();
  state.underground.seed = seed;
  return new CommandBus(state);
}

function recklessSample(seed: number): number | null {
  const bus = sampledWorld(seed);

  // Five back-to-back intrusions: the first establishes the watch; the next
  // four provoke the owner before the first ecosystem boundary can fire.
  for (let cycle = 0; cycle < 5; cycle += 1) {
    recklessCycle(bus);
  }

  return firstCompromiseBy(bus, 10 * DAY);
}

function measuredSample(seed: number): number | null {
  const bus = sampledWorld(seed);

  // A player who repeatedly disengages and spaces their escalation out gives
  // the world time to react instead of stacking provocation in one burst.
  // Physical eligibility cannot exist until the third cycle has raised grudge.
  recklessCycle(bus);
  bus.execute({ type: "advanceTime", minutes: DAY });
  recklessCycle(bus);
  bus.execute({ type: "advanceTime", minutes: DAY });
  recklessCycle(bus);

  return firstCompromiseBy(bus, 10 * DAY);
}

function summary(minutes: readonly (number | null)[]) {
  const concrete = minutes.filter((value): value is number => value !== null);
  return {
    sample: minutes.length,
    compromisedBy3d: concrete.filter((minute) => minute <= 3 * DAY).length,
    compromisedBy5d: concrete.filter((minute) => minute <= 5 * DAY).length,
    compromisedBy10d: concrete.filter((minute) => minute <= 10 * DAY).length,
    survived10d: minutes.filter((minute) => minute === null).length,
    earliestMinute: concrete.length > 0 ? Math.min(...concrete) : null,
    medianMinute:
      concrete.length > 0
        ? [...concrete].sort((a, b) => a - b)[
            Math.floor(concrete.length / 2)
          ]!
        : null,
  };
}

describe("Phase 6 P4 balance harness", () => {
  it("samples real P1→P4 causal runs instead of tuning from isolated rolls", () => {
    const reckless: (number | null)[] = [];
    const measured: (number | null)[] = [];

    for (let seed = 1; seed <= SAMPLE_SEEDS; seed += 1) {
      reckless.push(recklessSample(seed));
      measured.push(measuredSample(seed));
    }

    const recklessStats = summary(reckless);
    const measuredStats = summary(measured);

    // These summaries are deliberately printed in CI so tuning decisions can
    // cite an observed distribution rather than a design hunch.
    console.info(
      "PHASE6_P4_BALANCE",
      JSON.stringify({ reckless: recklessStats, measured: measuredStats }),
    );

    // "Early runs are genuinely dangerous": the real chain must be able to
    // reach a catastrophic condition inside the design's early-run window.
    expect(recklessStats.compromisedBy5d).toBeGreaterThan(0);

    // "Survival around a few days is plausible": spacing provocation must leave
    // at least some sampled histories uncompromised through day 3.
    expect(measuredStats.compromisedBy3d).toBeLessThan(SAMPLE_SEEDS);

    // Player restraint has to matter in aggregate, not just in one hand-picked
    // seed. The measured schedule cannot be more dangerous by day five.
    expect(measuredStats.compromisedBy5d).toBeLessThanOrEqual(
      recklessStats.compromisedBy5d,
    );
  });
});
