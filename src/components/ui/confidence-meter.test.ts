import { describe, expect, it } from "vitest";
import { evidenceConfidenceMeta } from "@/components/ui/semantic-state";

describe("ConfidenceMeter presentation contracts", () => {
  it("computes correct segment fills for low, medium, and high confidence", () => {
    expect(evidenceConfidenceMeta("low").meterSegments).toBe(1);
    expect(evidenceConfidenceMeta("medium").meterSegments).toBe(2);
    expect(evidenceConfidenceMeta("high").meterSegments).toBe(3);
  });

  it("safely falls back to low confidence for undefined or unknown input", () => {
    expect(evidenceConfidenceMeta(undefined).level).toBe("low");
    expect(evidenceConfidenceMeta(null).level).toBe("low");
    expect(evidenceConfidenceMeta("invalid").level).toBe("low");
  });
});
