import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  PLAYER_ACTOR_ID,
  type UndergroundActor,
  type UndergroundIncident,
  type UndergroundMessage,
  type UndergroundRelationship,
  type UndergroundRumor,
  type WorldState,
} from "@/game/simulation/state/world-state";

/** The ecosystem acts on fixed world-time boundaries (6 in-game hours). */
export const TICK_MINUTES = 360;

/**
 * A huge wait only simulates its most recent ticks (7 in-game days) so one
 * command can never stall the browser.
 */
export const MAX_CATCHUP_TICKS = 28;

const SUCCESS_NOISE_SPREAD = 40;

const SUCCESS_VICTIM_GRUDGE = 20;
const SUCCESS_VICTIM_TRUST = -15;
const SUCCESS_VICTIM_FEAR = 10;
const REPELLED_DEFENDER_GRUDGE = 8;
const REPELLED_ATTACKER_FEAR = 10;

const REACTION_GRUDGE = 15;
const REACTION_TRUST = -10;

const CONTACT_TRUST_THRESHOLD = 10;
const LEAK_PERCENT = 35;
const ACCURATE_PERCENT = 75;
const FOOTPRINT_PEER_TRUST = -5;

export type RelationshipCause = {
  kind: "incident" | "reaction" | "rumor";
  id: string;
};

type RelationshipChangedEvent = Extract<
  SimulationEvent,
  { type: "RelationshipChanged" }
>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function relationshipId(fromId: string, toId: string): string {
  return `rel:${fromId}>${toId}`;
}

function adjustRelationship(
  world: WorldState,
  fromId: string,
  toId: string,
  delta: { trust?: number; fear?: number; grudge?: number },
  cause: RelationshipCause,
  worldMinute: number,
): RelationshipChangedEvent {
  const id = relationshipId(fromId, toId);
  let relationship: UndergroundRelationship | undefined =
    world.underground.relationships.find((entry) => entry.id === id);

  if (!relationship) {
    relationship = {
      id,
      fromId,
      toId,
      trust: 0,
      fear: 0,
      grudge: 0,
      updatedWorldMinute: worldMinute,
    };
    world.underground.relationships.push(relationship);
  }

  relationship.trust = clamp(
    relationship.trust + (delta.trust ?? 0),
    -100,
    100,
  );
  relationship.fear = clamp(
    relationship.fear + (delta.fear ?? 0),
    -100,
    100,
  );
  relationship.grudge = clamp(
    relationship.grudge + (delta.grudge ?? 0),
    0,
    100,
  );
  relationship.updatedWorldMinute = worldMinute;

  return {
    type: "RelationshipChanged",
    relationshipId: relationship.id,
    fromId,
    toId,
    trust: relationship.trust,
    fear: relationship.fear,
    grudge: relationship.grudge,
    causeKind: cause.kind,
    causeId: cause.id,
    worldMinute,
  };
}

function moveRank(
  world: WorldState,
  actor: UndergroundActor,
  direction: "improve" | "worsen",
  incidentId: string,
  worldMinute: number,
): SimulationEvent[] {
  const step = Math.max(1, Math.floor(actor.rank * 0.01));
  const fromRank = actor.rank;
  const toRank =
    direction === "improve"
      ? Math.max(1, fromRank - step)
      : fromRank + step;

  if (toRank === fromRank) {
    return [];
  }

  actor.rank = toRank;

  if (actor.targetId) {
    const target = world.targets.find(
      (candidate) => candidate.id === actor.targetId,
    );

    if (target) {
      target.rank = toRank;
    }
  }

  return [
    {
      type: "ActorRankChanged",
      actorId: actor.id,
      fromRank,
      toRank,
      incidentId,
      worldMinute,
    },
  ];
}

