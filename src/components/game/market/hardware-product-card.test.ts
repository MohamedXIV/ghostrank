import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { presentHardwareItem } from "@/components/game/market/hardware-item-model";
import { HardwareProductCard } from "@/components/game/market/hardware-product-card";

const row = {
  label: "Cold Storage Array", category: "storage", cost: 250,
  compute: 0, memory: 0, vram: 0, storage: 5, network: 0, owned: 1,
};
describe("illustrated Market product cards", () => {
  it("renders real item category, CR price, stat and owned count with shadcn slots", () => {
    const item = presentHardwareItem("storage-array", row, 250);
    const html = renderToStaticMarkup(createElement(HardwareProductCard, { item, onBuy: () => {} }));
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("Cold Storage Array");
    expect(html).toContain("250 cr");
    expect(html).toContain("STO +5");
    expect(html).toContain("OWNED ×1");
    expect(html).toContain("Buy Cold Storage Array");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("In Stock");
  });
  it("disables unavailable purchases for insufficient credits without hiding specs", () => {
    const item = presentHardwareItem("storage-array", row, 0);
    const html = renderToStaticMarkup(createElement(HardwareProductCard, { item, onBuy: () => {} }));
    expect(html).toContain('disabled=""');
    expect(html).toContain("Not enough credits");
    expect(html).toContain("STO +5");
  });
});
