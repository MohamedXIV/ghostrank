export type HardwareCategory =
  | "workstation"
  | "cpu"
  | "memory"
  | "gpu"
  | "storage"
  | "network";

/**
 * Capability axes drawn from the design docs. Hardware improves scale, speed,
 * and convenience across these axes; it is never a level gate. Values are
 * first-pass tuning (see DECISIONS.md).
 */
export interface HardwareCapability {
  compute: number;
  memory: number;
  vram: number;
  storage: number;
  network: number;
}

export interface HardwareCatalogItem {
  id: string;
  label: string;
  category: HardwareCategory;
  cost: number;
  capability: HardwareCapability;
}

/**
 * Data-driven hardware catalog. Kept outside system logic. Every item is a
 * fictional abstraction. Prices are first-pass tuning (see DECISIONS.md).
 */
export const HARDWARE_CATALOG: readonly HardwareCatalogItem[] = [
  {
    id: "rig-starter",
    label: "Secondhand Workstation",
    category: "workstation",
    cost: 0,
    capability: { compute: 1, memory: 1, vram: 0, storage: 1, network: 1 },
  },
  {
    id: "cpu-overclock",
    label: "Overclocked CPU",
    category: "cpu",
    cost: 400,
    capability: { compute: 3, memory: 0, vram: 0, storage: 0, network: 0 },
  },
  {
    id: "ram-bank",
    label: "Expanded Memory Bank",
    category: "memory",
    cost: 300,
    capability: { compute: 0, memory: 4, vram: 0, storage: 0, network: 0 },
  },
  {
    id: "gpu-entry",
    label: "Entry Accelerator",
    category: "gpu",
    cost: 900,
    capability: { compute: 1, memory: 0, vram: 4, storage: 0, network: 0 },
  },
  {
    id: "storage-array",
    label: "Cold Storage Array",
    category: "storage",
    cost: 250,
    capability: { compute: 0, memory: 0, vram: 0, storage: 5, network: 0 },
  },
  {
    id: "net-card",
    label: "High-Throughput NIC",
    category: "network",
    cost: 350,
    capability: { compute: 0, memory: 0, vram: 0, storage: 0, network: 3 },
  },
];

export const STARTER_RIG_ID = "rig-starter";

/** The market counterparty for a catalog purchase. */
export const MARKET_COUNTERPARTY = "market";

export function findCatalogItem(
  catalogId: string,
): HardwareCatalogItem | undefined {
  return HARDWARE_CATALOG.find((item) => item.id === catalogId);
}
