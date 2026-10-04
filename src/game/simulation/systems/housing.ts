import { findHousingItem } from "@/content/housing-catalog";
import { softwareCapability } from "@/content/software-catalog";
import { derivePlayerToolCapability } from "@/game/simulation/systems/tools";
import type { HardwareCapability } from "@/content/hardware-catalog";
import { deriveRigCapability } from "@/game/simulation/systems/hardware";
import type { EconomyState } from "@/game/simulation/state/world-state";

const EMPTY_CAPABILITY: HardwareCapability = {
  compute: 0,
  memory: 0,
  vram: 0,
  storage: 0,
  network: 0,
};

function addCapability(
  left: HardwareCapability,
  right: HardwareCapability,
): HardwareCapability {
  return {
    compute: left.compute + right.compute,
    memory: left.memory + right.memory,
    vram: left.vram + right.vram,
    storage: left.storage + right.storage,
    network: left.network + right.network,
  };
}

/**
 * A held lease contributes capability to the rig: connectivity, bench space and
 * power. This is what makes housing show up as faster and wider work (P1/P2) —
 * capability flows into the same derived profile upgrades already feed. Holding
 * no lease (or an unpayable one you have been moved out of) is the free
 * baseline that adds nothing; it never subtracts, so housing is a lift, never a
 * gate or a punishment.
 */
export function deriveLeaseCapability(economy: EconomyState): HardwareCapability {
  if (!economy.housing) {
    return { ...EMPTY_CAPABILITY };
  }

  const item = findHousingItem(economy.housing);

  if (!item) {
    return { ...EMPTY_CAPABILITY };
  }

  return { ...item.capability };
}

/**
 * Capability contributed by active software licenses that model raw
 * capability (monitoring suites, automation frameworks). Licenses whose effect
 * is an efficiency modifier contribute nothing here and instead shorten action
 * durations through `actionDurationFactor`. Deriving keeps the baseline — no
 * licenses — exactly the hardware-plus-lease profile of P3.
 */
export function deriveSoftwareCapability(
  economy: EconomyState,
): HardwareCapability {
  return softwareCapability(economy.software);
}

/**
 * The capability that actually powers action speed and workload breadth: the
 * sum of owned hardware, the current lease, capability-bearing licenses, and
 * owned player tools. Derived, never stored. Each added layer is identity for
 * the empty case, so a bare rig stays exactly the hardware profile of P1/P2.
 */
export function effectiveCapability(economy: EconomyState): HardwareCapability {
  return addCapability(
    addCapability(
      addCapability(
        deriveRigCapability(economy),
        deriveLeaseCapability(economy),
      ),
      deriveSoftwareCapability(economy),
    ),
    derivePlayerToolCapability(economy),
  );
}
