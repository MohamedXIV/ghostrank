import { describe, expect, it } from "vitest";

import {
  CORE_WORLD_CONTENT,
  instantiateWorldContent,
  validateWorldContentRoster,
  type WorldContentRoster,
} from "@/content/world-content";
import {
  createSliceWorldState,
  SLICE_WORLD_SEED,
} from "@/game/runtime/slice-world";
import { STARTER_RIG_ID } from "@/content/hardware-catalog";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

function legacyPreP0SliceWorld() {
  return createInitialWorldState({
    player: {
      handle: "CobaltXZ",
      rank: 100_256,
    },
    knownTargetIds: [],
    evidence: [],
    economy: {
      credits: 0,
      ledger: [],
      hardware: [
        {
          id: "hw:1",
          catalogId: STARTER_RIG_ID,
          acquiredWorldMinute: 0,
        },
      ],
    },
    underground: {
      seed: SLICE_WORLD_SEED,
      playerNetwork: "white",
      actors: [
        {
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
        {
          id: "vesper",
          handle: "VESPER",
          rank: 480,
          network: "white",
          skill: 70,
          defense: 60,
          discretion: 40,
          activity: 25,
        },
        {
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
        {
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
        {
          id: "kestrel",
          handle: "KESTREL",
          rank: 61_000,
          network: "black",
          skill: 35,
          defense: 30,
          discretion: 20,
          activity: 35,
        },
      ],
    },
    targets: [
      {
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
    ],
  });
}

describe("Phase 8 P0 — world content roster", () => {
  it("describes the canonical peers and target outside runtime state", () => {
    expect(CORE_WORLD_CONTENT.id).toBe("alpha-core");
    expect(
      CORE_WORLD_CONTENT.actors.map(({ archetype, actor }) => ({
        archetype,
        id: actor.id,
      })),
    ).toEqual([
      { archetype: "apex-operator", id: "nightshade" },
      { archetype: "broker", id: "vesper" },
      { archetype: "automation-specialist", id: "lattice" },
      { archetype: "reckless-tinkerer", id: "halfmoon" },
      { archetype: "street-operator", id: "kestrel" },
    ]);
    expect(
      CORE_WORLD_CONTENT.targets.map(({ archetype, target }) => ({
        archetype,
        id: target.id,
      })),
    ).toEqual([
      { archetype: "elite-underground-operator", id: "nightshade" },
    ]);
  });

  it("instantiates simulation-shaped clones without leaking archetype metadata", () => {
    const first = instantiateWorldContent();
    const second = instantiateWorldContent();

    expect(first.actors).toHaveLength(5);
    expect(first.targets).toHaveLength(1);
    expect(first.actors[0]).not.toHaveProperty("archetype");
    expect(first.targets[0]).not.toHaveProperty("archetype");

    first.actors[0].skill = 0;
    first.targets[0].machines[0].label = "mutated";

    expect(second.actors[0].skill).toBe(92);
    expect(second.targets[0].machines[0].label).toBe("Outer Relay");
    expect(CORE_WORLD_CONTENT.actors[0].actor.skill).toBe(92);
  });

  it("preserves the complete pre-P0 default world byte-for-byte as data", () => {
    expect(createSliceWorldState()).toEqual(legacyPreP0SliceWorld());
  });

  it("preserves the canonical slice-world roster and public identity", () => {
    const state = createSliceWorldState();

    expect(state.underground.actors.map((actor) => actor.id)).toEqual([
      "nightshade",
      "vesper",
      "lattice",
      "halfmoon",
      "kestrel",
    ]);
    expect(state.targets.map((target) => target.id)).toEqual(["nightshade"]);
    expect(state.underground.actors[0]).toMatchObject({
      id: "nightshade",
      handle: "NIGHTSHADE",
      rank: 10,
      targetId: "nightshade",
    });
    expect(state.targets[0]).toMatchObject({
      id: "nightshade",
      handle: "NIGHTSHADE",
      rank: 10,
    });
  });

  it("rejects duplicate authored ids before they enter simulation state", () => {
    const duplicateActor: WorldContentRoster = {
      ...CORE_WORLD_CONTENT,
      actors: [
        ...CORE_WORLD_CONTENT.actors,
        structuredClone(CORE_WORLD_CONTENT.actors[0]),
      ],
    };

    expect(() => validateWorldContentRoster(duplicateActor)).toThrow(
      "Duplicate world actor id: nightshade",
    );

    const duplicatedMachine = structuredClone(CORE_WORLD_CONTENT.targets[0]);
    duplicatedMachine.target.id = "second-target";
    duplicatedMachine.target.handle = "SECOND";
    duplicatedMachine.target.rank = 20;
    duplicatedMachine.target.machines[0].id = "ns-vault";

    const duplicateInfrastructure: WorldContentRoster = {
      ...CORE_WORLD_CONTENT,
      targets: [...CORE_WORLD_CONTENT.targets, duplicatedMachine],
    };

    expect(() => validateWorldContentRoster(duplicateInfrastructure)).toThrow(
      "Duplicate world machine id: ns-vault",
    );
  });

  it("rejects dangling ownership, unknown assistants, and actor/target identity drift", () => {
    const danglingActor = structuredClone(CORE_WORLD_CONTENT.actors[1]);
    danglingActor.actor.targetId = "missing-target";

    expect(() =>
      validateWorldContentRoster({
        ...CORE_WORLD_CONTENT,
        actors: [
          CORE_WORLD_CONTENT.actors[0],
          danglingActor,
          ...CORE_WORLD_CONTENT.actors.slice(2),
        ],
      }),
    ).toThrow("owns missing target missing-target");

    const badModel = structuredClone(CORE_WORLD_CONTENT.actors[2]);
    badModel.actor.modelId = "model-does-not-exist";

    expect(() =>
      validateWorldContentRoster({
        ...CORE_WORLD_CONTENT,
        actors: [
          CORE_WORLD_CONTENT.actors[0],
          CORE_WORLD_CONTENT.actors[1],
          badModel,
          ...CORE_WORLD_CONTENT.actors.slice(3),
        ],
      }),
    ).toThrow("references unknown model model-does-not-exist");

    const drift = structuredClone(CORE_WORLD_CONTENT.targets[0]);
    drift.target.rank = 11;

    expect(() =>
      validateWorldContentRoster({
        ...CORE_WORLD_CONTENT,
        targets: [drift],
      }),
    ).toThrow("disagree on public identity");
  });
});
