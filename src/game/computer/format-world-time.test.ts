import { describe, expect, it } from "vitest";

import { formatWorldTime } from "@/game/computer/format-world-time";

describe("formatWorldTime", () => {
  it("starts at day one midnight", () => {
    expect(formatWorldTime(0)).toBe("DAY 1 // 00:00");
  });

  it("rolls minutes into later days", () => {
    expect(formatWorldTime(1_500)).toBe("DAY 2 // 01:00");
  });
});
