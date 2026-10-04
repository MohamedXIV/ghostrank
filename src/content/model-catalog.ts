import type { SoftwareEffect } from "@/content/software-catalog";

/**
 * Models are the substrate of the Phase 5 AI economy: where a P4 license is a
 * *program* you run and a P7 machine is a *box* you own, a model is an *assistant*
 * you run — a fictional AI that folds into the rig through the same effect
 * language the software marketplace already uses. Today a model contributes a
 * `modifier` shortcut on derived action durations: analysis work gets faster
 * while a model is running, through the exact `combineFactors` path licenses
 * and tools compose with (one floor, one runtime, no parallel mechanics).
 *
 * The two sources are deliberately opposite economic shapes, mirroring the
 * license-vs-tool split the economy already teaches:
 *
 * - **cloud** models are *rent*: no acquisition cost, running one moves no
 *   credits, and the subscription bills every crossed world-day boundary while
 *   it runs. An unpayable boundary **lapses** the model — stop, no debt, no
 *   penalty beyond losing the speed — the license semantics, unchanged. Cloud
 *   models run on the provider's hardware, so they carry **no rig footprint**
 *   and never contend with the player's own VRAM or storage.
 * - **local** models are *property*: a one-time acquisition debit, then
 *   running them costs nothing forever — but they occupy the player's
 *   **VRAM and storage**, and Phase 5 P1 contention turns that footprint into
 *   a real decision: a rig whose pool covers the footprint delivers the model's
 *   full shortcut, a rig that under-provisions it delivers only part of it
 *   (never less than running no model at all). Buying the GPU is how you pay
 *   for the speed locally instead of renting it.
 *
 * Model *properties* (reasoning, context, reliability) are catalog data seeded
 * now so later slices — AI analysis that can be wrong, builds whose defects
 * depend on the model — read provenance instead of inventing it. Nothing
 * consumes them yet, and that is stated rather than hidden: this slice ships
 * the substrate, the economics, and the speed lever only. Running no model at
 * all is the untouched baseline: factors compose to exactly 1 and every
 * pre-Phase-5 behaviour is the default.
 */

export type ModelSource = "cloud" | "local";

/**
 * Fictional model characteristics, on a small 1–5 band scale so later slices
 * can compare without a fake precision score. Provisional tuning.
 */
export interface ModelProperties {
  /** How well the model plans multi-step work (1–5). */
  reasoning: number;
  /** How much of an operation's context it can hold (1–5). */
  context: number;
  /** How often its conclusions can be trusted without verification (1–5). */
  reliability: number;
}

export interface ModelFootprint {
  /** VRAM units the model occupies on the host rig while running. */
  vram: number;
  /** Storage units the weights and working set occupy on the host rig. */
  storage: number;
}

export interface ModelListing {
  id: string;
  label: string;
  source: ModelSource;
  /**
   * Credits per crossed world day while the model runs (cloud only). Local
   * models use 0 — running owned property bills nothing.
   */
  dailyCost: number;
  /** One-time credits to acquire the model (local only). Cloud uses 0. */
  cost: number;
  /** The shortcut while running, as the shared modifier effect shape. */
  effect: SoftwareEffect;
  /** Catalog data reserved for the AI-analysis and build slices. */
  properties: ModelProperties;
  /**
   * The rig footprint while running (Phase 5 P1 contention). A *cloud* model
   * runs on the provider's hardware — its footprint here is 0/0, which is
   * exactly why renting never contends with the rig. A *local* model occupies
   * VRAM and storage on the player's own machines; how well the rig's pool
   * covers that footprint decides how much of the model's shortcut actually
   * arrives (see `systems/contention.ts`). Provisional tuning.
   */
  footprint: ModelFootprint;
  /**
   * Phase 5 P4 marketplace provenance: the fictional handle that authored and
   * sells this model, exactly like a P5 player tool. When present, acquiring the
   * model debits *this author* (a named peer edge in the value graph) instead of
   * the anonymous market; when absent, it is a market house brand. Provisional
   * tuning — only the in-fiction authored entries carry it.
   */
  author?: string;
}

export const MODEL_CATALOG: readonly ModelListing[] = [
  {
    id: "model-cloud-frontier",
    label: "Frontier Class API",
    source: "cloud",
    dailyCost: 120,
    cost: 0,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.7 },
    },
    properties: { reasoning: 5, context: 4, reliability: 3 },
    // A cloud frontier model runs entirely on the provider's hardware.
    footprint: { vram: 0, storage: 0 },
  },
  {
    id: "model-cloud-compact",
    label: "Compact Class API",
    source: "cloud",
    dailyCost: 40,
    cost: 0,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.85 },
    },
    properties: { reasoning: 3, context: 2, reliability: 4 },
    footprint: { vram: 0, storage: 0 },
  },
  {
    id: "model-local-workhorse",
    label: "Quantized Workhorse 13B",
    source: "local",
    dailyCost: 0,
    cost: 900,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.9 },
    },
    properties: { reasoning: 3, context: 2, reliability: 4 },
    // A modest, well-quantized local model: a small but real footprint.
    footprint: { vram: 2, storage: 1 },
  },
  {
    id: "model-local-tuned",
    label: "Fine-Tuned Analyst 34B",
    source: "local",
    dailyCost: 0,
    cost: 1_600,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.8 },
    },
    properties: { reasoning: 4, context: 3, reliability: 2 },
    // The bigger local model is faster still, but demands more of the rig.
    footprint: { vram: 4, storage: 2 },
  },
  {
    id: "model-local-salvage",
    label: "Salvaged Reason Core",
    source: "local",
    dailyCost: 0,
    cost: 600,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.85 },
    },
    // A strong planner with a weak sense for when it is wrong: cheap to buy,
    // prone to confident mistakes — the marketplace counterpart to the reliable
    // but plodding workhorse. Provisional tuning.
    properties: { reasoning: 4, context: 2, reliability: 2 },
    footprint: { vram: 3, storage: 1 },
    // Phase 5 P4 marketplace provenance: an in-fiction author sells this copy,
    // so buying it credits a named peer, not the anonymous market.
    author: "moebius",
  },
];

/** The recurring counterparty for cloud subscriptions: the providers. */
export const PROVIDER_COUNTERPARTY = "provider";

/**
 * The raw catalog entry for a model id, or `undefined` for an unknown id.
 * Content stays pure: it takes the plain id, never game state, so a stale save
 * reference resolves to nothing rather than breaking a fold. The *delivered*
 * effect (which depends on the rig's contention) is computed in the simulation
 * layer, not here.
 */
export function findModelItem(modelId: string): ModelListing | undefined {
  return MODEL_CATALOG.find((item) => item.id === modelId);
}
