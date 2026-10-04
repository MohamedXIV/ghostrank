import type { HardwareCapability } from "@/content/hardware-catalog";
import { playerToolEffects } from "@/content/player-tool-catalog";
import {
  actionDurationFactor,
  combineCapabilities,
  combineFactors,
} from "@/content/software-catalog";
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
 * Combined multiplicative duration shortcut from every active modifier license
 * *and* every owned modifier tool. The factor composes across both sources
 * through `combineFactors`, floored once at 0.1 so neither automation nor a
 * resale tool can make work free; the one-minute floor belongs to P1.
 */
export function combinedActionDurationFactor(
  economy: EconomyState,
): number {
  const licenseFactor = actionDurationFactor(economy.software);
  const toolEffects = playerToolEffects(
    economy.playerTools.map((tool) => tool.catalogId),
  );

  return combineFactors([
    {
      kind: "modifier",
      discount: { kind: "action-duration", factor: licenseFactor },
    },
    ...toolEffects,
  ]);
}

