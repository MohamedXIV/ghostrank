import type {
  SliceClueId,
  SliceOutcome,
} from "@/content/nightshade-slice";
import {
  DEFAULT_RUN_SCENARIO,
  type RunScenario,
} from "@/game/simulation/state/run-scenario";
import {
  createJobQueue,
  type JobQueueState,
} from "@/game/simulation/scheduler/job-queue";

import type { NetworkRouteChallenge } from "@/game/simulation/systems/network-routes";

export interface PlayerState {
  handle: string;
  rank: number;
}

/**
 * Phase 7 P0 — the durable terminal identity of a completed run. These names
 * are intentionally broader than the current P1 triggers: later slices decide
 * eligibility, while P0 defines the one-way contract every ending must use.
 */
export type RunEndingStatus =
  | "arrested"
  | "unmasked"
  | "missing"
  | "compromised"
  | "stranded"
  | "retired"
  | "vanished";

export type RunEndingCauseKind =
  | "compromise"
  | "investigation"
  | "physical-threat"
  | "retirement";

export interface RunEndingRecord {
  status: RunEndingStatus;
  causeKind: RunEndingCauseKind;
  causeId: string;
  worldMinute: number;
}

/**
 * Phase 7 P2 — a voluntary exit plan. "ready" is deliberately derived rather
 * than stored: cooling has one frozen deadline and reaching it is clock truth.
 */
export type RetirementStage = "planning" | "cooling";

export type RetirementPlan =
  | {
      stage: "planning";
      startedWorldMinute: number;
    }
  | {
      stage: "cooling";
      startedWorldMinute: number;
      committedWorldMinute: number;
      coolingUntilWorldMinute: number;
    };

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
  /**
   * Set only when an owner's review rotates a machine off the file (D071). A
   * retired record no longer counts as knowledge. Absent everywhere else.
   */
  retiredWorldMinute?: number;
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
  /**
   * The organization this infrastructure belongs to (D066). Absent for the
   * authored roster, whose targets have no organizations. Hidden truth: the
   * projection never sends it, only the owning organization's public name on a
   * contract its members issue.
   */
  organizationId?: string;
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
  | "operation-disengagement"
  | "operation-probe"
  | "network-route-test";

export type AnalysisConfidence = "low" | "medium" | "high";

/**
 * One proposed conclusion from an AI pass (Phase 5 P2). Claims are *not*
 * evidence: they are the assistant's read of infrastructure the player has not
 * yet verified, shaped by what the model can do —
 *
 * - `subjectId` locates the claim in world truth (a machine or service id), or
 *   `null` for a hallucinated host the target does not actually have. It stays
 *   internal: projecting a hidden subject would leak the very structure recon
 *   has not earned yet.
 * - `assertion` is the predicted machine role or service kind.
 * - `confidence` derives from the model's reasoning + context, **never** from
 *   `accurate` — an unreliable model states wrong things confidently by
 *   construction (the docs' "overstate confidence"). Expert play is verifying
 *   important conclusions through survey/inspect.
 * - `accurate` is hidden ground truth recorded at generation time, the rumor
 *   template: comparison only becomes meaningful when recon reveals `subjectId`
 *   with a different role/kind, or never appears (a fabrication).
 */
export interface AnalysisClaim {
  subjectId: string | null;
  kind: "machine-role" | "service-kind";
  assertion: string;
  confidence: AnalysisConfidence;
  accurate: boolean;
}

/**
 * The assistant's current read of a target — at most one per target, refreshed
 * by each pass. Derived from the model, the world seed, and the world minute:
 * deterministic and save-safe, with nothing that can desync.
 */
export interface AnalysisRecord {
  id: string;
  targetId: string;
  modelId: string;
  worldMinute: number;
  claims: AnalysisClaim[];
}

export type TraceSeverity = "low" | "elevated" | "high";

/**
 * The frozen quality outcome of a self-authored workflow build (Phase 5 P3),
 * rolled once at start. The docs' build outcomes: a workflow can come out
 * clean, ship with warnings, or carry defects. It is *frozen* — a later stop,
 * model swap, or save/restore can neither re-roll nor reveal it early.
 */
