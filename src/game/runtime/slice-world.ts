import { createInitialWorldState } from "@/game/simulation/state/world-state";

export function createSliceWorldState() {
  return createInitialWorldState({
    player: {
      handle: "CobaltXZ",
      rank: 100_256,
    },
    knownTargetIds: [],
    targets: [
      {
        id: "nightshade",
        handle: "NIGHTSHADE",
        rank: 10,
        hidden: {
          operationalSkill: 99,
          sponsorId: "black-index",
          note: "Phase 1 fixture: hidden from player projection until observed.",
        },
      },
    ],
  });
}
