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

export interface DistroSoundIdentity {
  waveform: OscillatorType;
  gain: number;
  install: readonly number[];
  stage: readonly number[];
  complete: readonly number[];
  boot: readonly number[];
  /** Brief, optional cue for a terminal run ending. */
  ending: readonly number[];
  /** Brief, optional cue for a newly surfaced physical warning. */
  warning: readonly number[];
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
  sound: DistroSoundIdentity;
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
    sound: {
      waveform: "square",
      gain: 0.026,
      install: [220, 330],
      stage: [330],
      complete: [330, 440, 660],
      boot: [196, 294, 392],
      ending: [196, 147],
      warning: [247],
    },
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
    sound: {
      waveform: "triangle",
      gain: 0.024,
      install: [262, 392],
      stage: [523],
      complete: [392, 523, 784],
      boot: [294, 440, 587],
      ending: [220, 330],
      warning: [349],
    },
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
    sound: {
      waveform: "sine",
      gain: 0.03,
      install: [196, 247],
      stage: [294],
      complete: [247, 330, 494],
      boot: [220, 277, 415],
      ending: [174, 220],
      warning: [262],
    },
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
    sound: {
      waveform: "sine",
      gain: 0.028,
      install: [330, 440],
      stage: [494],
      complete: [440, 554, 659],
      boot: [349, 523, 698],
      ending: [262, 349],
      warning: [440],
    },
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
    sound: {
      waveform: "triangle",
      gain: 0.026,
      install: [392, 523],
      stage: [659],
      complete: [523, 659, 784],
      boot: [440, 587, 880],
      ending: [330, 262],
      warning: [523],
    },
  },
};

export interface PresentationSelection {
  distroId: DistroId;
  themeId: string;
}

export const TEXT_SCALE_OPTIONS = ["normal", "large", "extra-large"] as const;
export type TextScale = (typeof TEXT_SCALE_OPTIONS)[number];

export const MOTION_MODE_OPTIONS = ["system", "reduce", "standard"] as const;
export type MotionMode = (typeof MOTION_MODE_OPTIONS)[number];

export const TRANSPARENCY_MODE_OPTIONS = ["default", "opaque"] as const;
export type TransparencyMode = (typeof TRANSPARENCY_MODE_OPTIONS)[number];

export const DENSITY_MODE_OPTIONS = ["compact", "comfortable"] as const;
export type DensityMode = (typeof DENSITY_MODE_OPTIONS)[number];

export const CONTRAST_MODE_OPTIONS = ["normal", "high"] as const;
export type ContrastMode = (typeof CONTRAST_MODE_OPTIONS)[number];

export interface PresentationSettings extends PresentationSelection {
  installedDistroIds: DistroId[];
  soundEnabled: boolean;
  textScale: TextScale;
  motionMode: MotionMode;
  transparencyMode: TransparencyMode;
  densityMode: DensityMode;
  contrastMode: ContrastMode;
}

export const DEFAULT_PRESENTATION: PresentationSelection = {
  distroId: "ghost-os",
  themeId: DISTRO_PROFILES["ghost-os"].defaultTheme,
};

export const DEFAULT_PRESENTATION_SETTINGS: PresentationSettings = {
  ...DEFAULT_PRESENTATION,
  installedDistroIds: ["ghost-os"],
  soundEnabled: true,
  textScale: "normal",
  motionMode: "system",
  transparencyMode: "default",
  densityMode: "compact",
  contrastMode: "normal",
};

export function isDistroId(value: unknown): value is DistroId {
  return (
    typeof value === "string" &&
    (DISTRO_IDS as readonly string[]).includes(value)
  );
}

export function isTextScale(value: unknown): value is TextScale {
  return (
    typeof value === "string" &&
    (TEXT_SCALE_OPTIONS as readonly string[]).includes(value)
  );
}

export function isMotionMode(value: unknown): value is MotionMode {
  return (
    typeof value === "string" &&
    (MOTION_MODE_OPTIONS as readonly string[]).includes(value)
  );
}

export function isTransparencyMode(value: unknown): value is TransparencyMode {
  return (
    typeof value === "string" &&
    (TRANSPARENCY_MODE_OPTIONS as readonly string[]).includes(value)
  );
}

export function isDensityMode(value: unknown): value is DensityMode {
  return (
    typeof value === "string" &&
    (DENSITY_MODE_OPTIONS as readonly string[]).includes(value)
  );
}

export function isContrastMode(value: unknown): value is ContrastMode {
  return (
    typeof value === "string" &&
    (CONTRAST_MODE_OPTIONS as readonly string[]).includes(value)
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


export function normalizeInstalledDistroIds(value: unknown): DistroId[] {
  const installed = Array.isArray(value)
    ? value.filter(isDistroId)
    : [];

  const unique = [...new Set<DistroId>(["ghost-os", ...installed])];
  return DISTRO_IDS.filter((id) => unique.includes(id));
}

export function normalizePresentationSettings(
  value: unknown,
): PresentationSettings {
  const selection = normalizePresentationSelection(value);
  const candidate =
    value && typeof value === "object"
      ? (value as {
          installedDistroIds?: unknown;
          soundEnabled?: unknown;
          textScale?: unknown;
          motionMode?: unknown;
          transparencyMode?: unknown;
          densityMode?: unknown;
          contrastMode?: unknown;
        })
      : {};

  const installedDistroIds = normalizeInstalledDistroIds(
    candidate.installedDistroIds,
  );

  if (!installedDistroIds.includes(selection.distroId)) {
    installedDistroIds.push(selection.distroId);
  }

  return {
    ...selection,
    installedDistroIds,
    soundEnabled:
      typeof candidate.soundEnabled === "boolean"
        ? candidate.soundEnabled
        : DEFAULT_PRESENTATION_SETTINGS.soundEnabled,
    textScale: isTextScale(candidate.textScale)
      ? candidate.textScale
      : DEFAULT_PRESENTATION_SETTINGS.textScale,
    motionMode: isMotionMode(candidate.motionMode)
      ? candidate.motionMode
      : DEFAULT_PRESENTATION_SETTINGS.motionMode,
    transparencyMode: isTransparencyMode(candidate.transparencyMode)
      ? candidate.transparencyMode
      : DEFAULT_PRESENTATION_SETTINGS.transparencyMode,
    densityMode: isDensityMode(candidate.densityMode)
      ? candidate.densityMode
      : DEFAULT_PRESENTATION_SETTINGS.densityMode,
    contrastMode: isContrastMode(candidate.contrastMode)
      ? candidate.contrastMode
      : DEFAULT_PRESENTATION_SETTINGS.contrastMode,
  };
}
