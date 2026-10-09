import { describe, expect, it } from "vitest";

import {
  ARCHETYPE_TEMPERAMENT,
  HACKER_ARCHETYPE_WEIGHTS,
  TINKERER_MODELS,
  type GeneratedRunScenario,
} from "@/content/world-scenarios";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import type { HackerArchetype } from "@/game/simulation/state/world-state";
import {
  FIXER_CONTACT_TRUST,
  activityBonus,
  cautionBonus,
  contactTrustThreshold,
  greedBonus,
} from "@/game/simulation/systems/temperament";
import { generateScenarioContent } from "@/game/world-generation/generate-scenario";
import { instantiateWorldContent } from "@/content/world-content";

/**
 * Weighted hacker archetypes and temperaments (Game-First G2, #78; D068). The
 * archetype is a weighted seeded draw, and its personality changes what the
 * hacker does: how often it acts, how private it stays, and whether a fixer
 * deals with the player from the first day.
 */

const DAY = 24 * 60;
const SCENES: readonly GeneratedRunScenario[] = ["fresh-scene", "high-pressure"];
const ARCHETYPES: readonly HackerArchetype[] = ["opportunist", "ghost", "enforcer", "fixer", "tinkerer"];
const RESERVED = (() => {
  const content = instantiateWorldContent();
  return [...content.actors, ...content.targets].map((entry) => entry.handle);
})();

function people(seed: number, scenario: GeneratedRunScenario) {
  return generateScenarioContent({ seed, scenario, reservedHandles: RESERVED }).actors;
}

describe("archetypes are a weighted seeded draw (D068)", () => {
  it("draws each archetype in proportion to its scene's weight, over 120 seeds", () => {
    for (const scenario of SCENES) {
      const counts = new Map<HackerArchetype, number>(ARCHETYPES.map((name) => [name, 0]));
      let total = 0;

      for (let seed = 1; seed <= 120; seed += 1) {
        for (const actor of people(seed, scenario)) {
          counts.set(actor.hackerArchetype!, (counts.get(actor.hackerArchetype!) ?? 0) + 1);
          total += 1;
        }
      }

      const weights = HACKER_ARCHETYPE_WEIGHTS[scenario];
      const sum = weights.reduce((acc, entry) => acc + entry.weight, 0);
      for (const entry of weights) {
        const share = (counts.get(entry.value) ?? 0) / total;
        // Expected share from the weight, within five points. The draw is seeded, so this is stable.
        expect(Math.abs(share - entry.weight / sum), `${scenario} ${entry.value}`).toBeLessThan(0.05);
      }
    }
  });

  it("gives High Pressure more enforcers than Fresh Scene", () => {
    const share = (scenario: GeneratedRunScenario) => {
      let enforcers = 0;
      let total = 0;
      for (let seed = 1; seed <= 120; seed += 1) {
        for (const actor of people(seed, scenario)) {
          total += 1;
          if (actor.hackerArchetype === "enforcer") enforcers += 1;
        }
      }
      return enforcers / total;
    };

    expect(share("high-pressure")).toBeGreaterThan(share("fresh-scene"));
  });

  it("keeps each temperament inside its archetype's ranges, and gives only tinkerers an assistant", () => {
    for (const scenario of SCENES) {
      for (let seed = 1; seed <= 40; seed += 1) {
        for (const actor of people(seed, scenario)) {
          const archetype = actor.hackerArchetype!;
          const ranges = ARCHETYPE_TEMPERAMENT[archetype];
          const temperament = actor.temperament!;

          for (const trait of ["aggression", "caution", "greed"] as const) {
            const [low, high] = ranges[trait];
            expect(temperament[trait]).toBeGreaterThanOrEqual(low);
            expect(temperament[trait]).toBeLessThanOrEqual(high);
          }

          if (archetype === "tinkerer") {
            expect(TINKERER_MODELS).toContain(actor.modelId);
          } else {
            expect(actor.modelId).toBeUndefined();
          }
        }
      }
    }
  });
});

