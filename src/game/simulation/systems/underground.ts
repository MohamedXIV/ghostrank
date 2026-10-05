import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { contractPayout, transferValue } from "@/game/simulation/systems/economy";
import { npcAssistDeltas } from "@/game/simulation/systems/npc-ai";
import { findModelItem } from "@/content/model-catalog";
import { probeCandidates, probeTick } from "@/game/simulation/systems/probes";
import { physicalRetaliationTick } from "@/game/simulation/systems/physical-retaliation";
import {
  PLAYER_ACTOR_ID,
  type ForumPost,
  type ForumSubjectKind,
  type UndergroundActor,
  type UndergroundContract,
  type UndergroundNetwork,
  type UndergroundIncident,
  type UndergroundMessage,
  type UndergroundRetaliation,
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

export interface UndergroundAdvanceHooks {
  /** Advance deadline systems to this tick before NPC actions at the same minute. */
  beforeTick?: (worldMinute: number) => void;
  /** Fold exact-boundary completions after NPC actions at this minute. */
  afterTick?: (worldMinute: number) => void;
}

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

const OFFER_PERCENT = 10;
const MAX_OPEN_CONTRACTS = 3;
const OFFER_WINDOW_MINUTES = 24 * 60;
const RECON_DUE_MINUTES = 2 * 24 * 60;
const INTRUSION_DUE_MINUTES = 4 * 24 * 60;
const CONTRACT_DELIVERED_TRUST = 15;
const CONTRACT_MISSED_TRUST = -15;

const FORUM_INCIDENT_PERCENT = 60;
const NETWORKS: UndergroundNetwork[] = ["white", "black"];

const PROVOCATION_GRUDGE = 25;
const PROVOCATION_TRUST = -10;
const SMEAR_GRUDGE_THRESHOLD = 30;
const UNMASK_GRUDGE_THRESHOLD = 60;
const SMEAR_PERCENT = 12;
const UNMASK_PERCENT = 3;
const SMEAR_GRUDGE_SPENT = -10;
const UNMASK_GRUDGE_SPENT = -30;
const SMEAR_RANK_PERCENT = 1;
const UNMASK_RANK_PERCENT = 5;
const UNMASK_PEER_TRUST = -40;
const UNMASK_SYMPATHY_TRUST = 10;

export type RelationshipCause = {
  kind:
    | "incident"
    | "reaction"
    | "rumor"
    | "contract"
    | "intrusion"
    | "retaliation"
    | "unmasking";
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
  percent = 1,
): SimulationEvent[] {
  const step = Math.max(1, Math.floor((actor.rank * percent) / 100));
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

function postToForum(
  world: WorldState,
  board: UndergroundNetwork,
  authorId: string,
  subject: { kind: ForumSubjectKind; id: string },
  worldMinute: number,
): SimulationEvent {
  const post: ForumPost = {
    id: `forum:${world.underground.forumPosts.length + 1}`,
    board,
    authorId,
    subject,
    worldMinute,
  };
  world.underground.forumPosts.push(post);

  return {
    type: "ForumPosted",
    postId: post.id,
    board,
    authorId,
    subjectKind: subject.kind,
    subjectId: subject.id,
    worldMinute,
  };
}

/** One actor of `board`'s network, other than `excluded`, picked by hash. */
function pickVoice(
  world: WorldState,
  board: UndergroundNetwork,
  excluded: string[],
  ...hashParts: (string | number)[]
): UndergroundActor | undefined {
  const voices = world.underground.actors.filter(
    (candidate) =>
      candidate.network === board && !excluded.includes(candidate.id),
  );

  if (voices.length === 0) {
    return undefined;
  }

  return voices[
    Math.floor(hashUnit(world.underground.seed, ...hashParts) * voices.length)
  ];
}

function commentOnIncident(
  world: WorldState,
  incident: UndergroundIncident,
  tickIndex: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  for (const board of NETWORKS) {
    const chatty =
      hashUnit(
        world.underground.seed,
        "forum-act",
        tickIndex,
        incident.id,
        board,
      ) *
        100 <
      FORUM_INCIDENT_PERCENT;

    if (!chatty) {
      continue;
    }

    const voice = pickVoice(
      world,
      board,
      [incident.actorId, incident.counterpartId],
      "forum-voice",
      tickIndex,
      incident.id,
      board,
    );

    if (voice) {
      events.push(
        postToForum(
          world,
          board,
          voice.id,
          { kind: "incident", id: incident.id },
          incident.worldMinute,
        ),
      );
    }
  }

  return events;
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
  // Phase 5 P4: a peer running a model gets an assist on this tick — either a
  // small skill lift (reliable read) or an AI-assisted mistake (skill penalty
  // and sloppier covering). An actor with no model returns { 0, 0 } and the
  // roll is exactly the pre-P4 math.
  const assist = npcAssistDeltas(
    seed,
    tickIndex,
    actor.id,
    actor.modelId ? findModelItem(actor.modelId) : undefined,
  );
  // The same math read from the defender's seat: an assistant watching logs is
  // "automation to watch" — it raises this tick's defence when the read is good
  // and lowers it when the model misses the pattern (docs/AI_SYSTEMS.md names
  // "miss a pattern" as a failure mode). No model is again exactly { 0, 0 }.
  const defense =
    counterpart.defense +
    npcAssistDeltas(
      seed,
      tickIndex,
      counterpart.id,
      counterpart.modelId ? findModelItem(counterpart.modelId) : undefined,
    ).skillDelta;
  const succeeded = actor.skill + assist.skillDelta - defense + noise > 0;

  // The discretion that decides privacy stays exactly the pre-P4 pick (the
  // victim's when the actor won, the actor's when it lost); an assist mistake
  // only ever *lowers* it, and a no-model assist contributes 0, so an
  // unassisted incident stays byte-identical.
  const discretion =
    (succeeded ? counterpart.discretion : actor.discretion) +
    assist.discretionDelta;
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

  if (incident.public) {
    events.push(...commentOnIncident(world, incident, tickIndex));
  } else {
    events.push(...leakIncident(world, incident, tickIndex));
  }

  return events;
}

function isOpenContract(contract: UndergroundContract): boolean {
  return contract.status === "offered" || contract.status === "accepted";
}

function expireContracts(
  world: WorldState,
  worldMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  for (const contract of world.underground.contracts) {
    if (
      contract.status === "offered" &&
      worldMinute > contract.expiresWorldMinute
    ) {
      contract.status = "expired";
      contract.resolvedWorldMinute = worldMinute;
      events.push({
        type: "ContractExpired",
        contractId: contract.id,
        stage: "offer",
        worldMinute,
      });
    } else if (
      contract.status === "accepted" &&
      contract.dueWorldMinute !== undefined &&
      worldMinute > contract.dueWorldMinute
    ) {
      contract.status = "expired";
      contract.resolvedWorldMinute = worldMinute;
      events.push(
        {
          type: "ContractExpired",
          contractId: contract.id,
          stage: "accepted",
          worldMinute,
        },
        adjustRelationship(
          world,
          contract.issuerId,
          PLAYER_ACTOR_ID,
          { trust: CONTRACT_MISSED_TRUST },
          { kind: "contract", id: contract.id },
          worldMinute,
        ),
      );
    }
  }

  return events;
}

function offerContracts(
  world: WorldState,
  tickIndex: number,
  worldMinute: number,
): SimulationEvent[] {
  const { underground } = world;
  const { seed } = underground;
  const events: SimulationEvent[] = [];

  if (world.targets.length === 0) {
    return events;
  }

  for (const issuer of underground.actors) {
    const open = underground.contracts.filter(isOpenContract);

    if (open.length >= MAX_OPEN_CONTRACTS) {
      break;
    }

    if (open.some((contract) => contract.issuerId === issuer.id)) {
      continue;
    }

    const trust = underground.relationships.find(
      (entry) =>
        entry.fromId === issuer.id && entry.toId === PLAYER_ACTOR_ID,
    )?.trust;

    if (trust === undefined || trust < CONTACT_TRUST_THRESHOLD) {
      continue;
    }

    const targets = world.targets.filter(
      (candidate) => candidate.id !== issuer.targetId,
    );

    if (targets.length === 0) {
      continue;
    }

    if (
      hashUnit(seed, "offer", tickIndex, issuer.id) * 100 >=
      OFFER_PERCENT
    ) {
      continue;
    }

    const target =
      targets[
        Math.floor(
          hashUnit(seed, "offer-target", tickIndex, issuer.id) *
            targets.length,
        )
      ];
    const objective =
      hashUnit(seed, "offer-objective", tickIndex, issuer.id) < 0.5
        ? "recon-report"
        : "intrusion";
    const serviceCount = target.machines.reduce(
      (sum, machine) => sum + machine.services.length,
      0,
    );

    const contract: UndergroundContract = {
      id: `contract:${underground.contracts.length + 1}`,
      issuerId: issuer.id,
      targetId: target.id,
      objective,
      status: "offered",
      offeredWorldMinute: worldMinute,
      expiresWorldMinute: worldMinute + OFFER_WINDOW_MINUTES,
    };

    if (objective === "recon-report") {
      const asked =
        1 +
        Math.floor(
          hashUnit(seed, "offer-services", tickIndex, issuer.id) * 2,
        );
      contract.requiredServices = Math.max(1, Math.min(asked, serviceCount));
    }

    underground.contracts.push(contract);
    events.push({
      type: "ContractOffered",
      contractId: contract.id,
      issuerId: contract.issuerId,
      targetId: contract.targetId,
      objective: contract.objective,
      expiresWorldMinute: contract.expiresWorldMinute,
      worldMinute,
    });
  }

  return events;
}

/** Due time granted when a contract is accepted at `worldMinute`. */
export function contractDueMinute(
  contract: Pick<UndergroundContract, "objective">,
  worldMinute: number,
): number {
  return (
    worldMinute +
    (contract.objective === "recon-report"
      ? RECON_DUE_MINUTES
      : INTRUSION_DUE_MINUTES)
  );
}

/** Objectives are verified from evidence and traces the player already has. */
export function isObjectiveMet(
  world: WorldState,
  contract: UndergroundContract,
): boolean {
  if (contract.objective === "intrusion") {
    return world.traces.some(
      (trace) =>
        trace.targetId === contract.targetId &&
        trace.cause === "operation-escalation" &&
        trace.worldMinute >= (contract.acceptedWorldMinute ?? 0),
    );
  }

  const target = world.targets.find(
    (candidate) => candidate.id === contract.targetId,
  );

  if (!target) {
    return false;
  }

  const known = new Set(
    world.evidence
      .filter((record) => record.kind === "service-presence")
      .map((record) => record.subjectId),
  );
  const count = target.machines.reduce(
    (sum, machine) =>
      sum +
      machine.services.filter((service) => known.has(service.id)).length,
    0,
  );

  return count >= (contract.requiredServices ?? 1);
}

/** Rewards for a delivered contract: credits, issuer trust and player rank. */
export function rewardContract(
  world: WorldState,
  contract: UndergroundContract,
  worldMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  const payout = contractPayout(contract);
  const payment = transferValue(world, {
    direction: "credit",
    amount: payout,
    causeKind: "contract",
    causeId: contract.id,
    counterparty: contract.issuerId,
    worldMinute,
  });

  if (payment) {
    events.push(payment);
  }

  events.push(
    adjustRelationship(
      world,
      contract.issuerId,
      PLAYER_ACTOR_ID,
      { trust: CONTRACT_DELIVERED_TRUST },
      { kind: "contract", id: contract.id },
      worldMinute,
    ),
  );

  const issuer = world.underground.actors.find(
    (candidate) => candidate.id === contract.issuerId,
  );

  if (issuer) {
    events.push(
      postToForum(
        world,
        issuer.network,
        issuer.id,
        { kind: "contract", id: contract.id },
        worldMinute,
      ),
    );
  }

  events.push(
    ...shiftPlayerRank(world, "improve", 1, "contract", contract.id, worldMinute),
  );

  return events;
}

function shiftPlayerRank(
  world: WorldState,
  direction: "improve" | "worsen",
  percent: number,
  causeKind: "contract" | "retaliation",
  causeId: string,
  worldMinute: number,
): SimulationEvent[] {
  const fromRank = world.player.rank;
  const step = Math.max(1, Math.floor((fromRank * percent) / 100));
  const toRank =
    direction === "improve" ? Math.max(1, fromRank - step) : fromRank + step;

  if (toRank === fromRank) {
    return [];
  }

  world.player.rank = toRank;

  return [
    {
      type: "PlayerRankChanged",
      fromRank,
      toRank,
      causeKind,
      causeId,
      worldMinute,
    },
  ];
}

function grudgeOf(world: WorldState, actorId: string): number {
  return (
    world.underground.relationships.find(
      (entry) => entry.fromId === actorId && entry.toId === PLAYER_ACTOR_ID,
    )?.grudge ?? 0
  );
}

function retaliate(
  world: WorldState,
  tickIndex: number,
  worldMinute: number,
): SimulationEvent[] {
  const { underground } = world;
  const { seed } = underground;
  const events: SimulationEvent[] = [];

  for (const actor of [...underground.actors]) {
    const grudge = grudgeOf(world, actor.id);

    if (grudge < SMEAR_GRUDGE_THRESHOLD) {
      continue;
    }

    const unmasks =
      grudge >= UNMASK_GRUDGE_THRESHOLD &&
      hashUnit(seed, "unmask", tickIndex, actor.id) * 100 < UNMASK_PERCENT;
    const smears =
      !unmasks &&
      hashUnit(seed, "smear", tickIndex, actor.id) * 100 < SMEAR_PERCENT;

    if (!unmasks && !smears) {
      continue;
    }

    const retaliation: UndergroundRetaliation = {
      id: `retaliation:${underground.retaliations.length + 1}`,
      actorId: actor.id,
      kind: unmasks ? "unmasking" : "smear",
      worldMinute,
    };
    underground.retaliations.push(retaliation);

    events.push(
      {
        type: "Retaliation",
        retaliationId: retaliation.id,
        actorId: actor.id,
        kind: retaliation.kind,
        worldMinute,
      },
      ...shiftPlayerRank(
        world,
        "worsen",
        unmasks ? UNMASK_RANK_PERCENT : SMEAR_RANK_PERCENT,
        "retaliation",
        retaliation.id,
        worldMinute,
      ),
      adjustRelationship(
        world,
        actor.id,
        PLAYER_ACTOR_ID,
        { grudge: unmasks ? UNMASK_GRUDGE_SPENT : SMEAR_GRUDGE_SPENT },
        {
          kind: unmasks ? "unmasking" : "retaliation",
          id: retaliation.id,
        },
        worldMinute,
      ),
    );

    if (unmasks) {
      events.push(...punishUnmasker(world, actor, retaliation.id, worldMinute));
    }
  }

  return events;
}

function condemnUnmasking(
  world: WorldState,
  unmasker: UndergroundActor,
  retaliationId: string,
  worldMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  for (const board of NETWORKS) {
    const voice = pickVoice(
      world,
      board,
      [unmasker.id],
      "forum-taboo",
      retaliationId,
      board,
    );

    if (voice) {
      events.push(
        postToForum(
          world,
          board,
          voice.id,
          { kind: "unmasking", id: retaliationId },
          worldMinute,
        ),
      );
    }
  }

  return events;
}

/** Unmasking is taboo: everyone else turns on the unmasker and sides with the player. */
function punishUnmasker(
  world: WorldState,
  unmasker: UndergroundActor,
  retaliationId: string,
  worldMinute: number,
): SimulationEvent[] {
  const cause: RelationshipCause = { kind: "unmasking", id: retaliationId };
  const events: SimulationEvent[] = [
    ...condemnUnmasking(world, unmasker, retaliationId, worldMinute),
    ...moveRank(
      world,
      unmasker,
      "worsen",
      retaliationId,
      worldMinute,
      UNMASK_RANK_PERCENT,
    ),
  ];

  for (const other of world.underground.actors) {
    if (other.id === unmasker.id) {
      continue;
    }

    events.push(
      adjustRelationship(
        world,
        other.id,
        unmasker.id,
        { trust: UNMASK_PEER_TRUST },
        cause,
        worldMinute,
      ),
      adjustRelationship(
        world,
        other.id,
        PLAYER_ACTOR_ID,
        { trust: UNMASK_SYMPATHY_TRUST },
        cause,
        worldMinute,
      ),
    );
  }

  return events;
}

/**
 * Escalating again against a target that is already watching you. The owner's
 * grudge hardens, citing the escalation trace.
 */
export function applyProvocation(
  world: WorldState,
  targetId: string,
  traceId: string,
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
      { grudge: PROVOCATION_GRUDGE, trust: PROVOCATION_TRUST },
      { kind: "intrusion", id: traceId },
      worldMinute,
    ),
  ];
}

