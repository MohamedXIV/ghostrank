import {
  DEFAULT_PRESENTATION_SETTINGS,
  normalizePresentationSettings,
  type PresentationSettings,
} from "@/presentation/distros";

export const PRESENTATION_STORAGE_KEY = "ghostrank:presentation:v2";
export const LEGACY_PRESENTATION_STORAGE_KEY = "ghostrank:presentation:v1";

export interface PresentationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadPresentationSettings(
  storage: Pick<PresentationStorage, "getItem">,
): PresentationSettings {
  try {
    const current = storage.getItem(PRESENTATION_STORAGE_KEY);

    if (current) {
      return normalizePresentationSettings(JSON.parse(current));
    }

    const legacy = storage.getItem(LEGACY_PRESENTATION_STORAGE_KEY);

    if (legacy) {
      return normalizePresentationSettings(JSON.parse(legacy));
    }

    return { ...DEFAULT_PRESENTATION_SETTINGS };
  } catch {
    return { ...DEFAULT_PRESENTATION_SETTINGS };
  }
}

export function savePresentationSettings(
  storage: Pick<PresentationStorage, "setItem">,
  settings: PresentationSettings,
): void {
  try {
    storage.setItem(
      PRESENTATION_STORAGE_KEY,
      JSON.stringify(normalizePresentationSettings(settings)),
    );
  } catch {
    // Presentation persistence is optional. A blocked/full storage backend must
    // never stop the run or make a cosmetic choice authoritative.
  }
}
