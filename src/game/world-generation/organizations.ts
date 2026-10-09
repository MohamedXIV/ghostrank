import {
  ORGANIZATION_NAME_HEADS,
  ORGANIZATION_NAME_TAILS,
  type ScenarioSpec,
} from "@/content/world-scenarios";
import { draw, percent, pickWeighted } from "@/game/world-generation/draw";
import {
  ORGANIZATION_AGENDAS,
  ORGANIZATION_MOTIVES,
  type TargetState,
  type UndergroundActor,
  type UndergroundOrganization,
} from "@/game/simulation/state/world-state";

/**
 * Procedural organizations for a generated scene (Game-First G2, #78;
 * GAME_FIRST_REBOOT §4). An organization is an identity with a name, a network,
 * a motive, an agenda, members who own targets, and rivals.
 *
 * Planning is pure and seeded, on the same named streams as the rest of the
 * generator. Owners are dealt across the organizations in a seeded order, so
 * every organization owns at least one target when there are enough owners.
 * Brokers belong to no organization: they are independent intermediaries.
 *
 * Rank is not an input. Names come from their own pool and never read a handle,
 * so reserving a player's name cannot change any organization.
 */

export interface OwnerRef {
  /** The owner actor's id. */
  id: string;
  /** The target that owner runs. Owners and targets share an id in the generator. */
  targetId: string;
}

const NAME_POOL: readonly string[] = ORGANIZATION_NAME_HEADS.flatMap((head) =>
  ORGANIZATION_NAME_TAILS.map((tail) => `${head} ${tail}`),
);

/** Organization ids are stable and readable: `org-1`, `org-2`, and so on. */
export function organizationId(index: number): string {
  return `org-${index + 1}`;
}

/**
 * Plans `spec.organizations` organizations for the owners. Every name is
 * distinct, folded for case, and comes from its own salted walk through the
 * pool.
 */
export function planOrganizations(
  seed: number,
  attempt: number,
  spec: ScenarioSpec,
  owners: readonly OwnerRef[],
): UndergroundOrganization[] {
  const count = spec.organizations;
  const names = pickOrganizationNames(seed, attempt, count);

  // Deal owners across organizations in a seeded order, then round-robin, so
  // membership is balanced and random at once.
  const dealOrder = owners
    .map((owner, index) => ({ owner, index, key: draw(seed, "org-deal", attempt, index) }))
    .sort((a, b) => a.key - b.key || a.index - b.index);
  const memberOf = new Map<string, number>();
  dealOrder.forEach(({ owner }, position) => {
    memberOf.set(owner.id, position % count);
  });

  const organizations: UndergroundOrganization[] = [];

  for (let index = 0; index < count; index += 1) {
    const members = owners.filter((owner) => memberOf.get(owner.id) === index);
    const network = percent(seed, attempt, "org-network", index) < spec.blackSharePercent
      ? "black"
      : "white";

    organizations.push({
      id: organizationId(index),
      name: names[index]!,
      network,
      motive: pickWeighted(spec.motiveWeights, draw(seed, attempt, "org-motive", index)),
      agenda: pickWeighted(spec.agendaWeights, draw(seed, attempt, "org-agenda", index)),
      memberIds: members.map((owner) => owner.id),
      targetIds: members.map((owner) => owner.targetId),
      rivalIds: [],
    });
  }

  // Rivalries are symmetric: each unordered pair is drawn once.
  for (let low = 0; low < count; low += 1) {
    for (let high = low + 1; high < count; high += 1) {
      if (percent(seed, attempt, "org-rival", low, high) >= spec.rivalryPercent) {
        continue;
      }

      organizations[low]!.rivalIds.push(organizationId(high));
      organizations[high]!.rivalIds.push(organizationId(low));
    }
  }

  return organizations;
}

function pickOrganizationNames(seed: number, attempt: number, count: number): string[] {
  const taken = new Set<string>();
  const names: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(draw(seed, "org-name", attempt, index) * NAME_POOL.length);
    let chosen: string | undefined;

    for (let step = 0; step < NAME_POOL.length && chosen === undefined; step += 1) {
      const candidate = NAME_POOL[(start + step) % NAME_POOL.length]!;

      if (!taken.has(candidate.toLowerCase())) {
        chosen = candidate;
      }
    }

    if (chosen === undefined) {
      throw new Error("Organization name pool is exhausted");
    }

    taken.add(chosen.toLowerCase());
    names.push(chosen);
  }

  return names;
}

/**
 * The first organization rule a candidate breaks, or null when all hold. A
 * candidate is accepted only when this returns null, so the rules here are the
 * contract the rest of the simulation may rely on.
 */
export function organizationRuleFailure(
  organizations: readonly UndergroundOrganization[],
  actors: readonly UndergroundActor[],
  targets: readonly TargetState[],
): string | null {
  const byId = new Map<string, UndergroundOrganization>();
  const names = new Set<string>();
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));

  for (const org of organizations) {
    if (org.id.trim() === "" || byId.has(org.id)) {
      return `organization id ${org.id} is empty or duplicated`;
    }
    byId.set(org.id, org);

    const folded = org.name.trim().toLowerCase();
    if (folded === "" || names.has(folded)) {
      return `organization ${org.id} has an empty or duplicate name`;
    }
    names.add(folded);

    if (!(ORGANIZATION_MOTIVES as readonly string[]).includes(org.motive)) {
      return `organization ${org.id} has unknown motive ${org.motive}`;
    }

    if (!(ORGANIZATION_AGENDAS as readonly string[]).includes(org.agenda)) {
      return `organization ${org.id} has unknown agenda ${org.agenda}`;
    }

    if (org.memberIds.length === 0) {
      return `organization ${org.id} has no members`;
    }

    if (org.targetIds.length === 0) {
      return `organization ${org.id} owns nothing`;
    }

    for (const memberId of org.memberIds) {
      const member = actorById.get(memberId);

      if (!member) {
        return `organization ${org.id} lists missing member ${memberId}`;
      }

      if (member.organizationId !== org.id) {
        return `member ${memberId} does not point back to ${org.id}`;
      }

      if (member.network !== org.network) {
        return `member ${memberId} is on the wrong network for ${org.id}`;
      }
    }

    for (const targetId of org.targetIds) {
      const owner = actors.find((actor) => actor.targetId === targetId);

      if (!targets.some((target) => target.id === targetId)) {
        return `organization ${org.id} owns missing target ${targetId}`;
      }

      if (!owner || !org.memberIds.includes(owner.id)) {
        return `organization ${org.id} owns ${targetId} but its owner is not a member`;
      }
    }
  }

  for (const org of organizations) {
    for (const rivalId of org.rivalIds) {
      const rival = byId.get(rivalId);

      if (rivalId === org.id || !rival) {
        return `organization ${org.id} has an invalid rival ${rivalId}`;
      }

      if (!rival.rivalIds.includes(org.id)) {
        return `rivalry between ${org.id} and ${rivalId} is not symmetric`;
      }
    }
  }

  for (const actor of actors) {
    if (actor.organizationId === undefined) {
      continue;
    }

    const org = byId.get(actor.organizationId);

    if (!org || !org.memberIds.includes(actor.id)) {
      return `actor ${actor.id} points at an organization that does not list it`;
    }
  }

  for (const target of targets) {
    const owners = organizations.filter((org) => org.targetIds.includes(target.id));

    if (owners.length !== 1) {
      return `target ${target.id} is owned by ${owners.length} organizations, not one`;
    }
  }

  return null;
}
