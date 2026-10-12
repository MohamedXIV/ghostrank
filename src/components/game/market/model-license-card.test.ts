import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { presentModelListing } from "@/components/game/market/model-listing-model";
import { ModelLicenseCard } from "@/components/game/market/model-license-card";
function render(source: "cloud"|"local", owned=false, running=false, credits=0, delivered=0.85) {
  const item=presentModelListing(source==="cloud"?"model-cloud-compact":"model-local-workhorse",{
    source,label:source==="cloud"?"Compact Class API":"Quantized Workhorse 13B",
    cost:source==="cloud"?0:900,dailyCost:source==="cloud"?40:0,
    factor:source==="cloud"?0.85:0.9,deliveredFactor:delivered,
    vram:source==="cloud"?0:2, storage:source==="cloud"?0:1,
    author:"", owned, running,
  },credits,{vram:1,storage:1});
  return renderToStaticMarkup(createElement(ModelLicenseCard,{item,onBuy:()=>{},onRun:()=>{},onStop:()=>{}}));
}
describe("shadcn AI model cards",()=>{
  it("shows cloud daily subscription and RUN with no fake local storage requirement",()=>{
    const html=render("cloud");
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain("40 cr"); expect(html).toContain("/ world day while running");
    expect(html).toContain("No local VRAM/storage load");
    expect(html).toContain('aria-label="Run Compact Class API"');
    expect(html).not.toContain("Not enough credits");
  });
  it("shows true local purchase, requirements and under-delivery before ownership",()=>{
    const html=render("local");
    expect(html).toContain("900 cr");expect(html).toContain("one-time");
    expect(html).toContain("VRAM load");expect(html).toContain("Storage load");
    expect(html).toContain("Current rig delivers");
    expect(html).toContain("×0.85");
    expect(html).toContain('aria-label="Buy Quantized Workhorse 13B"');
    expect(html).toContain("Not enough credits");
    expect(html).toContain('disabled=""');
  });
  it("stops the active model rather than offering a second buy",()=>{
    const html=render("local",true,true);
    expect(html).toContain("RUNNING");
    expect(html).toContain('aria-label="Stop Quantized Workhorse 13B"');
    expect(html).not.toContain('aria-label="Buy Quantized Workhorse 13B"');
  });
});
