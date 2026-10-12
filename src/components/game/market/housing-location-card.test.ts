import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HousingLocationCard } from "@/components/game/market/housing-location-card";
import { presentHousingListing } from "@/components/game/market/housing-listing-model";

const base = {
  label:"Basement Cot (Warehouse District)", dailyCost:15, active:false, travelMinutes:60,
  kind:"safehouse", anonymity:"quiet",
  compute:0, memory:0, vram:0, storage:0, network:0,
};

function render(active: boolean) {
  return renderToStaticMarkup(createElement(HousingLocationCard, {
    item:presentHousingListing("housing-basement-cot", { ...base, active }),
    onMoveIn:()=>{}, onMoveOut:()=>{},
  }));
}

describe("Housing location cards", () => {
  it("renders shadcn controls, factual travel, zero lift, anonymity and recurring cost", () => {
    const html = render(false);
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("15 cr");
    expect(html).toContain("/ world day");
    expect(html).toContain("60 world min travel");
    expect(html).toContain("quiet anonymity");
    expect(html).toContain("No capability lift");
    expect(html).toContain('aria-label="Move into Basement Cot (Warehouse District)"');
    expect(html).toContain("TRAVEL &amp; SIGN");
    expect(html).not.toContain("Security rating");
    expect(html).not.toContain("GUARANTEED");
  });
  it("uses authoritative lease state to offer a move out and show return time", () => {
    const html = render(true);
    expect(html).toContain("CURRENT LEASE");
    expect(html).toContain("Same duration to return");
    expect(html).toContain('aria-label="Move out of Basement Cot (Warehouse District)"');
    expect(html).toContain("MOVE OUT");
    expect(html).not.toContain("MOVE IN");
  });
});
