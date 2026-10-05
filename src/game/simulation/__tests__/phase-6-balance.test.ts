import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import type { CompromiseKind } from "@/game/simulation/state/world-state";

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

interface CompromiseSample {
  minute: number;
  kinds: CompromiseKind[];
}

function firstCompromiseBy(
  bus: CommandBus,
  endMinute: number,
): CompromiseSample | null {
  while (bus.snapshot().worldMinute < endMinute) {
    const remaining = endMinute - bus.snapshot().worldMinute;
    bus.execute({ type: "advanceTime", minutes: Math.min(TICK, remaining) });
    const state = bus.snapshot();
    const first = state.compromises[0];
    if (first) {
      return {
        minute: first.worldMinute,
        kinds: state.compromises
          .filter((record) => record.worldMinute === first.worldMinute)
          .map((record) => record.kind),
      };
    }
  }

  return null;
}

function sampledWorld(seed: number): CommandBus {
  const state = createSliceWorldState();
  state.underground.seed = seed;
  return new CommandBus(state);
}

function recklessSample(seed: number): CompromiseSample | null {
  const bus = sampledWorld(seed);

  // Five back-to-back intrusions: the first establishes the watch; the next
  // four provoke the owner before the first ecosystem boundary can fire.
  for (let cycle = 0; cycle < 5; cycle += 1) {
    recklessCycle(bus);
  }

  return firstCompromiseBy(bus, 10 * DAY);
}

function measuredSample(seed: number): CompromiseSample | null {
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

function summary(samples: readonly (CompromiseSample | null)[]) {
  const concrete = samples.filter(
    (value): value is CompromiseSample => value !== null,
  );
  const minutes = concrete.map((value) => value.minute);
  const conditionCounts: Record<CompromiseKind, number> = {
    "rig-lost": 0,
    "dwelling-lost": 0,
    "identity-exposed": 0,
    stranded: 0,
  };

  for (const sample of concrete) {
    for (const kind of sample.kinds) {
      conditionCounts[kind] += 1;
    }
  }

  return {
    sample: samples.length,
    compromisedBy3d: minutes.filter((minute) => minute <= 3 * DAY).length,
    compromisedBy5d: minutes.filter((minute) => minute <= 5 * DAY).length,
    compromisedBy10d: minutes.filter((minute) => minute <= 10 * DAY).length,
    survived10d: samples.filter((value) => value === null).length,
    earliestMinute: minutes.length > 0 ? Math.min(...minutes) : null,
    medianMinute:
      minutes.length > 0
        ? [...minutes].sort((a, b) => a - b)[Math.floor(minutes.length / 2)]!
        : null,
    conditionCounts,
  };
}

describe("Phase 6 P4 balance harness", () => {
  it("samples real P1→P4 causal runs instead of tuning from isolated rolls", () => {
    const reckless: (CompromiseSample | null)[] = [];
    const measured: (CompromiseSample | null)[] = [];

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
