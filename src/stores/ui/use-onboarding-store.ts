import { create } from "zustand";

import {
  DEFAULT_ONBOARDING_SETTINGS,
  loadOnboardingSettings,
  saveOnboardingSettings,
  type OnboardingSettings,
} from "@/presentation/onboarding-settings";

interface OnboardingState extends OnboardingSettings {
  hydrated: boolean;
  orientationModalOpen: boolean;
  legendModalOpen: boolean;
  hydrate: () => void;
  dismissHint: (hintId: string) => void;
  resetAllHints: () => void;
  setHintsEnabled: (enabled: boolean) => void;
  setDirectivesEnabled: (enabled: boolean) => void;
  dismissOrientation: () => void;
  setExpertMode: () => void;
  openOrientationModal: () => void;
  closeOrientationModal: () => void;
  openLegendModal: () => void;
  closeLegendModal: () => void;
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

function persist(settings: OnboardingSettings) {
  const storage = browserStorage();
  if (!storage) {
    return;
  }
  saveOnboardingSettings(storage, settings);
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...DEFAULT_ONBOARDING_SETTINGS,
  hydrated: false,
  orientationModalOpen: false,
  legendModalOpen: false,

  hydrate: () => {
    const storage = browserStorage();
    const settings = storage
      ? loadOnboardingSettings(storage)
      : { ...DEFAULT_ONBOARDING_SETTINGS };

    set({
      ...settings,
      hydrated: true,
      // If the orientation has never been dismissed, open the modal on first hydration
      orientationModalOpen: !settings.orientationDismissed,
    });
  },

  dismissHint: (hintId: string) => {
    const state = get();
    if (state.dismissedHintIds.includes(hintId)) {
      return;
    }
    const nextDismissed = [...state.dismissedHintIds, hintId];
    const nextSettings: OnboardingSettings = {
      hintsEnabled: state.hintsEnabled,
      directivesEnabled: state.directivesEnabled,
      orientationDismissed: state.orientationDismissed,
      dismissedHintIds: nextDismissed,
    };
    persist(nextSettings);
    set({ dismissedHintIds: nextDismissed });
  },

  resetAllHints: () => {
    const nextSettings: OnboardingSettings = {
      hintsEnabled: true,
      directivesEnabled: true,
      orientationDismissed: true,
      dismissedHintIds: [],
    };
    persist(nextSettings);
    set({
      hintsEnabled: true,
      directivesEnabled: true,
      dismissedHintIds: [],
    });
  },

  setHintsEnabled: (enabled: boolean) => {
    const state = get();
    const nextSettings: OnboardingSettings = {
      hintsEnabled: enabled,
      directivesEnabled: state.directivesEnabled,
      orientationDismissed: state.orientationDismissed,
      dismissedHintIds: state.dismissedHintIds,
    };
    persist(nextSettings);
    set({ hintsEnabled: enabled });
  },

  setDirectivesEnabled: (enabled: boolean) => {
    const state = get();
    const nextSettings: OnboardingSettings = {
      hintsEnabled: state.hintsEnabled,
      directivesEnabled: enabled,
      orientationDismissed: state.orientationDismissed,
      dismissedHintIds: state.dismissedHintIds,
    };
    persist(nextSettings);
    set({ directivesEnabled: enabled });
  },

  dismissOrientation: () => {
    const state = get();
    const nextSettings: OnboardingSettings = {
      hintsEnabled: state.hintsEnabled,
      directivesEnabled: state.directivesEnabled,
      orientationDismissed: true,
      dismissedHintIds: state.dismissedHintIds,
    };
    persist(nextSettings);
    set({ orientationDismissed: true, orientationModalOpen: false });
  },

  setExpertMode: () => {
    const nextSettings: OnboardingSettings = {
      hintsEnabled: false,
      directivesEnabled: false,
      orientationDismissed: true,
      dismissedHintIds: [],
    };
    persist(nextSettings);
    set({
      hintsEnabled: false,
      directivesEnabled: false,
      orientationDismissed: true,
      orientationModalOpen: false,
    });
  },

  openOrientationModal: () => set({ orientationModalOpen: true }),
  closeOrientationModal: () => set({ orientationModalOpen: false }),

  openLegendModal: () => set({ legendModalOpen: true }),
  closeLegendModal: () => set({ legendModalOpen: false }),
}));
