import { describe, expect, it } from "vitest";
import { machineRoleMeta } from "@/components/ui/semantic-state";
import { visibleTopologyRank, topologyEmptyCopy } from "@/components/game/recon/recon-topology";

describe("ReconTopology tier grouping and presentation contracts", () => {
  it("assigns edge and relay machines to gateway tier", () => {
    expect(machineRoleMeta("edge").tier).toBe("gateway");
    expect(machineRoleMeta("relay").tier).toBe("gateway");
  });

  it("assigns ops and compute machines to core tier", () => {
    expect(machineRoleMeta("ops").tier).toBe("core");
    expect(machineRoleMeta("compute").tier).toBe("core");
  });

  it("assigns vault and storage machines to secure vault/storage tier", () => {
    expect(machineRoleMeta("vault").tier).toBe("vault");
    expect(machineRoleMeta("storage").tier).toBe("storage");
    expect(machineRoleMeta("archive").tier).toBe("storage");
  });

  it("assigns unspecified machines to general tier with fallback glyph", () => {
    const meta = machineRoleMeta("unknown-role");
    expect(meta.tier).toBe("general");
    expect(meta.glyph).toBe("▣");
  });
});

describe("Recon topology does not fabricate target evidence", () => {
  it("withholds numerical rank for an unverified lead even if a stale value is supplied", () => {
    expect(visibleTopologyRank(undefined, false)).toBe("RANK UNKNOWN");
    expect(visibleTopologyRank(0, false)).toBe("RANK UNKNOWN");
    expect(visibleTopologyRank(100_256, false)).toBe("RANK UNKNOWN");
    expect(visibleTopologyRank(100_256, true)).toBe("RANK #100,256");
  });
  it("separates unknown opening lead from observed yet unmapped infrastructure", () => {
    expect(topologyEmptyCopy(false, false)).toContain("Unverified lead");
    expect(topologyEmptyCopy(false, false)).not.toContain("Target observed");
    expect(topologyEmptyCopy(true, false)).toContain("Target observed");
    expect(topologyEmptyCopy(true, true)).toContain("SURVEY HOSTS");
  });
});
