import { describe, expect, it } from "vitest";

import { instantiateWorldContent } from "@/content/world-content";
import {
  GENERATED_SCENARIO_SPECS,
  MOTIVE_AGENDAS,
  ORGANIZATION_KIND_TAILS,
  type GeneratedRunScenario,
} from "@/content/world-scenarios";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { CommandBus } from "@/game/simulation/command-bus";
import {
  DEFEND_DEFENSE_BONUS,
  EXPAND_OFFER_BONUS_PERCENT,
  defenseBonusOf,
  offerRateBonus,
  offerableTargetsFor,
  rivalTargetsFor,
} from "@/game/simulation/systems/organizations";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import type { WorldState } from "@/game/simulation/state/world-state";
import { generateScenarioContent } from "@/game/world-generation/generate-scenario";

/**
 * Organizations in generated scenes (Game-First G2, #78; D066). The generator
 * must build real, consistent organizations, and the simulation must read their
 * agendas while the player sees only a public name.
 */

const DAY = 24 * 60;
const SCENES: readonly GeneratedRunScenario[] = ["fresh-scene", "high-pressure"];
const SEEDS = Array.from({ length: 120 }, (_, index) => index + 1);
const RESERVED = (() => {
  const content = instantiateWorldContent();
  return [...content.actors, ...content.targets].map((entry) => entry.handle);
})();

function scene(seed: number, scenario: GeneratedRunScenario) {
  return generateScenarioContent({ seed, scenario, reservedHandles: RESERVED });
}

function sceneWorld(seed: number, scenario: GeneratedRunScenario): WorldState {
  return createSliceWorldState({ seed, handle: "Night_Wren", scenario });
}

describe("generated organizations are real and consistent (D066)", () => {
  it("builds the organization count each scene names, with unique public names", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const world = scene(seed, scenario);
        const names = world.organizations.map((org) => org.name.toLowerCase());

        expect(world.organizations).toHaveLength(GENERATED_SCENARIO_SPECS[scenario].organizations);
        expect(new Set(names).size).toBe(names.length);
      }
    }
  });

  it("gives each organization a public name that matches its kind", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        for (const org of scene(seed, scenario).organizations) {
          const tails = ORGANIZATION_KIND_TAILS[org.kind];
          expect(tails.some((tail) => org.name.endsWith(` ${tail}`))).toBe(true);
        }
      }
    }
  });

  it("holds every target in its owner's organization, and every organization holds infrastructure", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const world = scene(seed, scenario);

        for (const target of world.targets) {
          const owner = world.actors.find((actor) => actor.targetId === target.id);
          expect(owner?.organizationId).toBeDefined();
          expect(target.organizationId).toBe(owner?.organizationId);
        }

        for (const org of world.organizations) {
          expect(
            world.actors.some(
              (actor) => actor.organizationId === org.id && actor.targetId !== undefined,
            ),
          ).toBe(true);
        }
      }
    }
  });

  it("keeps rivalries symmetric, never self-referential, and every organization in one", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const orgs = scene(seed, scenario).organizations;
        const byId = new Map(orgs.map((org) => [org.id, org]));

        for (const org of orgs) {
          expect(org.rivalIds.length).toBeGreaterThan(0);
          expect(org.rivalIds).not.toContain(org.id);

          for (const rivalId of org.rivalIds) {
            const rival = byId.get(rivalId);
            expect(rival, `${org.id} -> ${rivalId}`).toBeDefined();
            expect(rival!.rivalIds).toContain(org.id);
          }
        }
      }
    }
  });

  it("draws each agenda from the motive behind it, and every motive appears across seeds", () => {
    const motives = new Set<string>();

    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        for (const org of scene(seed, scenario).organizations) {
          motives.add(org.motive);
          const allowed = MOTIVE_AGENDAS[org.motive].map((entry) => entry.value);
          expect(allowed).toContain(org.agenda);
        }
      }
    }

    expect([...motives].sort()).toEqual(["control", "profit", "revenge"]);
  });

  it("is the same for the same seed, and a reserved name does not move an organization", () => {
    for (const scenario of SCENES) {
      const plain = scene(6, scenario);
      expect(scene(6, scenario).organizations).toEqual(plain.organizations);

      const reserved = generateScenarioContent({
        seed: 6,
        scenario,
        reservedHandles: [...RESERVED, plain.actors[0]!.handle],
      });
      expect(reserved.organizations).toEqual(plain.organizations);
      expect(reserved.actors.map((actor) => actor.organizationId)).toEqual(
        plain.actors.map((actor) => actor.organizationId),
      );
    }
  });
});

describe("canonical has no organizations (legacy compatibility)", () => {
  it("leaves the authored roster without organization fields", () => {
    const world = createSliceWorldState({ seed: 42, scenario: "canonical" });

    expect(world.underground.organizations).toBeUndefined();
    expect(world.underground.actors.every((actor) => actor.organizationId === undefined)).toBe(true);
    expect(world.targets.every((target) => target.organizationId === undefined)).toBe(true);
  });
});