/**
 * Advance the NPC ecosystem to `toMinute`. Mutates the world draft owned by
 * the command bus. Rank is never an input to any decision here.
 */
export function advanceUnderground(
  world: WorldState,
  toMinute: number,
  hooks?: UndergroundAdvanceHooks,
): SimulationEvent[] {
  const { underground } = world;
  const events: SimulationEvent[] = [];

  const lastTickIndex = Math.floor(underground.lastTickMinute / TICK_MINUTES);
  const endTickIndex = Math.floor(toMinute / TICK_MINUTES);
  let startTickIndex = lastTickIndex + 1;

  if (endTickIndex - startTickIndex + 1 > MAX_CATCHUP_TICKS) {
    startTickIndex = endTickIndex - MAX_CATCHUP_TICKS + 1;
  }

  // Phase 6 P2: peers with standing against the player may spend a tick pointing
  // an assistant at them. See the call site inside the loop for why the
  // candidate list is re-derived every tick rather than cached for the command.

  for (
    let tickIndex = startTickIndex;
    tickIndex <= endTickIndex;
    tickIndex += 1
  ) {
    const worldMinute = tickIndex * TICK_MINUTES;

    hooks?.beforeTick?.(worldMinute);
    events.push(...expireContracts(world, worldMinute));

    if (underground.actors.length >= 2) {
      for (const actor of [...underground.actors]) {
        events.push(...runActorTick(world, actor, tickIndex, worldMinute));
      }
    }

    // P3 consumes only probes from earlier ticks. It acts before social
    // retaliation spends grudge; this tick's new probe is created below and
    // cannot turn into a room hit in the same breath.
    events.push(...physicalRetaliationTick(world, tickIndex, worldMinute));
    events.push(...retaliate(world, tickIndex, worldMinute));
    events.push(...offerContracts(world, tickIndex, worldMinute));
    // Last in the tick, and re-derived per tick: retaliation spends grudge
    // downward, so a cached candidate list would let one big `wait` keep probing
    // with a peer who has already spent its grudge while the same wait in chunks
    // would not — probe records would depend on how the player pressed the
    // button. Reading standing at the tick makes the sequence a function of
    // world history alone. Inside this loop at all is the point: a probe is an
    // ecosystem *action*, so it inherits the tick index and the catch-up cap
    // rather than carrying a second clock cursor, and a tick that never ran is a
    // probe that never happened — the deliberate contrast with P1's derived case
    // material (D032).
    events.push(
      ...probeTick(world, tickIndex, worldMinute, probeCandidates(world)),
    );
    hooks?.afterTick?.(worldMinute);
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
