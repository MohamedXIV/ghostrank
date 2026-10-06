import { create } from "zustand";

import {
  DEFAULT_PRESENTATION,
  DISTRO_PROFILES,
  normalizePresentationSelection,
  selectionForDistro,
  themeBelongsToDistro,
  type DistroId,
} from "@/presentation/distros";
import {
  loadPresentationSelection,
  savePresentationSelection,
} from "@/presentation/presentation-settings";

interface PresentationState {
  distroId: DistroId;
  themeId: string;
  hydrated: boolean;
  hydrate: () => void;
  setDistro: (distroId: DistroId) => void;
  setTheme: (themeId: string) => void;
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

function persistSelection(distroId: DistroId, themeId: string) {
  const storage = browserStorage();

  if (!storage) {
    return;
  }

  savePresentationSelection(storage, { distroId, themeId });
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  ...DEFAULT_PRESENTATION,
  hydrated: false,

  hydrate: () => {
    const storage = browserStorage();
    const selection = storage
      ? loadPresentationSelection(storage)
      : { ...DEFAULT_PRESENTATION };

    set({ ...selection, hydrated: true });
  },

  setDistro: (distroId) => {
    const selection = selectionForDistro(distroId);
    persistSelection(selection.distroId, selection.themeId);
    set(selection);
  },

  setTheme: (themeId) => {
    const { distroId } = get();

    if (!themeBelongsToDistro(distroId, themeId)) {
      return;
    }

    persistSelection(distroId, themeId);
    set({ themeId });
  },
}));

export function currentDistroProfile() {
  return DISTRO_PROFILES[usePresentationStore.getState().distroId];
}

export function presentationSnapshot() {
  const state = usePresentationStore.getState();

  return normalizePresentationSelection({
    distroId: state.distroId,
    themeId: state.themeId,
  });
}
