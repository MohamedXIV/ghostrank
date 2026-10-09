import { describe, expect, it } from "vitest";

import { instantiateWorldContent } from "@/content/world-content";
import { GENERATED_SCENARIO_SPECS, type GeneratedRunScenario } from "@/content/world-scenarios";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  ORGANIZATION_AGENDAS,
  ORGANIZATION_MOTIVES,
  type UndergroundActor,
  type UndergroundOrganization,
} from "@/game/simulation/state/world-state";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { generateScenarioContent } from "@/game/world-generation/generate-scenario";
import { organizationRuleFailure } from "@/game/world-generation/organizations";
import { worldStateSchema } from "@/persistence/world-state-schema";

/**
 * Procedural organizations (Game-First G2, #78; GAME_FIRST_REBOOT §4). These
 * tests pin the organization contract the simulation may rely on: identity,
 * ownership, motive and agenda, symmetric rivalry, and player-safe storage.
 */

const GENERATED: readonly GeneratedRunScenario[] = ["fresh-scene", "high-pressure"];
const SEEDS = Array.from({ length: 24 }, (_, index) => index + 1);
const AUTHORED_RESERVED = (() => {
  const content = instantiateWorldContent();
  return [...content.actors, ...content.targets].map((entry) => entry.handle);
})();

function generate(seed: number, scenario: GeneratedRunScenario, reserved = AUTHORED_RESERVED) {
  return generateScenarioContent({ seed, scenario, reservedHandles: reserved });
}

