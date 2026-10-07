import { create } from "zustand";

import {
  DEFAULT_PRESENTATION_SETTINGS,
  DISTRO_PROFILES,
  normalizePresentationSettings,
  selectionForDistro,
  themeBelongsToDistro,
  type ContrastMode,
  type DensityMode,
  type DistroId,
  type MotionMode,
  type PresentationSettings,
  type TextScale,
  type TransparencyMode,
} from "@/presentation/distros";
import {
  loadPresentationSettings,
  savePresentationSettings,
} from "@/presentation/presentation-settings";

interface PresentationState extends PresentationSettings {
  hydrated: boolean;
  hydrate: () => void;
  completeDistroInstall: (distroId: DistroId) => void;
  activateInstalledDistro: (distroId: DistroId) => void;
  setTheme: (themeId: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setTextScale: (scale: TextScale) => void;
  setMotionMode: (mode: MotionMode) => void;
  setTransparencyMode: (mode: TransparencyMode) => void;
  setDensityMode: (mode: DensityMode) => void;
  setContrastMode: (mode: ContrastMode) => void;
}

function browserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function persist(settings: PresentationSettings) {
  const storage = browserStorage();

  if (!storage) {
    return;
  }

  savePresentationSettings(storage, settings);
}

function settingsFromState(state: PresentationState): PresentationSettings {
  return normalizePresentationSettings({
    distroId: state.distroId,
    themeId: state.themeId,
    installedDistroIds: state.installedDistroIds,
    soundEnabled: state.soundEnabled,
    textScale: state.textScale,
    motionMode: state.motionMode,
    transparencyMode: state.transparencyMode,
    densityMode: state.densityMode,
    contrastMode: state.contrastMode,
  });
}

export const usePresentationStore = create<PresentationState>((set, get, api) => {
  api.getInitialState = () => get();

  return {
    ...DEFAULT_PRESENTATION_SETTINGS,
  hydrated: false,

  hydrate: () => {
    const storage = browserStorage();
    const settings = storage
      ? loadPresentationSettings(storage)
      : { ...DEFAULT_PRESENTATION_SETTINGS };

    set({ ...settings, hydrated: true });
  },

  completeDistroInstall: (distroId) => {
    const state = get();
    const selection = selectionForDistro(distroId);
    const installedDistroIds = state.installedDistroIds.includes(distroId)
      ? state.installedDistroIds
      : [...state.installedDistroIds, distroId];

    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      ...selection,
      installedDistroIds,
    });

    persist(next);
    set(next);
  },

  activateInstalledDistro: (distroId) => {
    const state = get();

    if (!state.installedDistroIds.includes(distroId)) {
      return;
    }

    const selection = selectionForDistro(distroId);
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      ...selection,
      installedDistroIds: state.installedDistroIds,
    });

    persist(next);
    set(next);
  },

  setTheme: (themeId) => {
    const state = get();

    if (!themeBelongsToDistro(state.distroId, themeId)) {
      return;
    }

    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      themeId,
    });

    persist(next);
    set(next);
  },

  setSoundEnabled: (soundEnabled) => {
    const state = get();
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      soundEnabled,
    });

    persist(next);
    set(next);
  },

  setTextScale: (textScale) => {
    const state = get();
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      textScale,
    });

    persist(next);
    set(next);
  },

  setMotionMode: (motionMode) => {
    const state = get();
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      motionMode,
    });

    persist(next);
    set(next);
  },

  setTransparencyMode: (transparencyMode) => {
    const state = get();
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      transparencyMode,
    });

    persist(next);
    set(next);
  },

  setDensityMode: (densityMode) => {
    const state = get();
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      densityMode,
    });

    persist(next);
    set(next);
  },

  setContrastMode: (contrastMode) => {
    const state = get();
    const next = normalizePresentationSettings({
      ...settingsFromState(state),
      contrastMode,
    });

    persist(next);
    set(next);
  },
};
});

export function currentDistroProfile() {
  return DISTRO_PROFILES[usePresentationStore.getState().distroId];
}

export function presentationSnapshot(): PresentationSettings {
  return settingsFromState(usePresentationStore.getState());
}
