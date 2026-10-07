import { describe, expect, it } from "vitest";

import {
  transitionDurationMs,
  transitionFrame,
} from "@/presentation/distro-installation";

describe("distro install/boot presentation lifecycle", () => {
  it("walks installation through authored stages before completion", () => {
    expect(transitionFrame("velvet", "install", 0).stage.id).toBe("verify");
    expect(transitionFrame("velvet", "install", 2100).stage.id).toBe(
      "configure",
    );
    expect(transitionFrame("velvet", "install", 4200)).toMatchObject({
      distroId: "velvet",
      kind: "install",
      progress: 100,
      complete: true,
      stage: { id: "reboot" },
    });
  });

  it("uses a shorter handover for an already installed distro", () => {
    expect(transitionDurationMs("boot", false)).toBeLessThan(
      transitionDurationMs("install", false),
    );
    expect(transitionFrame("lattice", "boot", 1500).complete).toBe(true);
  });

  it("keeps the state sequence but shortens decorative time for reduced motion", () => {
    expect(transitionDurationMs("install", true)).toBeLessThan(
      transitionDurationMs("install", false),
    );
    expect(transitionFrame("petal", "install", 900, true).stage.id).toBe(
      "reboot",
    );
  });
});
