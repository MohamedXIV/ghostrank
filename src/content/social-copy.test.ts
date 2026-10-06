import { describe, expect, it } from "vitest";

import {
  describeForumContractCopy,
  describeForumUnmaskingCopy,
  describeIncidentCopy,
  describeInvestigationSignalCopy,
  describePhysicalSignalCopy,
  describeProbeTellCopy,
} from "@/content/social-copy";

describe("Phase 8 P6 — authored social copy", () => {
  it("is stable for the same visible record id", () => {
    const first = describeIncidentCopy(
      "feed",
      "incident:42",
      "VESPER",
      "ROOKERY",
      "succeeded",
    );
    const second = describeIncidentCopy(
      "feed",
      "incident:42",
      "VESPER",
      "ROOKERY",
      "succeeded",
    );

    expect(second).toBe(first);
  });

  it("produces authored variation across different record ids", () => {
    const lines = new Set(
      Array.from({ length: 32 }, (_, index) =>
        describeIncidentCopy(
          "forum",
          `incident:${index + 1}`,
          "VESPER",
          "ROOKERY",
          "repelled",
        ),
      ),
    );

    expect(lines.size).toBeGreaterThan(1);
  });

  it("keeps the causal handles in every incident rendering", () => {
    for (const surface of ["feed", "message", "forum"] as const) {
      const text = describeIncidentCopy(
        surface,
        `${surface}:17`,
        "LATTICE",
        "IRONVEIL",
        "succeeded",
      );

      expect(text).toContain("LATTICE");
      expect(text).toContain("IRONVEIL");
    }
  });

  it("broadens investigation evidence while preserving the visible target", () => {
    const variants = new Set(
      Array.from({ length: 24 }, (_, index) =>
        describeInvestigationSignalCopy(
          `signal:${index + 1}`,
          "unusual-login",
          "NIGHTSHADE",
        ),
      ),
    );

    expect(variants.size).toBeGreaterThan(1);
    for (const text of variants) {
      expect(text).toContain("NIGHTSHADE");
    }
    expect(
      describeInvestigationSignalCopy(
        "signal:missing",
        "new-kind",
        "NIGHTSHADE",
      ),
    ).toContain("NIGHTSHADE");
  });

  it("broadens rival probe tells without exposing hidden probe truth", () => {
    const variants = new Set(
      Array.from({ length: 24 }, (_, index) =>
        describeProbeTellCopy(`probe:${index + 1}`, "probe-ping"),
      ),
    );

    expect(variants.size).toBeGreaterThan(1);
    for (const text of variants) {
      expect(text.length).toBeGreaterThan(20);
    }
    expect(describeProbeTellCopy("probe:missing", "new-kind")).toBe(
      "something poked at your corner of the network",
    );
  });

  it("varies physical signal wording without changing its meaning category", () => {
    const variants = new Set(
      Array.from({ length: 24 }, (_, index) =>
        describePhysicalSignalCopy(`physical:${index + 1}`, "outage"),
      ),
    );

    expect(variants.size).toBeGreaterThan(1);
    for (const text of variants) {
      expect(text.length).toBeGreaterThan(20);
    }
  });

  it("uses safe fallback copy for an unknown physical signal kind", () => {
    expect(describePhysicalSignalCopy("physical:missing", "new-kind")).toBe(
      "something outside the network does not fit",
    );
  });

  it("broadens forum contract/unmasking copy without hardcoding the player handle", () => {
    const contractLines = new Set(
      Array.from({ length: 24 }, (_, index) =>
        describeForumContractCopy(`post:${index + 1}`, "DAYSTAR"),
      ),
    );
    const unmaskLines = new Set(
      Array.from({ length: 24 }, (_, index) =>
        describeForumUnmaskingCopy(`post:${index + 1}`, "KESTREL"),
      ),
    );

    expect(contractLines.size).toBeGreaterThan(1);
    expect(unmaskLines.size).toBeGreaterThan(1);

    for (const text of contractLines) {
      expect(text).toContain("DAYSTAR");
      expect(text).not.toContain("CobaltXZ");
    }
    for (const text of unmaskLines) {
      expect(text).toContain("KESTREL");
    }
  });
});
