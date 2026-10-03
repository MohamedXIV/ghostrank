import { createInitialWorldState } from "@/game/simulation/state/world-state";

export const SLICE_WORLD_SEED = 20_261_003;

export function createSliceWorldState() {
  return createInitialWorldState({
    player: {
      handle: "CobaltXZ",
      rank: 100_256,
    },
    knownTargetIds: [],
    evidence: [],
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
