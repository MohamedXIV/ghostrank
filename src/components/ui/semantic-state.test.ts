import { describe, expect, it } from "vitest";

import {
  TRUTH_LEVEL_META,
  truthLevelMeta,
  type TruthLevel,
} from "@/components/ui/semantic-state";

describe("Phase 9 P0 semantic UI truth levels", () => {
  const levels: TruthLevel[] = [
    "confirmed",
    "observed",
    "inferred",
    "rumored",
    "stale",
    "unknown",
  ];

  it("keeps every truth level explicitly labeled and non-color coded", () => {
    for (const level of levels) {
      const meta = truthLevelMeta(level);

      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.glyph.length).toBeGreaterThan(0);
    }
  });

  it("keeps the vocabulary closed and stable for cross-app styling", () => {
    expect(Object.keys(TRUTH_LEVEL_META)).toEqual(levels);
  });
});
