import {
  relationshipStance,
  type RelationshipStance,
} from "@/game/simulation/systems/underground";
import {
  deriveReputationDescriptors,
  type ReputationDescriptor,
} from "@/game/simulation/systems/reputation";
import {
  deriveMachineCapability,
  type HardwareCapability,
} from "@/game/simulation/systems/hardware";
import {
  deriveLeaseCapability,
  deriveSoftwareCapability,
  effectiveCapability,
} from "@/game/simulation/systems/housing";
import {
  combinedActionDurationFactor,
  derivePlayerToolCapability,
} from "@/game/simulation/systems/tools";
import { recurringDailyCost } from "@/game/simulation/systems/upkeep";
import {
  deriveValueGraph,
  type ValueGraph,
} from "@/game/simulation/systems/value-graph";
import { HOUSING_CATALOG } from "@/content/housing-catalog";
import {
  PLAYER_TOOL_CATALOG,
  findPlayerToolItem,
  resaleValue,
} from "@/content/player-tool-catalog";
import {
  MACHINE_CATALOG,
  machineCapabilityOf,
  machineResaleValue,
} from "@/content/machine-catalog";
import {
  MODEL_CATALOG,
  type ModelFootprint,
  type ModelSource,
} from "@/content/model-catalog";
import { contestedModelFactor } from "@/game/simulation/systems/contention";
import {
  SOFTWARE_CATALOG,
  type SoftwareEffect,
} from "@/content/software-catalog";
import {
  RECON_ACTIONS,
  actionDuration,
  type ReconAction,
} from "@/game/simulation/systems/compute";
import { discoveryScope } from "@/game/simulation/systems/scale";
import {
  findCatalogItem,
  HARDWARE_CATALOG,
  MARKET_COUNTERPARTY,
  type HardwareCategory,
} from "@/content/hardware-catalog";
import {
  PLAYER_ACTOR_ID,
  type EvidenceKind,
  type ContractObjectiveKind,
  type ContractStatus,
  type LedgerCauseKind,
  type LedgerDirection,
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
const LEDGER_LIMIT = 30;

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

export interface VisibleHardware {
  id: string;
  catalogId: string;
  label: string;
  category: HardwareCategory;
  acquiredWorldMinute: number;
}

export interface VisibleCatalogItem {
  id: string;
  label: string;
  category: HardwareCategory;
  cost: number;
  capability: HardwareCapability;
  owned: number;
}

export interface VisibleLedgerEntry {
  id: string;
  worldMinute: number;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  causeKind: LedgerCauseKind;
  causeId: string;
  counterparty: string;
}

export interface VisibleHousing {
  id: string;
  label: string;
  dailyCost: number;
  capability: HardwareCapability;
  active: boolean;
}

export interface VisibleSoftwareListing {
  id: string;
  label: string;
  dailyCost: number;
  /** Flat capability contribution, if the license models raw capability. */
  capability: HardwareCapability | null;
  /** Multiplicative duration shortcut, if the license is an efficiency tool. */
  discountFactor: number | null;
  active: boolean;
}

/** A copy of an authored tool the player currently owns. */
export interface VisibleOwnedTool {
  id: string;
  catalogId: string;
  label: string;
  /** Provenance carried from the catalog into the projection. */
  author: string;
  paidCost: number;
  resaleValue: number;
  acquiredWorldMinute: number;
  capability: HardwareCapability | null;
  discountFactor: number | null;
}

/** A player-tool listing offered in the market panel. */
export interface VisiblePlayerToolListing {
  id: string;
  label: string;
  author: string;
  cost: number;
  ownedCount: number;
  capability: HardwareCapability | null;
  discountFactor: number | null;
}

/** An owned complete machine (named box) the player currently has in the rack. */
export interface VisibleOwnedMachine {
  id: string;
  catalogId: string;
  /** Player-chosen display name. */
  label: string;
  paidCost: number;
  resaleValue: number;
  acquiredWorldMinute: number;
  capability: HardwareCapability | null;
}

/** A machine listing offered in the market panel. */
export interface VisibleMachineListing {
  id: string;
  label: string;
  cost: number;
  ownedCount: number;
  capability: HardwareCapability;
}

/**
 * A model the rig can run. Both sources are listed; the two economic shapes
 * are mutually exclusive by construction — a cloud model rents (dailyCost > 0,
 * never owned, starting moves no credits), a local model is property (cost > 0,
 * bills nothing to run). Whether BUY or RUN applies follows from `source`,
 * `owned`, and `running`.
 */
export interface VisibleModelListing {
  id: string;
  label: string;
  source: ModelSource;
  /** One-time acquisition price; 0 for a cloud model, which cannot be bought. */
  cost: number;
  /** Credits per crossed world day while running; 0 for a local model. */
  dailyCost: number;
  /** The catalog shortcut this model advertises while running (< 1 is faster). */
  factor: number;
  /**
   * The shortcut this model would *actually deliver on the current rig*, after
   * Phase 5 P1 contention. A cloud model always matches `factor` (no rig
   * footprint); an under-provisioned rig delivers closer to 1 — the speed of
   * running nothing — and never below it.
   */
  deliveredFactor: number;
  /** The rig resources this model occupies while running (0/0 for cloud). */
  footprint: ModelFootprint;
  /** True for an owned local copy; always false for a cloud model. */
  owned: boolean;
  running: boolean;
}

export interface EconomyProjection {
  credits: number;
  capability: HardwareCapability;
  lease: HardwareCapability;
  software: HardwareCapability;
  /** Combined capability lift from all owned player tools. */
  playerTools: HardwareCapability;
  /** Combined capability lift from all owned machines. */
  ownedMachineCapability: HardwareCapability;
  actionMinutes: Record<ReconAction, number>;
  /**
   * The rig's combined duration shortcut (licenses × tools × running model).
   * Exactly 1 with none of them active — the untouched baseline.
   */
  actionDurationFactor: number;
  /** Catalog id of the running model, or null. */
  activeModelId: string | null;
  discoveryScope: number;
  currentHousingId: string | null;
  dailyCost: number;
  housing: VisibleHousing[];
  softwareListings: VisibleSoftwareListing[];
  ownedTools: VisibleOwnedTool[];
  toolListings: VisiblePlayerToolListing[];
  ownedMachines: VisibleOwnedMachine[];
  machineListings: VisibleMachineListing[];
  /** Every model the scene offers, tagged with ownership and running state. */
  modelListings: VisibleModelListing[];
  hardware: VisibleHardware[];
  catalog: VisibleCatalogItem[];
  ledger: VisibleLedgerEntry[];
  /** The player's value network, derived from the full ledger. */
  valueGraph: ValueGraph;
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
  economy: EconomyProjection;
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

function projectEconomy(
  state: WorldState,
  handles: Map<string, string>,
): EconomyProjection {
  const ownedCounts = new Map<string, number>();

  for (const owned of state.economy.hardware) {
    ownedCounts.set(
      owned.catalogId,
      (ownedCounts.get(owned.catalogId) ?? 0) + 1,
    );
  }

  const hardware: VisibleHardware[] = state.economy.hardware.map((owned) => {
    const item = findCatalogItem(owned.catalogId);

    return {
      id: owned.id,
      catalogId: owned.catalogId,
      label: item?.label ?? owned.catalogId,
      category: item?.category ?? "workstation",
      acquiredWorldMinute: owned.acquiredWorldMinute,
    };
  });

  const catalog: VisibleCatalogItem[] = HARDWARE_CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    category: item.category,
    cost: item.cost,
    capability: { ...item.capability },
    owned: ownedCounts.get(item.id) ?? 0,
  }));

  const resolveCounterparty = (raw: string): string =>
    raw === MARKET_COUNTERPARTY
      ? MARKET_COUNTERPARTY
      : (handles.get(raw) ?? raw);

  const ledger: VisibleLedgerEntry[] = [...state.economy.ledger]
    .reverse()
    .slice(0, LEDGER_LIMIT)
    .map((entry) => ({
      id: entry.id,
      worldMinute: entry.worldMinute,
      direction: entry.direction,
      amount: entry.amount,
      balanceAfter: entry.balanceAfter,
      causeKind: entry.cause.kind,
      causeId: entry.cause.id,
      counterparty: resolveCounterparty(entry.counterparty),
    }));

  // The value graph reads the *whole* ledger, not the capped recent view: it
  // summarises lifetime relationships, so a long run keeps its history.
  const valueGraph = deriveValueGraph(
    state.economy.ledger.map((entry) => ({
      counterparty: resolveCounterparty(entry.counterparty),
      direction: entry.direction,
      amount: entry.amount,
      causeKind: entry.cause.kind,
      worldMinute: entry.worldMinute,
    })),
  );

  const lease = deriveLeaseCapability(state.economy);
  const software = deriveSoftwareCapability(state.economy);
  const playerTools = derivePlayerToolCapability(state.economy);
  const ownedMachineCapability = deriveMachineCapability(state.economy);
  const capability = effectiveCapability(state.economy);
  // Phase 5 P1: a running local model contends with the rig's vram/storage
  // pool, so both the combined factor and each listing's *delivered* factor
  // are read against the derived pool. Cloud footprints are zero, so renting
  // is never contended by the player's own hardware.
  const factor = combinedActionDurationFactor(state.economy, capability);
  const actionMinutes = Object.fromEntries(
    RECON_ACTIONS.map((action) => [
      action,
      actionDuration(action, capability, factor),
    ]),
  ) as Record<ReconAction, number>;

  const housing: VisibleHousing[] = HOUSING_CATALOG.map((item) => ({
    id: item.id,
    label: item.label,
    dailyCost: item.dailyCost,
    capability: { ...item.capability },
    active: state.economy.housing === item.id,
  }));

  const softwareListings: VisibleSoftwareListing[] = SOFTWARE_CATALOG.map(
    (item) => ({
      id: item.id,
      label: item.label,
      dailyCost: item.dailyCost,
      capability:
        item.effect.kind === "capability"
          ? { ...item.effect.capability }
          : null,
      discountFactor:
        item.effect.kind === "modifier" ? item.effect.discount.factor : null,
      active: state.economy.software.includes(item.id),
    }),
  );

  const ownedToolCounts = new Map<string, number>();

  for (const owned of state.economy.playerTools) {
    ownedToolCounts.set(
      owned.catalogId,
      (ownedToolCounts.get(owned.catalogId) ?? 0) + 1,
    );
  }

  const ownedTools: VisibleOwnedTool[] = state.economy.playerTools.map(
    (owned) => {
      const item = findPlayerToolItem(owned.catalogId);
      const effect: SoftwareEffect | undefined = item?.effect;

      return {
        id: owned.id,
        catalogId: owned.catalogId,
        label: item?.label ?? owned.catalogId,
        author: owned.author,
        paidCost: owned.paidCost,
        resaleValue: resaleValue(owned.paidCost),
        acquiredWorldMinute: owned.acquiredWorldMinute,
        capability:
          effect?.kind === "capability" ? { ...effect.capability } : null,
        discountFactor:
          effect?.kind === "modifier" ? effect.discount.factor : null,
      };
    },
  );

  const toolListings: VisiblePlayerToolListing[] = PLAYER_TOOL_CATALOG.map(
    (item) => ({
      id: item.id,
      label: item.label,
      author: item.author,
      cost: item.cost,
      ownedCount: ownedToolCounts.get(item.id) ?? 0,
      capability:
        item.effect.kind === "capability"
          ? { ...item.effect.capability }
          : null,
      discountFactor:
        item.effect.kind === "modifier" ? item.effect.discount.factor : null,
    }),
  );

  const ownedMachineCounts = new Map<string, number>();

  for (const owned of state.economy.ownedMachines) {
    ownedMachineCounts.set(
      owned.catalogId,
      (ownedMachineCounts.get(owned.catalogId) ?? 0) + 1,
    );
  }

  const ownedMachines: VisibleOwnedMachine[] = state.economy.ownedMachines.map(
    (owned) => ({
      id: owned.id,
      catalogId: owned.catalogId,
      label: owned.label,
      paidCost: owned.paidCost,
      resaleValue: machineResaleValue(owned.paidCost),
      acquiredWorldMinute: owned.acquiredWorldMinute,
      capability: machineCapabilityOf(owned.catalogId),
    }),
  );

  const machineListings: VisibleMachineListing[] = MACHINE_CATALOG.map(
    (item) => ({
      id: item.id,
      label: item.label,
      cost: item.cost,
      ownedCount: ownedMachineCounts.get(item.id) ?? 0,
      capability: { ...item.capability },
    }),
  );

  // Models list every catalog entry with its two-state tag. The catalog factor
  // is what the model advertises; the *delivered* factor is what this rig
  // actually gives it after contention — `factor` above is the *combined*
  // result of licenses × tools × the running model's delivered shortcut.
  const modelListings: VisibleModelListing[] = MODEL_CATALOG.map((item) => {
    const catalogFactor =
      item.effect.kind === "modifier" ? item.effect.discount.factor : 1;

    return {
      id: item.id,
      label: item.label,
      source: item.source,
      cost: item.cost,
      dailyCost: item.dailyCost,
      factor: catalogFactor,
      deliveredFactor: contestedModelFactor(
        catalogFactor,
        item.footprint,
        capability,
      ),
      footprint: { ...item.footprint },
      owned: state.economy.ownedModels.includes(item.id),
      running: state.economy.activeModel === item.id,
    };
  });

  return {
    credits: state.economy.credits,
    capability,
    lease,
    software,
    playerTools,
    ownedMachineCapability,
    actionMinutes,
    actionDurationFactor: factor,
    activeModelId: state.economy.activeModel,
    discoveryScope: discoveryScope(capability.memory),
    currentHousingId: state.economy.housing,
    dailyCost: recurringDailyCost(
      state.economy.housing,
      state.economy.software,
      state.economy.activeModel,
    ),
    housing,
    softwareListings,
    ownedTools,
    toolListings,
    ownedMachines,
    machineListings,
    modelListings,
    hardware,
    catalog,
    ledger,
    valueGraph,
  };
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

  const handles = new Map(
    state.underground.actors.map((actor) => [actor.id, actor.handle]),
  );

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
    economy: projectEconomy(state, handles),
  };
}
