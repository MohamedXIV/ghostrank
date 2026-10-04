import {
  BASELINE_LOCATION,
  findHousingItem,
  type HousingAnonymity,
  type HousingKind,
} from "@/content/housing-catalog";

/**
 * Phase 6 P0 — physical presence. The design's rule is that the player exists
 * in a small physical space that can change during a run
 * (`docs/WORLD_RUNS_AND_ENDINGS.md`), but Phase 4 P3 already modelled "where you
 * live" as money: `economy.housing` is the lease you hold, and `advanceUpkeep`
 * already moves you out when a boundary cannot be paid
 * (`systems/upkeep.ts`). A second "current location" field would be a second
 * source of truth for one fact, and it would desync the first time upkeep
 * evicted someone without updating it.
 *
 * So presence is **derived, never stored**: the place you are is the place you
 * hold the keys to, and holding nothing is the baseline room. Like rig
 * capability (D018) and the value graph (D024), this adds no state, no events,
 * and no save-schema surface — which also means eviction, lapse, and relocation
 * can never disagree about where the player is.
 */

/** The player's physical standing at one world minute. */
export interface Presence {
  /** Stable id for the dwelling, or the baseline id when no lease is held. */
  locationId: string;
  label: string;
  /** A dwelling's fiction type; `"baseline"` is the un-leased fallback. */
  kind: HousingKind | "baseline";
  /** Coarse public-ness band. Consumed by P3 (physical retaliation). */
  anonymity: HousingAnonymity;
  /** True only while a lease is held; the baseline is never "leased". */
  leased: boolean;
  /** Daily upkeep the *derived* place bills, 0 for a capability-free baseline. */
  dailyCost: number;
  /** Minutes a relocation *from here* to a listed dwelling would cost. */
  distanceMinutes: number;
}

/**
 * The one place `travelMinutes` is read as: minutes of travel between the
 * starting district and a dwelling. A move costs the *difference* between where
 * you are and where you are going, which makes every relocation symmetric
 * (out and back pay the same) and keeps both Phase 4 listings at distance 0 —
 * they are in the same district as the baseline room, so signing either one
 * stays exactly as instant as it has always been.
 */
function distanceOf(housingId: string | null): number {
  if (!housingId) {
    return BASELINE_LOCATION.travelMinutes;
  }

  return findHousingItem(housingId)?.travelMinutes ?? 0;
}

/**
 * World minutes a relocation costs. `0` means "same district — you just walk
 * there", and the command layer treats 0 as *no time advance at all*, which is
 * what keeps every pre-Phase-6 lease test byte-identical.
 *
 * Both endpoints accept `null` for the baseline room, so *leaving* a safehouse
 * pays the trip back too. That symmetry is the point: if moving out were free,
 * relocation would be a one-way button press rather than the decision the
 * design asks for, and a player could flee to the outskirts and undo it at no
 * cost. (Involuntary eviction is different and stays instant — the world is
 * acting on the player, not the player choosing to travel; see `advanceUpkeep`.)
 */
export function relocationMinutes(
  fromHousingId: string | null,
  toHousingId: string | null,
): number {
  return Math.abs(distanceOf(fromHousingId) - distanceOf(toHousingId));
}

/**
 * Derive where the player is from the lease they hold. A stale `housing` id (a
 * catalog retune, or a hand-edited save) resolves to the baseline rather than
 * fabricating a place that does not exist — the same fail-toward-baseline rule
 * an unaffordable boundary already follows.
 */
export function derivePresence(housingId: string | null): Presence {
  const item = housingId ? findHousingItem(housingId) : undefined;

  if (!item) {
    return {
      locationId: BASELINE_LOCATION.id,
      label: BASELINE_LOCATION.label,
      kind: "baseline",
      anonymity: BASELINE_LOCATION.anonymity,
      leased: false,
      dailyCost: 0,
      distanceMinutes: BASELINE_LOCATION.travelMinutes,
    };
  }

  return {
    locationId: item.id,
    label: item.label,
    kind: item.kind ?? "residential",
    anonymity: item.anonymity ?? "public",
    leased: true,
    dailyCost: item.dailyCost,
    distanceMinutes: item.travelMinutes ?? 0,
  };
}
