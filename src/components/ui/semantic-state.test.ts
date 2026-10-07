import { describe, expect, it } from "vitest";

import {
  TRUTH_LEVEL_META,
  truthLevelMeta,
  type TruthLevel,
  deriveRelationshipCategory,
  relationshipCategoryMeta,
  deriveDeadlineUrgency,
  evidenceConfidenceMeta,
  contractObjectiveMeta,
  machineRoleMeta,
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

describe("Phase 9 P2 semantic UI relationship and rival signatures", () => {
  it("derives rival status from active heat / retaliation without new gameplay flags", () => {
    expect(
      deriveRelationshipCategory({ stance: "neutral", hasHeat: true }),
    ).toBe("rival");
    expect(
      deriveRelationshipCategory({ stance: "hostile", hasHeat: false }),
    ).toBe("hostile");
    expect(
      deriveRelationshipCategory({ stance: "friendly", hasHeat: false }),
    ).toBe("trusted");
    expect(
      deriveRelationshipCategory({ stance: "wary", hasHeat: false }),
    ).toBe("wary");
    expect(
      deriveRelationshipCategory({ stance: "unknown", hasHeat: false }),
    ).toBe("neutral");
    expect(
      deriveRelationshipCategory({ isPlayer: true }),
    ).toBe("self");
  });

  it("provides non-color glyphs and labels for every relationship category", () => {
    for (const category of [
      "self",
      "trusted",
      "neutral",
      "wary",
      "hostile",
      "rival",
    ] as const) {
      const meta = relationshipCategoryMeta(category);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.glyph.length).toBeGreaterThan(0);
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});

describe("Phase 9 P2 confidence and contract deadline vocabulary", () => {
  it("provides discrete confidence meter levels for assistant inferences", () => {
    expect(evidenceConfidenceMeta("low").meterSegments).toBe(1);
    expect(evidenceConfidenceMeta("medium").meterSegments).toBe(2);
    expect(evidenceConfidenceMeta("high").meterSegments).toBe(3);
    expect(evidenceConfidenceMeta("unknown").meterSegments).toBe(1);
  });

  it("derives deadline urgency relative to world minutes", () => {
    // Overdue or expired
    expect(
      deriveDeadlineUrgency({ currentMinute: 100, deadlineMinute: 90, status: "offered" }).urgency,
    ).toBe("expired");

    // Urgent: <= 360m (6 hours)
    expect(
      deriveDeadlineUrgency({ currentMinute: 100, deadlineMinute: 200, status: "accepted" }).urgency,
    ).toBe("urgent");

    // Closing: <= 1440m (24 hours)
    expect(
      deriveDeadlineUrgency({ currentMinute: 100, deadlineMinute: 1000, status: "accepted" }).urgency,
    ).toBe("closing");

    // Calm: > 1440m
    expect(
      deriveDeadlineUrgency({ currentMinute: 100, deadlineMinute: 2000, status: "accepted" }).urgency,
    ).toBe("calm");

    // Delivered
    expect(
      deriveDeadlineUrgency({ currentMinute: 100, deadlineMinute: 2000, status: "completed" }).urgency,
    ).toBe("delivered");
  });

  it("provides meta for known contract objective families", () => {
    expect(contractObjectiveMeta("recon-report").badge).toBe("RECON");
    expect(contractObjectiveMeta("infrastructure-map").badge).toBe("TOPOLOGY");
    expect(contractObjectiveMeta("quiet-recon").badge).toBe("SILENT");
    expect(contractObjectiveMeta("intrusion").badge).toBe("INTRUSION");
  });

  it("maps machine roles to topology tiers", () => {
    expect(machineRoleMeta("edge").tier).toBe("gateway");
    expect(machineRoleMeta("ops").tier).toBe("core");
    expect(machineRoleMeta("vault").tier).toBe("vault");
    expect(machineRoleMeta("storage").tier).toBe("storage");
  });
});
