import { LANDLORD_COUNTERPARTY, findHousingItem } from "@/content/housing-catalog";
import { PROVIDER_COUNTERPARTY, findModelItem } from "@/content/model-catalog";
import {
  VENDOR_COUNTERPARTY,
  findSoftwareItem,
} from "@/content/software-catalog";
import { transferValue } from "@/game/simulation/systems/economy";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

const DAY_MINUTES = 24 * 60;

/**
 * Charge every recurring obligation — the housing lease, each active software
 * license, and a running cloud model's subscription — for every whole world day
 * crossed between two minutes. Fees are levied at fixed day boundaries, so
 * splitting a wait charges the same set of boundaries in the same order:
 * deterministic and split-invariant.
 *
 * Each obligation is all-or-nothing at a boundary. A housing fee that cannot
 * be paid moves the player out (back to the free baseline); a license fee that
 * cannot be paid lapses just that one license; a cloud subscription that cannot
 * be paid stops the model. Nothing is charged for a failed bill, credits never
 * go negative, and there is no debt — the only consequence is losing the lift,
 * never a punishment.
 */
export function advanceUpkeep(
  world: WorldState,
  fromMinute: number,
  toMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  if (
    !world.economy.housing &&
    world.economy.software.length === 0 &&
    !world.economy.activeModel
  ) {
    return events;
  }

  const startDay = Math.floor(fromMinute / DAY_MINUTES);
  const endDay = Math.floor(toMinute / DAY_MINUTES);

  for (let day = startDay + 1; day <= endDay; day += 1) {
    const boundary = day * DAY_MINUTES;

    if (world.economy.housing) {
      const item = findHousingItem(world.economy.housing);

      if (item) {
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
        } else {
          events.push(charge);
        }
      }
    }

    for (const softwareId of [...world.economy.software]) {
      const item = findSoftwareItem(softwareId);

      if (!item) {
        continue;
      }

      const charge = transferValue(world, {
        direction: "debit",
        amount: item.dailyCost,
        causeKind: "license",
        causeId: item.id,
        counterparty: VENDOR_COUNTERPARTY,
        worldMinute: boundary,
      });

      if (!charge) {
        world.economy.software = world.economy.software.filter(
          (candidate) => candidate !== item.id,
        );
        events.push({
          type: "SoftwareChanged",
          softwareId: item.id,
          active: false,
          dailyCost: 0,
          worldMinute: boundary,
        });
      } else {
        events.push(charge);
      }
    }

    // The model bills last: a running *cloud* subscription is a daily fee like
    // a license, while a *local* model owns its copy outright and bills
    // nothing, so it is skipped rather than charged zero.
    if (world.economy.activeModel) {
      const item = findModelItem(world.economy.activeModel);

      if (item && item.dailyCost > 0) {
        const charge = transferValue(world, {
          direction: "debit",
          amount: item.dailyCost,
          causeKind: "model",
          causeId: item.id,
          counterparty: PROVIDER_COUNTERPARTY,
          worldMinute: boundary,
        });

        if (!charge) {
          // The subscription lapsed: the model stops with no debt and no
          // penalty beyond losing its speed, exactly like an unpayable license.
          world.economy.activeModel = null;
          events.push({
            type: "ModelChanged",
            modelId: item.id,
            active: false,
            source: item.source,
            dailyCost: 0,
            worldMinute: boundary,
          });
        } else {
          events.push(charge);
        }
      }
    }
  }

  return events;
}

/**
 * Total credits the held lease, every active license, and a running cloud
 * subscription bill per world day. A local model contributes nothing — running
 * owned property bills no fee — and no model at all is the untouched baseline.
 */
export function recurringDailyCost(
  housingId: string | null,
  softwareIds: readonly string[],
  activeModelId: string | null = null,
): number {
  const housing = housingId ? findHousingItem(housingId) : undefined;

  const licenses = softwareIds.reduce((sum, id) => {
    const item = findSoftwareItem(id);
    return sum + (item?.dailyCost ?? 0);
  }, 0);

  const model = activeModelId ? findModelItem(activeModelId) : undefined;

  return (housing?.dailyCost ?? 0) + licenses + (model?.dailyCost ?? 0);
}
