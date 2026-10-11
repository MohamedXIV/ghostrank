import type { DistroId } from "@/presentation/distros";

/**
 * Display-only shell composition. The distro is never an input to commands,
 * prices, world ticks, skill checks, or NPC decisions.
 */
export type ShellMode = "topbar-dock" | "compact-rail" | "edge-shelf" | "bottom-taskbar" | "soft-dock";
export type LauncherPlacement =
  | "bottom-center"
  | "left-vertical"
  | "right-floating"
  | "bottom-full"
  | "bottom-floating";
export interface ShellLayoutProfile {
  readonly mode: ShellMode;
  readonly launcherPlacement: LauncherPlacement;
  readonly wallpaper: `/visual-reboot/wallpapers/${DistroId}.svg`;
  readonly iconFamily: DistroId;
  readonly chrome: "practical" | "technical" | "layered" | "bright" | "rounded";
}

export const SHELL_LAYOUTS: Readonly<Record<DistroId, ShellLayoutProfile>> = {
  "ghost-os": {
    mode: "topbar-dock",
    launcherPlacement: "bottom-center",
    wallpaper: "/visual-reboot/wallpapers/ghost-os.svg",
    iconFamily: "ghost-os",
    chrome: "practical",
  },
  lattice: {
    mode: "compact-rail",
    launcherPlacement: "left-vertical",
    wallpaper: "/visual-reboot/wallpapers/lattice.svg",
    iconFamily: "lattice",
    chrome: "technical",
  },
  velvet: {
    mode: "edge-shelf",
    launcherPlacement: "right-floating",
    wallpaper: "/visual-reboot/wallpapers/velvet.svg",
    iconFamily: "velvet",
    chrome: "layered",
  },
  daybreak: {
    mode: "bottom-taskbar",
    launcherPlacement: "bottom-full",
    wallpaper: "/visual-reboot/wallpapers/daybreak.svg",
    iconFamily: "daybreak",
    chrome: "bright",
  },
  petal: {
    mode: "soft-dock",
    launcherPlacement: "bottom-floating",
    wallpaper: "/visual-reboot/wallpapers/petal.svg",
    iconFamily: "petal",
    chrome: "rounded",
  },
};

export function shellLayoutFor(id: DistroId): ShellLayoutProfile {
  return SHELL_LAYOUTS[id];
}
