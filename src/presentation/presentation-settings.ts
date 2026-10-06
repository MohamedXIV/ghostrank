import {
  normalizePresentationSelection,
  type PresentationSelection,
} from "@/presentation/distros";

export const PRESENTATION_STORAGE_KEY = "ghostrank:presentation:v1";

export interface PresentationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadPresentationSelection(
  storage: Pick<PresentationStorage, "getItem">,
): PresentationSelection {
  try {
    const raw = storage.getItem(PRESENTATION_STORAGE_KEY);

    if (!raw) {
      return normalizePresentationSelection(null);
    }

    return normalizePresentationSelection(JSON.parse(raw));
  } catch {
    return normalizePresentationSelection(null);
  }
}

export function savePresentationSelection(
  storage: Pick<PresentationStorage, "setItem">,
  selection: PresentationSelection,
): void {
  try {
    storage.setItem(
      PRESENTATION_STORAGE_KEY,
      JSON.stringify(normalizePresentationSelection(selection)),
    );
  } catch {
    // Presentation persistence is optional. A blocked/full storage backend must
    // never stop the run or make a cosmetic choice authoritative.
  }
}
