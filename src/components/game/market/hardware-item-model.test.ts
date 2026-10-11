import { describe, expect, it } from "vitest";
import { HARDWARE_CATALOG } from "@/content/hardware-catalog";
import { presentHardwareItem } from "@/components/game/market/hardware-item-model";

function actualRow(id: string, owned = 0) {
  const product = HARDWARE_CATALOG.find((x) => x.id === id);
  if (!product) throw new Error("Missing test catalog item: " + id);
  return {
    label: product.label,
    category: product.category,
    cost: product.cost,
    compute: product.capability.compute,
    memory: product.capability.memory,
    vram: product.capability.vram,
    storage: product.capability.storage,
    network: product.capability.network,
    owned,
  };
}

describe("illustrated Market is projection-driven, never fictionalized", () => {
  it("shows the real free owned starter workstation and retains purchasing eligibility", () => {
    const item = presentHardwareItem("rig-starter", actualRow("rig-starter", 1), 0);
    expect(item.label).toBe("Secondhand Workstation");
    expect(item.priceCr).toBe(0);
    expect(item.ownedCount).toBe(1);
    expect(item.affordable).toBe(true);
    expect(item.imageSrc).toBe("/visual-reboot/hardware/workstation.svg");
    expect(item.stats).toEqual([
      { metric: "CPU", value: 1 },
      { metric: "MEM", value: 1 },
      { metric: "STO", value: 1 },
      { metric: "NET", value: 1 },
    ]);
  });
  it("preserves affordability and precise storage capability", () => {
    const tooExpensive = presentHardwareItem("storage-array", actualRow("storage-array", 2), 249);
    const affordable = presentHardwareItem("storage-array", actualRow("storage-array", 2), 250);
    expect(tooExpensive.priceCr).toBe(250);
    expect(tooExpensive.stats).toEqual([{ metric: "STO", value: 5 }]);
    expect(tooExpensive.affordable).toBe(false);
    expect(affordable.affordable).toBe(true);
    expect(affordable.ownedCount).toBe(2);
    expect(affordable.imageSrc).toBe("/visual-reboot/hardware/storage.svg");
  });
  it("uses actual CPU deltas; never generates fictional shopping metadata", () => {
    const item = presentHardwareItem("cpu-overclock", actualRow("cpu-overclock"), 400);
    expect(item.stats).toEqual([{ metric: "CPU", value: 3 }]);
    expect(item.priceCr).toBe(400);
    expect(item).not.toHaveProperty("vendor");
    expect(item).not.toHaveProperty("condition");
    expect(item).not.toHaveProperty("rarity");
    expect(item).not.toHaveProperty("stock");
    expect(item).not.toHaveProperty("cart");
  });
  it("renders unknown categories as generic art without rewriting actual catalog data", () => {
    const strange = { ...actualRow("storage-array"), category: "experimental" };
    const item = presentHardwareItem("future-entry", strange, 250);
    expect(item.imageSrc).toBe("/visual-reboot/hardware/generic.svg");
    expect(item.category).toBe("experimental");
    expect(item.label).toBe("Cold Storage Array");
  });
});
