import { describe, expect, it } from "vitest";

import { instantiateWorldContent } from "@/content/world-content";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  advanceUnderground,
  counterpartWeight,
  smearPercent,
  temperamentActivity,
  temperamentDiscretionDelta,
} from "@/game/simulation/systems/underground";
import {
  ACTOR_TEMPERAMENTS,
  PLAYER_ACTOR_ID,
  type ActorTemperament,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";
import { generateScenarioContent } from "@/game/world-generation/generate-scenario";
import { worldStateSchema } from "@/persistence/world-state-schema";

/**
 * Weighted archetypes and hidden temperaments (Game-First G2 P2, D068). The
 * scene weights decide who is dealt; the temperament decides how the person
 * acts. Canonical actors have none, so every test here is about generated
 * people or about the baseline they fall back to.
 */

const GENERATED = ["fresh-scene", "high-pressure"] as const;
const SEEDS = Array.from({ length: 40 }, (_, index) => index + 1);
const AUTHORED_RESERVED = (() => {
  const content = instantiateWorldContent();
  return [...content.actors, ...content.targets].map((entry) => entry.handle);
})();

function actor(overrides: Partial<UndergroundActor> = {}): UndergroundActor {
  return {
    id: "probe",
    handle: "Probe",
    rank: 1_000,
    network: "black",
    skill: 60,
    defense: 50,
    discretion: 50,
    activity: 40,
    ...overrides,
  };
}

function withTemperament(
  temperament: ActorTemperament | undefined,
  overrides: Partial<UndergroundActor> = {},
): UndergroundActor {
  const base = actor(overrides);
  return temperament === undefined ? base : { ...base, temperament };
}

describe("people are dealt by weighted profile, with a temperament (Game-First G2 P2, D068)", () => {
  it("gives every generated person a temperament from the closed vocabulary", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const world = generateScenarioContent({
          seed,
          scenario,
          reservedHandles: AUTHORED_RESERVED,
        });

        for (const person of world.actors) {
          expect(ACTOR_TEMPERAMENTS, `${person.id} seed ${seed}`).toContain(person.temperament);
        }
      }
    }
  });

  it("deals high-pressure more grudge-holding owners than fresh-scene", () => {
    const share = (scenario: (typeof GENERATED)[number]) => {
      let owners = 0;
      let grudge = 0;

      for (const seed of SEEDS) {
        for (const person of generateScenarioContent({
          seed,
          scenario,
          reservedHandles: AUTHORED_RESERVED,
        }).actors) {
          if (person.targetId === undefined) {
            continue;
          }

          owners += 1;
          if (person.temperament === "grudge-holder") {
            grudge += 1;
          }
        }
      }

      return grudge / owners;
    };

    // Measured across these seeds (owners only): about 0.22 for fresh-scene, 0.38 for high-pressure.
    expect(share("high-pressure") - share("fresh-scene")).toBeGreaterThan(0.08);
  });

  it("gives every temperament a place in the generated population across the seeds", () => {
    const seen = new Set<ActorTemperament>();

    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        for (const person of generateScenarioContent({
          seed,
          scenario,
          reservedHandles: AUTHORED_RESERVED,
        }).actors) {
          if (person.temperament !== undefined) {
            seen.add(person.temperament);
          }
        }
      }
    }

    expect([...seen].sort()).toEqual([...ACTOR_TEMPERAMENTS].sort());
  });

  it("keeps a person's temperament when a name is reserved", () => {
    const plain = generateScenarioContent({
      seed: 5,
      scenario: "fresh-scene",
      reservedHandles: AUTHORED_RESERVED,
    });
    const reserved = generateScenarioContent({
      seed: 5,
      scenario: "fresh-scene",
      reservedHandles: [...AUTHORED_RESERVED, plain.actors[0]!.handle],
    });

    expect(reserved.actors.map((person) => person.temperament)).toEqual(
      plain.actors.map((person) => person.temperament),
    );
  });
});