describe("generated scenes carry real organizations (Game-First G2, #78)", () => {
  it("creates the number of organizations its scene names, each with a distinct name", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const { organizations } = generate(seed, scenario);
        const names = organizations.map((org) => org.name.toLowerCase());

        expect(organizations).toHaveLength(GENERATED_SCENARIO_SPECS[scenario].organizations);
        expect(new Set(names).size).toBe(names.length);
        expect(organizations.map((org) => org.id)).toEqual(
          organizations.map((_, index) => `org-${index + 1}`),
        );
      }
    }
  });

  it("gives every organization members and at least one target it owns", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const world = generate(seed, scenario);

        for (const org of world.organizations) {
          expect(org.memberIds.length, `${org.id} seed ${seed}`).toBeGreaterThan(0);
          expect(org.targetIds.length, `${org.id} seed ${seed}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("gives every target exactly one owning organization, and that owner a membership", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const world = generate(seed, scenario);

        for (const target of world.targets) {
          const owners = world.organizations.filter((org) => org.targetIds.includes(target.id));
          expect(owners, `${target.id} seed ${seed}`).toHaveLength(1);

          const owner = world.actors.find((actor) => actor.targetId === target.id)!;
          expect(owners[0]!.memberIds).toContain(owner.id);
        }
      }
    }
  });

  it("gives members their organization's network and points each one back", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const world = generate(seed, scenario);

        for (const actor of world.actors) {
          if (actor.targetId === undefined) {
            // Brokers are independent intermediaries and belong to no organization.
            expect(actor.organizationId).toBeUndefined();
            continue;
          }

          const org = world.organizations.find((entry) => entry.id === actor.organizationId);
          expect(org, `${actor.id} seed ${seed}`).toBeDefined();
          expect(actor.network).toBe(org!.network);
        }
      }
    }
  });

  it("keeps rivalries symmetric and never reflexive", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        const { organizations } = generate(seed, scenario);
        const byId = new Map(organizations.map((org) => [org.id, org]));

        for (const org of organizations) {
          expect(org.rivalIds).not.toContain(org.id);

          for (const rivalId of org.rivalIds) {
            expect(byId.get(rivalId)?.rivalIds, `${org.id}/${rivalId} seed ${seed}`).toContain(
              org.id,
            );
          }
        }
      }
    }
  });

  it("draws motives and agendas only from the closed vocabularies", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS) {
        for (const org of generate(seed, scenario).organizations) {
          expect(ORGANIZATION_MOTIVES).toContain(org.motive);
          expect(ORGANIZATION_AGENDAS).toContain(org.agenda);
        }
      }
    }
  });

  it("is a pure function of the seed, the scene and the reserved names", () => {
    for (const scenario of GENERATED) {
      expect(generate(11, scenario).organizations).toEqual(generate(11, scenario).organizations);
    }
  });

  it("keeps every organization unchanged when a person's name is reserved", () => {
    const plain = generate(5, "fresh-scene");
    const reserved = generate(5, "fresh-scene", [
      ...AUTHORED_RESERVED,
      plain.actors[0]!.handle,
    ]);

    // Names come from their own pool and never read a handle, so reserving a
    // person's name cannot move an organization.
    expect(reserved.organizations).toEqual(plain.organizations);
  });
});

describe("organizations are stored with the run (Game-First G2, #78)", () => {
  it("gives a generated run the organizations its scene planned", () => {
    for (const scenario of GENERATED) {
      const plan = generate(4, scenario).organizations;
      const world = createSliceWorldState({ seed: 4, handle: "Night_Wren", scenario });

      expect(world.underground.organizations).toEqual(plan);
    }
  });

  it("gives a canonical run no organizations, so the authored world is unchanged", () => {
    const world = createSliceWorldState({ seed: 4, handle: "Night_Wren", scenario: "canonical" });

    expect(world.underground.organizations).toEqual([]);
    expect(world.underground.actors.every((actor) => actor.organizationId === undefined)).toBe(
      true,
    );
  });

  it("reads a save from before organizations existed as having none", () => {
    const saved = JSON.parse(
      JSON.stringify(createSliceWorldState({ seed: 4, handle: "Night_Wren", scenario: "fresh-scene" })),
    ) as { underground: Record<string, unknown> };
    delete saved.underground.organizations;

    expect(worldStateSchema.parse(saved).underground.organizations).toEqual([]);
  });

  it("round-trips a generated run's organizations through the save schema", () => {
    const world = createSliceWorldState({ seed: 9, handle: "Night_Wren", scenario: "high-pressure" });
    const parsed = worldStateSchema.parse(JSON.parse(JSON.stringify(world)));

    expect(parsed.underground.organizations).toEqual(world.underground.organizations);
  });
});

describe("organizations stay out of the player's view (Game-First G2, #78)", () => {
  it("does not project any organization name, motive, agenda or rivalry", () => {
    for (const scenario of GENERATED) {
      for (const seed of SEEDS.slice(0, 6)) {
        const world = createSliceWorldState({ seed, handle: "Night_Wren", scenario });
        const projection = JSON.stringify(projectWorld(world));

        for (const org of world.underground.organizations) {
          expect(projection, `${org.id} seed ${seed}`).not.toContain(org.name);
        }
        expect(projection).not.toContain("rivalIds");
        expect(projection).not.toContain("motive");
        expect(projection).not.toContain("agenda");
      }
    }
  });
});

describe("the organization rules reject broken rosters (Game-First G2, #78)", () => {
  const world = generate(3, "fresh-scene");
  const actors = (): UndergroundActor[] => structuredClone(world.actors);
  const targets = () => structuredClone(world.targets);
  const orgs = (): UndergroundOrganization[] => structuredClone(world.organizations);

  it("accepts the generated plan", () => {
    expect(organizationRuleFailure(orgs(), actors(), targets())).toBeNull();
  });

  it("rejects a member who does not point back to its organization", () => {
    const broken = actors();
    broken[0]!.organizationId = undefined;

    expect(organizationRuleFailure(orgs(), broken, targets())).toMatch(/does not point back/);
  });

  it("rejects one-sided rivalry", () => {
    const broken = orgs();
    const rival = broken.find((org) => org.rivalIds.length > 0) ?? broken[0]!;
    rival.rivalIds = [...rival.rivalIds, rival.id === "org-1" ? "org-2" : "org-1"];

    expect(organizationRuleFailure(broken, actors(), targets())).toMatch(/not symmetric|invalid rival/);
  });

  it("rejects an organization that claims a target whose owner is not a member", () => {
    const broken = orgs();
    const [first, second] = broken;
    first!.targetIds = [...first!.targetIds, second!.targetIds[0]!];

    expect(organizationRuleFailure(broken, actors(), targets())).not.toBeNull();
  });
});
