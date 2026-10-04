import type { HardwareCapability } from "@/content/hardware-catalog";

/**
 * Housing is a recurring-cost capability source: a rented location adds to the
 * rig's effective capability while you can keep paying its daily upkeep. It is
 * never a gate — holding no lease is the free baseline that always supports
 * baseline play, and losing a lease moves you back to it rather than creating
 * debt.
 */

export interface HousingCatalogItem {
  id: string;
  label: string;
  /** Credits charged per crossed world day. */
  dailyCost: number;
  /** Capability contributed while the lease is held. */
  capability: HardwareCapability;
}

export const HOUSING_CATALOG: readonly HousingCatalogItem[] = [
  {
    id: "housing-cowork-loft",
    label: "Co-working Loft",
    dailyCost: 30,
    capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 2 },
  },
  {
    id: "housing-rented-lab",
    label: "Rented Lab Bench",
    dailyCost: 60,
    capability: { compute: 2, memory: 1, vram: 0, storage: 1, network: 0 },
  },
];

export const LANDLORD_COUNTERPARTY = "landlord";

export function findHousingItem(
  housingId: string,
): HousingCatalogItem | undefined {
  return HOUSING_CATALOG.find((item) => item.id === housingId);
}
