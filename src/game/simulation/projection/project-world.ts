import {
  relationshipStance,
  type RelationshipStance,
} from "@/game/simulation/systems/underground";
import {
  deriveReputationDescriptors,
  type ReputationDescriptor,
} from "@/game/simulation/systems/reputation";
import {
  PLAYER_ACTOR_ID,
  type EvidenceKind,
  type ContractObjectiveKind,
  type ContractStatus,
  type OperationState,
  type RetaliationKind,
  type UndergroundNetwork,
  type OpponentReactionKind,
  type OpponentReactionStatus,
  type UndergroundIncidentOutcome,
  type WorldState,
} from "@/game/simulation/state/world-state";

const FEED_LIMIT = 50;
const INBOX_LIMIT = 30;
const CONTRACT_LIMIT = 20;
const RETALIATION_LIMIT = 20;
const FORUM_LIMIT = 30;

export interface VisibleTarget {
  id: string;
  handle: string;
  rank: number;
  known: boolean;
}

export interface VisibleMachine {
  id: string;
  targetId: string;
  label: string;
  role: string;
}

export interface VisibleService {
  id: string;
  targetId: string;
  machineId: string;
  label: string;
  kind: string;
  state: "online" | "offline" | "degraded";
}

export type FootprintLevel = "none" | "low" | "elevated" | "severe";

export interface VisibleFootprint {
  score: number;
  level: FootprintLevel;
  traceCount: number;
}

export interface VisibleReaction {
  id: string;
  targetId: string;
  kind: OpponentReactionKind;
  status: OpponentReactionStatus;
  sourceTraceIds: string[];
  footprintScore: number;
  triggeredWorldMinute: number;
}

export interface VisibleHandle {
  id: string;
  handle: string;
  rank: number;
  isPlayer: boolean;
}

export interface VisibleIncident {
  id: string;
  actorHandle: string;
  counterpartHandle: string;
  outcome: UndergroundIncidentOutcome;
  worldMinute: number;
}

export interface VisibleStance {
  actorId: string;
  handle: string;
  stance: RelationshipStance;
}

export interface VisibleMessage {
  id: string;
  fromHandle: string;
  claimActorHandle: string;
  claimCounterpartHandle: string;
  claimOutcome: UndergroundIncidentOutcome;
  worldMinute: number;
  read: boolean;
}

export interface VisibleInbox {
  messages: VisibleMessage[];
  unread: number;
}

export interface VisibleContract {
  id: string;
  issuerHandle: string;
  targetId: string;
  targetHandle: string;
  objective: ContractObjectiveKind;
  requiredServices?: number;
  status: Exclude<ContractStatus, "declined">;
  expiresWorldMinute: number;
  dueWorldMinute?: number;
  resolvedWorldMinute?: number;
}

export interface VisibleRetaliation {
  id: string;
  actorHandle: string;
  kind: RetaliationKind;
  worldMinute: number;
}

export type VisibleForumSubject =
  | {
      kind: "incident";
      actorHandle: string;
      counterpartHandle: string;
      outcome: UndergroundIncidentOutcome;
    }
  | { kind: "unmasking"; unmaskerHandle: string }
  | { kind: "contract"; targetHandle: string };

export interface VisibleForumPost {
  id: string;
  board: UndergroundNetwork;
  authorHandle: string;
  worldMinute: number;
  subject: VisibleForumSubject;
}

export interface UndergroundProjection {
  board: VisibleHandle[];
  feed: VisibleIncident[];
  stances: VisibleStance[];
  inbox: VisibleInbox;
  contracts: VisibleContract[];
  retaliations: VisibleRetaliation[];
  forum: VisibleForumPost[];
}

export interface WorldProjection {
  worldMinute: number;
  player: {
    handle: string;
    rank: number;
  };
  targets: VisibleTarget[];
  machines: VisibleMachine[];
  services: VisibleService[];
  operation: OperationState | null;
  footprint: VisibleFootprint;
  reactions: VisibleReaction[];
  descriptors: ReputationDescriptor[];
  underground: UndergroundProjection;
}

