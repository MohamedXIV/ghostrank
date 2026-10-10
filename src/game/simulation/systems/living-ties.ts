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

/**
 * Public faction grievance can affect new commissions for 72 in-game hours.
 * This is history of an actual broker's published, completed contract, not
 * private incident truth or an omniscient faction mood meter.
 */
export const COUNTER_COMMISSION_MEMORY_MINUTES = 72 * 60;
export const COUNTER_COMMISSION_OFFER_BONUS_PERCENT = 20;
export const COUNTER_COMMISSION_TARGET_WEIGHT = 40;

/**
 * Organizations a broker's faction has a publicly evidenced reason to target.
 *
 * Only same-board authored posts with their real stored completed contract
 * count. The owner whose assets were commissioned must have actually seen
 * that post (same network) and now grudge the named publishing broker.
 * The contract issuer can share this source because they, too, are on the
 * same board AND in the victim owner's organization. No secret channels.
 *
 * Past the bounded memory window the existing personal grudge still exists,
 * but it is no longer a shared *fresh counter-commission* opportunity.
 */
export function factionCounterCommissionTargets(
  world: WorldState,
  issuer: UndergroundActor,
  worldMinute: number,
): ReadonlySet<string> {
  const victimOrg = organizationOfActor(world, issuer);
  const result = new Set<string>();
  if (!victimOrg || !Number.isInteger(worldMinute) || worldMinute < 0) return result;

  const posts = world.underground.forumPosts;
  for (let i = posts.length - 1; i >= 0; i--) {
    const post = posts[i]!;
    if (post.worldMinute > worldMinute) continue;
    if (worldMinute - post.worldMinute > COUNTER_COMMISSION_MEMORY_MINUTES) break;
    if (post.subject.kind !== "contract" || post.board !== issuer.network) continue;

    const contract = world.underground.contracts.find(c =>
      c.id === post.subject.id && c.status === "completed" &&
      c.resolvedWorldMinute === post.worldMinute);
    if (!contract) continue;

    const commissioned = world.targets.find(t => t.id === contract.targetId);
    if (!commissioned || commissioned.organizationId !== victimOrg.id) continue;
    const harmedOwner = ownerOfTarget(world, commissioned);
    if (!harmedOwner || harmedOwner.network !== post.board ||
        harmedOwner.organizationId !== victimOrg.id) continue;

    const publisher = world.underground.actors.find(a => a.id === post.authorId);
    if (!publisher || publisher.id !== contract.issuerId ||
        !publisher.organizationId ||
        !victimOrg.rivalIds.includes(publisher.organizationId)) continue;
    if (grudgeBetween(world, harmedOwner.id, publisher.id) <= 0) continue;

    result.add(publisher.organizationId);
  }
  return result;
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
  publicCounterTargets: ReadonlySet<string> = new Set<string>(),
): number {
  return (
    BASE_STANDING_WEIGHT +
    (owner === undefined ? 0 : grudgeBetween(world, issuer.id, owner.id)) +
    (rivalOf(world, issuer, target.organizationId) ? RIVAL_WEIGHT : 0) +
    (target.organizationId !== undefined && publicCounterTargets.has(target.organizationId)
      ? COUNTER_COMMISSION_TARGET_WEIGHT : 0)
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
