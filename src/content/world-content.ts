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
  | "street-operator"
  | "scam-operator"
  | "extortion-operator"
  | "market-predator"
  | "corporate-operator"
  | "rival-operator";

export type WorldTargetArchetype =
  | "elite-underground-operator"
  | "scam-network"
  | "extortion-crew"
  | "predatory-market"
  | "corporate-infrastructure"
  | "rival-infrastructure";

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
 * Phase 8 authored world roster.
 *
 * P0 moved the Phase 2–7 canonical five peers / NIGHTSHADE target here without
 * changing runtime behavior. P2 broadens this same data surface with fictional
 * scam/extortion/market/corporate/rival target-owner archetypes. The simulation
 * still sees only ordinary actors, targets, machines and services.
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
    {
      archetype: "scam-operator",
      actor: {
        id: "velvetwire",
        handle: "VELVETWIRE",
        rank: 8_600,
        network: "black",
        skill: 58,
        defense: 44,
        discretion: 78,
        activity: 26,
        targetId: "velvetwire",
      },
    },
    {
      archetype: "extortion-operator",
      actor: {
        id: "ironveil",
        handle: "IRONVEIL",
        rank: 1_750,
        network: "black",
        skill: 74,
        defense: 67,
        discretion: 50,
        activity: 24,
        modelId: "model-local-workhorse",
        targetId: "ironveil",
      },
    },
    {
      archetype: "market-predator",
      actor: {
        id: "tallyman",
        handle: "TALLYMAN",
        rank: 6_200,
        network: "black",
        skill: 56,
        defense: 72,
        discretion: 64,
        activity: 22,
        targetId: "tallyman",
      },
    },
    {
      archetype: "corporate-operator",
      actor: {
        id: "daystar",
        handle: "DAYSTAR",
        rank: 14_800,
        network: "white",
        skill: 50,
        defense: 82,
        discretion: 84,
        activity: 15,
        modelId: "model-local-tuned",
        targetId: "daystar",
      },
    },
    {
      archetype: "rival-operator",
      actor: {
        id: "rookery",
        handle: "ROOKERY",
        rank: 39_000,
        network: "white",
        skill: 66,
        defense: 59,
        discretion: 46,
        activity: 31,
        targetId: "rookery",
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
    {
      archetype: "scam-network",
      target: {
        id: "velvetwire",
        handle: "VELVETWIRE",
        rank: 8_600,
        machines: [
          {
            id: "vw-front",
            label: "Mirror Front",
            role: "front",
            services: [
              {
                id: "vw-board",
                label: "Offer Board",
                kind: "marketplace",
                state: "online",
              },
            ],
          },
          {
            id: "vw-ledger",
            label: "Settlement Ledger",
            role: "ledger",
            services: [
              {
                id: "vw-clearing",
                label: "Clearing Queue",
                kind: "ledger",
                state: "online",
              },
              {
                id: "vw-contact",
                label: "Contact Index",
                kind: "contacts",
                state: "online",
              },
            ],
          },
        ],
      },
    },
    {
      archetype: "extortion-crew",
      target: {
        id: "ironveil",
        handle: "IRONVEIL",
        rank: 1_750,
        machines: [
          {
            id: "iv-relay",
            label: "Relay Cage",
            role: "relay",
            services: [
              {
                id: "iv-signal",
                label: "Signal Queue",
                kind: "signal",
                state: "online",
              },
            ],
          },
          {
            id: "iv-locker",
            label: "Pressure Locker",
            role: "vault",
            services: [
              {
                id: "iv-dossier",
                label: "Dossier Index",
                kind: "archive",
                state: "online",
              },
            ],
          },
          {
            id: "iv-coordinator",
            label: "Crew Coordinator",
            role: "coordinator",
            services: [
              {
                id: "iv-schedule",
                label: "Dispatch Schedule",
                kind: "dispatch",
                state: "online",
              },
            ],
          },
        ],
      },
    },
    {
      archetype: "predatory-market",
      target: {
        id: "tallyman",
        handle: "TALLYMAN",
        rank: 6_200,
        machines: [
          {
            id: "tm-exchange",
            label: "Exchange Node",
            role: "exchange",
            services: [
              {
                id: "tm-orders",
                label: "Order Book",
                kind: "market",
                state: "online",
              },
            ],
          },
          {
            id: "tm-cache",
            label: "Price Cache",
            role: "vault",
            services: [
              {
                id: "tm-pricing",
                label: "Pricing Feed",
                kind: "pricing",
                state: "online",
              },
              {
                id: "tm-history",
                label: "Trade Archive",
                kind: "archive",
                state: "online",
              },
            ],
          },
        ],
      },
    },
    {
      archetype: "corporate-infrastructure",
      target: {
        id: "daystar",
        handle: "DAYSTAR",
        rank: 14_800,
        machines: [
          {
            id: "ds-edge",
            label: "Partner Edge",
            role: "gateway",
            services: [
              {
                id: "ds-portal",
                label: "Partner Portal",
                kind: "portal",
                state: "online",
              },
            ],
          },
          {
            id: "ds-ops",
            label: "Operations Cluster",
            role: "operations",
            services: [
              {
                id: "ds-scheduler",
                label: "Work Scheduler",
                kind: "scheduler",
                state: "online",
              },
            ],
          },
          {
            id: "ds-archive",
            label: "Records Store",
            role: "archive",
            services: [
              {
                id: "ds-records",
                label: "Records Index",
                kind: "records",
                state: "online",
              },
            ],
          },
        ],
      },
    },
    {
      archetype: "rival-infrastructure",
      target: {
        id: "rookery",
        handle: "ROOKERY",
        rank: 39_000,
        machines: [
          {
            id: "rk-observer",
            label: "Observer Node",
            role: "monitor",
            services: [
              {
                id: "rk-telemetry",
                label: "Telemetry Stream",
                kind: "telemetry",
                state: "online",
              },
            ],
          },
          {
            id: "rk-workbench",
            label: "Research Workbench",
            role: "lab",
            services: [
              {
                id: "rk-analysis",
                label: "Analysis Queue",
                kind: "analysis",
                state: "online",
              },
              {
                id: "rk-notes",
                label: "Research Notes",
                kind: "archive",
                state: "online",
              },
            ],
          },
        ],
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
function requireContentString(
  value: string,
  label: string,
): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must not be empty`);
  }
}

export function validateWorldContentRoster(
  roster: WorldContentRoster,
): void {
  requireContentString(roster.id, "World content roster id");

  const actorIds = new Set<string>();
  const targetIds = new Set<string>();
  const machineIds = new Set<string>();
  const serviceIds = new Set<string>();

  for (const { actor } of roster.actors) {
    requireContentString(actor.id, "World actor id");
    requireContentString(actor.handle, `World actor ${actor.id} handle`);

    if (actor.targetId !== undefined) {
      requireContentString(
        actor.targetId,
        `World actor ${actor.id} targetId`,
      );
    }

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
      if (!Number.isInteger(value) || value < 0 || value > 100) {
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
    requireContentString(target.id, "World target id");
    requireContentString(target.handle, `World target ${target.id} handle`);

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
      requireContentString(machine.id, "World machine id");
      requireContentString(
        machine.label,
        `World machine ${machine.id} label`,
      );
      requireContentString(
        machine.role,
        `World machine ${machine.id} role`,
      );

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
        requireContentString(service.id, "World service id");
        requireContentString(
          service.label,
          `World service ${service.id} label`,
        );
        requireContentString(
          service.kind,
          `World service ${service.id} kind`,
        );

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
