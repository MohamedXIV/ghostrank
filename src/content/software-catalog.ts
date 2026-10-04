import type { HardwareCapability } from "@/content/hardware-catalog";

/**
 * Premium software is a stackable tool layer: licensed programs that make the
 * rig's existing capability *more productive* — faster analysis, wider passes,
 * better throughput. Software is never a gate: every action and every item
 * stays available without a single license; owning nothing is the untouched
 * baseline, exactly as with hardware and housing.
 *
 * The economic shape differs from hardware on purpose: licenses are a
 * *recurring* cost. Activating or stopping a license moves no credits (the
 * choice is reversible and never double-billed); the daily license fee is
 * levied at each crossed world-day boundary, alongside housing upkeep.
 */

/** A multiplicative shortcut applied to accelerated operation durations. */
export type SoftwareDiscount = {
  kind: "action-duration";
  /** Actions above baseline cost `factor ×` their hardware minutes. */
  factor: number;
};

export type SoftwareEffect =
  /** Extra capability folded into the rig's effective profile. */
  | { kind: "capability"; capability: HardwareCapability }
  /** A stackable efficiency modifier on top of derived capability. */
  | { kind: "modifier"; discount: SoftwareDiscount };

export interface SoftwareCatalogItem {
  id: string;
  label: string;
  /** Credits charged per crossed world day while the license is active. */
  dailyCost: number;
  effect: SoftwareEffect;
}

export const SOFTWARE_CATALOG: readonly SoftwareCatalogItem[] = [
  {
    id: "software-net-monitor",
    label: "Commercial Monitoring Suite",
    dailyCost: 40,
    effect: {
      kind: "capability",
      capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 2 },
    },
  },
  {
    id: "software-auto-recon",
    label: "Automated Recon Framework",
    dailyCost: 70,
    effect: {
      kind: "capability",
      capability: { compute: 0, memory: 2, vram: 0, storage: 0, network: 1 },
    },
  },
  {
    id: "software-analysis-pipeline",
    label: "Optimized Analysis Pipeline",
    dailyCost: 100,
    effect: {
      kind: "modifier",
      discount: { kind: "action-duration", factor: 0.85 },
    },
  },
];

/** The recurring counterparty for license fees: the fictional vendors. */
export const VENDOR_COUNTERPARTY = "vendor";

export function findSoftwareItem(
  softwareId: string,
): SoftwareCatalogItem | undefined {
  return SOFTWARE_CATALOG.find((item) => item.id === softwareId);
}

export function softwareCapability(
  activeIds: readonly string[],
): HardwareCapability {
  const total: HardwareCapability = {
    compute: 0,
    memory: 0,
    vram: 0,
    storage: 0,
    network: 0,
  };

  for (const id of activeIds) {
    const item = findSoftwareItem(id);
    if (!item || item.effect.kind !== "capability") {
      continue;
    }
    total.compute += item.effect.capability.compute;
    total.memory += item.effect.capability.memory;
    total.vram += item.effect.capability.vram;
    total.storage += item.effect.capability.storage;
    total.network += item.effect.capability.network;
  }

  return total;
}

/**
 * Combined multiplicative shortcut from every active modifier license. With no
 * licenses it is exactly 1, so hardware-only durations stay untouched; factors
 * stack multiplicatively but are floored so automation can never make work
 * free — one minute minimum still belongs to the P1 rule.
 */
export function actionDurationFactor(activeIds: readonly string[]): number {
  let factor = 1;

  for (const id of activeIds) {
    const item = findSoftwareItem(id);
    if (!item || item.effect.kind !== "modifier") {
      continue;
    }
    factor *= item.effect.discount.factor;
  }

  return Math.max(0.1, factor);
}
