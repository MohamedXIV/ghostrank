import { findModelItem } from "@/content/model-catalog";
import type {
  TargetState,
  UndergroundActor,
} from "@/game/simulation/state/world-state";

/**
 * Phase 8 P0 — authored world content lives here instead of inside the runtime
 * fixture. Archetypes are editorial metadata only: they guide later breadth and
 * tests, but never enter authoritative WorldState or become a power/class gate.
 */
export type WorldActorArchetype =
  | "apex-operator"
  | "broker"
  | "automation-specialist"
  | "reckless-tinkerer"
  | "street-operator";

export type WorldTargetArchetype = "elite-underground-operator";

export interface WorldActorContent {
  archetype: WorldActorArchetype;
  actor: UndergroundActor;
}

export interface WorldTargetContent {
  archetype: WorldTargetArchetype;
  target: TargetState;
}

export interface WorldContentRoster {
  id: string;
  actors: readonly WorldActorContent[];
  targets: readonly WorldTargetContent[];
}

/**
 * The Phase 2–7 canonical roster, moved verbatim out of slice-world.ts.
 *
 * P0 intentionally adds no breadth yet. Keeping this roster byte-equivalent is
 * the compatibility floor; later Phase 8 slices can add authored entries here
 * without teaching runtime code about specific handles.
 */
export const CORE_WORLD_CONTENT: WorldContentRoster = {
  id: "alpha-core",
  actors: [
    {
      archetype: "apex-operator",
      actor: {
        id: "nightshade",
        handle: "NIGHTSHADE",
        rank: 10,
        network: "black",
        skill: 92,
        defense: 88,
        discretion: 70,
        activity: 12,
        targetId: "nightshade",
      },
    },
    {
      archetype: "broker",
      actor: {
        id: "vesper",
        handle: "VESPER",
        rank: 480,
        network: "white",
        skill: 70,
        defense: 60,
        discretion: 40,
        activity: 25,
      },
    },
    {
      archetype: "automation-specialist",
      actor: {
        id: "lattice",
        handle: "LATTICE",
        rank: 3_400,
        network: "black",
        skill: 62,
        defense: 55,
        discretion: 55,
        activity: 30,
        modelId: "model-local-workhorse",
      },
    },
    {
      archetype: "reckless-tinkerer",
      actor: {
        id: "halfmoon",
        handle: "HALFMOON",
        rank: 22_000,
        network: "white",
        skill: 45,
        defense: 40,
        discretion: 30,
        activity: 35,
        modelId: "model-local-salvage",
      },
    },
    {
      archetype: "street-operator",
      actor: {
        id: "kestrel",
        handle: "KESTREL",
        rank: 61_000,
        network: "black",
        skill: 35,
        defense: 30,
        discretion: 20,
        activity: 35,
      },
    },
  ],
  targets: [
    {
      archetype: "elite-underground-operator",
      target: {
        id: "nightshade",
        handle: "NIGHTSHADE",
        rank: 10,
        machines: [
          {
            id: "ns-relay",
            label: "Outer Relay",
            role: "relay",
            services: [
              {
                id: "ns-signal",
                label: "Signal Broker",
                kind: "signal",
                state: "online",
              },
            ],
          },
          {
            id: "ns-vault",
            label: "Cold Vault",
            role: "vault",
            services: [
              {
                id: "ns-archive",
                label: "Archive Index",
                kind: "archive",
                state: "online",
              },
            ],
          },
        ],
        hidden: {
          operationalSkill: 99,
          sponsorId: "black-index",
          note: "Authoritative operation truth; infrastructure stays hidden until supported by evidence.",
        },
      },
    },
  ],
};

export interface InstantiatedWorldContent {
  actors: UndergroundActor[];
  targets: TargetState[];
}

/**
 * Validate authored content at the data/runtime boundary.
 *
 * This is deliberately about structural content mistakes, not balance:
 * duplicate ids, dangling actor-owned targets, invalid 0–100 actor inputs,
 * unknown assistant models, and empty target infrastructure fail loudly.
 */
export function validateWorldContentRoster(
  roster: WorldContentRoster,
): void {
  if (roster.id.trim().length === 0) {
    throw new Error("World content roster id must not be empty");
  }

  const actorIds = new Set<string>();
  const targetIds = new Set<string>();
  const machineIds = new Set<string>();
  const serviceIds = new Set<string>();

  for (const { actor } of roster.actors) {
    if (actorIds.has(actor.id)) {
      throw new Error(`Duplicate world actor id: ${actor.id}`);
    }
    actorIds.add(actor.id);

    for (const [field, value] of [
      ["skill", actor.skill],
      ["defense", actor.defense],
      ["discretion", actor.discretion],
      ["activity", actor.activity],
    ] as const) {
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error(
          `World actor ${actor.id} has invalid ${field}: ${value}`,
        );
      }
    }

    if (!Number.isInteger(actor.rank) || actor.rank < 1) {
      throw new Error(`World actor ${actor.id} has invalid rank`);
    }

    if (actor.modelId && !findModelItem(actor.modelId)) {
      throw new Error(
        `World actor ${actor.id} references unknown model ${actor.modelId}`,
      );
    }
  }

  for (const { target } of roster.targets) {
    if (targetIds.has(target.id)) {
      throw new Error(`Duplicate world target id: ${target.id}`);
    }
    targetIds.add(target.id);

    if (!Number.isInteger(target.rank) || target.rank < 1) {
      throw new Error(`World target ${target.id} has invalid rank`);
    }

    if (target.machines.length === 0) {
      throw new Error(`World target ${target.id} has no infrastructure`);
    }

    for (const machine of target.machines) {
      if (machineIds.has(machine.id)) {
        throw new Error(`Duplicate world machine id: ${machine.id}`);
      }
      machineIds.add(machine.id);

      if (machine.services.length === 0) {
        throw new Error(
          `World machine ${machine.id} has no simulated services`,
        );
      }

      for (const service of machine.services) {
        if (serviceIds.has(service.id)) {
          throw new Error(`Duplicate world service id: ${service.id}`);
        }
        serviceIds.add(service.id);
      }
    }
  }

  for (const { actor } of roster.actors) {
    if (!actor.targetId) {
      continue;
    }

    const owned = roster.targets.find(
      ({ target }) => target.id === actor.targetId,
    )?.target;

    if (!owned) {
      throw new Error(
        `World actor ${actor.id} owns missing target ${actor.targetId}`,
      );
    }

    if (owned.handle !== actor.handle || owned.rank !== actor.rank) {
      throw new Error(
        `World actor ${actor.id} and owned target ${owned.id} disagree on public identity`,
      );
    }
  }
}

/**
 * Clone authored content before handing it to simulation authority. Runtime
 * mutation can never rewrite the catalog used by the next run/test.
 */
export function instantiateWorldContent(
  roster: WorldContentRoster = CORE_WORLD_CONTENT,
): InstantiatedWorldContent {
  validateWorldContentRoster(roster);

  return {
    actors: roster.actors.map(({ actor }) => structuredClone(actor)),
    targets: roster.targets.map(({ target }) => structuredClone(target)),
  };
}
