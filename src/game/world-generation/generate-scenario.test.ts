import { describe, expect, it } from "vitest";

import { instantiateWorldContent } from "@/content/world-content";
import { GENERATED_SCENARIO_SPECS, type GeneratedRunScenario } from "@/content/world-scenarios";
import { checkPlayerHandleShape } from "@/game/identity/player-handle";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { PLAYER_ACTOR_ID, STARTING_NETWORK_TRUST } from "@/game/simulation/state/world-state";
import {
  generateScenarioContent,
  type GeneratedScenarioContent,
} from "@/game/world-generation/generate-scenario";

const GENERATED: readonly GeneratedRunScenario[] = ["fresh-scene", "high-pressure"];
const SEEDS = Array.from({ length: 40 }, (_, index) => index + 1);
const AUTHORED_RESERVED = (() => {
  const content = instantiateWorldContent();
  return [...content.actors, ...content.targets].map((entry) => entry.handle);
})();

function generate(
  seed: number,
  scenario: GeneratedRunScenario,
  reserved: readonly string[] = AUTHORED_RESERVED,
): GeneratedScenarioContent {
  return generateScenarioContent({ seed, scenario, reservedHandles: reserved });
}

describe("seeded scenario generation (Game-First G2, #78; D065)", () => {
  it("gives the same people for the same seed, scenario and reserved names", () => {
    for (const scenario of GENERATED) {
      expect(generate(7, scenario)).toEqual(generate(7, scenario));
    }
  });

  it("gives different people for different seeds", () => {
    for (const scenario of GENERATED) {
      const handles = (seed: number) =>
        generate(seed, scenario).actors.map((actor) => actor.handle).join(",");

      expect(handles(1)).not.toBe(handles(2));
    }
  });

  it("matches the counts its spec names", () => {
    for (const scenario of GENERATED) {
      const spec = GENERATED_SCENARIO_SPECS[scenario];
      const world = generate(3, scenario);
      const owners = world.actors.filter((actor) => actor.targetId !== undefined);
      const brokers = world.actors.filter((actor) => actor.targetId === undefined);

      expect(owners).toHaveLength(spec.owners);
      expect(brokers).toHaveLength(spec.brokers);
      expect(world.targets).toHaveLength(spec.owners);

      for (const target of world.targets) {
        expect(target.machines.length).toBeGreaterThanOrEqual(2);
        expect(target.machines.length).toBeLessThanOrEqual(3);

        for (const machine of target.machines) {
          expect(machine.services.length).toBeGreaterThanOrEqual(1);
          expect(machine.services.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it("passes the structural validator and the generation rules across many seeds", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        // generate() throws if no candidate satisfies every rule, so reaching the
        // assertions below means the seed was accepted.
        const world = generate(seed, scenario);
        const actorIds = world.actors.map((actor) => actor.id);
        const targetIds = world.targets.map((target) => target.id);

        expect(new Set(actorIds).size).toBe(actorIds.length);
        expect(new Set(targetIds).size).toBe(targetIds.length);

        for (const target of world.targets) {
          const hasOnlineService = target.machines.some((machine) =>
            machine.services.some((service) => service.state === "online"),
          );
          expect(hasOnlineService).toBe(true);

          const offerable = world.actors.some(
            (actor) => actor.network === "white" && actor.targetId !== target.id,
          );
          expect(offerable).toBe(true);
        }
      }
    }
  });

  it("gives every person the stored shape and a name no other person uses", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const world = generate(seed, scenario);
        // One name per person: an owner's target carries the owner's name, so the
        // actors are the roster of names. Each target must match its owner exactly.
        const names = world.actors.map((actor) => actor.handle);

        for (const name of names) {
          expect(checkPlayerHandleShape(name)).toBeNull();
        }

        const folded = new Set(names.map((name) => name.toLowerCase()));
        expect(folded.size).toBe(names.length);

        for (const target of world.targets) {
          const owner = world.actors.find((actor) => actor.targetId === target.id);
          expect(owner?.handle).toBe(target.handle);
        }
      }
    }
  });

  it("never reuses the player's handle or an authored name", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS.slice(0, 12)) {
        const world = generate(seed, scenario);
        const taken = new Set(AUTHORED_RESERVED.map((name) => name.toLowerCase()));

        for (const actor of world.actors) {
          expect(taken.has(actor.handle.toLowerCase())).toBe(false);
        }
      }
    }
  });

  it("changes only the name when a name is reserved, and nothing else about the person", () => {
    const scenario: GeneratedRunScenario = "fresh-scene";
    const plain = generate(5, scenario);
    const reservedName = plain.actors[0]!.handle;
    const reserved = generate(5, scenario, [...AUTHORED_RESERVED, reservedName]);

    expect(reserved.actors.map((actor) => actor.handle.toLowerCase())).not.toContain(
      reservedName.toLowerCase(),
    );

    // Stats, networks, ranks, machines and ties come from salts that never read a
    // name, so they stay the same for every person.
    const strip = (actor: (typeof plain.actors)[number]) =>
      Object.fromEntries(Object.entries(actor).filter(([key]) => key !== "handle"));
    expect(reserved.actors.map(strip)).toEqual(plain.actors.map(strip));
    expect(reserved.targets.map((target) => target.machines)).toEqual(
      plain.targets.map((target) => target.machines),
    );
  });

  it("gives white actors a starting trust in the player and black actors none", () => {
    for (const scenario of GENERATED) {
      const world = generate(9, scenario);

      for (const actor of world.actors) {
        const tie = world.relationships.find(
          (entry) => entry.fromId === actor.id && entry.toId === PLAYER_ACTOR_ID,
        );

        expect(tie).toBeDefined();
        expect(tie!.trust).toBe(actor.network === "white" ? STARTING_NETWORK_TRUST : 0);
        expect(tie!.grudge).toBe(0);
      }
    }
  });
});

describe("canonical scenario stays the authored roster (legacy compatibility)", () => {
  it("builds the same world as the default, so existing saves keep their meaning", () => {
    const defaulted = createSliceWorldState({ seed: 42, handle: "BetaStress" });
    const canonical = createSliceWorldState({
      seed: 42,
      handle: "BetaStress",
      scenario: "canonical",
    });

    expect(JSON.stringify(canonical)).toBe(JSON.stringify(defaulted));
    expect(canonical.scenario).toBe("canonical");
  });

  it("does not add starting ties to a canonical world, so its ties are unchanged", () => {
    const world = createSliceWorldState({ seed: 42, scenario: "canonical" });
    const authored = instantiateWorldContent();

    expect(world.underground.actors.map((actor) => actor.id)).toEqual(
      authored.actors.map((actor) => actor.id),
    );
    expect(world.underground.relationships.every((entry) => entry.toId === PLAYER_ACTOR_ID)).toBe(true);
  });
});
