import type {
  TargetState,
  UndergroundActor,
  UndergroundOrganization,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Organizations in generated scenes (Game-First G2, #78; D066).
 *
 * An organization is a hidden simulation entity with a public name. Its agenda
 * is read by three decisions, and only these three:
 * - `expand`: members offer contracts more often;
 * - `undercut`: members commission work against their rivals' infrastructure;
 * - `defend`: members resist intrusion better.
 *
 * Every helper returns the neutral value (no bonus, no rival targets) when the
 * world has no organizations, so the authored canonical roster and every
 * pre-G2 save behave exactly as before. Rank is never read here.
 */

/** Percentage points added to a member's contract offer rate under `expand`. */
export const EXPAND_OFFER_BONUS_PERCENT = 15;

/** Defence points a member gains against intrusion under `defend`. */
export const DEFEND_DEFENSE_BONUS = 10;

export function organizationById(
  world: WorldState,
  id: string | undefined,
): UndergroundOrganization | undefined {
  if (id === undefined) {
    return undefined;
  }

  return world.underground.organizations?.find((entry) => entry.id === id);
}

export function organizationOfActor(
  world: WorldState,
  actor: Pick<UndergroundActor, "organizationId">,
): UndergroundOrganization | undefined {
  return organizationById(world, actor.organizationId);
}

/** Percentage points added to an issuer's offer rate: `expand` members offer more. */
export function offerRateBonus(
  world: WorldState,
  issuer: Pick<UndergroundActor, "organizationId">,
): number {
  return organizationOfActor(world, issuer)?.agenda === "expand"
    ? EXPAND_OFFER_BONUS_PERCENT
    : 0;
}

/** Defence points an actor gains against intrusion from its organization's agenda. */
export function defenseBonusOf(
  world: WorldState,
  actor: Pick<UndergroundActor, "organizationId">,
): number {
  return organizationOfActor(world, actor)?.agenda === "defend"
    ? DEFEND_DEFENSE_BONUS
    : 0;
}

/**
 * Targets an `undercut` issuer's rivals own. Empty for every other agenda and
 * for independent issuers, so the caller falls back to its general pool.
 */
export function rivalTargetsFor(
  world: WorldState,
  issuer: Pick<UndergroundActor, "organizationId">,
  targets: readonly TargetState[],
): TargetState[] {
  const organization = organizationOfActor(world, issuer);

  if (organization?.agenda !== "undercut") {
    return [];
  }

  return targets.filter(
    (target) =>
      target.organizationId !== undefined &&
      organization.rivalIds.includes(target.organizationId),
  );
}

/**
 * Targets an issuer may offer work against: everything except its own target
 * and, for a member, the infrastructure of its own organization. An independent
 * issuer loses nothing, so the authored roster sees every target it saw before.
 */
export function offerableTargetsFor(
  issuer: Pick<UndergroundActor, "targetId" | "organizationId">,
  targets: readonly TargetState[],
): TargetState[] {
  return targets.filter(
    (target) =>
      target.id !== issuer.targetId &&
      (issuer.organizationId === undefined ||
        target.organizationId !== issuer.organizationId),
  );
}


/** G5 P5 TDD RED: peer warning support is not implemented yet. */
export function peerWarningDefenseBonus(
  _world: WorldState,
  _defender: UndergroundActor,
  _worldMinute: number,
): number {
  return 0;
}
