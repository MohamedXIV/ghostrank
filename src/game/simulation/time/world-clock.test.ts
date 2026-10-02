import { describe, expect, it } from "vitest";

import { formatWorldClock } from "@/game/simulation/time/world-clock";

describe("formatWorldClock", () => {
  it.each([
    [0, "Day 1 · 00:00"],
    [90, "Day 1 · 01:30"],
    [1_440, "Day 2 · 00:00"],
    [1_500, "Day 2 · 01:00"],
  ])("formats world minute %i deterministically", (worldMinute, expected) => {
    expect(formatWorldClock(worldMinute)).toBe(expected);
  });

  it("rejects negative or fractional world minutes", () => {
    expect(() => formatWorldClock(-1)).toThrow();
    expect(() => formatWorldClock(1.5)).toThrow();
  });
});
