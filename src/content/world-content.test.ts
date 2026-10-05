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
      { archetype: "scam-operator", id: "velvetwire" },
      { archetype: "extortion-operator", id: "ironveil" },
      { archetype: "market-predator", id: "tallyman" },
      { archetype: "corporate-operator", id: "daystar" },
      { archetype: "rival-operator", id: "rookery" },
    ]);
    expect(
      CORE_WORLD_CONTENT.targets.map(({ archetype, target }) => ({
        archetype,
        id: target.id,
      })),
    ).toEqual([
      { archetype: "elite-underground-operator", id: "nightshade" },
      { archetype: "scam-network", id: "velvetwire" },
      { archetype: "extortion-crew", id: "ironveil" },
      { archetype: "predatory-market", id: "tallyman" },
      { archetype: "corporate-infrastructure", id: "daystar" },
      { archetype: "rival-infrastructure", id: "rookery" },
    ]);
  });

  it("instantiates simulation-shaped clones without leaking archetype metadata", () => {
    const first = instantiateWorldContent();
    const second = instantiateWorldContent();

    expect(first.actors).toHaveLength(10);
    expect(first.targets).toHaveLength(6);
    expect(first.actors[0]).not.toHaveProperty("archetype");
    expect(first.targets[0]).not.toHaveProperty("archetype");

    first.actors[0].skill = 0;
    first.targets[0].machines[0].label = "mutated";

    expect(second.actors[0].skill).toBe(92);
    expect(second.targets[0].machines[0].label).toBe("Outer Relay");
    expect(CORE_WORLD_CONTENT.actors[0].actor.skill).toBe(92);
  });

  it("preserves every pre-P0 authored entry while P2 adds breadth around it", () => {
    const current = createSliceWorldState();
    const legacy = legacyPreP0SliceWorld();

    expect(current.underground.actors.slice(0, 5)).toEqual(
      legacy.underground.actors,
    );
    expect(current.targets[0]).toEqual(legacy.targets[0]);
    expect(current.player).toEqual(legacy.player);
    expect(current.economy).toEqual(legacy.economy);
    expect(current.underground.seed).toBe(legacy.underground.seed);
    expect(current.underground.playerNetwork).toBe(
      legacy.underground.playerNetwork,
    );
  });

  it("preserves the canonical slice-world roster and public identity", () => {
    const state = createSliceWorldState();

    expect(state.underground.actors.map((actor) => actor.id)).toEqual([
      "nightshade",
      "vesper",
      "lattice",
      "halfmoon",
      "kestrel",
      "velvetwire",
      "ironveil",
      "tallyman",
      "daystar",
      "rookery",
    ]);
    expect(state.targets.map((target) => target.id)).toEqual([
      "nightshade",
      "velvetwire",
      "ironveil",
      "tallyman",
      "daystar",
      "rookery",
    ]);
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

    for (const target of state.targets.slice(1)) {
      const owner = state.underground.actors.find(
        (actor) => actor.targetId === target.id,
      );
      expect(owner).toBeDefined();
      expect(owner?.handle).toBe(target.handle);
      expect(owner?.rank).toBe(target.rank);
      expect(target.machines.length).toBeGreaterThanOrEqual(2);
      expect(
        target.machines.reduce(
          (sum, machine) => sum + machine.services.length,
          0,
        ),
      ).toBeGreaterThanOrEqual(3);
    }
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

  it("rejects fractional percentages and empty persisted strings", () => {
    const fractional = structuredClone(CORE_WORLD_CONTENT);
    fractional.actors[0].actor.activity = 12.5;
    expect(() => validateWorldContentRoster(fractional)).toThrow(
      "invalid activity: 12.5",
    );

    const cases: {
      label: string;
      mutate: (roster: WorldContentRoster) => void;
      error: string;
    }[] = [
      {
        label: "actor id",
        mutate: (roster) => {
          roster.actors[0].actor.id = "";
        },
        error: "World actor id must not be empty",
      },
      {
        label: "actor handle",
        mutate: (roster) => {
          roster.actors[0].actor.handle = "   ";
        },
        error: "World actor nightshade handle must not be empty",
      },
      {
        label: "target id",
        mutate: (roster) => {
          roster.targets[0].target.id = "";
        },
        error: "World target id must not be empty",
      },
      {
        label: "target handle",
        mutate: (roster) => {
          roster.targets[0].target.handle = "";
        },
        error: "World target nightshade handle must not be empty",
      },
      {
        label: "machine id",
        mutate: (roster) => {
          roster.targets[0].target.machines[0].id = "";
        },
        error: "World machine id must not be empty",
      },
      {
        label: "machine label",
        mutate: (roster) => {
          roster.targets[0].target.machines[0].label = "";
        },
        error: "World machine ns-relay label must not be empty",
      },
      {
        label: "machine role",
        mutate: (roster) => {
          roster.targets[0].target.machines[0].role = "";
        },
        error: "World machine ns-relay role must not be empty",
      },
      {
        label: "service id",
        mutate: (roster) => {
          roster.targets[0].target.machines[0].services[0].id = "";
        },
        error: "World service id must not be empty",
      },
      {
        label: "service label",
        mutate: (roster) => {
          roster.targets[0].target.machines[0].services[0].label = "";
        },
        error: "World service ns-signal label must not be empty",
      },
      {
        label: "service kind",
        mutate: (roster) => {
          roster.targets[0].target.machines[0].services[0].kind = "";
        },
        error: "World service ns-signal kind must not be empty",
      },
    ];

    for (const entry of cases) {
      const roster = structuredClone(CORE_WORLD_CONTENT);
      entry.mutate(roster);
      expect(
        () => validateWorldContentRoster(roster),
        entry.label,
      ).toThrow(entry.error);
    }
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
