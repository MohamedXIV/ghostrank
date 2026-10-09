import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import type { WorldState } from "@/game/simulation/state/world-state";
import {
  BASE_STANDING_WEIGHT,
  RIVAL_WEIGHT,
  counterpartWeight,
  offerTargetWeight,
  ownerOfTarget,
  pickWeighted,
  usesLivingTies,
} from "@/game/simulation/systems/living-ties";
import { organizationOfActor } from "@/game/simulation/systems/organizations";

/**
 * Living ties in generated scenes (Game-First G2, #78; D067): grudges and rival
 * organizations change who intrudes on whom and who is commissioned against whom.
 */

const DAY = 24 * 60;
const SCENES = ["fresh-scene", "high-pressure"] as const;
const SEEDS = Array.from({ length: 120 }, (_, index) => index + 1);

function grudge(world: WorldState, fromId: string, toId: string): number {
  return (
    world.underground.relationships.find((entry) => entry.fromId === fromId && entry.toId === toId)
      ?.grudge ?? 0
  );
}

/** The world with `fromId`'s grudge toward `toId` set to `value`, adding the tie if absent. */
function withGrudge(world: WorldState, fromId: string, toId: string, value: number): WorldState {
  const exists = world.underground.relationships.some(
    (entry) => entry.fromId === fromId && entry.toId === toId,
  );
  const relationships = exists
    ? world.underground.relationships.map((entry) =>
        entry.fromId === fromId && entry.toId === toId ? { ...entry, grudge: value } : entry,
      )
    : [
        ...world.underground.relationships,
        {
          id: `rel:${fromId}>${toId}`,
          fromId,
          toId,
          trust: 0,
          fear: 0,
          grudge: value,
          updatedWorldMinute: 0,
        },
      ];

  return { ...world, underground: { ...world.underground, relationships } };
}

describe("living ties are switched by scene (D067)", () => {
  it("is off for canonical and for saves with no scene, and on for generated scenes", () => {
    const canonical = createSliceWorldState({ seed: 1, scenario: "canonical" });
    const legacy = { ...canonical, scenario: undefined } as WorldState;

    expect(usesLivingTies(canonical)).toBe(false);
    expect(usesLivingTies(legacy)).toBe(false);
    for (const scenario of SCENES) {
      expect(usesLivingTies(createSliceWorldState({ seed: 1, scenario }))).toBe(true);
    }
  });
});

describe("standing sets the weights", () => {
  it("adds grudge toward an intrusion counterpart, and a rival organization's bonus", () => {
    const world = createSliceWorldState({ seed: 3, scenario: "fresh-scene" });
    const [actor, other] = world.underground.actors;
    const rivalOrg = world.underground.organizations!.find(
      (org) => org.id !== actor!.organizationId && organizationOfActor(world, actor!)?.rivalIds.includes(org.id),
    );
    const base = counterpartWeight(world, actor!, other!);

    expect(base).toBeGreaterThanOrEqual(BASE_STANDING_WEIGHT);

    const hated = withGrudge(world, actor!.id, other!.id, 40);
    expect(counterpartWeight(hated, actor!, other!)).toBe(
      counterpartWeight(world, actor!, other!) + 40 - grudge(world, actor!.id, other!.id),
    );

    expect(rivalOrg, "every organization has a rival").toBeDefined();
    if (rivalOrg) {
      const rival = world.underground.actors.find((entry) => entry.organizationId === rivalOrg.id)!;
      expect(counterpartWeight(world, actor!, rival)).toBeGreaterThanOrEqual(
        BASE_STANDING_WEIGHT + RIVAL_WEIGHT,
      );
    }
  });

  it("weights a commission by the grudge the issuer holds against the owner", () => {
    const world = createSliceWorldState({ seed: 5, scenario: "high-pressure" });
    const issuer = world.underground.actors[0]!;
    const target = world.targets.find((entry) => entry.id !== issuer.targetId)!;
    const owner = ownerOfTarget(world, target);

    expect(owner).toBeDefined();
    const cold = offerTargetWeight(world, issuer, target, owner);
    const warmed = withGrudge(world, issuer.id, owner!.id, 60);
    expect(offerTargetWeight(warmed, issuer, target, owner)).toBeGreaterThan(cold);
  });
});

describe("the weighted pick is proportional and deterministic", () => {
  it("picks in proportion to weight, and the same draw always picks the same item", () => {
    expect(pickWeighted(["a", "b"], [1, 3], 0.2)).toBe("a");
    expect(pickWeighted(["a", "b"], [1, 3], 0.3)).toBe("b");
    expect(pickWeighted(["a", "b"], [1, 3], 0.3)).toBe(pickWeighted(["a", "b"], [1, 3], 0.3));

    let bees = 0;
    const grid = 1_000;
    for (let index = 0; index < grid; index += 1) {
      if (pickWeighted(["a", "b"], [1, 3], (index + 0.5) / grid) === "b") {
        bees += 1;
      }
    }
    expect(bees / grid).toBeCloseTo(0.75, 2);
  });
});

describe("standing changes what happens across seeds (D067)", () => {
  it("sends more intrusions between rival organizations than an even pick would", () => {
    for (const scenario of SCENES) {
      let observed = 0;
      let expected = 0;

      for (const seed of SEEDS) {
        const bus = new CommandBus(createSliceWorldState({ seed, handle: "Night_Wren", scenario }));
        bus.execute({ type: "advanceTime", minutes: 30 * DAY });
        const world = bus.snapshot();
        const actors = world.underground.actors;

        for (const incident of world.underground.incidents) {
          const actor = actors.find((entry) => entry.id === incident.actorId)!;
          const counterpart = actors.find((entry) => entry.id === incident.counterpartId)!;
          const org = organizationOfActor(world, actor);

          if (org !== undefined) {
            const rivals = actors.filter(
              (entry) => entry.id !== actor.id && org.rivalIds.includes(entry.organizationId ?? ""),
            ).length;
            expected += rivals / (actors.length - 1);
          }
          if (org?.rivalIds.includes(counterpart.organizationId ?? "")) {
            observed += 1;
          }
        }
      }

      // Measured at about 1.3x to 1.4x the even-pick share; the bound is well inside that.
      expect(observed, scenario).toBeGreaterThan(expected * 1.15);
    }
  });

  it("commissions work against the actors each issuer holds a grudge against", () => {
    for (const scenario of SCENES) {
      let chosen = 0;
      let baseline = 0;
      let count = 0;

      for (const seed of SEEDS) {
        const bus = new CommandBus(createSliceWorldState({ seed, handle: "Night_Wren", scenario }));
        bus.execute({ type: "advanceTime", minutes: 30 * DAY });
        const world = bus.snapshot();

        for (const contract of world.underground.contracts) {
          const issuer = world.underground.actors.find((entry) => entry.id === contract.issuerId)!;
          const target = world.targets.find((entry) => entry.id === contract.targetId)!;
          const owner = ownerOfTarget(world, target);
          chosen += grudge(world, issuer.id, owner?.id ?? "");

          const others = world.targets.filter((entry) => entry.id !== issuer.targetId);
          const average =
            others.reduce(
              (sum, entry) => sum + grudge(world, issuer.id, ownerOfTarget(world, entry)?.id ?? ""),
              0,
            ) / others.length;
          baseline += average;
          count += 1;
        }
      }

      // Measured at about 57.8 against 44.9 (Fresh Scene) and 76.1 against 58.1 (High Pressure).
      expect(count, scenario).toBeGreaterThan(0);
      expect(chosen / count, scenario).toBeGreaterThan(baseline / count);
    }
  });
});
