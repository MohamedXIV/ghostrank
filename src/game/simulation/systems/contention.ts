import type { HardwareCapability } from "@/content/hardware-catalog";
import type { ModelFootprint } from "@/content/model-catalog";

/**
 * Compute contention is the Phase 5 P1 consumer of the two capability axes no
 * earlier slice ever read — `vram` and `storage`. A running *local* model
 * occupies both on the player's own rig (weights in storage, working set in
 * VRAM), while a *cloud* model runs on the provider's hardware and imposes no
 * footprint at all. Contention turns that footprint into a decision rather than
 * a passive bonus: the rig's pooled VRAM and storage either cover the model's
 * footprint — in which case its advertised shortcut arrives in full — or they
 * fall short, in which case the model still runs but delivers only part of the
 * speed-up it promised.
 *
 * The shape is deliberately one-sided, the standing Phase 4 rule that "hardware
 * is a lift, never a punishment": contention can only *reduce a model's
 * shortcut toward ×1*, which is exactly the speed of running no model at all. It
 * can never push an action slower than the baseline table, and it never touches
 * licenses, tools, or the model's economics — it scales one number that then
 * flows through the existing `combineFactors` path like any other modifier. So a
 * starved local model simply stops helping, the way an unaffordable lease or an
 * unpaid license stops helping, and the player's remedies are the ones the
 * design names: buy more VRAM or storage, stop the model, or rent the speed from
 * the cloud instead.
 *
 * Pure and deterministic: a function of the derived rig pool and the catalog
 * footprint, with no clock, order, or RNG — restoring a save or splitting a wait
 * cannot change it, because it does not depend on when or how often it is read.
 */

/** How well `have` covers a single `need` units, in [0, 1]. A zero need is
 * fully covered by anything (0/0 is treated as "not required", not NaN). */
function axisCoverage(need: number, have: number): number {
  if (need <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, have) / need);
}

/**
 * The fraction of a model's footprint the rig actually covers, in [0, 1]. The
 * model needs *both* its VRAM and its storage to fit, so the scarcer axis
 * bottlenecks the whole thing: `min` across the two. A cloud footprint (0/0)
 * always scores 1 — it never contends with the rig.
 */
export function modelPoolCoverage(
  footprint: ModelFootprint,
  pool: HardwareCapability,
): number {
  return Math.min(
    axisCoverage(footprint.vram, pool.vram),
    axisCoverage(footprint.storage, pool.storage),
  );
}

/**
 * The shortcut a model really delivers on a given rig: its advertised catalog
 * `factor` scaled by how well the rig covers its footprint. At full coverage it
 * is exactly `factor`; at zero coverage it is `1` (no shortcut at all). The
 * result is always in [`factor`, 1] — contention only ever takes speed back,
 * never gives more, and never dips below the no-model baseline.
 */
export function contestedModelFactor(
  factor: number,
  footprint: ModelFootprint,
  pool: HardwareCapability,
): number {
  const coverage = modelPoolCoverage(footprint, pool);

  if (coverage >= 1) {
    return factor;
  }

  return 1 - (1 - factor) * coverage;
}
