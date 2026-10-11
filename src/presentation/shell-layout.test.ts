import { describe, expect, it } from "vitest";
import { DISTRO_IDS } from "@/presentation/distros";
import { SHELL_LAYOUTS, shellLayoutFor } from "@/presentation/shell-layout";

describe("visual reboot distro shell contract", () => {
  it("gives all five distros distinct physical launcher layouts, not recolors", () => {
    const profiles = DISTRO_IDS.map((id) => SHELL_LAYOUTS[id]);
    expect(profiles).toHaveLength(5);
    expect(new Set(profiles.map((p) => p.mode)).size).toBe(5);
    expect(new Set(profiles.map((p) => p.launcherPlacement)).size).toBe(5);
    expect(new Set(profiles.map((p) => p.wallpaper)).size).toBe(5);
    expect(new Set(profiles.map((p) => p.iconFamily)).size).toBe(5);
  });

  it.each(DISTRO_IDS)("keeps the profile presentation-only and wallpaper offline for %s", (id) => {
    const layout = shellLayoutFor(id);
    expect(layout.wallpaper).toBe(`/visual-reboot/wallpapers/${id}.svg`);
    expect(layout).not.toHaveProperty("rank");
    expect(layout).not.toHaveProperty("cost");
    expect(layout).not.toHaveProperty("worldState");
    expect(layout).not.toHaveProperty("gameplay");
  });

  it("preserves the agreed five unique desktop arrangements", () => {
    expect(SHELL_LAYOUTS["ghost-os"].mode).toBe("topbar-dock");
    expect(SHELL_LAYOUTS.lattice.mode).toBe("compact-rail");
    expect(SHELL_LAYOUTS.velvet.mode).toBe("edge-shelf");
    expect(SHELL_LAYOUTS.daybreak.mode).toBe("bottom-taskbar");
    expect(SHELL_LAYOUTS.petal.mode).toBe("soft-dock");
  });
});
