import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import { AppearanceApp } from "@/components/game/appearance-app";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";

describe("AppearanceApp presentation and accessibility overrides", () => {
  beforeEach(() => {
    usePresentationStore.setState({
      distroId: "ghost-os",
      themeId: "ash",
      installedDistroIds: ["ghost-os"],
      soundEnabled: true,
      textScale: "normal",
      motionMode: "system",
      transparencyMode: "default",
      densityMode: "compact",
      contrastMode: "normal",
      hydrated: true,
    });
  });

  it("renders operating environment, theme variant, sound, guidance, and accessibility sections", () => {
    const html = renderToStaticMarkup(React.createElement(AppearanceApp));

    expect(html).toContain("System distributions");
    expect(html).toContain("GHOST/OS");
    expect(html).toContain("Ash");
    expect(html).toContain("DISTRO SOUND IDENTITY");
    expect(html).toContain("ACCESSIBILITY &amp; COMFORT");
    expect(html).toContain("Interaction overrides");
  });

  it("renders interactive accessibility controls for text scale, motion, transparency, density, and contrast", () => {
    const html = renderToStaticMarkup(React.createElement(AppearanceApp));

    expect(html).toContain("Interface &amp; Text Scale");
    expect(html).toContain("100% (NORMAL)");
    expect(html).toContain("115% (LARGE)");
    expect(html).toContain("130% (EXTRA LARGE)");

    expect(html).toContain("Motion &amp; Animations");
    expect(html).toContain("SYSTEM");
    expect(html).toContain("REDUCED");
    expect(html).toContain("STANDARD");

    expect(html).toContain("Surface Transparency &amp; Blur");
    expect(html).toContain("TRANSLUCENT");
    expect(html).toContain("OPAQUE (SOLID)");

    expect(html).toContain("Information Density");
    expect(html).toContain("COMPACT");
    expect(html).toContain("COMFORTABLE");

    expect(html).toContain("Contrast Level");
    expect(html).toContain("BALANCED");
    expect(html).toContain("HIGH CONTRAST");
  });

  it("updates aria-pressed attributes when accessibility overrides are active", () => {
    usePresentationStore.setState({
      textScale: "extra-large",
      motionMode: "reduce",
      transparencyMode: "opaque",
      densityMode: "comfortable",
      contrastMode: "high",
    });

    const html = renderToStaticMarkup(React.createElement(AppearanceApp));

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("130% (EXTRA LARGE)");
    expect(html).toContain("REDUCED");
    expect(html).toContain("OPAQUE (SOLID)");
    expect(html).toContain("COMFORTABLE");
    expect(html).toContain("HIGH CONTRAST");
  });

  it("renders all five distro profiles", () => {
    const html = renderToStaticMarkup(React.createElement(AppearanceApp));

    expect(html).toContain("Ghost");
    expect(html).toContain("Lattice");
    expect(html).toContain("Velvet");
    expect(html).toContain("Daybreak");
    expect(html).toContain("Petal");
  });
});