export type WorkflowOutcome = "clean" | "warnings" | "defective";

/**
 * One in-flight build job (Phase 5 P3). Everything that must stay stable while
 * the world clock runs is captured at start: the duration (the delivered model
 * shortcut, if any, is *frozen* so split waits cannot change it), the due
 * minute, and the rolled outcome — hidden until completion, because a build
 * report the player could read halfway would grade the roll for free.
 */
export interface InFlightBuild {
  id: string;
  specId: string;
  /** The assistant running when the build was commissioned. */
  modelId: string;
  startedWorldMinute: number;
  /**
   * Frozen completion minute captured at commissioning. Phase 6 P3 never
   * rewrites it: physical outages pause the clock around the job instead.
   */
  dueWorldMinute: number;
  /** Minute the current physical outage paused this job. Absent while running. */
  pausedAtWorldMinute?: number;
  /** The physical threat that owns the active pause; prevents cross-outage settlement. */
  pausedByThreatId?: string;
  /** Closed pause intervals already paid by the clock. Absent means zero. */
  accumulatedPausedMinutes?: number;
  outcome: WorkflowOutcome;
}

/**
 * A completed, owned self-authored workflow. Like every other instance type,
 * the effect derives from the catalog spec via `specId`, never from storage;
 * what is per-copy is the *build* — the frozen `outcome` roll, the assistant
 * that wrote it, the spec label at completion (identity, renameable later),
 * and the landing minute. A later catalog retune can neither re-grade a build
 * nor lose its provenance.
 */
export interface OwnedWorkflow {
  id: string;
  specId: string;
  /** Display name captured at completion; a rename changes identity, not power. */
  label: string;
  outcome: WorkflowOutcome;
  /** The model that built it, kept as provenance. */
  builtWithModelId: string;
  /** World minute the build completed and the workflow became usable. */
  acquiredWorldMinute: number;
}

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

/**
 * One piece of evidence a case file has surfaced (Phase 6 P1). It is *not*
 * hidden truth — the player reads it — but it is authoritative state, because
 * the same evidence must not be re-surfaced every time the clock is advanced.
 */
export interface InvestigationSignal {
  id: string;
  kind: InvestigationSignalKind;
  /** Review boundary this surfaced on. Never a countdown, never a deadline. */
  surfacedWorldMinute: number;
}

/**
 * An authority case file opened against the player's activity on one target
 * (Phase 6 P1). What it *means* stays internal: `progress` is arithmetic over
 * the footprint the player already emitted — never a roll against a hidden
 * difficulty score, never an input from rank — and the player reads only the
 * surfaced `signals` and the band they imply.
 *
 * `sourceIds` is the citable causal chain P5 folds over: the `OperationTrace`
 * ids whose weights fed `progress`, plus the `OpponentReaction` ids on the same
 * target, cited for provenance only (their footprint *is* those traces' weight,
 * so counting a reaction again would charge the player twice).
 */
export interface Investigation {
  id: string;
  targetId: string;
  /** Review boundary the file was opened on, not the minute of the last trace. */
  openedWorldMinute: number;
  /** Hidden truth: assembled case material. Never projected as a number. */
  progress: number;
  sourceIds: string[];
  signals: InvestigationSignal[];
}

export type InvestigationSignalKind =
  | "unusual-login"
  | "marketplace-behavior"
  | "suspicious-message";

/**
 * The seat of the player's infrastructure a rival pointed an assistant at
 * (Phase 6 P2). Names, three of them: which part of your standing was being
 * mapped, which is what a tell actually feels like from the inside.
 */
export type RivalProbeSubject = "rig" | "dwelling" | "habits";

/**
 * The observable artifact a probe leaves behind (Phase 6 P2). The three kinds are
 * the lines of `docs/GAME_DESIGN.md`'s evidence list that belong to *peers* —
 * "strange probes", "calls", and "missing contacts" — deliberately disjoint from
 * P1's authority vocabulary and from P3's physical one.
 */
