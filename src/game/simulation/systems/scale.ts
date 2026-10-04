/**
 * Workload scale is the second consumer of rig capability (after P1 speed).
 * Memory decides how much work one operation pass handles at once: with a
 * larger bank, a single survey discovers several machines and a single
 * inspection several services. It is breadth, never a gate — the same items
 * are discoverable either way; a modest rig just needs more passes, and each
 * pass costs its own world time.
 */

/**
 * Items one pass of a scoped action can process for a given memory capability.
 * The starter rig sits at 1, the untouched Phase 2 behaviour; memory only ever
 * widens a pass, never narrows it below one.
 */
export function discoveryScope(memory: number): number {
  return Math.max(1, Math.floor(memory));
}
