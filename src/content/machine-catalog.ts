/**
 * Machines are the *complete boxes* of the hardware layer: where a P0 component
 * (a CPU, a NIC) upgrades one axis of a rig you already have, a machine is a
 * whole named system you buy outright — a secondhand workstation is the starter
 * baseline, and beyond it sit dedicated rigs with their own profiles. You own
 * as many as you can afford, you can rename any of them to something you'll
 * recognise later, and you can sell one back through the same offline fence as
 * tools. Like every Phase 4 layer, machines are a *lift*, never a gate: the
 * free baseline contributes zero capability, and the whole inventory simply
 * folds into the same effective profile P1 speed and P2 breadth already read.
 *
 * The economics mirror P5 tools (property, not rent): a one-time debit to the
 * `market`, no recurring fee, and a resale that returns a fraction of what was
 * actually *paid* — so retuning the catalog never re-values a box already in a
 * player's rack. A machine's *label* is player-authored (renameable) while its
 * capability derives from the catalog id; both the paid price and the chosen
 * label are stored so provenance and identity survive later tuning.
 */

import type { HardwareCapability } from "@/content/hardware-catalog";

export interface MachineListing {
  id: string;
  label: string;
  cost: number;
  capability: HardwareCapability;
  /**
   * Phase 7 P6 content tag. The simulation decides whether rare stock is
   * currently available; the catalog remains pure data.
   */
  exotic?: boolean;
}

export const MACHINE_CATALOG: readonly MachineListing[] = [
  {
    id: "box-burner",
    label: "Burner Laptop",
    cost: 600,
    capability: { compute: 1, memory: 1, vram: 0, storage: 1, network: 1 },
  },
  {
    id: "box-analysis-node",
    label: "Analysis Node",
    cost: 1_500,
    capability: { compute: 4, memory: 3, vram: 0, storage: 2, network: 1 },
  },
  {
    id: "box-attack-cluster",
    label: "Attack Cluster",
    cost: 2_400,
    capability: { compute: 6, memory: 4, vram: 3, storage: 2, network: 2 },
  },
  {
    id: "box-silent-proxy",
    label: "Silent Proxy Box",
    cost: 1_100,
    capability: { compute: 1, memory: 2, vram: 0, storage: 3, network: 4 },
  },
  {
    id: "box-annealing-rack",
    label: "Cryogenic Annealing Rack",
    cost: 4_500,
    // P6 deliberately avoids compute/network. It widens discovery and gives
    // local AI/builds more memory/VRAM/storage headroom, but it cannot become a
    // universal operation-speed or success button.
    capability: { compute: 0, memory: 8, vram: 5, storage: 4, network: 0 },
    exotic: true,
  },
];

/** Fraction of the purchase price recovered when a machine is resold. */
export const MACHINE_RESALE_RATE = 0.5;

/**
 * Upper bound on a player-chosen machine label. Player text that lands in the
 * save needs a ceiling; labels are display names, not content, so a short cap
 * is enough and keeps any single value bounded.
 */
export const MACHINE_LABEL_MAX_LENGTH = 24;

export function findMachineItem(
  machineId: string,
): MachineListing | undefined {
  return MACHINE_CATALOG.find((item) => item.id === machineId);
}

/**
 * Credits recovered when reselling an owned machine: a fixed fraction of what
 * was actually paid, floored to whole credits, so resale never re-values
 * inventory against current catalog tuning.
 */
export function machineResaleValue(paidCost: number): number {
  return Math.floor(paidCost * MACHINE_RESALE_RATE);
}

/**
 * The capability contributed by one owned machine. Unknown catalog ids
 * contribute nothing, so a stale save reference is inert rather than broken.
 */
export function machineCapabilityOf(
  catalogId: string,
): HardwareCapability | null {
  const item = findMachineItem(catalogId);
  return item ? { ...item.capability } : null;
}