export type RivalProbeArtifactKind =
  | "probe-ping"
  | "caller-question"
  | "missing-contact";

/**
 * One rival probe attempt (Phase 6 P2): a named peer pointed an assistant at one
 * seat of the player's infrastructure and formed a read.
 *
 * `correct` is the slice's hidden truth — whether that read matches reality —
 * and it is deliberately *not* projected: you cannot observe someone else's
 * belief, only the tell they left. It persists so a restored world keeps
 * fooling the same rivals the same way, and so P3 can target the player using a
 * rival's actual (possibly wrong) picture rather than a fresh roll.
 *
 * The lift itself is represented by the record, not by a stored scalar: which
 * seats a given peer has correctly read is exactly "the prober's knowledge of
 * the player's infrastructure standing", and keeping it as citable rows is what
 * lets P5's postmortem fold probes into a chain.
 */
export interface RivalProbe {
  id: string;
  /** Hidden-truth-adjacent: who probed. Never projected — you see the tell. */
  actorId: string;
  /**
   * Which seat was aimed at. This is the stored fact; the observable tell is
   * *derived* from it by `probeArtifactOf`, so the record cannot contradict
   * itself and a restored world shows exactly the tells it showed before.
   */
  subject: RivalProbeSubject;
  /** Hidden truth: whether the read matched reality. Never projected. */
  correct: boolean;
  /**
   * For a dwelling read only: which derived physical location the rival read.
   * Hidden and optional so pre-P3/P2 saves remain valid. A later relocation can
   * therefore invalidate a once-correct address instead of teleporting the hit.
   */
  locationId?: string;
  worldMinute: number;
}

/** Physical evidence named by WORLD_RUNS_AND_ENDINGS. */
export type PhysicalSignalKind =
  | "strange-vehicle"
  | "footsteps"
  | "knock"
  | "unknown-call"
  | "door-camera-motion"
  | "outage"
  | "unusual-connectivity"
  | "unexpected-delivery"
  | "nearby-activity";

export type PhysicalThreatKind = "warning" | "outage" | "property-hit";

/**
 * Durable truth behind one physical escalation. The surface receives only the
 * signal and its minute; causes, outage end, and impact stay simulation truth.
 */
export interface PhysicalThreat {
  id: string;
  actorId: string;
  kind: PhysicalThreatKind;
  signalKind: PhysicalSignalKind;
  sourceProbeId: string;
  sourceInvestigationIds: string[];
  /** Physical place where this consequence actually landed. */
  locationId: string;
  worldMinute: number;
  /** Hidden end of a temporary outage — never projected as a countdown. */
  endsWorldMinute?: number;
  affectedBuildIds: string[];
  destroyedHardwareIds: string[];
  /** P3's D030 beat: a peer may adopt automation as part of an escalation. */
  assistantAdoptedModelId?: string;
}

/**
 * Phase 6 P4 — a catastrophic loss condition, not an ending. These records are
 * append-only causal history: the current lease/hardware remain their own source
 * of truth, while Phase 7 can later decide whether a condition ends the run.
 */
export type CompromiseKind =
  | "rig-lost"
  | "dwelling-lost"
  | "identity-exposed"
  | "stranded";

export interface CompromiseRecord {
  id: string;
  kind: CompromiseKind;
  sourceThreatId: string;
  sourceProbeId: string;
  sourceInvestigationIds: string[];
  /** Where the triggering physical consequence landed. */
  locationId: string;
  worldMinute: number;
}

/**
 * The player-visible band of a case file. Names, three of them, derived from
 * how many signals have surfaced — the `FootprintLevel`/`relationshipStance`
 * discipline, so there is no number anywhere to turn into a bar.
 */
