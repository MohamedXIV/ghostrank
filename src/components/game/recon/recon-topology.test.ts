import { describe, expect, it } from "vitest";
import { machineRoleMeta } from "@/components/ui/semantic-state";

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
