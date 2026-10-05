import type { HardwareCapability } from "@/content/hardware-catalog";

/**
 * Housing is a recurring-cost capability source: a rented location adds to the
 * rig's effective capability while you can keep paying its daily upkeep. It is
 * never a gate — holding no lease is the free baseline that always supports
 * baseline play, and losing a lease moves you back to it rather than creating
 * debt.
 */

/**
 * Phase 6 P0: how public a dwelling is. A **band, not a number** — the same
 * discipline `relationshipStance` and `FootprintLevel` use, so threat systems
 * later in this phase read a coarse fact instead of a stat the player can
 * optimise. `anonymity` is consumed by Phase 6 P3 (physical retaliation), not
 * by P0: it ships here as catalog data that changes no current outcome, stated
 * plainly rather than hidden, the way P0's model properties shipped in Phase 5.
 */
export type HousingAnonymity = "public" | "quiet" | "hidden";

/** What a dwelling *is* in the fiction. Presentation and future threat
 *  targeting only — it never contributes capability and never gates anything. */
export type HousingKind = "workspace" | "residential" | "safehouse";

export interface HousingCatalogItem {
  id: string;
  label: string;
  /** Credits charged per crossed world day. */
  dailyCost: number;
  /** Capability contributed while the lease is held. */
  capability: HardwareCapability;
  /**
   * Optional since Phase 6 P0. **Absent means `0`**, which is why every
   * pre-Phase-6 listing keeps its exact instant, free-to-sign behaviour:
   * signing is only a *move* when the destination is somewhere that takes time
   * to reach. Relocation pays in world minutes (and therefore in exposure),
   * never in credits — the P3 rule that signing, switching, and breaking a
   * lease move no money still holds.
   */
  travelMinutes?: number;
  /** Optional since Phase 6 P0; absent means `"public"`. */
  anonymity?: HousingAnonymity;
  /** Optional since Phase 6 P0; absent means `"residential"`. */
  kind?: HousingKind;
}

export const HOUSING_CATALOG: readonly HousingCatalogItem[] = [
  {
    id: "housing-cowork-loft",
    label: "Co-working Loft",
    dailyCost: 30,
    capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 2 },
  },
  {
    id: "housing-rented-lab",
    label: "Rented Lab Bench",
    dailyCost: 60,
    capability: { compute: 2, memory: 1, vram: 0, storage: 1, network: 0 },
  },
  // Phase 6 P0 — relocation as a real choice. A safehouse is the same lease
  // machinery (daily upkeep, lapse-not-debt) with two additions: it is *somewhere
  // you have to travel to*, so moving there costs world time and therefore
  // exposure, and it contributes **no capability at all**. That second property
  // is the load-bearing one: a safehouse must never be a power purchase, so it
  // cannot raise `effectiveCapability` even though it is a housing entry. A
  // player who flees here gives up rig lift for distance — the money/time/skill
  // triangle, not a stats upgrade.
  {
    id: "housing-sleeper-unit",
    label: "Sleeper Unit (Outskirts)",
    dailyCost: 25,
    capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 0 },
    travelMinutes: 180,
    anonymity: "hidden",
    kind: "safehouse",
  },
  {
    // The middle option: closer and cheaper to reach than the outskirts, but it
    // hides nothing from anyone who already knows where to look.
    id: "housing-basement-cot",
    label: "Basement Cot (Warehouse District)",
    dailyCost: 15,
    capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 0 },
    travelMinutes: 60,
    anonymity: "quiet",
    kind: "safehouse",
  },

  // Phase 8 P4 — breadth only. These four locations deliberately occupy
  // different price/capability/anonymity/travel corners while reusing the same
  // lease/presence/retaliation rules. None introduces a location-specific rule.
  {
    id: "housing-night-shift-office",
    label: "Night-Shift Office (Print District)",
    dailyCost: 45,
    capability: { compute: 0, memory: 0, vram: 0, storage: 1, network: 1 },
    travelMinutes: 30,
    anonymity: "quiet",
    kind: "workspace",
  },
  {
    id: "housing-sublet-studio",
    label: "Sublet Studio (Old Blocks)",
    dailyCost: 35,
    capability: { compute: 1, memory: 1, vram: 0, storage: 0, network: 0 },
    travelMinutes: 45,
    anonymity: "quiet",
    kind: "residential",
  },
  {
    id: "housing-archive-lockup",
    label: "Archive Lockup (Freight Belt)",
    dailyCost: 80,
    capability: { compute: 1, memory: 1, vram: 0, storage: 3, network: 0 },
    travelMinutes: 120,
    anonymity: "hidden",
    kind: "workspace",
  },
  {
    id: "housing-cellar-studio",
    label: "Cellar Studio (Outer Ring)",
    dailyCost: 55,
    capability: { compute: 0, memory: 1, vram: 0, storage: 0, network: 1 },
    travelMinutes: 150,
    anonymity: "hidden",
    kind: "residential",
  },
];

export const LANDLORD_COUNTERPARTY = "landlord";

/**
 * Where the player physically is when they hold no lease. Phase 1 rendered this
 * as a hardcoded caption; Phase 6 P0 makes it data, because "somewhere" is now
 * read by the simulation's own presence derivation rather than by a string in a
 * component. The label keeps the wording players already recognise.
 */
export const BASELINE_LOCATION_ID = "location-baseline-room";

export const BASELINE_LOCATION: {
  id: string;
  label: string;
  anonymity: HousingAnonymity;
  travelMinutes: number;
} = {
  id: BASELINE_LOCATION_ID,
  label: "Short-Term Room // Unit 04",
  anonymity: "public",
  travelMinutes: 0,
};

export function findHousingItem(
  housingId: string,
): HousingCatalogItem | undefined {
  return HOUSING_CATALOG.find((item) => item.id === housingId);
}
