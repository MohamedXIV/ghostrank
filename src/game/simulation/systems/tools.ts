import type { HardwareCapability } from "@/content/hardware-catalog";
import { findModelItem } from "@/content/model-catalog";
import { playerToolEffects } from "@/content/player-tool-catalog";
import {
  actionDurationFactor,
  combineCapabilities,
  combineFactors,
  type SoftwareEffect,
} from "@/content/software-catalog";
import { contestedModelFactor } from "@/game/simulation/systems/contention";
import type { EconomyState } from "@/game/simulation/state/world-state";

/**
 * Owned player tools and rented licenses share one effect language, so the rig
 * reads them through a single combined layer. These helpers reuse the exact
 * combinators P4 introduced for licenses; with no owned tools both return
 * identity (zero capability, factor 1), so the hardware-plus-lease baseline of
 * P3 — and the license behaviour of P4 — stay untouched.
 */

/** Capability contributed by owned tools alone. */
export function derivePlayerToolCapability(
  economy: EconomyState,
): HardwareCapability {
  const effects = playerToolEffects(
    economy.playerTools.map((tool) => tool.catalogId),
  );

  return combineCapabilities(effects);
}

/**
 * Combined multiplicative duration shortcut from every active modifier license,
 * every owned modifier tool, and the running model (Phase 5). The factor
 * composes across all sources through `combineFactors`, floored once at 0.1 so
 * neither automation, a resale tool, nor an AI assistant can make work free;
 * the one-minute floor belongs to P1. No model running — the baseline — adds
 * exactly nothing, so pre-Phase-5 durations are untouched.
 *
 * When a `pool` is passed (the derived rig capability), the running model's
 * shortcut is first reduced by *contention* (Phase 5 P1): a local model only
 * delivers its advertised speed to the extent the rig's VRAM and storage cover
 * its footprint, and a starved one drifts toward ×1 — the no-model baseline —
 * never below it. A cloud model has a zero footprint, so it is never contended
 * by the player's own rig. With no `pool`, or no model running, the factor is
 * exactly the licenses × tools × catalog-model composition of P0, so every
 * existing caller and test is untouched.
 */
export function combinedActionDurationFactor(
  economy: EconomyState,
  pool?: HardwareCapability,
): number {
  const licenseFactor = actionDurationFactor(economy.software);
  const toolEffects = playerToolEffects(
    economy.playerTools.map((tool) => tool.catalogId),
  );

  const model = economy.activeModel
    ? findModelItem(economy.activeModel)
    : undefined;
  const modelEffects: SoftwareEffect[] = [];

  if (model && model.effect.kind === "modifier") {
    const catalogFactor = model.effect.discount.factor;
    const delivered = pool
      ? contestedModelFactor(catalogFactor, model.footprint, pool)
      : catalogFactor;

    if (delivered < 1) {
      modelEffects.push({
        kind: "modifier",
        discount: { kind: "action-duration", factor: delivered },
      });
    }
  }

  return combineFactors([
    {
      kind: "modifier",
      discount: { kind: "action-duration", factor: licenseFactor },
    },
    ...toolEffects,
    ...modelEffects,
  ]);
}

