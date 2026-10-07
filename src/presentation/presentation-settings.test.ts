import { describe, expect, it } from "vitest";

import {
  LEGACY_PRESENTATION_STORAGE_KEY,
  loadPresentationSettings,
  PRESENTATION_STORAGE_KEY,
  savePresentationSettings,
  type PresentationStorage,
} from "@/presentation/presentation-settings";

function memoryStorage(
  initial?: Record<string, string>,
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
  it("round-trips installed distros, active theme, sound preference, and accessibility overrides", () => {
    const storage = memoryStorage();

    savePresentationSettings(storage, {
      distroId: "petal",
      themeId: "night",
      installedDistroIds: ["ghost-os", "petal"],
      soundEnabled: false,
      textScale: "large",
      motionMode: "reduce",
      transparencyMode: "opaque",
      densityMode: "comfortable",
      contrastMode: "high",
    });

    expect(loadPresentationSettings(storage)).toEqual({
      distroId: "petal",
      themeId: "night",
      installedDistroIds: ["ghost-os", "petal"],
      soundEnabled: false,
      textScale: "large",
      motionMode: "reduce",
      transparencyMode: "opaque",
      densityMode: "comfortable",
      contrastMode: "high",
    });
  });

  it("migrates legacy selections and populates default accessibility overrides", () => {
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
      textScale: "normal",
      motionMode: "system",
      transparencyMode: "default",
      densityMode: "compact",
      contrastMode: "normal",
    });
  });

  it("fails toward Ghost/OS and default accessibility overrides for corrupt JSON", () => {
    expect(
      loadPresentationSettings(
        memoryStorage({ [PRESENTATION_STORAGE_KEY]: "{nope" }),
      ),
    ).toEqual({
      distroId: "ghost-os",
      themeId: "ash",
      installedDistroIds: ["ghost-os"],
      soundEnabled: true,
      textScale: "normal",
      motionMode: "system",
      transparencyMode: "default",
      densityMode: "compact",
      contrastMode: "normal",
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
          textScale: "normal",
          motionMode: "system",
          transparencyMode: "default",
          densityMode: "compact",
          contrastMode: "normal",
        },
      ),
    ).not.toThrow();
  });
});