function leakIncident(
  world: WorldState,
  incident: UndergroundIncident,
  tickIndex: number,
): SimulationEvent[] {
  const { underground } = world;
  const events: SimulationEvent[] = [];

  for (const contact of underground.actors) {
    if (
      contact.id === incident.actorId ||
      contact.id === incident.counterpartId
    ) {
      continue;
    }

    const trust = underground.relationships.find(
      (entry) =>
        entry.fromId === contact.id && entry.toId === PLAYER_ACTOR_ID,
    )?.trust;

    if (trust === undefined || trust < CONTACT_TRUST_THRESHOLD) {
      continue;
    }

    const leaks =
      hashUnit(underground.seed, "leak", tickIndex, contact.id, incident.id) *
        100 <
      LEAK_PERCENT;

    if (!leaks) {
      continue;
    }

    const accurate =
      hashUnit(underground.seed, "leak-acc", tickIndex, contact.id, incident.id) *
        100 <
      ACCURATE_PERCENT;

    const rumor: UndergroundRumor = {
      id: `rumor:${underground.rumors.length + 1}`,
      kind: "incident-leak",
      sourceId: incident.id,
      relayId: contact.id,
      accurate,
      claim: {
        actorId: incident.actorId,
        counterpartId: incident.counterpartId,
        outcome: accurate
          ? incident.outcome
          : incident.outcome === "succeeded"
            ? "repelled"
            : "succeeded",
      },
      worldMinute: incident.worldMinute,
    };
    underground.rumors.push(rumor);

    const message: UndergroundMessage = {
      id: `message:${underground.messages.length + 1}`,
      fromId: contact.id,
      rumorId: rumor.id,
      worldMinute: incident.worldMinute,
      read: false,
    };
    underground.messages.push(message);

    events.push(
      {
        type: "RumorSpread",
        rumorId: rumor.id,
        kind: rumor.kind,
        sourceId: rumor.sourceId,
        relayId: rumor.relayId,
        accurate: rumor.accurate,
        worldMinute: rumor.worldMinute,
      },
      {
        type: "MessageDelivered",
        messageId: message.id,
        fromId: message.fromId,
        rumorId: message.rumorId,
        worldMinute: message.worldMinute,
      },
    );
  }

  return events;
}

function runActorTick(
  world: WorldState,
  actor: UndergroundActor,
  tickIndex: number,
  worldMinute: number,
): SimulationEvent[] {
  const { underground } = world;
  const { seed } = underground;

  const actRoll = hashUnit(seed, "act", tickIndex, actor.id) * 100;

  if (actRoll >= actor.activity) {
    return [];
  }

  const others = underground.actors.filter(
    (candidate) => candidate.id !== actor.id,
  );

  if (others.length === 0) {
    return [];
  }

  const counterpart =
    others[
      Math.floor(hashUnit(seed, "pick", tickIndex, actor.id) * others.length)
    ];

  const noise =
    hashUnit(seed, "roll", tickIndex, actor.id) * SUCCESS_NOISE_SPREAD -
    SUCCESS_NOISE_SPREAD / 2;
  const succeeded = actor.skill - counterpart.defense + noise > 0;

  const discretion = succeeded ? counterpart.discretion : actor.discretion;
  const isPublic =
    hashUnit(seed, "pub", tickIndex, actor.id) * 100 >= discretion;

  const incident: UndergroundIncident = {
    id: `incident:${underground.incidents.length + 1}`,
    kind: "npc-intrusion",
    actorId: actor.id,
    counterpartId: counterpart.id,
    outcome: succeeded ? "succeeded" : "repelled",
    public: isPublic,
    worldMinute,
  };
  underground.incidents.push(incident);

  const events: SimulationEvent[] = [
    {
      type: "UndergroundActivity",
      incidentId: incident.id,
      actorId: incident.actorId,
      counterpartId: incident.counterpartId,
      outcome: incident.outcome,
      public: incident.public,
      worldMinute,
    },
  ];
  const cause: RelationshipCause = { kind: "incident", id: incident.id };

  if (succeeded) {
    events.push(
      ...moveRank(world, actor, "improve", incident.id, worldMinute),
      ...moveRank(world, counterpart, "worsen", incident.id, worldMinute),
      adjustRelationship(
        world,
        counterpart.id,
        actor.id,
        {
          grudge: SUCCESS_VICTIM_GRUDGE,
          trust: SUCCESS_VICTIM_TRUST,
          fear: SUCCESS_VICTIM_FEAR,
        },
        cause,
        worldMinute,
      ),
    );
  } else {
    events.push(
      adjustRelationship(
        world,
        counterpart.id,
        actor.id,
        { grudge: REPELLED_DEFENDER_GRUDGE },
        cause,
        worldMinute,
      ),
      adjustRelationship(
        world,
        actor.id,
        counterpart.id,
        { fear: REPELLED_ATTACKER_FEAR },
        cause,
        worldMinute,
      ),
    );
  }

  if (!incident.public) {
    events.push(...leakIncident(world, incident, tickIndex));
  }

  return events;
}

