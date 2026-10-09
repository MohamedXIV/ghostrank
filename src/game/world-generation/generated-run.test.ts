import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { WorldState } from "@/game/simulation/state/world-state";

/**
 * Generated worlds run through the same authority as the authored slice
 * (Game-First G2, #78; D065). These tests check the simulation, not the
 * generator: replay, rank independence, operation breadth and early offers.
 */

const DAY = 24 * 60;
const HANDLE = "Night_Wren";
const GENERATED = ["fresh-scene", "high-pressure"] as const;
const SEEDS = Array.from({ length: 12 }, (_, index) => index + 1);

function generatedWorld(
  seed: number,
  scenario: (typeof GENERATED)[number],
  rank?: number,
): WorldState {
  const world = createSliceWorldState({ seed, handle: HANDLE, scenario });

  if (rank !== undefined) {
    world.player.rank = rank;
  }

  return world;
}

/**
 * Removes every rank-named field, recursively. What remains is everything rank
 * is not allowed to decide: credits, evidence, traces, trust, contracts, events.
 */
function withoutRank(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutRank);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !/rank/i.test(key))
        .map(([key, entry]) => [key, withoutRank(entry)]),
    );
  }

  return value;
}

describe("generated runs replay deterministically (Game-First G2, #78)", () => {
  it("gives two identical worlds the same two days, event for event", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const first = new CommandBus(generatedWorld(seed, scenario));
        const second = new CommandBus(generatedWorld(seed, scenario));

        const a = first.execute({ type: "advanceTime", minutes: 2 * DAY });
        const b = second.execute({ type: "advanceTime", minutes: 2 * DAY });

        const label = `${scenario} seed ${seed}`;
        expect(a.ok, label).toBe(true);
        expect(a, label).toEqual(b);
        expect(first.snapshot(), label).toEqual(second.snapshot());
        expect(first.snapshot().worldMinute, label).toBe(2 * DAY);
      }
    }
  });
});

describe("rank stays reputation, not power (Game-First G2, #78)", () => {
  it("gives the same non-rank outcomes at rank 1 and rank 999999", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const low = new CommandBus(generatedWorld(seed, scenario, 1));
        const high = new CommandBus(generatedWorld(seed, scenario, 999_999));
        const firstTarget = low.snapshot().targets[0]!.id;

        const script: SimulationCommand[] = [
          { type: "observeTarget", targetId: firstTarget },
          { type: "openOperation", targetId: firstTarget },
          { type: "surveyTarget", targetId: firstTarget },
          { type: "disengageOperation" },
          { type: "advanceTime", minutes: 3 * DAY },
        ];
        const label = `${scenario} seed ${seed}`;

        for (const command of script) {
          expect(withoutRank(low.execute(command)), label).toEqual(
            withoutRank(high.execute(command)),
          );
        }

        expect(withoutRank(low.snapshot()), label).toEqual(
          withoutRank(high.snapshot()),
        );
      }
    }
  });
});

describe("every generated target is playable (Game-First G2, #78)", () => {
  it("runs the operation commands against every target", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const template = generatedWorld(seed, scenario);

        for (const target of template.targets) {
          const bus = new CommandBus(template);
          const label = `${scenario} seed ${seed} target ${target.id}`;

          expect(
            bus.execute({ type: "observeTarget", targetId: target.id }),
            label,
          ).toMatchObject({ ok: true });
          expect(
            bus.execute({ type: "openOperation", targetId: target.id }),
            label,
          ).toMatchObject({ ok: true });
          expect(
            bus.execute({ type: "surveyTarget", targetId: target.id }),
            label,
          ).toMatchObject({ ok: true });
          expect(
            bus.execute({ type: "disengageOperation" }),
            label,
          ).toMatchObject({ ok: true });

          const world = bus.snapshot();
          expect(world.knownTargetIds, label).toContain(target.id);
        }
      }
    }
  });
});

describe("a generated scene offers work early (Game-First G2, #78)", () => {
  it("makes at least one contract offer within three days", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const bus = new CommandBus(generatedWorld(seed, scenario));
        bus.execute({ type: "advanceTime", minutes: 3 * DAY });

        const world = bus.snapshot();
        const label = `${scenario} seed ${seed}`;
        const offers = world.underground.contracts;

        expect(offers.length, label).toBeGreaterThan(0);

        for (const contract of offers) {
          expect(contract.offeredWorldMinute, label).toBeLessThanOrEqual(3 * DAY);
          const issuer = world.underground.actors.find(
            (actor) => actor.id === contract.issuerId,
          );
          expect(issuer?.targetId, label).not.toBe(contract.targetId);
        }
      }
    }
  });
});
