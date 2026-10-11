import type {
  UndergroundActor, WorldState,
} from "@/game/simulation/state/world-state";

/**
 * G5 P6: public, witnessed harm can recruit an NPC into another NPC's feud.
 *
 * The returned plans contain only vetted ACTUAL incident IDs and actors. The
 * existing underground relationship authority applies the delta, so this
 * pure finder never mutates the world or creates another simulation clock.
 */
export interface NpcSolidarityPlan {
  incidentId: string;
  witnessId: string;
  attackerId: string;
  defenderId: string;
}

export const SOLIDARITY_TRUST_THRESHOLD = 20;
export const SOLIDARITY_GRUDGE = 18;
export const SOLIDARITY_TRUST_LOSS = -4;
const TICK_MINUTES = 360;

/**
 * Only a real public success, physically held target, visible same-board
 * incident post and an already-trusting organizational colleague qualify.
 * Earlier posted rumors and attacker/victim's private omniscience do not.
 *
 * Exactly the PREVIOUS tick's posts are consumed here, once at the next
 * world boundary. The existing lastTickMinute cursor provides exactly-once
 * semantics across bulk waits and save/load; no extra save ledger.
 */
export function npcSolidarityPlans(
  world: Readonly<WorldState>,
  minute: number,
): NpcSolidarityPlan[] {
  if (world.ending ||
      (world.scenario !== "fresh-scene" && world.scenario !== "high-pressure") ||
      !Number.isSafeInteger(minute) || minute < TICK_MINUTES * 2 ||
      minute % TICK_MINUTES !== 0) return [];

  const underground = world.underground;
  if (!underground.organizations?.length || !underground.forumPosts.length) return [];

  const previousMinute = minute - TICK_MINUTES;
  const processed = new Set<string>();
  const plans: NpcSolidarityPlan[] = [];

  // Historical forum posts are append-chronological. No long-run full-history
  // scan: only posts published on the preceding tick can inform this action.
  for (let i = underground.forumPosts.length - 1; i >= 0; i--) {
    const post = underground.forumPosts[i]!;
    if (post.worldMinute < previousMinute) break;
    if (post.worldMinute !== previousMinute ||
        post.subject.kind !== "incident" ||
        processed.has(post.subject.id)) continue;

    const incident = underground.incidents.find(entry =>
      entry.id === post.subject.id &&
      entry.worldMinute === previousMinute &&
      entry.public && entry.kind === "npc-intrusion" &&
      entry.outcome === "succeeded");
    if (!incident) continue;
    const attacker = underground.actors.find(a => a.id === incident.actorId);
    const defender = underground.actors.find(a => a.id === incident.counterpartId);
    if (!attacker?.organizationId || !defender?.organizationId ||
        defender.id === attacker.id || defender.network !== post.board ||
        !defender.targetId || !attacker.targetId ||
        !world.targets.some(t => t.id === defender.targetId &&
          t.organizationId === defender.organizationId) ||
        !world.targets.some(t => t.id === attacker.targetId &&
          t.organizationId === attacker.organizationId)) continue;

    const org = underground.organizations.find(o => o.id === defender.organizationId);
    if (!org?.rivalIds.includes(attacker.organizationId)) continue;
    const author = underground.actors.find(a => a.id === post.authorId);
    if (!author || author.network !== post.board ||
        author.id === attacker.id || author.id === defender.id) continue;

    const candidates = underground.actors
      .filter(peer => peer.id !== defender.id && peer.id !== attacker.id &&
        peer.organizationId === defender.organizationId &&
        peer.network === post.board)
      .map(peer => ({
        peer, trust: underground.relationships.find(rel =>
          rel.fromId === peer.id && rel.toId === defender.id)?.trust ?? 0,
      }))
      .filter(item => item.trust >= SOLIDARITY_TRUST_THRESHOLD)
      .sort((a, b) => b.trust - a.trust ||
        a.peer.id.localeCompare(b.peer.id));

    const witness: UndergroundActor | undefined = candidates[0]?.peer;
    if (!witness) continue;
    processed.add(post.subject.id);

    plans.push({
      incidentId: incident.id, witnessId: witness.id,
      attackerId: attacker.id, defenderId: defender.id,
    });
  }

  // Stable ordering is independent of the arbitrary forum page/order once
  // validated. Only one witness for an incident, even across two boards/posts.
  return plans.sort((a, b) => a.incidentId.localeCompare(b.incidentId));
}
