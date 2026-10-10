import type { WorldState } from "@/game/simulation/state/world-state";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { actionDuration, type ReconAction } from "@/game/simulation/systems/compute";
import { discoveryScope } from "@/game/simulation/systems/scale";
import { combinedActionDurationFactor } from "@/game/simulation/systems/tools";

/**
 * What a recon action costs on the player's rig, in game minutes (Phase 5 P1,
 * P3). The command bus charges this, and the Nightshade briefing previews the
 * same number, so the two can never disagree.
 */
export function rigActionMinutesFor(
  world: WorldState,
  action: ReconAction,
): number {
  // Phase 5 P1: the rig's vram/storage pool contends a running local model,
  // so the duration factor is read against the same derived pool. Phase 5
  // P3: in-flight builds are tenants of that pool too, and their footprint
  // taxes the model's delivered shortcut while they run.
  const capability = effectiveCapability(world.economy);

  return actionDuration(
    action,
    capability,
    combinedActionDurationFactor(world.economy, capability, world.builds),
  );
}

/** How many machines or services one survey or inspection can reveal (Phase 5). */
export function rigDiscoveryScopeFor(world: WorldState): number {
  return discoveryScope(effectiveCapability(world.economy).memory);
}
