import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRESENTATION,
  DISTRO_IDS,
  DISTRO_PROFILES,
  normalizePresentationSelection,
  normalizePresentationSettings,
  selectionForDistro,
} from "@/presentation/distros";

describe("Phase 9 P1 distro profiles", () => {
  it("ships the five planned presentation identities", () => {
    expect(DISTRO_IDS).toEqual([
      "ghost-os",
      "lattice",
      "velvet",
      "daybreak",
      "petal",
    ]);

    for (const id of DISTRO_IDS) {
      const profile = DISTRO_PROFILES[id];

      expect(profile.id).toBe(id);
      expect(profile.themes.length).toBeGreaterThan(0);
      expect(
        profile.themes.some((theme) => theme.id === profile.defaultTheme),
      ).toBe(true);
      expect(profile.swatches).toHaveLength(3);
    }
  });

  it("gives Petal both light and night themes", () => {
    expect(DISTRO_PROFILES.petal.themes.map((theme) => theme.id)).toEqual([
      "light",
      "night",
    ]);
  });

  it("falls back safely when persisted presentation data is invalid", () => {
    expect(normalizePresentationSelection(null)).toEqual(DEFAULT_PRESENTATION);
    expect(
      normalizePresentationSelection({
        distroId: "not-a-distro",
        themeId: "anything",
      }),
    ).toEqual(DEFAULT_PRESENTATION);

    expect(
      normalizePresentationSelection({
        distroId: "petal",
        themeId: "missing",
      }),
    ).toEqual(selectionForDistro("petal"));
  });

  it("normalizes accessibility overrides and falls back to safe defaults", () => {
    expect(
      normalizePresentationSettings({
        distroId: "lattice",
        themeId: "grid",
        textScale: "extra-large",
        motionMode: "reduce",
        transparencyMode: "opaque",
        densityMode: "comfortable",
        contrastMode: "high",
      }),
    ).toMatchObject({
      distroId: "lattice",
      themeId: "grid",
      textScale: "extra-large",
      motionMode: "reduce",
      transparencyMode: "opaque",
      densityMode: "comfortable",
      contrastMode: "high",
    });

    expect(
      normalizePresentationSettings({
        textScale: "invalid-scale",
        motionMode: "invalid-motion",
        transparencyMode: "invalid-transparency",
        densityMode: "invalid-density",
        contrastMode: "invalid-contrast",
      }),
    ).toMatchObject({
      textScale: "normal",
      motionMode: "system",
      transparencyMode: "default",
      densityMode: "compact",
      contrastMode: "normal",
    });
  });
});
