import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { presentSoftwareListing } from "@/components/game/market/software-listing-model";
import { SoftwareLicenseCard } from "@/components/game/market/software-license-card";

const row = {
  label:"Commercial Monitoring Suite", dailyCost:40, active:false,
  discountFactor:1, compute:0, memory:0, vram:0, storage:0, network:2,
};

describe("shadcn Software License Card", () => {
  const render = (active: boolean) => renderToStaticMarkup(
    createElement(SoftwareLicenseCard, {
      item:presentSoftwareListing("software-net-monitor", { ...row, active }),
      onToggle:() => {},
    }),
  );
  it("shows official shadcn component slots and real daily license cost", () => {
    const html = render(false);
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("Commercial Monitoring Suite");
    expect(html).toContain("40 cr");
    expect(html).toContain("/ world day");
    expect(html).toContain("NET");
    expect(html).toContain('aria-label="Run Commercial Monitoring Suite"');
    expect(html).not.toContain("One-time");
  });
  it("shows running label and STOP, without pretending the license was bought permanently", () => {
    const html = render(true);
    expect(html).toContain("RUNNING");
    expect(html).toContain('aria-label="Stop Commercial Monitoring Suite"');
    expect(html).not.toContain("OWNED");
  });
});
