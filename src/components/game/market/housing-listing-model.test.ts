import { describe, expect, it } from "vitest";
import { HOUSING_CATALOG } from "@/content/housing-catalog";
import { presentHousingListing } from "@/components/game/market/housing-listing-model";

function project(id: string, active = false) {
  const item = HOUSING_CATALOG.find(entry => entry.id === id);
  if (!item) throw new Error("Unknown catalog location: " + id);
  return {
    label: item.label, dailyCost: item.dailyCost, active,
    kind: item.kind ?? "residential", anonymity: item.anonymity ?? "public",
    travelMinutes: item.travelMinutes ?? 0, ...item.capability,
  };
}

describe("Housing market from visible projected facts", () => {
  it("retains actual priced same-district workspace and network lift", () => {
    const item = presentHousingListing("housing-cowork-loft", project("housing-cowork-loft", true));
    expect(item.dailyCostCr).toBe(30);
    expect(item.active).toBe(true);
    expect(item.travelMinutes).toBe(0);
    expect(item.capabilities).toEqual([{ metric: "NET", value: 2 }]);
    expect(item.art).toBe("/visual-reboot/housing/housing-cowork-loft.svg");
  });
  it("retains safehouse time, band and zero capability without invented safety stats", () => {
    const item = presentHousingListing("housing-sleeper-unit", project("housing-sleeper-unit"));
    expect(item.dailyCostCr).toBe(25);
    expect(item.kind).toBe("safehouse");
    expect(item.anonymity).toBe("hidden");
    expect(item.travelMinutes).toBe(180);
    expect(item.capabilities).toEqual([]);
    expect(item).not.toHaveProperty("security");
    expect(item).not.toHaveProperty("risk");
    expect(item).not.toHaveProperty("vendor");
  });
  it("uses neutral art for unrecognized projected locations, without a fabricated listing", () => {
    expect(presentHousingListing("future-place", { ...project("housing-rented-lab"), label:"Future" }).art)
      .toBe("/visual-reboot/housing/generic.svg");
  });
});