function projectUnderground(
  state: WorldState,
  knownTargets: Set<string>,
): UndergroundProjection {
  const { underground } = state;
  const handles = new Map(
    underground.actors.map((actor) => [actor.id, actor.handle]),
  );
  handles.set(PLAYER_ACTOR_ID, state.player.handle);

  const board: VisibleHandle[] = [
    ...underground.actors.map((actor) => ({
      id: actor.id,
      handle: actor.handle,
      rank: actor.rank,
      isPlayer: false,
    })),
    {
      id: PLAYER_ACTOR_ID,
      handle: state.player.handle,
      rank: state.player.rank,
      isPlayer: true,
    },
  ].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

  const feed: VisibleIncident[] = underground.incidents
    .filter((incident) => incident.public)
    .slice(-FEED_LIMIT)
    .reverse()
    .map((incident) => ({
      id: incident.id,
      actorHandle: handles.get(incident.actorId) ?? incident.actorId,
      counterpartHandle:
        handles.get(incident.counterpartId) ?? incident.counterpartId,
      outcome: incident.outcome,
      worldMinute: incident.worldMinute,
    }));

  const stances: VisibleStance[] = [];

  for (const actor of underground.actors) {
    if (!actor.targetId || !knownTargets.has(actor.targetId)) {
      continue;
    }

    const relationship = underground.relationships.find(
      (entry) =>
        entry.fromId === actor.id && entry.toId === PLAYER_ACTOR_ID,
    );

    if (!relationship) {
      continue;
    }

    stances.push({
      actorId: actor.id,
      handle: actor.handle,
      stance: relationshipStance(relationship),
    });
  }

  const rumors = new Map(
    underground.rumors.map((rumor) => [rumor.id, rumor]),
  );
  const inboxMessages: VisibleMessage[] = [];

  for (const message of underground.messages) {
    const claim = rumors.get(message.rumorId)?.claim;

    if (!claim) {
      continue;
    }

    inboxMessages.push({
      id: message.id,
      fromHandle: handles.get(message.fromId) ?? message.fromId,
      claimActorHandle: handles.get(claim.actorId) ?? claim.actorId,
      claimCounterpartHandle:
        handles.get(claim.counterpartId) ?? claim.counterpartId,
      claimOutcome: claim.outcome,
      worldMinute: message.worldMinute,
      read: message.read,
    });
  }

  const unread = inboxMessages.filter((message) => !message.read).length;
  const newestFirst = inboxMessages
    .reverse()
    .sort((a, b) => b.worldMinute - a.worldMinute)
    .slice(0, INBOX_LIMIT);

  const targetHandles = new Map(
    state.targets.map((target) => [target.id, target.handle]),
  );
  const contracts: VisibleContract[] = [];

  for (const contract of [...underground.contracts].reverse()) {
    if (contract.status === "declined") {
      continue;
    }

    contracts.push({
      id: contract.id,
      issuerHandle: handles.get(contract.issuerId) ?? contract.issuerId,
      targetId: contract.targetId,
      targetHandle:
        targetHandles.get(contract.targetId) ?? contract.targetId,
      objective: contract.objective,
      requiredServices: contract.requiredServices,
      status: contract.status,
      expiresWorldMinute: contract.expiresWorldMinute,
      ...(contract.dueWorldMinute === undefined
        ? {}
        : { dueWorldMinute: contract.dueWorldMinute }),
      ...(contract.resolvedWorldMinute === undefined
        ? {}
        : { resolvedWorldMinute: contract.resolvedWorldMinute }),
    });

    if (contracts.length >= CONTRACT_LIMIT) {
      break;
    }
  }

  const retaliations: VisibleRetaliation[] = [...underground.retaliations]
    .reverse()
    .slice(0, RETALIATION_LIMIT)
    .map((entry) => ({
      id: entry.id,
      actorHandle: handles.get(entry.actorId) ?? entry.actorId,
      kind: entry.kind,
      worldMinute: entry.worldMinute,
    }));

  const forum: VisibleForumPost[] = [];

  if (underground.playerNetwork) {
    const incidents = new Map(
      underground.incidents.map((incident) => [incident.id, incident]),
    );
    const retaliationById = new Map(
      underground.retaliations.map((entry) => [entry.id, entry]),
    );
    const contractById = new Map(
      underground.contracts.map((entry) => [entry.id, entry]),
    );

    for (const post of [...underground.forumPosts].reverse()) {
      if (post.board !== underground.playerNetwork) {
        continue;
      }

      let subject: VisibleForumSubject | undefined;

      if (post.subject.kind === "incident") {
        const incident = incidents.get(post.subject.id);
        subject = incident && {
          kind: "incident",
          actorHandle: handles.get(incident.actorId) ?? incident.actorId,
          counterpartHandle:
            handles.get(incident.counterpartId) ?? incident.counterpartId,
          outcome: incident.outcome,
        };
      } else if (post.subject.kind === "unmasking") {
        const entry = retaliationById.get(post.subject.id);
        subject = entry && {
          kind: "unmasking",
          unmaskerHandle: handles.get(entry.actorId) ?? entry.actorId,
        };
      } else {
        const entry = contractById.get(post.subject.id);
        subject = entry && {
          kind: "contract",
          targetHandle: targetHandles.get(entry.targetId) ?? entry.targetId,
        };
      }

      if (!subject) {
        continue;
      }

      forum.push({
        id: post.id,
        board: post.board,
        authorHandle: handles.get(post.authorId) ?? post.authorId,
        worldMinute: post.worldMinute,
        subject,
      });

      if (forum.length >= FORUM_LIMIT) {
        break;
      }
    }

    forum.sort(
      (a, b) =>
        b.worldMinute - a.worldMinute ||
        b.id.localeCompare(a.id, undefined, { numeric: true }),
    );
  }

  return {
    board,
    feed,
    stances,
    inbox: { messages: newestFirst, unread },
    contracts,
    retaliations,
    forum,
  };
}

