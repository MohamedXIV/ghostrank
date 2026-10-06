import { describe, expect, it } from "vitest";

import {
  loadPresentationSelection,
  PRESENTATION_STORAGE_KEY,
  savePresentationSelection,
  type PresentationStorage,
} from "@/presentation/presentation-settings";

function memoryStorage(initial?: string): PresentationStorage {
  const values = new Map<string, string>();

  if (initial !== undefined) {
    values.set(PRESENTATION_STORAGE_KEY, initial);
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("presentation settings persistence", () => {
  it("round-trips distro and theme outside the run save", () => {
    const storage = memoryStorage();

    savePresentationSelection(storage, {
      distroId: "petal",
      themeId: "night",
    });

    expect(loadPresentationSelection(storage)).toEqual({
      distroId: "petal",
      themeId: "night",
    });
  });

  it("fails toward the default profile for corrupt JSON", () => {
    expect(loadPresentationSelection(memoryStorage("{nope"))).toEqual({
      distroId: "ghost-os",
      themeId: "ash",
    });
  });

  it("never lets unavailable cosmetic storage interrupt play", () => {
    expect(() =>
      savePresentationSelection(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        { distroId: "daybreak", themeId: "warm" },
      ),
    ).not.toThrow();
  });
});
