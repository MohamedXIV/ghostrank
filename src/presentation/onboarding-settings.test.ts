import { describe, expect, it } from "vitest";

import {
  DEFAULT_ONBOARDING_SETTINGS,
  loadOnboardingSettings,
  normalizeOnboardingSettings,
  saveOnboardingSettings,
  ONBOARDING_STORAGE_KEY,
  type OnboardingStorage,
} from "@/presentation/onboarding-settings";

describe("Onboarding Settings persistence and normalization contracts", () => {
  it("normalizes empty or non-object values to default settings", () => {
    expect(normalizeOnboardingSettings(null)).toEqual(
      DEFAULT_ONBOARDING_SETTINGS,
    );
    expect(normalizeOnboardingSettings(undefined)).toEqual(
      DEFAULT_ONBOARDING_SETTINGS,
    );
    expect(normalizeOnboardingSettings("not-an-object")).toEqual(
      DEFAULT_ONBOARDING_SETTINGS,
    );
  });

  it("preserves valid boolean flags and deduplicates hint IDs", () => {
    const raw = {
      hintsEnabled: false,
      directivesEnabled: false,
      orientationDismissed: true,
      dismissedHintIds: ["hint-1", "hint-2", "hint-1", "", "   "],
    };

    const normalized = normalizeOnboardingSettings(raw);
    expect(normalized.hintsEnabled).toBe(false);
    expect(normalized.directivesEnabled).toBe(false);
    expect(normalized.orientationDismissed).toBe(true);
    expect(normalized.dismissedHintIds).toEqual(["hint-1", "hint-2"]);
  });

  it("loads and saves safely to browser storage", () => {
    const store = new Map<string, string>();
    const storage: OnboardingStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, val) => store.set(key, val),
    };

    // Initial load returns default settings
    expect(loadOnboardingSettings(storage)).toEqual(DEFAULT_ONBOARDING_SETTINGS);

    // Save customized settings
    saveOnboardingSettings(storage, {
      hintsEnabled: false,
      directivesEnabled: true,
      orientationDismissed: true,
      dismissedHintIds: ["hint:recon-lead"],
    });

    expect(store.has(ONBOARDING_STORAGE_KEY)).toBe(true);

    const reloaded = loadOnboardingSettings(storage);
    expect(reloaded.hintsEnabled).toBe(false);
    expect(reloaded.directivesEnabled).toBe(true);
    expect(reloaded.orientationDismissed).toBe(true);
    expect(reloaded.dismissedHintIds).toEqual(["hint:recon-lead"]);
  });

  it("safely handles corrupted storage without throwing", () => {
    const storage: OnboardingStorage = {
      getItem: () => "invalid-json{{{",
      setItem: () => {},
    };

    expect(loadOnboardingSettings(storage)).toEqual(DEFAULT_ONBOARDING_SETTINGS);
  });
});
