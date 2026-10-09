import { hashUnit } from "@/game/simulation/rng/stateless-hash";

/**
 * Seeded draws for scenario generation (Game-First G2, #78). Every draw is a
 * named stream salted by what it decides, so changing one decision never
 * reshuffles an unrelated one. These helpers are generator-only: simulation
 * systems that roll at runtime use `hashUnit` directly.
 */

export function draw(seed: number, ...parts: Array<string | number>): number {
  return hashUnit(seed, ...parts);
}

/** An integer in the inclusive range `[low, high]`. */
export function range(
  seed: number,
  [low, high]: readonly [number, number],
  ...parts: Array<string | number>
): number {
  return low + Math.floor(draw(seed, ...parts) * (high - low + 1));
}

/** A percentage in `[0, 100)`, compared against percent thresholds. */
export function percent(seed: number, ...parts: Array<string | number>): number {
  return draw(seed, ...parts) * 100;
}

/**
 * Picks one key from a weight table. Keys are read in insertion order, so the
 * same table and the same draw always pick the same key. A zero weight is never
 * picked; a table with no positive weight is a programming error.
 */
export function pickWeighted<K extends string>(
  weights: Record<K, number>,
  unit: number,
): K {
  const entries = (Object.entries(weights) as Array<[K, number]>).filter(
    ([, weight]) => weight > 0,
  );
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

  if (entries.length === 0 || total <= 0) {
    throw new Error("Weighted table has no positive weight");
  }

  let cursor = unit * total;

  for (const [key, weight] of entries) {
    if (cursor < weight) {
      return key;
    }
    cursor -= weight;
  }

  // Floating-point slack can leave the cursor a hair past the last bucket.
  return entries[entries.length - 1]![0];
}
