import { DEFAULT_RUN_SCENARIO } from "@/game/simulation/state/run-scenario";
import type {
  TargetState,
  UndergroundActor,
  WorldState,
} from "@/game/simulation/state/world-state";
import { organizationOfActor } from "@/game/simulation/systems/organizations";

/**
 * Living ties in generated scenes (Game-First G2, #78; D067).
 *
 * Until G2, an actor chose its intrusion counterpart and a contract its target
 * uniformly, and ties only recorded the outcome. In a generated scene the same
 * choices are weighted by standing: who an actor holds a grudge against, and
 * which organization is its rival. A victim's grudge therefore becomes work
 * against its attacker, and rivals fight each other more often. Under an
 * active `undercut` agenda, peers are more likely to raid rival infrastructure.
 * When the organization reacts to a rival breach by switching to `defend`,
 * that additional offensive focus ends immediately; recovery reinstates it.
 *
 * The authored canonical roster keeps the uniform choices exactly, so every
 * canonical and pre-G2 save plays as before. Rank is never read here.
 */

/** Weight every candidate starts with, before standing is added. */
export const BASE_STANDING_WEIGHT = 10;

/** Extra weight for a member of, or infrastructure held by, a rival organization. */
export const RIVAL_WEIGHT = 20;

/** Additional *NPC intrusion* focus against rivals under an active undercut agenda. */
export const UNDERCUT_RIVAL_RAID_WEIGHT = 60;

/** G5 P4 TDD RED: generated contracts do not yet inherit public faction grievance. */
export function factionCounterCommissionTargets(
  _world: WorldState,
  _issuer: UndergroundActor,
  _worldMinute: number,
): ReadonlySet<string> {
  return new Set<string>();
}


/** Generated scenes use the living rules. A save with no scene is canonical (D065). */
export function usesLivingTies(world: WorldState): boolean {
  return (world.scenario ?? DEFAULT_RUN_SCENARIO) !== "canonical";
}

function grudgeBetween(world: WorldState, fromId: string, toId: string): number {
  return (
    world.underground.relationships.find(
      (entry) => entry.fromId === fromId && entry.toId === toId,
    )?.grudge ?? 0
  );
}

function rivalOf(
  world: WorldState,
  actor: Pick<UndergroundActor, "organizationId">,
  organizationId: string | undefined,
): boolean {
  const organization = organizationOfActor(world, actor);

  return (
    organizationId !== undefined &&
    organization !== undefined &&
    organization.rivalIds.includes(organizationId)
  );
}

/** How likely `actor` is to pick `other` as the counterpart of an intrusion. */
export function counterpartWeight(
  world: WorldState,
  actor: UndergroundActor,
  other: UndergroundActor,
): number {
  const isRival = rivalOf(world, actor, other.organizationId);
  // Existing hash draw, grudge, and standing remain authoritative.
  // No separate NPC decision loop or random source: undercut only shifts the
  // candidate weights, and never blocks a personally motivated non-rival raid.
  const undercutFocus = isRival && organizationOfActor(world, actor)?.agenda === "undercut";
  return (
    BASE_STANDING_WEIGHT +
    grudgeBetween(world, actor.id, other.id) +
    (isRival ? RIVAL_WEIGHT : 0) +
    (undercutFocus ? UNDERCUT_RIVAL_RAID_WEIGHT : 0)
  );
}

/**
 * How likely `issuer` is to commission work against `target`: the grudge it holds
 * against the target's owner, and whether the target is a rival organization's.
 */
export function offerTargetWeight(
  world: WorldState,
  issuer: UndergroundActor,
  target: TargetState,
  owner: UndergroundActor | undefined,
): number {
  return (
    BASE_STANDING_WEIGHT +
    (owner === undefined ? 0 : grudgeBetween(world, issuer.id, owner.id)) +
    (rivalOf(world, issuer, target.organizationId) ? RIVAL_WEIGHT : 0)
  );
}

/** The owner actor of a target, or undefined when no actor holds it. */
export function ownerOfTarget(
  world: WorldState,
  target: TargetState,
): UndergroundActor | undefined {
  return world.underground.actors.find((actor) => actor.targetId === target.id);
}

/**
 * Picks one item with probability proportional to its weight. `point` is a
 * seeded draw in [0, 1), so the same draw always picks the same item.
 */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  point: number,
): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let remaining = point * total;

  for (let index = 0; index < items.length; index += 1) {
    const weight = weights[index]!;

    if (remaining < weight) {
      return items[index]!;
    }

    remaining -= weight;
  }

  return items[items.length - 1]!;
}
