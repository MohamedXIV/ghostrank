import type { UndergroundActor } from "@/game/simulation/state/world-state";

/**
 * Temperament in generated scenes (Game-First G2, #78; D068). A generated hacker's
 * personality changes what it does, not just its numbers:
 * - aggression adds to the chance it acts on a tick (more intrusions);
 * - caution adds to its discretion (its incidents surface less often);
 * - greed adds to its contract offer rate (more work offered);
 * - a fixer deals with the player from zero trust, as a contact and as an issuer.
 *
 * An actor with no temperament (the authored roster, every pre-G2 save) gets
 * exactly zero from each helper, so its arithmetic is unchanged. Rank is never read.
 */

/**
 * The trust a fixer needs before it deals with the player. Zero: a fixer deals
 * with anyone who is not hostile to it, so black fixers, who start at zero,
 * offer work from the first day. Every other actor keeps the base threshold.
 */
export const FIXER_CONTACT_TRUST = 0;

/** Points added to the chance of acting on a tick, from aggression. */
export function activityBonus(actor: Pick<UndergroundActor, "temperament">): number {
  return (actor.temperament?.aggression ?? 0) / 10;
}

/** Points added to the discretion an incident is judged against, from caution. */
export function cautionBonus(actor: Pick<UndergroundActor, "temperament">): number {
  return (actor.temperament?.caution ?? 0) / 10;
}

/** Points added to an issuer's offer rate, from greed. */
export function greedBonus(actor: Pick<UndergroundActor, "temperament">): number {
  return (actor.temperament?.greed ?? 0) / 10;
}

/** The trust an actor needs in the player before it deals with them. */
export function contactTrustThreshold(
  actor: Pick<UndergroundActor, "hackerArchetype">,
  base: number,
): number {
  return actor.hackerArchetype === "fixer" ? FIXER_CONTACT_TRUST : base;
}
