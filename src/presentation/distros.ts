export const DISTRO_IDS = [
  "ghost-os",
  "lattice",
  "velvet",
  "daybreak",
  "petal",
] as const;

export type DistroId = (typeof DISTRO_IDS)[number];

export interface DistroTheme {
  id: string;
  label: string;
  description: string;
}

export interface DistroProfile {
  id: DistroId;
  label: string;
  shortLabel: string;
  glyph: string;
  description: string;
  defaultTheme: string;
  themes: readonly DistroTheme[];
  swatches: readonly [string, string, string];
}

export const DISTRO_PROFILES: Readonly<Record<DistroId, DistroProfile>> = {
  "ghost-os": {
    id: "ghost-os",
    label: "GHOST/OS",
    shortLabel: "Ghost",
    glyph: "◈",
    description: "Restrained, dark, quiet and technical.",
    defaultTheme: "ash",
    themes: [
      {
        id: "ash",
        label: "Ash",
        description: "Graphite surfaces with a muted green signal.",
      },
    ],
    swatches: ["#05080b", "#10171c", "#94d1b6"],
  },
  lattice: {
    id: "lattice",
    label: "LATTICE",
    shortLabel: "Lattice",
    glyph: "⌗",
    description: "Dense technical workspace with a cooler analytical edge.",
    defaultTheme: "grid",
    themes: [
      {
        id: "grid",
        label: "Grid",
        description: "Slate-blue structure, tighter chrome and crisp focus.",
      },
    ],
    swatches: ["#071019", "#10232f", "#79c9ec"],
  },
  velvet: {
    id: "velvet",
    label: "VELVET",
    shortLabel: "Velvet",
    glyph: "◆",
    description: "Elegant dark surfaces, softer edges and plum highlights.",
    defaultTheme: "plum",
    themes: [
      {
        id: "plum",
        label: "Plum",
        description: "Deep charcoal-plum with restrained rose accents.",
      },
    ],
    swatches: ["#100a12", "#211624", "#d59ac7"],
  },
  daybreak: {
    id: "daybreak",
    label: "DAYBREAK",
    shortLabel: "Daybreak",
    glyph: "☼",
    description: "Warm bright desktop built for calm, long-form readability.",
    defaultTheme: "warm",
    themes: [
      {
        id: "warm",
        label: "Warm",
        description: "Cream surfaces with teal and muted gold accents.",
      },
    ],
    swatches: ["#f3efe6", "#fffaf0", "#2f7c74"],
  },
  petal: {
    id: "petal",
    label: "PETAL",
    shortLabel: "Petal",
    glyph: "✿",
    description: "Cute, colorful and expressive without giving up clarity.",
    defaultTheme: "light",
    themes: [
      {
        id: "light",
        label: "Light",
        description: "Creamy blush surfaces with lilac, mint and rose notes.",
      },
      {
        id: "night",
        label: "Night",
        description: "Dark berry surfaces carrying the same pastel identity.",
      },
    ],
    swatches: ["#fff5fa", "#f1d9ef", "#c8689f"],
  },
};

export interface PresentationSelection {
  distroId: DistroId;
  themeId: string;
}

export const DEFAULT_PRESENTATION: PresentationSelection = {
  distroId: "ghost-os",
  themeId: DISTRO_PROFILES["ghost-os"].defaultTheme,
};

export function isDistroId(value: unknown): value is DistroId {
  return (
    typeof value === "string" &&
    (DISTRO_IDS as readonly string[]).includes(value)
  );
}

export function themeBelongsToDistro(
  distroId: DistroId,
  themeId: unknown,
): themeId is string {
  return (
    typeof themeId === "string" &&
    DISTRO_PROFILES[distroId].themes.some((theme) => theme.id === themeId)
  );
}

export function selectionForDistro(distroId: DistroId): PresentationSelection {
  return {
    distroId,
    themeId: DISTRO_PROFILES[distroId].defaultTheme,
  };
}

export function normalizePresentationSelection(
  value: unknown,
): PresentationSelection {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_PRESENTATION };
  }

  const candidate = value as {
    distroId?: unknown;
    themeId?: unknown;
  };

  if (!isDistroId(candidate.distroId)) {
    return { ...DEFAULT_PRESENTATION };
  }

  if (!themeBelongsToDistro(candidate.distroId, candidate.themeId)) {
    return selectionForDistro(candidate.distroId);
  }

  return {
    distroId: candidate.distroId,
    themeId: candidate.themeId,
  };
}
