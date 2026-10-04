import type { SoftwareEffect } from "@/content/software-catalog";

/**
 * Player tools are the scene's *authored* artifacts: a named peer wrote the
 * program, you buy the copy outright, and it carries that author's handle
 * wherever it goes. They reuse the exact same effect shape as software
 * licenses — a capability lift folded into the rig, or an efficiency modifier
 * on action durations — but their economics are deliberately different: a tool
 * is a one-time purchase with no recurring fee, and it can be resold. Where a
 * license is rent you stop whenever you like, a tool is property: you pay once,
 * you keep the lift, and selling it recovers part of the price.
 *
 * The provenance is the point. A tool's author handle is recorded on every
 * ledger entry the trade creates, so buying and selling tools seeds the
 * digital-value graph with named edges — money flowing *to a person*, not just
 * to "the market". Like every other Phase 4 layer, tools are never a gate:
 * owning nothing is the untouched baseline.
 */

export interface PlayerToolListing {
  id: string;
  label: string;
  /** Provenance: the fictional handle that authored this tool. */
  author: string;
  /** One-time credits charged to acquire the copy. */
  cost: number;
  effect: SoftwareEffect;
}

export const PLAYER_TOOL_CATALOG: readonly PlayerToolListing[] = [
  {
    id: "tool-paranoid-scraper",
    label: "Paranoid Scraper",
    author: "nullbyte",
    cost: 500,
    effect: {
      kind: "capability",
      capability: { compute: 0, memory: 1, vram: 0, storage: 0, network: 1 },
    },
  },
  {
    id: "tool-ghost-loader",
    label: "Ghost Loader",
    author: "hexwidow",
    cost: 1_200,
    effect: {
      kind: "capability",
      capability: { compute: 2, memory: 1, vram: 0, storage: 0, network: 0 },
    },
  },
  {
    id: "tool-silent-dedup",
    label: "Silent Dedup Daemon",
    author: "cipher-priest",
    cost: 900,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.9 },
    },
  },
];

/** Fraction of the purchase price recovered when a tool is resold. */
export const TOOL_RESALE_RATE = 0.5;

/** The counterparty that pays out on a resale: an offline fence, not a peer. */
export const FENCE_COUNTERPARTY = "fence";

export function findPlayerToolItem(
  toolId: string,
): PlayerToolListing | undefined {
  return PLAYER_TOOL_CATALOG.find((item) => item.id === toolId);
}

/**
 * Credits recovered when reselling an owned copy: a fixed fraction of what was
 * actually paid for it, so retuning the catalog never re-values a copy already
 * in a player's inventory. Floor keeps it a whole credit amount.
 */
export function resaleValue(paidCost: number): number {
  return Math.floor(paidCost * TOOL_RESALE_RATE);
}

/**
 * Resolve the effect of each owned catalog id, skipping unknown ids. Content
 * stays pure: it takes plain ids, never game state, so the same path works for
 * a rented license list or an owned-tool inventory. An empty list contributes
 * no effects — the untouched baseline.
 */
export function playerToolEffects(
  ownedCatalogIds: readonly string[],
): SoftwareEffect[] {
  const effects: SoftwareEffect[] = [];

  for (const catalogId of ownedCatalogIds) {
    const item = findPlayerToolItem(catalogId);

    if (item) {
      effects.push(item.effect);
    }
  }

  return effects;
}
