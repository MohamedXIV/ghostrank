import { STARTER_RIG_ID } from "@/content/hardware-catalog";
import {
  instantiateWorldContent,
  type InstantiatedWorldContent,
} from "@/content/world-content";
import { validatePlayerHandle } from "@/game/identity/player-handle";
import { generateScenarioContent } from "@/game/world-generation/generate-scenario";
import { generateRunSeed } from "@/game/simulation/rng/seeded-rng";
import {
  DEFAULT_RUN_SCENARIO,
  type RunScenario,
} from "@/game/simulation/state/run-scenario";
import {
  createInitialWorldState,
  type WorldState,
} from "@/game/simulation/state/world-state";

export const SLICE_WORLD_SEED = 20_261_003;

/**
 * The handle a run takes when a caller does not choose one. Every player-facing
 * start path passes the handle the player typed, so this only serves tests and
 * the canonical preset.
 */
export const DEFAULT_PLAYER_HANDLE = "CobaltXZ";

export interface CreateSliceWorldOptions {
  seed?: number;
  handle?: string;
  /** How the starting world is made. Defaults to the authored canonical roster. */
  scenario?: RunScenario;
}

/** Every handle the authored roster already uses. A new run may not take one. */
export function authoredHandleRoster(): string[] {
  return rosterHandles(instantiateWorldContent());
}

function rosterHandles(content: InstantiatedWorldContent): string[] {
  return [...content.actors, ...content.targets].map((entry) => entry.handle);
}

/**
 * Creates the standard slice world state.
 * If seed is not specified, defaults to SLICE_WORLD_SEED to preserve
 * determinism for existing tests and predictable runs.
 *
 * The handle is checked against the authored roster, so a run can never open
 * under the name of an actor or target the world already knows. A rejected
 * handle is a programming error here: the entry screen validates first and
 * only passes a handle that it accepted.
 *
 * The canonical scenario uses the authored roster unchanged, so every existing
 * save and test keeps its meaning. A generated scenario draws its people and
 * infrastructure from the seed, and never reuses the player's handle or an
 * authored name (D065).
 */
export function createSliceWorldState(
  options: CreateSliceWorldOptions = {},
): WorldState {
  const authored = instantiateWorldContent();
  const scenario = options.scenario ?? DEFAULT_RUN_SCENARIO;
  const seed = options.seed ?? SLICE_WORLD_SEED;
  const handle = validatePlayerHandle(
    options.handle ?? DEFAULT_PLAYER_HANDLE,
    rosterHandles(authored),
  );

  if (!handle.ok) {
    throw new RangeError(`Invalid player handle: ${handle.reason}`);
  }

  const people =
    scenario === "canonical"
      ? { actors: authored.actors, targets: authored.targets, relationships: null }
      : generateScenarioContent({
          seed,
          scenario,
          reservedHandles: [handle.handle, ...rosterHandles(authored)],
        });

  return createInitialWorldState({
    player: {
      handle: handle.handle,
      rank: 100_256,
    },
    scenario,
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
      actors: people.actors,
      // A generated scene supplies its own starting ties, the player's included.
      // The canonical path leaves this out, so the default ties are unchanged.
      ...(people.relationships ? { relationships: people.relationships } : {}),
    },
    targets: people.targets,
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
