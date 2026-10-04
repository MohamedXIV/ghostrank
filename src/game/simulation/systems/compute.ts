import type { HardwareCapability } from "@/content/hardware-catalog";

/**
 * Compute budgeting turns rig capability into operational speed. It is the
 * "money vs time vs skill" triangle: better hardware completes the same
 * fictional action in less world time. It never gates a target and never blocks
 * an action — a weak rig is never *slower* than the baseline, it simply forgoes
 * the acceleration. This preserves "rank is reputation, not power."
 */

export type ReconAction =
  | "survey"
  | "inspect"
  | "escalate"
  | "disengage";

export const RECON_ACTIONS: readonly ReconAction[] = [
  "survey",
  "inspect",
  "escalate",
  "disengage",
];

/**
 * Baseline durations at the starter rig's capability. With only the free
 * secondhand workstation (compute 1, network 1) every action costs exactly its
 * base duration, so acceleration is strictly a function of upgrades.
 */
const ACTION_BASE_MINUTES: Record<ReconAction, number> = {
  survey: 12,
  inspect: 8,
  escalate: 5,
  disengage: 3,
};

/**
 * The capability value of the starter rig on the axes that accelerate work.
 * Anything at or below this is treated as unaccelerated baseline.
 */
export const BASELINE_CAPABILITY = 1;

/**
 * Effective minutes for a given base and the relevant capability axis. Above
 * baseline the work shortens with diminishing returns and never drops below one
 * minute; at or below baseline it costs the untouched base duration.
 */
export function acceleratedMinutes(
  base: number,
  capability: number,
): number {
  if (capability <= BASELINE_CAPABILITY) {
    return base;
  }

  return Math.max(1, Math.ceil((base * BASELINE_CAPABILITY) / capability));
}

/**
 * The axis each recon action draws on: survey reads network throughput, the
 * analytical actions read compute, and disengagement is a careful manual exit
 * that no hardware speeds up.
 */
function actionAxis(
  action: ReconAction,
  capability: HardwareCapability,
): number | null {
  switch (action) {
    case "survey":
      return capability.network;
    case "inspect":
    case "escalate":
      return capability.compute;
    case "disengage":
      return null;
  }
}

export function actionBaseMinutes(action: ReconAction): number {
  return ACTION_BASE_MINUTES[action];
}

/**
 * World minutes a single operation action costs for a given rig. Deterministic:
 * a pure function of the base table and the derived rig capability. Splitting a
 * wait or restoring a save cannot change it, because it does not depend on when
 * or how often it is read.
 *
 * `factor` carries the shortcut from efficiency-oriented software licenses:
 * hardware minutes above the base are scaled by it (never dropping below the
 * one-minute floor). At the default 1 — the no-license baseline — durations are
 * exactly the P1 hardware table.
 */
export function actionDuration(
  action: ReconAction,
  capability: HardwareCapability,
  factor = 1,
): number {
  const base = ACTION_BASE_MINUTES[action];
  const axis = actionAxis(action, capability);

  if (axis === null) {
    return base;
  }

  const hardwareMinutes = acceleratedMinutes(base, axis);

  if (factor >= 1 || hardwareMinutes <= 1) {
    return hardwareMinutes;
  }

  return Math.max(1, Math.ceil(hardwareMinutes * factor));
}