describe("temperament changes what a hacker does (D068)", () => {
  it("gives the authored roster and every pre-G2 save no temperament effect", () => {
    const world = createSliceWorldState({ seed: 42, scenario: "canonical" });
    const actor = world.underground.actors[0]!;

    expect(actor.temperament).toBeUndefined();
    expect(activityBonus(actor)).toBe(0);
    expect(cautionBonus(actor)).toBe(0);
    expect(greedBonus(actor)).toBe(0);
    expect(contactTrustThreshold(actor, 10)).toBe(10);
  });

  it("makes a fixer deal with the player from zero trust, and nobody else", () => {
    expect(FIXER_CONTACT_TRUST).toBe(0);
    expect(contactTrustThreshold({ hackerArchetype: "fixer" }, 10)).toBe(0);
    expect(contactTrustThreshold({ hackerArchetype: "enforcer" }, 10)).toBe(10);
    expect(contactTrustThreshold({}, 10)).toBe(10);
  });

  it("scales each temperament trait to a tenth of a point per point, with no other term", () => {
    expect(activityBonus({ temperament: { aggression: 90, caution: 0, greed: 0 } })).toBe(9);
    expect(cautionBonus({ temperament: { aggression: 0, caution: 90, greed: 0 } })).toBe(9);
    expect(greedBonus({ temperament: { aggression: 0, caution: 0, greed: 90 } })).toBe(9);
  });

  it("makes enforcers initiate more intrusions than ghosts, and ghosts' incidents surface less often", () => {
    for (const scenario of SCENES) {
      const initiated = new Map<string, number>();
      const actors = new Map<string, number>();
      const incidents = new Map<string, number>();
      const publicIncidents = new Map<string, number>();

      for (let seed = 1; seed <= 24; seed += 1) {
        const bus = new CommandBus(createSliceWorldState({ seed, handle: "Night_Wren", scenario }));
        bus.execute({ type: "advanceTime", minutes: 30 * DAY });
        const world = bus.snapshot();

        for (const actor of world.underground.actors) {
          const key = actor.hackerArchetype ?? "none";
          actors.set(key, (actors.get(key) ?? 0) + 1);
        }
        for (const incident of world.underground.incidents) {
          const key = world.underground.actors.find((entry) => entry.id === incident.actorId)!
            .hackerArchetype ?? "none";
          initiated.set(key, (initiated.get(key) ?? 0) + 1);
          incidents.set(key, (incidents.get(key) ?? 0) + 1);
          if (incident.public) {
            publicIncidents.set(key, (publicIncidents.get(key) ?? 0) + 1);
          }
        }
      }

      const perActor = (key: string) => (initiated.get(key) ?? 0) / (actors.get(key) ?? 1);
      const surfaced = (key: string) =>
        (publicIncidents.get(key) ?? 0) / Math.max(1, incidents.get(key) ?? 0);

      // Measured at 34.6 vs 27.6 per actor (Fresh Scene) and 51.4 vs 44.8 (High Pressure).
      expect(perActor("enforcer"), scenario).toBeGreaterThan(perActor("ghost") * 1.1);
      // Measured at 0.51 vs 0.41 (Fresh Scene) and 0.33 vs 0.28 (High Pressure).
      expect(surfaced("enforcer"), scenario).toBeGreaterThan(surfaced("ghost"));
    }
  });

  it("lets black fixers issue work from the first day, while no other black issuer does", () => {
    for (const scenario of SCENES) {
      let blackFixerOffers = 0;
      let otherBlackOffers = 0;

      for (let seed = 1; seed <= 24; seed += 1) {
        const bus = new CommandBus(createSliceWorldState({ seed, handle: "Night_Wren", scenario }));
        bus.execute({ type: "advanceTime", minutes: 30 * DAY });
        const world = bus.snapshot();

        for (const contract of world.underground.contracts) {
          const issuer = world.underground.actors.find((entry) => entry.id === contract.issuerId)!;
          if (issuer.network !== "black") {
            continue;
          }
          if (issuer.hackerArchetype === "fixer") {
            blackFixerOffers += 1;
          } else {
            otherBlackOffers += 1;
          }
        }
      }

      // Measured at 181 (Fresh Scene) and 147 (High Pressure) over 24 seeds.
      expect(blackFixerOffers, scenario).toBeGreaterThan(0);
      // Measured: black non-fixers never offer in these scenes over 24 seeds, 30 days.
      expect(otherBlackOffers, scenario).toBe(0);
    }
  });
});
