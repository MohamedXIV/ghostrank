import { STARTER_RIG_ID } from "@/content/hardware-catalog";
import { instantiateWorldContent } from "@/content/world-content";
import { generateRunSeed } from "@/game/simulation/rng/seeded-rng";
import {
  createInitialWorldState,
  type WorldState,
} from "@/game/simulation/state/world-state";

export const SLICE_WORLD_SEED = 20_261_003;

export interface CreateSliceWorldOptions {
  seed?: number;
  handle?: string;
}

/**
 * Creates the standard slice world state.
 * If seed is not specified, defaults to SLICE_WORLD_SEED to preserve
 * determinism for existing tests and predictable runs.
 */
export function createSliceWorldState(
  options: CreateSliceWorldOptions = {},
): WorldState {
  const content = instantiateWorldContent();
  const seed = options.seed ?? SLICE_WORLD_SEED;

  return createInitialWorldState({
    player: {
      handle: options.handle ?? "CobaltXZ",
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
      seed,
      playerNetwork: "white",
      actors: content.actors,
    },
    targets: content.targets,
  });
}

/**
 * Creates a fresh new run world state with a genuinely varying random seed.
 * Can optionally accept an explicit seed (for repeatable replay/testing).
 */
export function createNewRunWorldState(
  options: CreateSliceWorldOptions = {},
): WorldState {
  const seed = options.seed ?? generateRunSeed();
  return createSliceWorldState({ ...options, seed });
}

