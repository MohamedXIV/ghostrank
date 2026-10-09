import type { WorldActorArchetype, WorldTargetArchetype } from "@/content/world-content";
import type { RunScenario } from "@/game/simulation/state/run-scenario";

/**
 * Editorial data for run scenarios (Game-First G2, #78). Nothing here is
 * simulation truth. The generator in `src/game/world-generation/` reads these
 * tables and turns a seed into a roster; the rules it must satisfy live there,
 * not here.
 */

export type GeneratedRunScenario = Exclude<RunScenario, "canonical">;

export const SCENARIO_PRESENTATION: Record<
  RunScenario,
  { label: string; preview: string }
> = {
  canonical: {
    label: "Canonical Underground",
    preview:
      "The authored scene: NIGHTSHADE, VESPER and the rest of the known underground, as the slice has always played.",
  },
  "fresh-scene": {
    label: "Fresh Scene",
    preview:
      "A new scene drawn from this run's seed: brokers, crews and rivals you have not met. The same rules, different people.",
  },
  "high-pressure": {
    label: "High Pressure",
    preview:
      "A volatile scene: sharper operators, more of them on the black network, and a denser web of rivalries. Harder, never rigged.",
  },
};

export interface ScenarioSpec {
  /** Targets, each with exactly one owner actor. */
  owners: number;
  /** White-network intermediaries that own nothing. Always white, so the player has contacts. */
  brokers: number;
  /** Percent chance an owner is on the black network. */
  blackSharePercent: number;
  /** Inclusive ranges for hidden competence, all 0-100. */
  skill: readonly [number, number];
  defense: readonly [number, number];
  discretion: readonly [number, number];
  activity: readonly [number, number];
  /** Inclusive display-rank range. Rank is presentation only; no system reads it for outcomes. */
  rank: readonly [number, number];
  /** Hidden sponsor identities that owners are attached to. */
  sponsors: number;
  /** Percent chance of a peer-to-peer tie for each ordered pair of actors. */
  linkPercent: number;
}

export const GENERATED_SCENARIO_SPECS: Record<GeneratedRunScenario, ScenarioSpec> = {
  "fresh-scene": {
    owners: 6,
    brokers: 2,
    blackSharePercent: 40,
    skill: [35, 80],
    defense: [30, 75],
    discretion: [25, 70],
    activity: [12, 30],
    rank: [2_000, 90_000],
    sponsors: 3,
    linkPercent: 25,
  },
  "high-pressure": {
    owners: 7,
    brokers: 2,
    blackSharePercent: 60,
    skill: [55, 92],
    defense: [50, 90],
    discretion: [40, 85],
    activity: [25, 45],
    rank: [800, 40_000],
    sponsors: 2,
    linkPercent: 40,
  },
};

/** Handle parts. Every prefix-suffix pair is ASCII and well under the 16-character limit. */
export const NAME_PREFIXES = [
  "Ash", "Brine", "Cinder", "Drift", "Ember", "Fathom", "Glass", "Halo",
  "Iron", "Jade", "Kite", "Lumen", "Murk", "Nettle", "Onyx", "Pale",
  "Quill", "Rust", "Sable", "Tide", "Umber", "Vault", "Wisp", "Zephyr",
] as const;

export const NAME_SUFFIXES = [
  "wick", "loom", "fox", "rook", "sprite", "tooth",
  "veil", "ward", "hook", "mire", "pike", "wren",
] as const;

/**
 * Owner profiles, cycled by owner index. Each actor archetype is paired with the
 * target archetype its infrastructure reads as. Editorial metadata only.
 */
export const OWNER_PROFILES: ReadonlyArray<{
  actor: WorldActorArchetype;
  target: WorldTargetArchetype;
}> = [
  { actor: "scam-operator", target: "scam-network" },
  { actor: "extortion-operator", target: "extortion-crew" },
  { actor: "market-predator", target: "predatory-market" },
  { actor: "corporate-operator", target: "corporate-infrastructure" },
  { actor: "rival-operator", target: "rival-infrastructure" },
  { actor: "automation-specialist", target: "elite-underground-operator" },
];

export const MACHINE_TEMPLATES: ReadonlyArray<{ role: string; label: string }> = [
  { role: "relay", label: "Outer Relay" },
  { role: "front", label: "Mirror Front" },
  { role: "vault", label: "Cold Vault" },
  { role: "gateway", label: "Edge Gateway" },
  { role: "ledger", label: "Tally Ledger" },
  { role: "edge", label: "Dock Edge" },
];

export const SERVICE_TEMPLATES: ReadonlyArray<{ kind: string; label: string }> = [
  { kind: "signal", label: "Signal Broker" },
  { kind: "marketplace", label: "Offer Board" },
  { kind: "archive", label: "Archive Index" },
  { kind: "storage", label: "Dead Drop" },
  { kind: "ledger-feed", label: "Ledger Feed" },
  { kind: "mail", label: "Drop Mailbox" },
];