export type InvestigationStage = "probing" | "warming" | "converging";

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
  /**
   * Phase 5 P4: the catalog id of the model this actor runs as an assistant, or
   * undefined when the actor works without AI. It is a hidden-truth input to the
   * NPC-vs-NPC roll only — it never gates the player, and it is deliberately not
   * projected (the projection shows *that* a peer runs an assistant, through the
   * read-only `assistants` surface, never the raw skill this lifts). undefined is
   * the untouched pre-P4 baseline: the actor's roll is exactly its old math.
   */
  modelId?: string;
  /** Operation target this actor owns; rank is kept in sync with it. */
  targetId?: string;
  /**
   * The organization this actor belongs to (D066). Absent for independent
   * actors and for the whole authored roster. Hidden truth.
   */
  organizationId?: string;
  /** Generated scenes only (D068). Absent for the authored roster. Hidden truth. */
  hackerArchetype?: HackerArchetype;
  /** Generated scenes only (D068). Hidden personality that changes behaviour. */
  temperament?: Temperament;
}

/**
 * How a generated hacker works. Each archetype draws its temperament from its own
 * ranges and is weighted per scene. `fixer` brokers deal with the player at lower
 * trust, and `tinkerer` runs an assistant. Hidden truth.
 */
export type HackerArchetype =
  | "opportunist"
  | "ghost"
  | "enforcer"
  | "fixer"
  | "tinkerer";

/** Personality, each 0-100. Read by intrusion tempo, discretion and offer rate (D068). */
export interface Temperament {
  /** Adds to the chance of acting on a tick. */
  aggression: number;
  /** Adds to discretion, so the actor's incidents stay private more often. */
  caution: number;
  /** Adds to the actor's contract offer rate. */
  greed: number;
}

export type OrganizationKind = "crew" | "syndicate" | "exchange";

/** Why an organization acts. Hidden truth; no system reads it directly. */
export type OrganizationMotive = "profit" | "revenge" | "control";

/**
 * What an organization presses for. Each agenda is read by the simulation:
 * `undercut` commissions work against rival infrastructure, `expand` offers
 * more contracts from its members, and `defend` hardens its members' defence.
 */
export type OrganizationAgenda = "undercut" | "expand" | "defend";

