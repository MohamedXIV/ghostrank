import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { ComputerDesktop } from "@/components/game/computer-desktop";
import { createGameSession } from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { useUiStore } from "@/stores/ui/use-ui-store";

describe("ComputerDesktop accessibility & keyboard presentation", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      distroId: "lattice",
      themeId: "grid",
      installedDistroIds: ["ghost-os", "lattice"],
      soundEnabled: true,
      textScale: "large",
      motionMode: "reduce",
      transparencyMode: "opaque",
      densityMode: "comfortable",
      contrastMode: "high",
      hydrated: true,
    });
    useUiStore.setState({
      activeSurface: "computer",
      openWindows: ["terminal"],
      focusedWindow: "terminal",
    });
  });

  it("applies all accessibility overrides as data attributes on the desktop surface", async () => {
    const runtime = await createGameSession({
      initialState: createSliceWorldState(),
    });

    usePresentationStore.setState({
      distroId: "lattice",
      themeId: "grid",
      installedDistroIds: ["ghost-os", "lattice"],
      soundEnabled: true,
      textScale: "large",
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

    expect(html).toContain('data-distro="lattice"');
    expect(html).toContain('data-theme="grid"');
    expect(html).toContain('data-text-scale="large"');
    expect(html).toContain('data-motion-mode="reduce"');
    expect(html).toContain('data-transparency="opaque"');
    expect(html).toContain('data-density="comfortable"');
    expect(html).toContain('data-contrast="high"');
  });

  it("exposes keyboard shortcuts via aria-keyshortcuts on application launchers", async () => {
    const runtime = await createGameSession({
      initialState: createSliceWorldState(),
    });

    const html = renderToStaticMarkup(
      React.createElement(ComputerDesktop, {
        runtime,
        onReturnToRoom: () => {},
      }),
    );

    expect(html).toContain('aria-keyshortcuts="Alt+1"');
    expect(html).toContain('aria-keyshortcuts="Alt+2"');
    expect(html).toContain('aria-keyshortcuts="Alt+3"');
    expect(html).toContain('aria-keyshortcuts="Alt+4"');
    expect(html).toContain('aria-keyshortcuts="Alt+5"');
    expect(html).toContain('aria-keyshortcuts="Alt+6"');
    expect(html).toContain('aria-keyshortcuts="F1"');
  });

  it("marks terminal output with aria-live polite for screen reader live region support", async () => {
    const runtime = await createGameSession({
      initialState: createSliceWorldState(),
    });

    const html = renderToStaticMarkup(
      React.createElement(ComputerDesktop, {
        runtime,
        onReturnToRoom: () => {},
      }),
    );

    expect(html).toContain('aria-live="polite"');
  });
});
