import { describe, expect, it } from "vitest";

import { SeededRng } from "@/game/simulation/rng/seeded-rng";

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
});
