import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RunTimeline } from "@/components/game/history/run-timeline";
import { deriveCompletedRunSummary } from "@/game/simulation/systems/run-history";
import { createReleaseStressFixtures } from "@/game/performance/release-stress-fixture";

describe("RunTimeline presentation contracts", () => {
  it("renders the latest bounded page with the ending in view", () => {
    const { completed } = createReleaseStressFixtures();
    const summary = deriveCompletedRunSummary(completed);
    const markup = renderToStaticMarkup(
      React.createElement(RunTimeline, { run: summary }),
    );

    expect(markup.match(/<li class="run-event /g)).toHaveLength(100);
    expect(markup).toContain("EVENTS 2920–3019 OF 3019");
    expect(markup).toContain("The run ended in custody.");
    expect(markup).toContain("OLDER EVENTS");
    expect(markup).toContain("NEWER EVENTS");
  });
});
