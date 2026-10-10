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


/**
 * G5 P5: the informed defence of a target owner after a verifiable, same-board
 * public rival incident. Existing directed trust is the collaboration contract:
 * an ally who trusts the owner may temporarily lend defensive expertise.
 *
 * No new AI tick, group health, hidden knowledge transfer or RNG state. A new
 * public report alone is NOT enough; the owner must see its own network's
 * earlier forum discussion and have a genuinely trusted co-organizational peer.
 */
export const PEER_WARNING_MEMORY_MINUTES = 24 * 60;
export const PEER_WARNING_TRUST_THRESHOLD = 20;
export const PEER_WARNING_DEFENSE_CAP = 8;

export function peerWarningDefenseBonus(
  world: WorldState,
  defender: UndergroundActor,
  worldMinute: number,
): number {
  if (world.ending || !Number.isInteger(worldMinute) || worldMinute < 0 ||
      defender.targetId === undefined || defender.organizationId === undefined) return 0;

  const organization = organizationOfActor(world, defender);
  if (!organization ||
      !world.targets.some(t =>
        t.id === defender.targetId && t.organizationId === organization.id)) return 0;

  // Cheap eligibility first. Most organizations have no same-board trusted
  // helper, so avoid rescanning the entire forum during long-run world probes.
  // One strongest qualified helper prevents unbounded stacking in big crews.
  let bonus = 0;
  for (const peer of world.underground.actors) {
    if (peer.id === defender.id || peer.organizationId !== organization.id ||
        peer.network !== defender.network) continue;
    const relationship = world.underground.relationships.find(r =>
      r.fromId === peer.id && r.toId === defender.id);
    if ((relationship?.trust ?? 0) < PEER_WARNING_TRUST_THRESHOLD) continue;
    bonus = Math.max(bonus, Math.min(
      PEER_WARNING_DEFENSE_CAP, Math.floor(peer.defense / 10),
    ));
  }
  if (bonus === 0) return 0;

  // Require an actual prior public incident AND a corresponding forum report
  // on the owner's network. Posts are append-chronological world events:
  // scan newest-first, stopping at the 24-hour horizon even after a 30d run.
  const posts = world.underground.forumPosts;
  for (let index = posts.length - 1; index >= 0; index--) {
    const post = posts[index]!;
    if (worldMinute - post.worldMinute > PEER_WARNING_MEMORY_MINUTES) break;
    if (post.subject.kind !== "incident" || post.board !== defender.network ||
        post.worldMinute >= worldMinute) continue;
    const author = world.underground.actors.find(a => a.id === post.authorId);
    if (author?.network !== post.board) continue;
    const incident = world.underground.incidents.find(i =>
      i.id === post.subject.id && i.public &&
      i.worldMinute === post.worldMinute &&
      i.counterpartId === defender.id);
    if (!incident) continue;
    const attacker = world.underground.actors.find(a => a.id === incident.actorId);
    if (attacker?.organizationId !== undefined &&
        organization.rivalIds.includes(attacker.organizationId)) return bonus;
  }
  return 0;
}