/**
 * Advance the NPC ecosystem to `toMinute`. Mutates the world draft owned by
 * the command bus. Rank is never an input to any decision here.
 */
export function advanceUnderground(
  world: WorldState,
  toMinute: number,
): SimulationEvent[] {
  const { underground } = world;
  const events: SimulationEvent[] = [];

  const lastTickIndex = Math.floor(underground.lastTickMinute / TICK_MINUTES);
  const endTickIndex = Math.floor(toMinute / TICK_MINUTES);
  let startTickIndex = lastTickIndex + 1;

  if (endTickIndex - startTickIndex + 1 > MAX_CATCHUP_TICKS) {
    startTickIndex = endTickIndex - MAX_CATCHUP_TICKS + 1;
  }

  if (underground.actors.length >= 2) {
    for (
      let tickIndex = startTickIndex;
      tickIndex <= endTickIndex;
      tickIndex += 1
    ) {
      const worldMinute = tickIndex * TICK_MINUTES;

      for (const actor of [...underground.actors]) {
        events.push(...runActorTick(world, actor, tickIndex, worldMinute));
      }
    }
  }

  underground.lastTickMinute = Math.max(underground.lastTickMinute, toMinute);

  return events;
}

/**
 * The owner of a target notices the player's footprint. The change cites the
 * reaction that caused it, so the grudge is reconstructable.
 */
export function applyReactionRelationship(
  world: WorldState,
  targetId: string,
  reactionId: string,
  worldMinute: number,
): SimulationEvent[] {
  const owner = world.underground.actors.find(
    (candidate) => candidate.targetId === targetId,
  );

  if (!owner) {
    return [];
  }

  return [
    adjustRelationship(
      world,
      owner.id,
      PLAYER_ACTOR_ID,
      { grudge: REACTION_GRUDGE, trust: REACTION_TRUST },
      { kind: "reaction", id: reactionId },
      worldMinute,
    ),
  ];
}

/**
 * Peers of a target owner talk about the player's observed footprint. Each
 * loses a little trust, citing the rumor so the change is reconstructable.
 */
export function spreadPlayerFootprint(
  world: WorldState,
  targetId: string,
  reactionId: string,
  worldMinute: number,
): SimulationEvent[] {
  const owner = world.underground.actors.find(
    (candidate) => candidate.targetId === targetId,
  );

  if (!owner) {
    return [];
  }

  const events: SimulationEvent[] = [];

  for (const peer of world.underground.actors) {
    if (peer.id === owner.id || peer.network !== owner.network) {
      continue;
    }

    const rumor: UndergroundRumor = {
      id: `rumor:${world.underground.rumors.length + 1}`,
      kind: "player-footprint",
      sourceId: reactionId,
      relayId: peer.id,
      accurate: true,
      claim: null,
      worldMinute,
    };
    world.underground.rumors.push(rumor);

    events.push(
      {
        type: "RumorSpread",
        rumorId: rumor.id,
        kind: rumor.kind,
        sourceId: rumor.sourceId,
        relayId: rumor.relayId,
        accurate: rumor.accurate,
        worldMinute,
      },
      adjustRelationship(
        world,
        peer.id,
        PLAYER_ACTOR_ID,
        { trust: FOOTPRINT_PEER_TRUST },
        { kind: "rumor", id: rumor.id },
        worldMinute,
      ),
    );
  }

  return events;
}

export type RelationshipStance = "friendly" | "neutral" | "wary" | "hostile";

/** Coarse, player-readable band. Raw relationship numbers stay hidden. */
export function relationshipStance(
  relationship: Pick<UndergroundRelationship, "trust" | "grudge">,
): RelationshipStance {
  if (relationship.grudge >= 30) {
    return "hostile";
  }

  if (relationship.grudge >= 10 || relationship.trust <= -10) {
    return "wary";
  }

  if (relationship.trust >= 30) {
    return "friendly";
  }

  return "neutral";
}
