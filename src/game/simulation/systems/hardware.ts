import {
  findCatalogItem,
  type HardwareCapability,
} from "@/content/hardware-catalog";
import { machineCapabilityOf } from "@/content/machine-catalog";
import type { EconomyState } from "@/game/simulation/state/world-state";

export type { HardwareCapability };

const EMPTY_CAPABILITY: HardwareCapability = {
  compute: 0,
  memory: 0,
  vram: 0,
  storage: 0,
  network: 0,
};

/**
 * The player's rig capability is the sum of every owned item's capability.
 * Derived and never stored. Owning more hardware never gates a target: it only
 * changes capability, which later systems (compute budgeting, builds) read.
 */
export function deriveRigCapability(economy: EconomyState): HardwareCapability {
  return economy.hardware.reduce<HardwareCapability>((total, owned) => {
    const item = findCatalogItem(owned.catalogId);

    if (!item) {
      return total;
    }

    return {
      compute: total.compute + item.capability.compute,
      memory: total.memory + item.capability.memory,
      vram: total.vram + item.capability.vram,
      storage: total.storage + item.capability.storage,
      network: total.network + item.capability.network,
    };
  }, { ...EMPTY_CAPABILITY });
}

/**
 * The combined capability of every owned machine (complete named boxes). This
 * is the P7 layer of the hardware model: machines fold into the same effective
 * profile components do, so they feed P1 speed and P2 breadth with no new
 * mechanics. An empty inventory contributes exactly zero — the untouched
 * baseline — so machines are a lift, never a gate.
 */
export function deriveMachineCapability(
  economy: EconomyState,
): HardwareCapability {
  return economy.ownedMachines.reduce<HardwareCapability>((total, owned) => {
    const capability = machineCapabilityOf(owned.catalogId);

    if (!capability) {
      return total;
    }

    return {
      compute: total.compute + capability.compute,
      memory: total.memory + capability.memory,
      vram: total.vram + capability.vram,
      storage: total.storage + capability.storage,
      network: total.network + capability.network,
    };
  }, { ...EMPTY_CAPABILITY });
}
