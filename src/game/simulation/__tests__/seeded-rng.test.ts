import { describe, expect, it } from "vitest";

import { SeededRng, generateRunSeed } from "@/game/simulation/rng/seeded-rng";

describe("SeededRng", () => {
  it("produces the same sequence for the same seed", () => {
    const first = new SeededRng(73);
    const second = new SeededRng(73);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
  });

  it("keeps values inside the half-open unit interval", () => {
    const rng = new SeededRng(91);

    for (let index = 0; index < 100; index += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("generates varying positive 32-bit unsigned integers", () => {
    const seeds = new Set<number>();
    for (let i = 0; i < 50; i += 1) {
      const seed = generateRunSeed();
      expect(seed).toBeGreaterThan(0);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeLessThanOrEqual(0xffffffff);
      seeds.add(seed);
    }
    // Across 50 generations, there should be multiple distinct seeds
    expect(seeds.size).toBeGreaterThan(1);
  });
});

