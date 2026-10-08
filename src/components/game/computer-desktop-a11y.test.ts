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

  it("keeps the header controls in one reading and focus order, with ROOM last inside the actions group", async () => {
    // The narrow header wraps these controls with CSS (G1 acceptance). The wrap
    // must not reorder them, so the DOM order here is the focus order too.
    const runtime = await createGameSession({
      initialState: createSliceWorldState(),
    });

    const html = renderToStaticMarkup(
      React.createElement(ComputerDesktop, {
        runtime,
        onReturnToRoom: () => {},
        onStartNewRun: () => {},
      }),
    );

    const header = html.slice(
      html.indexOf('<header class="os-bar">'),
      html.indexOf("</header>"),
    );
    const order = ["+ NEW RUN", "? GLOSSARY", "DIRECTIVES", "ROOM"].map((label) =>
      header.indexOf(label),
    );

    expect(order.every((index) => index > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(header.indexOf('class="os-actions"')).toBeGreaterThan(0);
    expect(header.indexOf('class="os-actions"')).toBeLessThan(order[0]);
    expect(header.lastIndexOf("</div>")).toBeGreaterThan(order[3]);
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
