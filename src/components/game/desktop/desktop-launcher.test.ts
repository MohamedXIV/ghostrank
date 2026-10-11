import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DISTRO_IDS } from "@/presentation/distros";
import { DesktopLauncher, LAUNCHER_APPS } from "@/components/game/desktop/desktop-launcher";

describe("distro native desktop launcher", () => {
  const markupFor = (distroId: (typeof DISTRO_IDS)[number]) =>
    renderToStaticMarkup(
      createElement(DesktopLauncher, {
        distroId,
        focusedWindow: "market",
        openWindows: ["terminal", "market"],
        onOpenWindow: () => {},
        onOpenGlossary: () => {},
      }),
    );

  it("exposes exactly the six real apps and glossary with stable keyboard shortcuts", () => {
    expect(LAUNCHER_APPS.map((app) => app.id)).toEqual([
      "terminal", "recon", "underground", "market", "history", "settings",
    ]);
    const html = markupFor("ghost-os");
    expect((html.match(/data-window-id=/g) ?? [])).toHaveLength(6);
    for (let n = 1; n <= 6; n++) expect(html).toContain(`aria-keyshortcuts="Alt+${n}"`);
    expect(html).toContain("Open system glossary");
    expect(html).toContain('data-window-id="market"');
    expect(html).toContain('data-focused="true"');
    expect(html).toContain('data-open="true"');
  });

  it.each(DISTRO_IDS)("renders an accessible %s launcher in the matching geometry", (id) => {
    const html = markupFor(id);
    expect(html).toContain('aria-label="Applications"');
    expect(html).toContain(`data-distro-launcher="${id}"`);
    expect(html).toContain("Market");
    expect(html).toContain("Recon");
    expect(html).not.toContain("Wi-Fi");
    expect(html).not.toContain("Spotify");
  });
});
