import {
  LANDLORD_COUNTERPARTY,
  findHousingItem,
} from "@/content/housing-catalog";
import type { HardwareCapability } from "@/content/hardware-catalog";
import { transferValue } from "@/game/simulation/systems/economy";
import { deriveRigCapability } from "@/game/simulation/systems/hardware";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { EconomyState, WorldState } from "@/game/simulation/state/world-state";

const DAY_MINUTES = 24 * 60;

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
 * The capability that actually powers action speed and workload breadth: the
 * sum of owned hardware and the current lease. Derived, never stored.
 */
export function effectiveCapability(economy: EconomyState): HardwareCapability {
  return addCapability(
    deriveRigCapability(economy),
    deriveLeaseCapability(economy),
  );
}

/**
 * Charge housing upkeep for every whole world day crossed between two minutes.
 * Rent is levied at fixed day boundaries, so splitting a wait charges the same
 * set of boundaries and the totals match: deterministic and split-invariant.
 * If a boundary cannot be paid the player simply loses the lease (back to the
 * free baseline) and no charge is made — credits never go negative, there is no
 * debt and no penalty beyond returning to baseline capability.
 */
export function advanceUpkeep(
  world: WorldState,
  fromMinute: number,
  toMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  if (!world.economy.housing) {
    return events;
  }

  const item = findHousingItem(world.economy.housing);

  if (!item) {
    return events;
  }

  const startDay = Math.floor(fromMinute / DAY_MINUTES);
  const endDay = Math.floor(toMinute / DAY_MINUTES);

  for (let day = startDay + 1; day <= endDay; day += 1) {
    const boundary = day * DAY_MINUTES;
    const charge = transferValue(world, {
      direction: "debit",
      amount: item.dailyCost,
      causeKind: "upkeep",
      causeId: item.id,
      counterparty: LANDLORD_COUNTERPARTY,
      worldMinute: boundary,
    });

    if (!charge) {
      world.economy.housing = null;
      events.push({
        type: "HousingChanged",
        housingId: null,
        dailyCost: 0,
        worldMinute: boundary,
      });
      break;
    }

    events.push(charge);
  }

  return events;
}
