import { describe, expect, it } from "vitest";
import { CAPABILITY_METRIC_META } from "@/components/game/market/capability-bar";

describe("CapabilityBar presentation contracts", () => {
  it("provides distinct non-color glyphs and labels for all hardware metrics", () => {
    const metrics = ["compute", "memory", "vram", "storage", "network"] as const;
    const glyphs = new Set(metrics.map((m) => CAPABILITY_METRIC_META[m].glyph));
    expect(glyphs.size).toBe(metrics.length);
  });
});
