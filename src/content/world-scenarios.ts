import type { WorldActorArchetype, WorldTargetArchetype } from "@/content/world-content";
import type {
  HackerArchetype,
  OrganizationAgenda,
  OrganizationKind,
  OrganizationMotive,
} from "@/game/simulation/state/world-state";
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
  /** Organizations that own infrastructure and employ owners and brokers (D066). */
  organizations: number;
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
    organizations: 3,
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
    organizations: 2,
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

/** Organization names are a public head and a kind-specific tail (D066). */
export const ORGANIZATION_HEADS = [
  "Brine", "Cinder", "Ferrous", "Halcyon", "Ledgerline", "Marrow",
  "Nightjar", "Oriel", "Pallid", "Quarry", "Rowan", "Sablewing",
] as const;

export const ORGANIZATION_KIND_TAILS: Record<OrganizationKind, readonly [string, string]> = {
  crew: ["Crew", "Collective"],
  syndicate: ["Syndicate", "Concern"],
  exchange: ["Exchange", "Works"],
};

export const ORGANIZATION_KINDS: readonly OrganizationKind[] = ["crew", "syndicate", "exchange"];

/** Weights for an organization's hidden motive. */
export const ORGANIZATION_MOTIVES: ReadonlyArray<{ value: OrganizationMotive; weight: number }> = [
  { value: "profit", weight: 40 },
  { value: "revenge", weight: 35 },
  { value: "control", weight: 25 },
];

/** Weights for an agenda given the motive behind it. Each motive can press for more than one thing. */
export const MOTIVE_AGENDAS: Record<
  OrganizationMotive,
  ReadonlyArray<{ value: OrganizationAgenda; weight: number }>
> = {
  profit: [
    { value: "expand", weight: 60 },
    { value: "defend", weight: 40 },
  ],
  revenge: [
    { value: "undercut", weight: 70 },
    { value: "expand", weight: 30 },
  ],
  control: [
    { value: "defend", weight: 60 },
    { value: "undercut", weight: 40 },
  ],
};

/**
 * Hacker archetypes and their weights per scene (D068). `High Pressure` weights
 * enforcers and tinkerers up, so the volatile scene has more active and
 * retaliatory actors. These weights are editorial data; the draw itself is seeded.
 */
export const HACKER_ARCHETYPE_WEIGHTS: Record<
  GeneratedRunScenario,
  ReadonlyArray<{ value: HackerArchetype; weight: number }>
> = {
  "fresh-scene": [
    { value: "opportunist", weight: 30 },
    { value: "ghost", weight: 20 },
    { value: "enforcer", weight: 20 },
    { value: "fixer", weight: 15 },
    { value: "tinkerer", weight: 15 },
  ],
  "high-pressure": [
    { value: "opportunist", weight: 25 },
    { value: "ghost", weight: 10 },
    { value: "enforcer", weight: 35 },
    { value: "fixer", weight: 10 },
    { value: "tinkerer", weight: 20 },
  ],
};

/** Inclusive temperament ranges (0-100) for each archetype. */
export const ARCHETYPE_TEMPERAMENT: Record<
  HackerArchetype,
  {
    aggression: readonly [number, number];
    caution: readonly [number, number];
    greed: readonly [number, number];
  }
> = {
  opportunist: { aggression: [40, 70], caution: [0, 30], greed: [50, 90] },
  ghost: { aggression: [0, 20], caution: [60, 95], greed: [10, 40] },
  enforcer: { aggression: [60, 95], caution: [20, 50], greed: [30, 60] },
  fixer: { aggression: [10, 40], caution: [40, 70], greed: [60, 95] },
  tinkerer: { aggression: [20, 50], caution: [40, 70], greed: [20, 50] },
};

/** Assistant models a tinkerer may run. Non-premium, so a generated scene needs no purchase. */
export const TINKERER_MODELS: readonly string[] = [
  "model-local-workhorse",
  "model-local-tuned",
  "model-local-reliable",
  "model-cloud-compact",
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