describe("agendas drive decisions, and the player sees only a public name", () => {
  it("never offers a member work against its own organization's infrastructure", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const bus = new CommandBus(sceneWorld(seed, scenario));
        bus.execute({ type: "advanceTime", minutes: 10 * DAY });
        const world = bus.snapshot();

        for (const contract of world.underground.contracts) {
          const issuer = world.underground.actors.find((actor) => actor.id === contract.issuerId)!;
          const target = world.targets.find((entry) => entry.id === contract.targetId)!;

          if (issuer.organizationId !== undefined) {
            expect(target.organizationId).not.toBe(issuer.organizationId);
          }
        }
      }
    }
  });

  it("points an undercut member at a rival organization's infrastructure", () => {
    let checked = 0;

    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const bus = new CommandBus(sceneWorld(seed, scenario));
        bus.execute({ type: "advanceTime", minutes: 10 * DAY });
        const world = bus.snapshot();
        const orgs = world.underground.organizations ?? [];

        for (const contract of world.underground.contracts) {
          const issuer = world.underground.actors.find((actor) => actor.id === contract.issuerId)!;
          const org = orgs.find((entry) => entry.id === issuer.organizationId);

          if (org?.agenda === "undercut") {
            const target = world.targets.find((entry) => entry.id === contract.targetId)!;
            expect(org.rivalIds).toContain(target.organizationId);
            checked += 1;
          }
        }
      }
    }

    // The sweep must actually exercise the rule, or it proves nothing.
    expect(checked).toBeGreaterThan(0);
  });

  it("reads an agenda only through its decision helpers", () => {
    const world = sceneWorld(3, "fresh-scene");
    const orgs = world.underground.organizations!;
    const expand = orgs.find((org) => org.agenda === "expand");
    const defend = orgs.find((org) => org.agenda === "defend");

    if (expand) {
      expect(offerRateBonus(world, { organizationId: expand.id })).toBe(
        EXPAND_OFFER_BONUS_PERCENT,
      );
    }

    if (defend) {
      expect(defenseBonusOf(world, { organizationId: defend.id })).toBe(
        DEFEND_DEFENSE_BONUS,
      );
    }

    expect(offerRateBonus(world, {})).toBe(0);
    expect(defenseBonusOf(world, {})).toBe(0);
  });

  it("offers an independent issuer every target, and a member every target but its own organization's", () => {
    const world = sceneWorld(4, "high-pressure");
    const targets = world.targets;

    expect(offerableTargetsFor({ targetId: targets[0]!.id }, targets)).toHaveLength(
      targets.length - 1,
    );

    const member = world.targets[0]!.organizationId!;
    const offered = offerableTargetsFor(
      { targetId: targets[0]!.id, organizationId: member },
      targets,
    );
    expect(offered.every((target) => target.organizationId !== member)).toBe(true);
  });

  it("finds rival targets only for an undercut member", () => {
    const world = sceneWorld(3, "fresh-scene");
    const orgs = world.underground.organizations!;
    const undercut = orgs.find((org) => org.agenda === "undercut");

    if (undercut) {
      const rivals = rivalTargetsFor(world, { organizationId: undercut.id }, world.targets);
      expect(rivals.length).toBeGreaterThan(0);
      expect(rivals.every((target) => undercut.rivalIds.includes(target.organizationId!))).toBe(true);
    }

    expect(rivalTargetsFor(world, {}, world.targets)).toEqual([]);
  });

  it("projects an organization's public name on its member's contracts, and nothing hidden", () => {
    let sawName = false;

    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const bus = new CommandBus(sceneWorld(seed, scenario));
        bus.execute({ type: "advanceTime", minutes: 10 * DAY });
        const world = bus.snapshot();
        const projection = projectWorld(world);
        const text = JSON.stringify(projection);

        for (const hidden of ["\"motive\"", "\"agenda\"", "\"rivalIds\"", "\"organizationId\"", "\"organizations\""]) {
          expect(text, `${scenario} seed ${seed} leaks ${hidden}`).not.toContain(hidden);
        }

        // Each shown name is the public name of the issuer's own organization.
        for (const contract of projection.underground.contracts) {
          const source = world.underground.contracts.find(
            (entry) => entry.id === contract.id,
          );
          const issuer = world.underground.actors.find(
            (actor) => actor.id === source?.issuerId,
          );
          const shown = contract.issuerOrganization;
          const own = (world.underground.organizations ?? []).find(
            (org) => org.id === issuer?.organizationId,
          );

          if (shown !== undefined) {
            sawName = true;
          }
          expect(shown).toBe(own?.name);
        }
      }
    }

    expect(sawName).toBe(true);
  });
});

