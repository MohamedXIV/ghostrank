import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReconStationHeader } from "@/components/game/recon/recon-station-header";

describe("Recon visual station: player-known signals only", () => {
  it("renders shadcn badges for observed, never imagined infrastructure", () => {
    const html = renderToStaticMarkup(createElement(ReconStationHeader, {
      observedTargets: 0, knownMachines: 0, activeEvidence: 0, activeOperation: false,
    }));
    expect(html).toContain("RECON CONTROL");
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("Observed profiles");
    expect(html).toContain("Known hosts");
    expect(html).toContain("0");
    expect(html).not.toContain("Potential hosts");
    expect(html).not.toContain("Network threat level");
  });
  it("only displays active operation service evidence, without hidden ranks or confidence", () => {
    const html = renderToStaticMarkup(createElement(ReconStationHeader, {
      observedTargets: 2, knownMachines: 3, activeEvidence: 4, activeOperation: true,
    }));
    expect(html).toContain("2");
    expect(html).toContain("3");
    expect(html).toContain("4");
    expect(html).toContain("Active services");
    expect(html).toContain("LIVE OPERATION");
    expect(html).not.toContain("Danger");
    expect(html).not.toContain("Predict");
  });
});
