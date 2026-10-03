import {
  findCatalogItem,
  type HardwareCapability,
} from "@/content/hardware-catalog";
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
