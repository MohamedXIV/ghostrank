import { STARTER_RIG_ID } from "@/content/hardware-catalog";
import { instantiateWorldContent } from "@/content/world-content";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

export const SLICE_WORLD_SEED = 20_261_003;

export function createSliceWorldState() {
  const content = instantiateWorldContent();

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
      actors: content.actors,
    },
    targets: content.targets,
  });
}
