import { describe, expect, it } from "vitest";
import { SOFTWARE_CATALOG } from "@/content/software-catalog";
import { presentSoftwareListing } from "@/components/game/market/software-listing-model";

const projection = (id: string, active = false) => {
  const catalog = SOFTWARE_CATALOG.find(item => item.id === id);
  if (!catalog) throw new Error("No item " + id);
  return {
    label: catalog.label, dailyCost: catalog.dailyCost, active,
    discountFactor: catalog.effect.kind === "modifier" ? catalog.effect.discount.factor : 1,
    compute: catalog.effect.kind === "capability" ? catalog.effect.capability.compute : 0,
    memory: catalog.effect.kind === "capability" ? catalog.effect.capability.memory : 0,
    vram: catalog.effect.kind === "capability" ? catalog.effect.capability.vram : 0,
    storage: catalog.effect.kind === "capability" ? catalog.effect.capability.storage : 0,
    network: catalog.effect.kind === "capability" ? catalog.effect.capability.network : 0,
  };
};

describe("Software Market projection-driven listings", () => {
  it("retains monitoring software recurring cost, running state and network gain", () => {
    const item = presentSoftwareListing("software-net-monitor", projection("software-net-monitor", true));
    expect(item.label).toBe("Commercial Monitoring Suite");
    expect(item.dailyCostCr).toBe(40);
    expect(item.active).toBe(true);
    expect(item.efficiency).toBeNull();
    expect(item.capabilities).toEqual([{ metric: "NET", value: 2 }]);
    expect(item.art).toBe("/visual-reboot/software/software-net-monitor.svg");
  });
  it("retains duration modifiers rather than inventing hardware capability", () => {
    const item = presentSoftwareListing("software-analysis-pipeline", projection("software-analysis-pipeline"));
    expect(item.efficiency).toBe("×0.85 action time");
    expect(item.capabilities).toEqual([]);
    expect(item.dailyCostCr).toBe(100);
    expect(item.active).toBe(false);
  });
  it("never fabricates sellers, scarcity or ownership gates", () => {
    const item = presentSoftwareListing("future-plugin", {
      ...projection("software-net-monitor"), label:"Future plugin", dailyCost:5,
    });
    expect(item.art).toBe("/visual-reboot/software/generic.svg");
    expect(item).not.toHaveProperty("vendor");
    expect(item).not.toHaveProperty("rarity");
    expect(item).not.toHaveProperty("affordable");
    expect(item).not.toHaveProperty("owned");
  });
});