describe("a temperament changes behaviour in the ways it names (Game-First G2 P2, D068)", () => {
  it("leaves an untempered actor exactly as it was", () => {
    const plain = actor({ activity: 37 });

    expect(temperamentActivity(plain)).toBe(37);
    expect(temperamentDiscretionDelta(plain)).toBe(0);
    // The untouched baseline: the authored smear chance is 12 percent.
    expect(smearPercent(plain)).toBe(12);
  });

  it("acts least often when careful and most often when reckless", () => {
    const careful = withTemperament("careful", { activity: 40 });
    const reckless = withTemperament("reckless", { activity: 40 });

    expect(temperamentActivity(careful)).toBeLessThan(temperamentActivity(actor({ activity: 40 })));
    expect(temperamentActivity(reckless)).toBeGreaterThan(temperamentActivity(actor({ activity: 40 })));
  });

  it("is quieter when careful and more public when reckless", () => {
    expect(temperamentDiscretionDelta(withTemperament("careful"))).toBeGreaterThan(0);
    expect(temperamentDiscretionDelta(withTemperament("reckless"))).toBeLessThan(0);
  });

  it("smears most when a grudge-holder and least when careful", () => {
    const grudge = smearPercent(withTemperament("grudge-holder"));
    const careful = smearPercent(withTemperament("careful"));

    expect(grudge).toBeGreaterThan(smearPercent(actor()));
    expect(careful).toBeLessThan(smearPercent(actor()));
  });

  it("never drops a temperament's activity below zero or above one hundred", () => {
    for (const temperament of ACTOR_TEMPERAMENTS) {
      for (const activity of [0, 1, 50, 99, 100]) {
        const value = temperamentActivity(withTemperament(temperament, { activity }));

        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("temperaments reshape counterpart choice, and nothing else reads them (Game-First G2 P2, D068)", () => {
  function worldWithPair(
    temperament: ActorTemperament | undefined,
    grudge: number,
  ): { world: WorldState; self: UndergroundActor; other: UndergroundActor } {
    const world = createSliceWorldState({ seed: 4, handle: "Night_Wren", scenario: "fresh-scene" });
    const self = world.underground.actors[0]!;
    const other = world.underground.actors[1]!;

    if (temperament === undefined) {
      delete self.temperament;
    } else {
      self.temperament = temperament;
    }

    world.underground.relationships = world.underground.relationships.filter(
      (entry) => !(entry.fromId === self.id && entry.toId === other.id),
    );
    world.underground.relationships.push({
      id: `rel:${self.id}>${other.id}`,
      fromId: self.id,
      toId: other.id,
      trust: -20,
      fear: 0,
      grudge,
      updatedWorldMinute: 0,
    });

    return { world, self, other };
  }

  it("lets a reckless actor ignore standing entirely", () => {
    const hostile = worldWithPair("reckless", 90);
    const neutral = worldWithPair("reckless", 0);

    expect(counterpartWeight(hostile.world, hostile.self, hostile.other)).toBe(
      counterpartWeight(neutral.world, neutral.self, neutral.other),
    );
  });

  it("lets a careful actor discount a grudge a grudge-holder would amplify", () => {
    const careful = worldWithPair("careful", 40);
    const holder = worldWithPair("grudge-holder", 40);
    const plain = worldWithPair(undefined, 40);

    const carefulWeight = counterpartWeight(careful.world, careful.self, careful.other);
    const holderWeight = counterpartWeight(holder.world, holder.self, holder.other);
    const plainWeight = counterpartWeight(plain.world, plain.self, plain.other);

    expect(carefulWeight).toBeLessThan(plainWeight);
    expect(holderWeight).toBeGreaterThan(plainWeight);
  });

  it("lets an opportunist pick the softer counterpart and ignore standing", () => {
    const soft = worldWithPair("opportunist", 0);
    soft.other.defense = 20;
    const hard = worldWithPair("opportunist", 0);
    hard.other.defense = 90;

    expect(counterpartWeight(soft.world, soft.self, soft.other)).toBeGreaterThan(
      counterpartWeight(hard.world, hard.self, hard.other),
    );

    const hostile = worldWithPair("opportunist", 90);
    const calm = worldWithPair("opportunist", 0);
    hostile.other.defense = calm.other.defense = 50;

    expect(counterpartWeight(hostile.world, hostile.self, hostile.other)).toBe(
      counterpartWeight(calm.world, calm.self, calm.other),
    );
  });
});

describe("temperament drives the simulation as a whole (Game-First G2 P2, D068)", () => {
  function runWith(
    temperament: ActorTemperament,
    seed: number,
  ): { incidents: number; publicIncidents: number } {
    const bus = new CommandBus(createSliceWorldState({ seed, handle: "Night_Wren", scenario: "fresh-scene" }));
    const world = bus.snapshot();

    for (const person of world.underground.actors) {
      person.temperament = temperament;
    }

    const live = new CommandBus(world);
    live.execute({ type: "advanceTime", minutes: 24 * 60 * 2 });
    const incidents = live.snapshot().underground.incidents;

    return {
      incidents: incidents.length,
      publicIncidents: incidents.filter((incident) => incident.public).length,
    };
  }

  it("makes a reckless population louder and busier than a careful one", () => {
    let reckless = { incidents: 0, publicIncidents: 0 };
    let careful = { incidents: 0, publicIncidents: 0 };

    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const r = runWith("reckless", seed);
      const c = runWith("careful", seed);
      reckless = { incidents: reckless.incidents + r.incidents, publicIncidents: reckless.publicIncidents + r.publicIncidents };
      careful = { incidents: careful.incidents + c.incidents, publicIncidents: careful.publicIncidents + c.publicIncidents };
    }

    // Measured over these 6 worlds, two days: 117 reckless incidents, 71% public; 55 careful, 40% public.
    expect(reckless.publicIncidents / reckless.incidents).toBeGreaterThan(
      careful.publicIncidents / careful.incidents + 0.2,
    );
    expect(reckless.incidents).toBeGreaterThan(careful.incidents);
  });
});

describe("temperament decides how hard a grudge is pressed on the player (Game-First G2 P2, D068)", () => {
  function smearsWith(temperament: ActorTemperament, seed: number): number {
    const world = createSliceWorldState({ seed, handle: "Night_Wren", scenario: "fresh-scene" });

    for (const person of world.underground.actors) {
      person.temperament = temperament;
      const tie = world.underground.relationships.find(
        (entry) => entry.fromId === person.id && entry.toId === PLAYER_ACTOR_ID,
      );
      // Above the smear threshold, so each actor is eligible on every tick.
      if (tie) {
        tie.grudge = 40;
      }
    }

    advanceUnderground(world, 4 * 360);

    return world.underground.retaliations.filter((entry) => entry.kind === "smear").length;
  }

  it("smears far more often for a grudge-holder population than for a careful one", () => {
    let grudge = 0;
    let careful = 0;

    for (const seed of Array.from({ length: 20 }, (_, index) => index + 1)) {
      grudge += smearsWith("grudge-holder", seed);
      careful += smearsWith("careful", seed);
    }

    // Measured over these 20 worlds: 128 smears for grudge-holders, 29 for careful.
    expect(grudge).toBeGreaterThan(careful * 2);
  });
});

describe("temperament stays hidden and persists (Game-First G2 P2, D068)", () => {
  it("does not project any temperament to the player", () => {
    for (const seed of [2, 7, 13]) {
      const world = createSliceWorldState({ seed, handle: "Night_Wren", scenario: "high-pressure" });
      const projection = JSON.stringify(projectWorld(world));

      expect(projection).not.toContain("temperament");
      for (const temperament of ACTOR_TEMPERAMENTS) {
        expect(projection, `${temperament} seed ${seed}`).not.toContain(`"${temperament}"`);
      }
    }
  });

  it("round-trips every person's temperament through the save schema", () => {
    const world = createSliceWorldState({ seed: 9, handle: "Night_Wren", scenario: "fresh-scene" });
    const parsed = worldStateSchema.parse(JSON.parse(JSON.stringify(world)));

    expect(parsed.underground.actors.map((person) => person.temperament)).toEqual(
      world.underground.actors.map((person) => person.temperament),
    );
  });

  it("gives a canonical actor no temperament, so the authored people are unchanged", () => {
    const world = createSliceWorldState({ seed: 42, handle: "BetaStress", scenario: "canonical" });

    expect(world.underground.actors.every((person) => person.temperament === undefined)).toBe(true);
  });
});
