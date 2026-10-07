import { describe, expect, it } from "vitest";
import { deriveRelationshipCategory, relationshipCategoryMeta } from "@/components/ui/semantic-state";

describe("RelationshipBadge presentation contracts", () => {
  it("derives category based on heat and stance correctly", () => {
    expect(deriveRelationshipCategory({ stance: "friendly", hasHeat: true })).toBe("rival");
    expect(deriveRelationshipCategory({ stance: "friendly", hasHeat: false })).toBe("trusted");
    expect(deriveRelationshipCategory({ stance: "hostile", hasHeat: false })).toBe("hostile");
    expect(deriveRelationshipCategory({ isPlayer: true })).toBe("self");
  });

  it("provides distinct glyphs for each relationship category", () => {
    const categories = ["self", "trusted", "neutral", "wary", "hostile", "rival"] as const;
    const glyphs = new Set(categories.map((c) => relationshipCategoryMeta(c).glyph));
    expect(glyphs.size).toBe(categories.length);
  });
});
