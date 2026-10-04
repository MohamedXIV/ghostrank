export interface PlayerState {
  handle: string;
  rank: number;
}

export type EvidenceKind =
  | "target-profile"
  | "machine-presence"
  | "service-presence";

export type EvidenceConfidence = "observed";

export interface EvidenceRecord {
  id: string;
  kind: EvidenceKind;
  subjectId: string;
  confidence: EvidenceConfidence;
  source: "direct-observation" | "legacy-discovery";
  worldMinute: number;
}

export interface SimulatedServiceState {
  id: string;
  label: string;
  kind: string;
  state: "online" | "offline" | "degraded";
}

export interface MachineState {
  id: string;
  label: string;
  role: string;
  services: SimulatedServiceState[];
}

export interface TargetState {
  id: string;
  handle: string;
  rank: number;
  machines: MachineState[];
  hidden?: Record<string, unknown>;
}

export type OperationStage = "recon" | "intrusive";

export interface OperationState {
  targetId: string;
  stage: OperationStage;
  openedWorldMinute: number;
  escalatedWorldMinute?: number;
}

export type TraceCause =
  | "operation-escalation"
  | "operation-disengagement";

export type TraceSeverity = "low" | "elevated" | "high";

export interface OperationTrace {
  id: string;
  targetId: string;
  cause: TraceCause;
  stage: OperationStage;
  severity: TraceSeverity;
  weight: number;
  worldMinute: number;
}

export type OpponentReactionKind = "defensive-watch";
export type OpponentReactionStatus = "active";

export interface OpponentReaction {
  id: string;
  targetId: string;
  kind: OpponentReactionKind;
  status: OpponentReactionStatus;
  sourceTraceIds: string[];
  footprintScore: number;
  triggeredWorldMinute: number;
  playerVisible: boolean;
}

export const PLAYER_ACTOR_ID = "player";

export type UndergroundNetwork = "white" | "black";

export interface UndergroundActor {
  id: string;
  handle: string;
  rank: number;
  network: UndergroundNetwork;
  /** Hidden truth: offensive capability, 0-100. Never an input from rank. */
  skill: number;
  /** Hidden truth: resistance to intrusion, 0-100. */
  defense: number;
  /** Hidden truth: how well incidents stay private, 0-100. */
  discretion: number;
  /** Hidden truth: percent chance to act on each ecosystem tick. */
  activity: number;
  /** Operation target this actor owns; rank is kept in sync with it. */
  targetId?: string;
}

export interface UndergroundRelationship {
  id: string;
  fromId: string;
  toId: string;
  trust: number;
  fear: number;
  grudge: number;
  updatedWorldMinute: number;
}

export type UndergroundIncidentKind = "npc-intrusion";
export type UndergroundIncidentOutcome = "succeeded" | "repelled";

export interface UndergroundIncident {
  id: string;
  kind: UndergroundIncidentKind;
  actorId: string;
  counterpartId: string;
  outcome: UndergroundIncidentOutcome;
  public: boolean;
  worldMinute: number;
}

export type UndergroundRumorKind = "incident-leak" | "player-footprint";

export interface UndergroundRumorClaim {
  actorId: string;
  counterpartId: string;
  outcome: UndergroundIncidentOutcome;
}

export interface UndergroundRumor {
  id: string;
  kind: UndergroundRumorKind;
  /** Incident ID for a leak, reaction ID for a player footprint. */
  sourceId: string;
  relayId: string;
  /** Hidden truth: whether the claim matches what actually happened. */
  accurate: boolean;
  claim: UndergroundRumorClaim | null;
  worldMinute: number;
}

export interface UndergroundMessage {
  id: string;
  fromId: string;
  rumorId: string;
  worldMinute: number;
  read: boolean;
}

export type ForumSubjectKind = "incident" | "unmasking" | "contract";

export interface ForumPost {
  id: string;
  board: UndergroundNetwork;
  authorId: string;
  subject: { kind: ForumSubjectKind; id: string };
  worldMinute: number;
}

export type RetaliationKind = "smear" | "unmasking";

export interface UndergroundRetaliation {
  id: string;
  actorId: string;
  kind: RetaliationKind;
  worldMinute: number;
}

export type ContractObjectiveKind = "recon-report" | "intrusion";
export type ContractStatus =
  | "offered"
  | "accepted"
  | "completed"
  | "expired"
  | "declined";

export interface UndergroundContract {
  id: string;
  issuerId: string;
  targetId: string;
  objective: ContractObjectiveKind;
  /** Recon reports only: how many services of the target must be known. */
  requiredServices?: number;
  status: ContractStatus;
  offeredWorldMinute: number;
  expiresWorldMinute: number;
  acceptedWorldMinute?: number;
  dueWorldMinute?: number;
  resolvedWorldMinute?: number;
}

export interface UndergroundState {
  seed: number;
  lastTickMinute: number;
  playerNetwork: UndergroundNetwork | null;
  actors: UndergroundActor[];
  relationships: UndergroundRelationship[];
  incidents: UndergroundIncident[];
  rumors: UndergroundRumor[];
  messages: UndergroundMessage[];
  contracts: UndergroundContract[];
  retaliations: UndergroundRetaliation[];
  forumPosts: ForumPost[];
}

export type LedgerDirection = "credit" | "debit";
export type LedgerCauseKind =
  | "contract"
  | "hardware"
  | "housing"
  | "upkeep"
  | "license";