function evidenceSubjects(
  state: WorldState,
  kind: EvidenceKind,
): Set<string> {
  return new Set(
    state.evidence
      .filter((record) => record.kind === kind)
      .map((record) => record.subjectId),
  );
}

function footprintLevel(score: number): FootprintLevel {
  if (score === 0) {
    return "none";
  }

  if (score <= 2) {
    return "low";
  }

  if (score <= 4) {
    return "elevated";
  }

  return "severe";
}

export function projectWorld(state: WorldState): WorldProjection {
  const knownTargets = evidenceSubjects(state, "target-profile");
  const knownMachines = evidenceSubjects(state, "machine-presence");
  const knownServices = evidenceSubjects(state, "service-presence");

  const targets: VisibleTarget[] = [];
  const machines: VisibleMachine[] = [];
  const services: VisibleService[] = [];

  for (const target of state.targets) {
    if (knownTargets.has(target.id)) {
      targets.push({
        id: target.id,
        handle: target.handle,
        rank: target.rank,
        known: true,
      });
    }

    for (const machine of target.machines) {
      const machineVisible = knownMachines.has(machine.id);

      if (machineVisible) {
        machines.push({
          id: machine.id,
          targetId: target.id,
          label: machine.label,
          role: machine.role,
        });
      }

      if (!machineVisible) {
        continue;
      }

      for (const service of machine.services) {
        if (!knownServices.has(service.id)) {
          continue;
        }

        services.push({
          id: service.id,
          targetId: target.id,
          machineId: machine.id,
          label: service.label,
          kind: service.kind,
          state: service.state,
        });
      }
    }
  }

  const footprintScore = state.traces.reduce(
    (sum, trace) => sum + trace.weight,
    0,
  );

  const reactions = state.reactions
    .filter((reaction) => reaction.playerVisible)
    .map((reaction) => ({
      id: reaction.id,
      targetId: reaction.targetId,
      kind: reaction.kind,
      status: reaction.status,
      sourceTraceIds: [...reaction.sourceTraceIds],
      footprintScore: reaction.footprintScore,
      triggeredWorldMinute: reaction.triggeredWorldMinute,
    }));

  return {
    worldMinute: state.worldMinute,
    player: {
      handle: state.player.handle,
      rank: state.player.rank,
    },
    targets,
    machines,
    services,
    operation: state.operation ? structuredClone(state.operation) : null,
    footprint: {
      score: footprintScore,
      level: footprintLevel(footprintScore),
      traceCount: state.traces.length,
    },
    reactions,
    descriptors: deriveReputationDescriptors(state),
    underground: projectUnderground(state, knownTargets),
  };
}