export interface UndergroundOrganization {
  id: string;
  /** Public identity. A member's contract names it; nothing else about it is shown. */
  name: string;
  kind: OrganizationKind;
  /** Hidden truth from here on. */
  motive: OrganizationMotive;
  agenda: OrganizationAgenda;
  /** Organizations at odds with this one. Symmetric, never this organization. */
  rivalIds: string[];
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

export type ContractObjectiveKind =
  | "recon-report"
  | "infrastructure-map"
  | "quiet-recon"
  | "intrusion";
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
  /** Infrastructure-map only: how many machines of the target must be known. */
  requiredMachines?: number;
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
  /** Generated scenes only (D066). Absent means no organizations, as in the authored roster. */
  organizations?: UndergroundOrganization[];
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
  | "license"
  | "tool"
  | "machine"
  | "model";

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

/**
 * An owned player-tool instance. The author handle is captured at acquisition
 * so provenance survives a save/load round-trip. Effect is derived from
 * `catalogId`, never stored.
 */
export interface OwnedPlayerTool {
  id: string;
  catalogId: string;
  /** Provenance: the author's handle at the time of purchase. */
  author: string;
  /** Credits paid when this copy was acquired (for resale context). */
  paidCost: number;
  acquiredWorldMinute: number;
}

/**
 * An owned machine instance: a complete named box. Its capability derives from
 * `catalogId`, but the display `label` is player-authored (renameable) and the
 * `paidCost` is captured at purchase, so identity and resale value survive
 * later catalog retuning — the same property model as P5 tools.
 */
export interface OwnedMachine {
  id: string;
  catalogId: string;
  /** Player-chosen display name; defaults to the catalog label. */
  label: string;
  paidCost: number;
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
  /**
   * Owned player-tool instances (authored artifacts). Each contributes a
   * SoftwareEffect permanently with no recurring fee; an empty list is the
   * baseline.
   */
  playerTools: OwnedPlayerTool[];
  /**
   * Owned machine instances (complete named boxes). Each contributes its
   * catalog capability permanently with no recurring fee; an empty list is the
   * baseline, and the whole inventory folds into the same effective profile.
   */
  ownedMachines: OwnedMachine[];
  /**
   * Catalog ids of acquired *local* models (Phase 5 property). Running one bills
   * nothing; an empty list means the player owns no model outright.
   */
  ownedModels: string[];
  /**
   * Owned self-authored workflows (Phase 5 P3). Each completed build lands here
   * and contributes its spec's effect permanently with no recurring fee — the
   * same shape as P7 tools; an empty list is the untouched pre-build baseline.
   */
  ownedWorkflows: OwnedWorkflow[];
  /**
   * Catalog id of the running model, or null. A running model is the rig's AI
   * assistant: it composes its shortcut into the same duration factor as
   * licenses and tools. Cloud models bill while they run and lapse if the fee
   * cannot be paid; local models are owned and run free. Null is the untouched
   * pre-Phase-5 baseline.
   */
  activeModel: string | null;
}

/**
 * The Nightshade briefing (G3, D071): one authored, scripted-by-rules operation
 * with two routes, a visible trace preview and an owner review on the clock.
 * Absent in every world except the `nightshade-slice` scenario, so the
 * canonical rules never read it.
 */
export interface NightshadeSliceReview {
  dueWorldMinute: number;
  reactionId: string;
  status: "scheduled" | "ran";
}

export interface NightshadeSliceLogEntry {
  worldMinute: number;
  key: string;
  footprint: number;
}

/** A clue the broker has promised, due on a later boundary (the broker answers on the owner's schedule). */
export interface NightshadeSlicePendingClue {
  clueId: SliceClueId;
  dueWorldMinute: number;
}

export interface NightshadeSliceState {
  rules: "nightshade-v1" | "nightshade-v2";
  targetId: string;
  contractId: string;
  clues: SliceClueId[];
  pendingClues: NightshadeSlicePendingClue[];
  review: NightshadeSliceReview | null;
  outcome: SliceOutcome | null;
  endedWorldMinute: number | null;
  log: NightshadeSliceLogEntry[];
}

export interface WorldState {
  /** Optional generic route challenges; absent in canonical and legacy worlds. */
  networkChallenges?: NetworkRouteChallenge[];
  worldMinute: number;
  player: PlayerState;
  /**
   * The Nightshade briefing (D071). Absent in every other scenario, including
   * every save made before G3.
   */
  slice?: NightshadeSliceState;
  /**
   * The scenario this run was started under (G2, D065). Absent in saves made
   * before G2, which are canonical.
   */
  scenario?: RunScenario;
  targets: TargetState[];
  knownTargetIds: string[];
  evidence: EvidenceRecord[];
  operation: OperationState | null;
  traces: OperationTrace[];
  reactions: OpponentReaction[];
  underground: UndergroundState;
  economy: EconomyState;
  /**
   * The AI assistant's stored reads (Phase 5 P2). At most one record per
   * target; empty is the pre-Phase-5 baseline, so every default world starts
   * with no analysis and no unverified claims.
   */
  analysis: AnalysisRecord[];
  /**
   * In-flight software builds (Phase 5 P3). Each occupies its footprint on the
   * rig until its due minute, when it moves into `economy.ownedWorkflows`.
   * Empty is the untouched pre-build baseline; a save restored mid-build
   * resumes on the same frozen clock.
   */
  builds: InFlightBuild[];
  /**
   * Authority case files opened against the player (Phase 6 P1). Advanced on
   * the same fixed world-time boundaries as the ecosystem, from the footprint
   * the player already emitted. Empty is the untouched pre-Phase-6 baseline, so
   * a default world has no investigation and nothing to read.
   */
  investigations: Investigation[];
  /**
   * Rival probe attempts against the player (Phase 6 P2), rolled inside the
   * ecosystem's own tick loop. Empty is the untouched pre-Phase-6 baseline: a
   * world where nobody holds anything against the player never generates one, so
   * every pre-P2 ecosystem roll re-runs byte-identical. `correct` on each record
   * is hidden truth that never projects, and nothing outside P3 consumes it.
   */
  probes: RivalProbe[];
  /** Phase 6 P3 physical escalation records; empty is the untouched baseline. */
  physicalThreats: PhysicalThreat[];
  /** Phase 6 P4 catastrophic conditions; empty is the pre-compromise baseline. */
  compromises: CompromiseRecord[];
  /**
   * Phase 7 P0 terminal record. Null means the run is live. Once non-null it is
   * immutable: the command bus rejects further gameplay commands.
   */
  ending: RunEndingRecord | null;
  /**
   * Phase 7 P2 voluntary-exit process. Null means no plan is active; a cooling
   * plan is still a live run and can be cancelled until P3 finalizes an ending.
   */
  retirement: RetirementPlan | null;
  /**
   * Time-owning player jobs (Game-First G1, #77): waits longer than one command
   * can finish, sleeps and fast-forwards. Empty is the pre-G1 baseline, so a
   * world with nothing queued advances exactly as before. Terminal jobs leave
   * the queue; the clock is the only resource a time job holds.
   */
  jobQueue: JobQueueState;
}

export interface InitialTargetState
  extends Omit<TargetState, "machines"> {
  machines?: MachineState[];
}

export interface InitialWorldState {
  networkChallenges?: NetworkRouteChallenge[];
  worldMinute?: number;
  /** How the starting world was made. Absent means canonical (G2, D065). */
  scenario?: RunScenario;
  player?: PlayerState;
  targets?: InitialTargetState[];
  knownTargetIds?: string[];
  evidence?: EvidenceRecord[];
  operation?: OperationState | null;
  traces?: OperationTrace[];
  reactions?: OpponentReaction[];
  underground?: Partial<UndergroundState>;
  economy?: Partial<EconomyState>;
  analysis?: AnalysisRecord[];
  builds?: InFlightBuild[];
  investigations?: Investigation[];
  probes?: RivalProbe[];
  physicalThreats?: PhysicalThreat[];
  compromises?: CompromiseRecord[];
  ending?: RunEndingRecord | null;
  retirement?: RetirementPlan | null;
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
    // Written only when a generated scene supplies organizations, so canonical
    // and pre-G2 worlds keep exactly the shape they had (D066).
    ...(initial?.organizations
      ? { organizations: structuredClone(initial.organizations) }
      : {}),
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
    playerTools: initial?.playerTools
      ? structuredClone(initial.playerTools)
      : [],
    ownedMachines: initial?.ownedMachines
      ? structuredClone(initial.ownedMachines)
      : [],
    ownedModels: initial?.ownedModels ? [...initial.ownedModels] : [],
    ownedWorkflows: initial?.ownedWorkflows
      ? structuredClone(initial.ownedWorkflows)
      : [],
    activeModel: initial?.activeModel ?? null,
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
    ...(initial.networkChallenges === undefined ? {} : {
      networkChallenges: structuredClone(initial.networkChallenges),
    }),
    worldMinute,
    player: initial.player ?? {
      handle: "unknown",
      rank: 100_000,
    },
    scenario: initial.scenario ?? DEFAULT_RUN_SCENARIO,
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
    analysis: initial.analysis ? structuredClone(initial.analysis) : [],
    builds: initial.builds ? structuredClone(initial.builds) : [],
    investigations: initial.investigations
      ? structuredClone(initial.investigations)
      : [],
    probes: initial.probes ? structuredClone(initial.probes) : [],
    physicalThreats: initial.physicalThreats
      ? structuredClone(initial.physicalThreats)
      : [],
    compromises: initial.compromises
      ? structuredClone(initial.compromises)
      : [],
    ending:
      initial.ending === undefined
        ? null
        : structuredClone(initial.ending),
    retirement:
      initial.retirement === undefined
        ? null
        : structuredClone(initial.retirement),
    jobQueue: createJobQueue(),
  };
}
