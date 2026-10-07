import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EndingPresentation } from "@/components/game/ending/ending-presentation";
import type { RunEndingStatus } from "@/game/simulation/state/world-state";

const ENDINGS: readonly RunEndingStatus[] = [
  "arrested",
  "unmasked",
  "missing",
  "compromised",
  "stranded",
  "retired",
  "vanished",
];

describe("authored ending presentation", () => {
  it.each(ENDINGS)("renders the %s ending from safe presentation data", (status) => {
    const html = renderToStaticMarkup(
      React.createElement(EndingPresentation, {
        ending: {
          status,
          label: status.toUpperCase(),
          worldMinute: 1_440,
          ...(status === "retired"
            ? { variant: "white-quiet" as const, detail: "A quiet departure." }
            : {}),
        },
        handle: "CobaltXZ",
        finalRank: 3_700,
        finalCredits: 120,
        traceCount: 4,
        evidence: [
          {
            id: "safe-evidence-1",
            category: "INVESTIGATION",
            worldMinute: 900,
            text: "An unfamiliar login touched Nightshade.",
          },
        ],
        distroId: "ghost-os",
        themeId: "ash",
        textScale: "normal",
        motionMode: "system",
        transparencyMode: "default",
        densityMode: "compact",
        contrastMode: "normal",
        onStartNewRun: () => undefined,
      }),
    );

    expect(html).toContain(`data-ending="${status}"`);
    expect(html).toContain("CobaltXZ");
    expect(html).toContain("WORLD TIME");
    expect(html).toContain("connection unconfirmed");
    expect(html).not.toContain("causeId");
    expect(html).not.toContain("hidden:");
  });
});
