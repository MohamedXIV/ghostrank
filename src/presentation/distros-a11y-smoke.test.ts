import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { ComputerDesktop } from "@/components/game/computer-desktop";
import { createGameSession } from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  DISTRO_IDS,
  DISTRO_PROFILES,
  type DistroId,
} from "@/presentation/distros";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { useUiStore } from "@/stores/ui/use-ui-store";

describe("All distros accessibility smoke test", () => {
  beforeEach(() => {
    useUiStore.setState({
      activeSurface: "computer",
      openWindows: ["terminal", "recon"],
      focusedWindow: "terminal",
    });
  });

  const distroThemePairs: Array<{ distroId: DistroId; themeId: string }> = [
    { distroId: "ghost-os", themeId: "ash" },
    { distroId: "lattice", themeId: "grid" },
    { distroId: "velvet", themeId: "plum" },
    { distroId: "daybreak", themeId: "warm" },
    { distroId: "petal", themeId: "light" },
    { distroId: "petal", themeId: "night" },
  ];

  for (const { distroId, themeId } of distroThemePairs) {
    it(`renders ${distroId} (${themeId}) with accessibility overrides and keyboard landmarks`, async () => {
      const runtime = await createGameSession({
        initialState: createSliceWorldState(),
      });

      usePresentationStore.setState({
        distroId,
        themeId,
        installedDistroIds: [...DISTRO_IDS],
        soundEnabled: false,
        textScale: "extra-large",
        motionMode: "reduce",
        transparencyMode: "opaque",
        densityMode: "comfortable",
        contrastMode: "high",
        hydrated: true,
      });

      const html = renderToStaticMarkup(
        React.createElement(ComputerDesktop, {
          runtime,
          onReturnToRoom: () => {},
        }),
      );

      // Distro & theme attributes
      expect(html).toContain(`data-distro="${distroId}"`);
      expect(html).toContain(`data-theme="${themeId}"`);

      // Accessibility overrides
      expect(html).toContain('data-text-scale="extra-large"');
      expect(html).toContain('data-motion-mode="reduce"');
      expect(html).toContain('data-transparency="opaque"');
      expect(html).toContain('data-density="comfortable"');
      expect(html).toContain('data-contrast="high"');

      // Shell brand & profile glyph
      const profile = DISTRO_PROFILES[distroId];
      expect(html).toContain(profile.label);

      // Launcher aria-keyshortcuts
      expect(html).toContain('aria-keyshortcuts="Alt+1"');
      expect(html).toContain('aria-keyshortcuts="Alt+2"');
      expect(html).toContain('aria-keyshortcuts="Alt+3"');
      expect(html).toContain('aria-keyshortcuts="Alt+4"');
      expect(html).toContain('aria-keyshortcuts="Alt+5"');
      expect(html).toContain('aria-keyshortcuts="Alt+6"');
      expect(html).toContain('aria-keyshortcuts="F1"');

      // Live regions
      expect(html).toContain('aria-live="polite"');
    });
  }
});
