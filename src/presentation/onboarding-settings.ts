export const ONBOARDING_STORAGE_KEY = "ghostrank:onboarding:v1";

export interface OnboardingSettings {
  /**
   * Master toggle for contextual hints across apps.
   */
  hintsEnabled: boolean;
  /**
   * Master toggle for the progressive operational directives dock.
   */
  directivesEnabled: boolean;
  /**
   * Whether the first-run operational orientation briefing has been dismissed.
   */
  orientationDismissed: boolean;
  /**
   * IDs of contextual hints explicitly dismissed by the player.
   */
  dismissedHintIds: string[];
}

export const DEFAULT_ONBOARDING_SETTINGS: OnboardingSettings = {
  hintsEnabled: true,
  directivesEnabled: true,
  orientationDismissed: false,
  dismissedHintIds: [],
};

export interface OnboardingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function normalizeOnboardingSettings(value: unknown): OnboardingSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_ONBOARDING_SETTINGS };
  }

  const candidate = value as Partial<OnboardingSettings>;

  const dismissedHintIds = Array.isArray(candidate.dismissedHintIds)
    ? candidate.dismissedHintIds.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      )
    : [];

  return {
    hintsEnabled:
      typeof candidate.hintsEnabled === "boolean"
        ? candidate.hintsEnabled
        : DEFAULT_ONBOARDING_SETTINGS.hintsEnabled,
    directivesEnabled:
      typeof candidate.directivesEnabled === "boolean"
        ? candidate.directivesEnabled
        : DEFAULT_ONBOARDING_SETTINGS.directivesEnabled,
    orientationDismissed:
      typeof candidate.orientationDismissed === "boolean"
        ? candidate.orientationDismissed
        : DEFAULT_ONBOARDING_SETTINGS.orientationDismissed,
    dismissedHintIds: [...new Set(dismissedHintIds)],
  };
}

export function loadOnboardingSettings(
  storage: Pick<OnboardingStorage, "getItem">,
): OnboardingSettings {
  try {
    const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
    if (raw) {
      return normalizeOnboardingSettings(JSON.parse(raw));
    }
    return { ...DEFAULT_ONBOARDING_SETTINGS };
  } catch {
    return { ...DEFAULT_ONBOARDING_SETTINGS };
  }
}

export function saveOnboardingSettings(
  storage: Pick<OnboardingStorage, "setItem">,
  settings: OnboardingSettings,
): void {
  try {
    storage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify(normalizeOnboardingSettings(settings)),
    );
  } catch {
    // Non-authoritative presentation storage failure is non-fatal.
  }
}
