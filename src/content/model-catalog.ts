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
 *   penalty beyond losing the speed — the license semantics, unchanged.
 * - **local** models are *property*: a one-time acquisition debit, then
 *   running them costs nothing forever. The hardware footprint they impose is
 *   the next slice's (compute contention), not this one's.
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
  },
];

/** The recurring counterparty for cloud subscriptions: the providers. */
export const PROVIDER_COUNTERPARTY = "provider";

export function findModelItem(modelId: string): ModelListing | undefined {
  return MODEL_CATALOG.find((item) => item.id === modelId);
}

/**
 * The effect of the running model, or `undefined` for the no-model baseline.
 * Content stays pure: it takes the plain id, never game state, and unknown ids
 * are inert — a stale save reference contributes no factor rather than
 * breaking the fold.
 */
export function modelEffectOf(
  modelId: string | null,
): SoftwareEffect | undefined {
  return modelId ? findModelItem(modelId)?.effect : undefined;
}
