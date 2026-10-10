import { STARTER_RIG_ID } from "@/content/hardware-catalog";
import {
  instantiateWorldContent,
  type InstantiatedWorldContent,
} from "@/content/world-content";
import { validatePlayerHandle } from "@/game/identity/player-handle";
import {
  NIGHTSHADE_TARGET_ID,
  SLICE_CONTRACT_ID,
  SLICE_MAP_MACHINES,
  SLICE_WINDOW_END_MINUTE,
} from "@/content/nightshade-slice";
import { createNightshadeSliceState } from "@/game/simulation/systems/nightshade-slice";
import { seededNetworkRouteOrder } from "@/game/simulation/systems/network-routes";
import type { NetworkRouteChallenge } from "@/game/simulation/systems/network-routes";
import { RELAY_MACHINE_ID, VAULT_MACHINE_ID } from "@/content/nightshade-slice";

import { generateScenarioContent } from "@/game/world-generation/generate-scenario";
import { attachGeneratedRouteChallenge } from "@/game/world-generation/network-route-provider";
import { generateRunSeed } from "@/game/simulation/rng/seeded-rng";
import {
  DEFAULT_RUN_SCENARIO,
  SLICE_RUN_SCENARIO,
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
  /** Opt-in v2 learning adapter; omitted deliberately retains v1 compatibility. */
  nightshadeRules?: "nightshade-v1" | "nightshade-v2";
  /** Opt-in shared route provider for generated scenarios, preserving plain fixture worlds. */
  networkMappingDemo?: boolean;
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
    scenario === "canonical" || scenario === SLICE_RUN_SCENARIO
      ? {
          actors: authored.actors,
          targets: authored.targets,
          relationships: null,
          organizations: null,
          contracts: null,
        }
      : generateScenarioContent({
          seed,
          scenario,
          reservedHandles: [handle.handle, ...rosterHandles(authored)],
        });

  const world = createInitialWorldState({
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
      // Generated scenes carry their organizations; the canonical roster has none (D066).
      ...(people.organizations ? { organizations: people.organizations } : {}),
      // Generated scenes start with their opening offers from white brokers (D069).
      ...(people.contracts ? { contracts: people.contracts } : {}),
    },
    targets: people.targets,
  });

  if (scenario === SLICE_RUN_SCENARIO) {
    attachNightshadeBriefing(world, authored.actors, options.nightshadeRules ?? "nightshade-v1", seed);
  }
  if ((scenario === "fresh-scene" || scenario === "high-pressure") &&
      options.networkMappingDemo === true) {
    attachGeneratedRouteChallenge(world, seed);
  }

  return world;
}

/**
 * Opens the Nightshade briefing on a world (D071): one contract for the relay
 * and the vault, offered by a white broker, and the slice record that holds its
 * clues, owner review and outcome. The canonical rules never read any of it.
 */
function attachNightshadeBriefing(
  world: WorldState,
  actors: readonly { id: string; network: string; targetId?: string }[],
  rules: "nightshade-v1" | "nightshade-v2",
  seed: number,
): void {
  const issuer =
    actors.find((actor) => actor.network === "white" && !actor.targetId) ??
    actors.find((actor) => actor.network === "white");

  if (!issuer) {
    throw new RangeError("The Nightshade briefing needs a white broker to offer it.");
  }

  world.underground.contracts.push({
    id: SLICE_CONTRACT_ID,
    issuerId: issuer.id,
    targetId: NIGHTSHADE_TARGET_ID,
    objective: "infrastructure-map",
    requiredMachines: SLICE_MAP_MACHINES,
    status: "offered",
    offeredWorldMinute: 0,
    expiresWorldMinute: SLICE_WINDOW_END_MINUTE,
  });
  world.slice = createNightshadeSliceState({ contractId: SLICE_CONTRACT_ID, rules });
  if (rules === "nightshade-v2") {
    // Pure scenario data: the same evaluator operates on every other target.
    const challenge: NetworkRouteChallenge = {
      id: "route:nightshade-entry", targetId: NIGHTSHADE_TARGET_ID,
      entryMachineId: RELAY_MACHINE_ID, objectiveMachineId: VAULT_MACHINE_ID,
      candidates: [
        { id: "route-amber", label: "Amber", carrier: "public", echo: "triangle" },
        { id: "route-cobalt", label: "Cobalt", carrier: "sealed", echo: "circle" },
        { id: "route-ivory", label: "Ivory", carrier: "sealed", echo: "triangle" },
      ],
      requiredCarrier: "sealed", requiredEcho: "triangle",
      epoch: 0, baseMinutes: 4, traceWeight: 1,
      observations: [], tests: [],
    };
    challenge.candidates = seededNetworkRouteOrder(seed, challenge);
    world.networkChallenges = [challenge];
  }
}

/**
 * Creates a fresh new run world state with a genuinely varying random seed.
 * Can optionally accept an explicit seed (for repeatable replay/testing).
 */
export function createNewRunWorldState(
  options: CreateSliceWorldOptions = {},
): WorldState {
  const seed = options.seed ?? generateRunSeed();
  return createSliceWorldState({
    ...options,
    seed,
    // New interactive runs opt in to the shared mechanic; fixture factories
    // and all restored nightshade-v1 saves retain their original semantics.
    nightshadeRules: options.nightshadeRules ??
      (options.scenario === SLICE_RUN_SCENARIO ? "nightshade-v2" : undefined),
    networkMappingDemo: options.networkMappingDemo ??
      (options.scenario === "fresh-scene" || options.scenario === "high-pressure"),
  });
}
