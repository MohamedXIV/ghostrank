import { describe, expect, it } from "vitest";

import {
  LEGACY_PRESENTATION_STORAGE_KEY,
  loadPresentationSettings,
  PRESENTATION_STORAGE_KEY,
  savePresentationSettings,
  type PresentationStorage,
} from "@/presentation/presentation-settings";

function memoryStorage(
  initial?: Partial<Record<string, string>>,
): PresentationStorage {
  const values = new Map<string, string>(Object.entries(initial ?? {}));

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe("presentation settings persistence", () => {
  it("round-trips installed distros, active theme and sound preference", () => {
    const storage = memoryStorage();

    savePresentationSettings(storage, {
      distroId: "petal",
      themeId: "night",
      installedDistroIds: ["ghost-os", "petal"],
      soundEnabled: false,
    });

    expect(loadPresentationSettings(storage)).toEqual({
      distroId: "petal",
      themeId: "night",
      installedDistroIds: ["ghost-os", "petal"],
      soundEnabled: false,
    });
  });

  it("migrates the P1 preview v1 selection and treats it as installed", () => {
    const storage = memoryStorage({
      [LEGACY_PRESENTATION_STORAGE_KEY]: JSON.stringify({
        distroId: "velvet",
        themeId: "plum",
      }),
    });

    expect(loadPresentationSettings(storage)).toEqual({
      distroId: "velvet",
      themeId: "plum",
      installedDistroIds: ["ghost-os", "velvet"],
      soundEnabled: true,
    });
  });

  it("fails toward Ghost/OS for corrupt JSON", () => {
    expect(
      loadPresentationSettings(
        memoryStorage({ [PRESENTATION_STORAGE_KEY]: "{nope" }),
      ),
    ).toEqual({
      distroId: "ghost-os",
      themeId: "ash",
      installedDistroIds: ["ghost-os"],
      soundEnabled: true,
    });
  });

  it("never lets unavailable cosmetic storage interrupt play", () => {
    expect(() =>
      savePresentationSettings(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        {
          distroId: "daybreak",
          themeId: "warm",
          installedDistroIds: ["ghost-os", "daybreak"],
          soundEnabled: true,
        },
      ),
    ).not.toThrow();
  });
});