/** A single value transfer. The ledger is the seed of the digital-value graph. */
export interface ValueLedgerEntry {
  id: string;
  worldMinute: number;
  direction: LedgerDirection;
  amount: number;
  balanceAfter: number;
  cause: { kind: LedgerCauseKind; id: string };
  /** Actor id for a contract payout; "market" for a catalog purchase. */
  counterparty: string;
}

/** An owned hardware instance. Capability is derived from the catalog, not stored. */
export interface OwnedHardware {
  id: string;
  catalogId: string;
  acquiredWorldMinute: number;
}

export interface EconomyState {
  credits: number;
  ledger: ValueLedgerEntry[];
  hardware: OwnedHardware[];
  /** The catalog id of the held lease, or null for the free baseline. */
  housing: string | null;
  /**
   * Catalog ids of active software licenses, kept in catalog order. An empty
   * list is the free baseline: no recurring license fees, no software lift.
   */
  software: string[];
}

export interface WorldState {
  worldMinute: number;
  player: PlayerState;
  targets: TargetState[];
  knownTargetIds: string[];
  evidence: EvidenceRecord[];
  operation: OperationState | null;
  traces: OperationTrace[];
  reactions: OpponentReaction[];
  underground: UndergroundState;
  economy: EconomyState;
}

export interface InitialTargetState
  extends Omit<TargetState, "machines"> {
  machines?: MachineState[];
}

export interface InitialWorldState {
  worldMinute?: number;
  player?: PlayerState;
  targets?: InitialTargetState[];
  knownTargetIds?: string[];
  evidence?: EvidenceRecord[];
  operation?: OperationState | null;
  traces?: OperationTrace[];
  reactions?: OpponentReaction[];
  underground?: Partial<UndergroundState>;
  economy?: Partial<EconomyState>;
}

export const STARTING_NETWORK_TRUST = 20;
export const STARTING_CREDITS = 0;

function createInitialUnderground(
  initial: Partial<UndergroundState> | undefined,
  worldMinute: number,
): UndergroundState {
  const actors = initial?.actors ? structuredClone(initial.actors) : [];
  const playerNetwork = initial?.playerNetwork ?? null;
  const relationships = initial?.relationships
    ? structuredClone(initial.relationships)
    : [];

  if (playerNetwork && !initial?.relationships) {
    for (const actor of actors) {
      if (actor.network === playerNetwork) {
        relationships.push({
          id: `rel:${actor.id}>${PLAYER_ACTOR_ID}`,
          fromId: actor.id,
          toId: PLAYER_ACTOR_ID,
          trust: STARTING_NETWORK_TRUST,
          fear: 0,
          grudge: 0,
          updatedWorldMinute: worldMinute,
        });
      }
    }
  }

  return {
    seed: initial?.seed ?? 0,
    lastTickMinute: initial?.lastTickMinute ?? worldMinute,
    playerNetwork,
    actors,
    relationships,
    incidents: initial?.incidents ? structuredClone(initial.incidents) : [],
    rumors: initial?.rumors ? structuredClone(initial.rumors) : [],
    messages: initial?.messages ? structuredClone(initial.messages) : [],
    contracts: initial?.contracts ? structuredClone(initial.contracts) : [],
    retaliations: initial?.retaliations
      ? structuredClone(initial.retaliations)
      : [],
    forumPosts: initial?.forumPosts
      ? structuredClone(initial.forumPosts)
      : [],
  };
}

function createInitialEconomy(
  initial: Partial<EconomyState> | undefined,
): EconomyState {
  return {
    credits: initial?.credits ?? STARTING_CREDITS,
    ledger: initial?.ledger ? structuredClone(initial.ledger) : [],
    hardware: initial?.hardware ? structuredClone(initial.hardware) : [],
    housing: initial?.housing ?? null,
    software: initial?.software ? [...initial.software] : [],
  };
}

export function createInitialWorldState(
  initial: InitialWorldState = {},
): WorldState {
  const worldMinute = initial.worldMinute ?? 0;
  const knownTargetIds = initial.knownTargetIds
    ? [...initial.knownTargetIds]
    : [];
  const evidence = initial.evidence
    ? structuredClone(initial.evidence)
    : [];

  for (const targetId of knownTargetIds) {
    const evidenceId = `target-profile:${targetId}`;

    if (!evidence.some((record) => record.id === evidenceId)) {
      evidence.push({
        id: evidenceId,
        kind: "target-profile",
        subjectId: targetId,
        confidence: "observed",
        source: "legacy-discovery",
        worldMinute,
      });
    }
  }

  return {
    worldMinute,
    player: initial.player ?? {
      handle: "unknown",
      rank: 100_000,
    },
    targets: initial.targets
      ? initial.targets.map((target) => ({
          ...structuredClone(target),
          machines: target.machines
            ? structuredClone(target.machines)
            : [],
        }))
      : [],
    knownTargetIds,
    evidence,
    operation:
      initial.operation === undefined
        ? null
        : structuredClone(initial.operation),
    traces: initial.traces ? structuredClone(initial.traces) : [],
    reactions: initial.reactions
      ? structuredClone(initial.reactions)
      : [],
    underground: createInitialUnderground(initial.underground, worldMinute),
    economy: createInitialEconomy(initial.economy),
  };
}
