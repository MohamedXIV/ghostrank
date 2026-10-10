import { runningJobFor } from "@/game/simulation/scheduler/job-queue";
import {
  SLICE_CLUES,
  SLICE_LOG_TEXT,
  SLICE_WINDOW_END_MINUTE,
  type SliceClueId,
  type SliceOutcome,
} from "@/content/nightshade-slice";
import {
  footprintOf,
  previewSliceActions,
  sliceMapStatus,
  watchActive,
  type SlicePreview,
} from "@/game/simulation/systems/nightshade-slice";
import {
  isInterruptibleKind,
  type TimeJobKind,
} from "@/game/simulation/systems/time-jobs";
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
  deriveWorkflowCapability,
} from "@/game/simulation/systems/tools";
import {
  WORKFLOW_SPEC_CATALOG,
  findWorkflowSpec,
} from "@/content/workflow-spec-catalog";
import {
  availablePool,
  buildMinutes,
  deliverableEffect,
  settledBuildDueMinute,
} from "@/game/simulation/systems/builds";
import { recurringDailyCost } from "@/game/simulation/systems/upkeep";
import { deriveInvestigationStage } from "@/game/simulation/systems/investigations";
import { probeArtifactOf } from "@/game/simulation/systems/probes";
import {
  deriveLongRunPressure,
  type LongRunPressureBand,
  type LongRunPressureReason,
} from "@/game/simulation/systems/long-run-pressure";
import {
  compromiseLabel,
  derivePostmortems,
  type PostmortemAttribution,
  type PostmortemStepKind,
} from "@/game/simulation/systems/postmortem";
import {
  derivePresence,
  relocationMinutes,
} from "@/game/simulation/systems/location";
import {
  deriveRetirementOutcome,
  retirementBlockers,
  retirementStatus,
  type RetirementBlocker,
  type RetirementStatus,
  type RetirementVariant,
} from "@/game/simulation/systems/retirement";
import {
  deriveValueGraph,
  type ValueGraph,
} from "@/game/simulation/systems/value-graph";
import {
  HOUSING_CATALOG,
  type HousingAnonymity,
  type HousingKind,
} from "@/content/housing-catalog";
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
import { machineMarketVisible } from "@/game/simulation/systems/exotic-capability";
import {
  MODEL_CATALOG,
  findModelItem,
  type ModelFootprint,
  type ModelSource,
} from "@/content/model-catalog";
import { contestedModelFactor } from "@/game/simulation/systems/contention";
import {
  SOFTWARE_CATALOG,
  findSoftwareItem,
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
  type AnalysisConfidence,
  type CompromiseKind,
  type EvidenceKind,
  type ContractObjectiveKind,
  type ContractStatus,
  type InvestigationSignalKind,
  type InvestigationStage,
  type PhysicalSignalKind,
  type RivalProbeArtifactKind,
  type LedgerCauseKind,
  type LedgerDirection,
  type OperationState,
  type RetaliationKind,
  type RunEndingStatus,
  type UndergroundNetwork,
  type WorkflowOutcome,
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

/**
 * One claim of the assistant's read, as much of it as the player is allowed to
 * see.
 *
 * `subject` is a display handle, never the world id. Analysis claims can only
 * describe structure recon has not observed yet (that is what makes them worth
 * asking for), so exposing a real id would hand over hidden topology for free and
 * turn the assistant into a cheat. Handles are anonymous per-kind counters —
 * `unmapped host 1`, `unmapped service 2` — which also keeps the display
 * *uniform*: a hallucinated subject and a real-but-unmapped one are
 * indistinguishable on screen, exactly as they should be. Even for a service
 * claim, whose host is legitimately visible (the generator only predicts services
 * of surveyed machines), naming the host would flag the fabricated claims as the
 * ones with no host, so it is withheld for all of them.
 *
 * `accurate` never leaves the simulation. Its entire purpose is to be discovered
 * by doing recon; projecting it would grade the assistant for the player.
 */
export interface VisibleAnalysisClaim {
  kind: "machine-role" | "service-kind";
  /** What the assistant thinks the subject is. */
  assertion: string;
  /** Anonymous, safe-to-show handle for the subject. */
  subject: string;
  confidence: AnalysisConfidence;
}

/** The current stored read of one target, for the targets the player knows. */
export interface VisibleAnalysisRecord {
  targetId: string;
  modelId: string;
  /** Display label for the model that produced it; falls back to the raw id. */
  modelLabel: string;
  worldMinute: number;
  claims: VisibleAnalysisClaim[];
}

/**
 * A build spec the forge offers — the IR made visible. Fictional data only:
 * the steps are the design language of `docs/HACKING_AND_TOOLS.md`, never code,
 * and the effect is the same capability language licenses and tools use. The
 * estimate is *this* rig's current compute minutes with no assistant shortcut;
 * a running model shortens it further, and queueing builds lengthen later ones.
 */
export interface VisibleWorkflowSpec {
  id: string;
  label: string;
  steps: string[];
  tests: string[];
  /** Base minutes at this rig's compute, before any model shortcut. */
  estimatedMinutes: number;
  footprint: { vram: number; storage: number };
  capability: HardwareCapability | null;
  discountFactor: number | null;
  /** The premium license this workflow replaces, for the FORGE copy. */
  replacesLabel: string;
}

/**
 * An in-flight build job. The frozen `outcome` is deliberately **not** here:
 * a report card the player could read halfway through the job grades the roll
 * for free and destroys the build-time tension. What is visible is the plan
 * (spec, start, due) and the occupancy the rig is paying for.
 */
export interface VisibleBuild {
  id: string;
  specId: string;
  specLabel: string;
  modelLabel: string;
  startedWorldMinute: number;
  dueWorldMinute: number;
  /** Status only — the hidden outage end is never projected as a countdown. */
  paused: boolean;
  footprint: { vram: number; storage: number };
}

/**
 * A completed, owned self-authored workflow — projected in full, outcome and
 * test report included. The asymmetry with analysis claims is principled: the
 * assistant predicted *someone else's* hidden topology, so its truth stays
 * internal; a forge build is the player's own ground truth, witnessed by the
 * queue from the start, and hiding its report would grade nothing.
 */
export interface VisibleOwnedWorkflow {
  id: string;
  specId: string;
  label: string;
  outcome: WorkflowOutcome;
  builtWithLabel: string;
  acquiredWorldMinute: number;
  tests: string[];
  capability: HardwareCapability | null;
  discountFactor: number | null;
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

/**
 * Phase 6 P1 — one piece of evidence a case file has surfaced. The player reads
 * *what kind of thing they noticed* and when, plus a line of fiction in the
 * target's own handle so the evidence names the thing it is about; the material
 * behind it and the traces that produced it stay in the simulation (D028/D030).
 */
export interface VisibleInvestigationSignal {
  id: string;
  kind: InvestigationSignalKind;
  targetHandle: string;
  worldMinute: number;
}

/**
 * An open authority case file, as the player can see it: whose target it is,
 * the evidence list, and the band those items imply. `progress`, `sourceIds`,
 * and `openedWorldMinute` are deliberately absent — the first is a hidden
 * number, the second is causal provenance P5 reads, and the third would let a
 * player subtract to find a deadline this design refuses to state.
 */
export interface VisibleInvestigation {
  id: string;
  targetId: string;
  stage: InvestigationStage;
  signals: VisibleInvestigationSignal[];
}

/**
 * A rival probe's observable face (Phase 6 P2): which kind of thing you noticed
 * and when. Deliberately three facts short of the record — `actorId` (whose
 * curiosity it was), `subject` (which seat of your standing they aimed at), and
 * `correct` (whether the read landed) — because none is observable from inside
 * the fiction: you can notice a ping, you cannot notice what someone was
 * *looking for* or that they were wrong about you. The tell is *derived* from
 * the seat rather than shipped alongside it, so the surface shows the artifact
 * and the inference from tell back to seat stays the player's work — and the
 * projection cannot contradict the world, so a restored game shows exactly the
 * tells it showed before.
 */
export interface VisibleProbe {
  id: string;
  artifactKind: RivalProbeArtifactKind;
  worldMinute: number;
}

/** P3's observable physical evidence; every cause and impact field stays hidden. */
export interface VisiblePhysicalSignal {
  id: string;
  kind: PhysicalSignalKind;
  worldMinute: number;
  /**
   * Derived against current presence so the room can avoid presenting an old
   * safehouse's history as if it were happening outside the new one.
   */
  atCurrentLocation: boolean;
}

/**
 * P4's visible catastrophic condition. Cause ids remain hidden until P5's
 * postmortem; during the run the player gets only the named loss and its minute.
 */
export interface VisibleCompromise {
  id: string;
  kind: CompromiseKind;
  label: string;
  worldMinute: number;
}

/**
 * P5's postmortem is a safe derived read over hidden provenance. The text has
 * already been constrained to player-knowable facts; no source ids or hidden
 * truth fields cross this interface.
 */
export interface VisiblePostmortemStep {
  id: string;
  kind: PostmortemStepKind;
  worldMinute: number;
  text: string;
}

export interface VisiblePostmortem {
  compromiseId: string;
  compromiseKind: CompromiseKind;
  compromiseLabel: string;
  worldMinute: number;
  attribution: PostmortemAttribution;
  note: string;
  steps: VisiblePostmortemStep[];
}

/**
 * P0 terminal projection. The cause id remains authoritative provenance for
 * later run history; the live final screen needs only the final status + time.
 */
export interface VisibleRunEnding {
  status: RunEndingStatus;
  label: string;
  worldMinute: number;
  variant?: RetirementVariant;
  detail?: string;
}

export interface VisibleRetirement {
  status: RetirementStatus;
  blockers: RetirementBlocker[];
  startedWorldMinute: number;
  committedWorldMinute?: number;
  readyWorldMinute?: number;
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

/**
 * Phase 5 P4: a peer's running assistant, name and model label only. This is
 * the ecosystem-side half of "AI is part of the world, not a player-exclusive
 * superpower" made visible without leaking anything: no skill/defense lift
 * leaves the simulation (the roll uses `actor.modelId`, projection shows only
 * *that* the peer runs a model, which every observer of the marketplace can
 * already infer — the design's leak rule from D029 keeps hidden-truth numbers
 * inside the simulation).
 */
export interface VisibleAssistant {
  actorId: string;
  handle: string;
  /** Display label for the model this peer runs; raw id if the catalog dropped it. */
  modelLabel: string;
  /** Author provenance on the model label, so the peer's tool reads as authored. */
  modelAuthor: string | null;
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
  /** The public name of the issuer's organization, when it has one (D066). */
  issuerOrganization?: string;
  targetId: string;
  targetHandle: string;
  objective: ContractObjectiveKind;
  requiredServices?: number;
  requiredMachines?: number;
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
  /** Phase 5 P4: which peers run which assistant (name + model label only). */
  assistants: VisibleAssistant[];
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
  /**
   * Phase 6 P0: what kind of dwelling this is, and how public. Names, never
   * numbers — `anonymity` is a band, and it is consumed by P3's physical
   * retaliation, not by anything today.
   */
  kind: HousingKind | "baseline";
  anonymity: HousingAnonymity;
  /**
   * World minutes a relocation here costs from the district you are in now.
   * `0` means "next door — no time passes", which is why signing a Phase 4
   * lease is still instant.
   */
  travelMinutes: number;
}

/**
 * Phase 6 P0 — where the player physically is, derived from the lease they hold
 * (`systems/location.ts`). It is on the world projection rather than the
 * economy one because its consumer is the *physical* surface: the room renderer
 * reads this instead of hardcoding a caption, and the bridge contract that
 * reaches Phaser is built from it. Nothing here is authoritative state — it is
 * a read of `economy.housing`, so eviction and relocation can never disagree
 * with it.
 */
export interface VisiblePresence {
  locationId: string;
  label: string;
  kind: HousingKind | "baseline";
  anonymity: HousingAnonymity;
  leased: boolean;
  dailyCost: number;
  distanceMinutes: number;
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
  exotic: boolean;
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
  /**
   * Phase 5 P4 marketplace provenance: the author handle an in-fiction peer
   * sells this copy under, or null for a market house brand. Buying an authored
   * model debits this peer, so the value graph gains a named edge — the P5 tool
   * template, reused. The Market panel shows `by <author>` only when present.
   */
  author: string | null;
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
  /** Combined capability lift from all owned self-built workflows (P3). */
  workflows: HardwareCapability;
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
  /** The forge's shelf: buildable workflow specs with this rig's estimates. */
  workflowSpecs: VisibleWorkflowSpec[];
  /** In-flight build jobs (plan and occupancy only, never the outcome). */
  builds: VisibleBuild[];
  /** Completed self-built workflows, projected in full. */
  ownedWorkflows: VisibleOwnedWorkflow[];
  hardware: VisibleHardware[];
  catalog: VisibleCatalogItem[];
  ledger: VisibleLedgerEntry[];
  /** The player's value network, derived from the full ledger. */
  valueGraph: ValueGraph;
}

export interface VisibleLongRunPressure {
  band: LongRunPressureBand;
  reasons: LongRunPressureReason[];
}

/** The player-owned time job holding the clock, as the HUD may show it (D055). */
export interface VisibleClockJob {
  kind: TimeJobKind;
  startedWorldMinute: number;
  targetWorldMinute: number;
  interruptible: boolean;
}

export interface WorldProjection {
  worldMinute: number;
  clockJob: VisibleClockJob | null;
  player: {
    handle: string;
    rank: number;
  };
  targets: VisibleTarget[];
  machines: VisibleMachine[];
  services: VisibleService[];
  /**
   * The assistant's current reads, for known targets only. Empty by default —
   * the pre-Phase-5 projection is untouched when no analysis has been run.
   */
  analysis: VisibleAnalysisRecord[];
  operation: OperationState | null;
  footprint: VisibleFootprint;
  reactions: VisibleReaction[];
  /**
   * Phase 6 P1: open authority case files, for known targets only. Empty is the
   * pre-Phase-6 baseline, so a world with no footprint projects exactly what it
   * projected before this slice existed.
   */
  investigations: VisibleInvestigation[];
  /**
   * Phase 6 P2: the tells rivals have left, newest first. Empty is the
   * pre-Phase-6 baseline, so a world nobody is curious about projects exactly
   * what it did before this slice existed.
   */
  probes: VisibleProbe[];
  /** Phase 6 P3: ambiguous physical evidence, newest first. */
  physicalSignals: VisiblePhysicalSignal[];
  /** Phase 6 P4: durable named compromise conditions, newest first. */
  compromises: VisibleCompromise[];
  /** Phase 6 P5: player-safe causal reads, one per compromise. */
  postmortems: VisiblePostmortem[];
  /** Phase 7 P0: null while live, terminal status once the run has ended. */
  ending: VisibleRunEnding | null;
  /** Phase 7 P2: player-controlled wind-down/cooling plan, null when idle. */
  retirement: VisibleRetirement | null;
  /**
   * The Nightshade briefing (G3, D071). Present only in that scenario, so every
   * other projection keeps exactly the shape it had before G3.
   */
  slice?: VisibleNightshadeBriefing;
  /**
   * Phase 7 P5: coarse player-safe veteran pressure. Numeric bonuses remain
   * simulation internals; the surface gets only the band and the history
   * categories that caused it.
   */
  longRunPressure: VisibleLongRunPressure;
  descriptors: ReputationDescriptor[];
  underground: UndergroundProjection;
  economy: EconomyProjection;
  /**
   * Phase 6 P0: where the player physically is, derived from the held lease.
   * A default world has no lease, so this is always the baseline room — the
   * zero-regression identity that keeps every pre-Phase-6 projection test
   * byte-identical while giving the physical surface real data to render.
   */
  presence: VisiblePresence;
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
  // An issuer's organization is shown by its public name only. Motive, agenda
  // and rivalries are hidden truth and never leave the simulation (D066).
  const organizationNames = new Map(
    (underground.organizations ?? []).map((org) => [org.id, org.name]),
  );
  const issuerOrganizations = new Map(
    underground.actors.flatMap((actor) => {
      const name =
        actor.organizationId === undefined
          ? undefined
          : organizationNames.get(actor.organizationId);
      return name === undefined ? [] : [[actor.id, name] as const];
    }),
  );

  for (const contract of [...underground.contracts].reverse()) {
    if (contract.status === "declined") {
      continue;
    }

    const issuerOrganization = issuerOrganizations.get(contract.issuerId);

    contracts.push({
      id: contract.id,
      issuerHandle: handles.get(contract.issuerId) ?? contract.issuerId,
      ...(issuerOrganization === undefined ? {} : { issuerOrganization }),
      targetId: contract.targetId,
      targetHandle:
        targetHandles.get(contract.targetId) ?? contract.targetId,
      objective: contract.objective,
      requiredServices: contract.requiredServices,
      requiredMachines: contract.requiredMachines,
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

  const assistants: VisibleAssistant[] = [];

  for (const actor of underground.actors) {
    if (!actor.modelId) {
      continue;
    }

    const model = findModelItem(actor.modelId);

    assistants.push({
      actorId: actor.id,
      handle: actor.handle,
      modelLabel: model?.label ?? actor.modelId,
      modelAuthor: model?.author ?? null,
    });
  }

  return {
    board,
    feed,
    stances,
    inbox: { messages: newestFirst, unread },
    contracts,
    retaliations,
    forum,
    assistants,
  };
}

function evidenceSubjects(
  state: WorldState,
  kind: EvidenceKind,
): Set<string> {
  return new Set(
    state.evidence
      .filter(
        (record) =>
          record.kind === kind && record.retiredWorldMinute === undefined,
      )
      .map((record) => record.subjectId),
  );
}

/**
 * The Nightshade briefing as the player may read it (D071). Clue and log text
 * come from authored content by key. The preview carries only rules the player
 * can reason about: minutes, weights, thresholds and what leaving would end
 * with. The owner's stored state beyond its schedule never leaves the simulation.
 */
export interface VisibleNightshadeBriefing {
  rules: "nightshade-v1";
  targetId: string;
  targetHandle: string;
  outcome: SliceOutcome | null;
  endedWorldMinute: number | null;
  windowEndWorldMinute: number;
  contract: { id: string; status: string } | null;
  clues: { id: SliceClueId; title: string; text: string }[];
  pendingClues: { clueId: SliceClueId; title: string; dueWorldMinute: number }[];
  map: { known: number; needed: number; relayOnMap: boolean; vaultOnMap: boolean };
  footprint: number;
  watched: boolean;
  review: { dueWorldMinute: number; status: "scheduled" | "ran" } | null;
  preview: SlicePreview | null;
  log: { worldMinute: number; text: string; footprint: number }[];
}

function projectNightshadeBriefing(state: WorldState): VisibleNightshadeBriefing {
  const slice = state.slice;

  if (!slice) {
    throw new RangeError("No Nightshade briefing on this world.");
  }

  const target = state.targets.find((candidate) => candidate.id === slice.targetId);
  const contract = state.underground.contracts.find(
    (candidate) => candidate.id === slice.contractId,
  );

  return {
    rules: slice.rules,
    targetId: slice.targetId,
    targetHandle: target?.handle ?? slice.targetId,
    outcome: slice.outcome,
    endedWorldMinute: slice.endedWorldMinute,
    windowEndWorldMinute: SLICE_WINDOW_END_MINUTE,
    contract: contract ? { id: contract.id, status: contract.status } : null,
    clues: slice.clues.map((clueId) => ({
      id: clueId,
      title: SLICE_CLUES[clueId].title,
      text: SLICE_CLUES[clueId].text,
    })),
    pendingClues: slice.pendingClues.map((pending) => ({
      clueId: pending.clueId,
      title: SLICE_CLUES[pending.clueId].title,
      dueWorldMinute: pending.dueWorldMinute,
    })),
    map: sliceMapStatus(state),
    footprint: footprintOf(state, slice.targetId),
    watched: watchActive(state, slice.targetId),
    review: slice.review
      ? { dueWorldMinute: slice.review.dueWorldMinute, status: slice.review.status }
      : null,
    preview: slice.outcome === null ? previewSliceActions(state) : null,
    log: slice.log.map((entry) => ({
      worldMinute: entry.worldMinute,
      text: SLICE_LOG_TEXT[entry.key] ?? entry.key,
      footprint: entry.footprint,
    })),
  };
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
  const workflows = deriveWorkflowCapability(state.economy);
  const capability = effectiveCapability(state.economy);
  // Phase 5 P1: a running local model contends with the rig's vram/storage
  // pool, so both the combined factor and each listing's *delivered* factor
  // are read against the derived pool. Cloud footprints are zero, so renting
  // is never contended by the player's own hardware.
  // Phase 5 P3: in-flight builds are tenants of the same pool, so the factor
  // is read against what remains after the whole queue takes its share.
  const factor = combinedActionDurationFactor(
    state.economy,
    capability,
    state.builds,
  );
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
    kind: item.kind ?? "residential",
    anonymity: item.anonymity ?? "public",
    // What a relocation *here* costs from where the player stands now, so the
    // price of a move is legible before the player commits to it.
    travelMinutes: relocationMinutes(state.economy.housing, item.id),
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

  const machineListings: VisibleMachineListing[] = MACHINE_CATALOG
    .filter((item) => machineMarketVisible(state, item.id))
    .map((item) => ({
      id: item.id,
      label: item.label,
      cost: item.cost,
      ownedCount: ownedMachineCounts.get(item.id) ?? 0,
      capability: { ...item.capability },
      exotic: item.exotic === true,
    }));

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
        // P3: a build queue taxes the pool the model runs against too.
        availablePool(capability, state.builds, findWorkflowSpec),
      ),
      footprint: { ...item.footprint },
      author: item.author ?? null,
      owned: state.economy.ownedModels.includes(item.id),
      running: state.economy.activeModel === item.id,
    };
  });

  // The forge's shelf: every spec with this rig's honest estimate. The estimate
  // is bare compute minutes — a running assistant shortens it further at
  // commissioning, which the panel says rather than fakes here.
  const workflowSpecs: VisibleWorkflowSpec[] = WORKFLOW_SPEC_CATALOG.map(
    (spec) => ({
      id: spec.id,
      label: spec.label,
      steps: [...spec.steps],
      tests: [...spec.tests],
      estimatedMinutes: buildMinutes(spec, capability),
      footprint: { ...spec.footprint },
      capability:
        spec.effect.kind === "capability"
          ? { ...spec.effect.capability }
          : null,
      discountFactor:
        spec.effect.kind === "modifier" ? spec.effect.discount.factor : null,
      replacesLabel:
        findSoftwareItem(spec.replaces)?.label ?? spec.replaces,
    }),
  );

  // In-flight jobs show the plan and the occupancy — never the frozen outcome.
  const builds: VisibleBuild[] = state.builds.map((build) => {
    const spec = findWorkflowSpec(build.specId);

    return {
      id: build.id,
      specId: build.specId,
      specLabel: spec?.label ?? build.specId,
      modelLabel: findModelItem(build.modelId)?.label ?? build.modelId,
      startedWorldMinute: build.startedWorldMinute,
      // Stored due is immutable; only closed pause time shifts this derived view.
      dueWorldMinute: settledBuildDueMinute(build),
      paused: build.pausedAtWorldMinute !== undefined,
      footprint: spec
        ? { ...spec.footprint }
        : { vram: 0, storage: 0 },
    };
  });

  const ownedWorkflows: VisibleOwnedWorkflow[] =
    state.economy.ownedWorkflows.map((workflow) => {
      const spec = findWorkflowSpec(workflow.specId);
      const delivered = spec
        ? deliverableEffect(spec, workflow.outcome)
        : undefined;

      return {
        id: workflow.id,
        specId: workflow.specId,
        label: workflow.label,
        outcome: workflow.outcome,
        builtWithLabel:
          findModelItem(workflow.builtWithModelId)?.label ??
          workflow.builtWithModelId,
        acquiredWorldMinute: workflow.acquiredWorldMinute,
        tests: spec ? [...spec.tests] : [],
        capability:
          delivered?.kind === "capability"
            ? { ...delivered.capability }
            : null,
        discountFactor:
          delivered?.kind === "modifier"
            ? delivered.discount.factor
            : null,
      };
    });

  return {
    credits: state.economy.credits,
    capability,
    lease,
    software,
    playerTools,
    workflows,
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
    workflowSpecs,
    builds,
    ownedWorkflows,
    hardware,
    catalog,
    ledger,
    valueGraph,
  };
}

/**
 * Project the assistant's stored reads, for known targets only. Claims keep
 * their generation order so the panel matches the record; each subject gets the
 * next anonymous handle of its kind.
 */
function projectAnalysis(
  state: WorldState,
  knownTargets: Set<string>,
): VisibleAnalysisRecord[] {
  const records: VisibleAnalysisRecord[] = [];

  for (const record of state.analysis) {
    if (!knownTargets.has(record.targetId)) {
      continue;
    }

    // Subjects get anonymous per-kind counters, never world ids: a claim may
    // only describe unobserved structure, so any real id would leak it.
    let hostCount = 0;
    let serviceCount = 0;

    records.push({
      targetId: record.targetId,
      modelId: record.modelId,
      modelLabel: findModelItem(record.modelId)?.label ?? record.modelId,
      worldMinute: record.worldMinute,
      claims: record.claims.map((claim) => ({
        kind: claim.kind,
        assertion: claim.assertion,
        subject:
          claim.kind === "machine-role"
            ? `unmapped host ${++hostCount}`
            : `unmapped service ${++serviceCount}`,
        confidence: claim.confidence,
      })),
    });
  }

  return records;
}

/**
 * Project the open case files, for known targets only, newest evidence first
 * within each file. The hidden `progress`, the causal `sourceIds`, and the
 * opening minute all stay in the simulation: the first is a number the design
 * refuses to show, the second is the provenance P5's postmortem folds, and the
 * third is the raw material of a countdown.
 */
function projectInvestigations(
  state: WorldState,
  knownTargets: Set<string>,
): VisibleInvestigation[] {
  const targetHandles = new Map(
    state.targets.map((target) => [target.id, target.handle]),
  );
  const visible: VisibleInvestigation[] = [];

  for (const investigation of state.investigations) {
    if (!knownTargets.has(investigation.targetId)) {
      continue;
    }

    visible.push({
      id: investigation.id,
      targetId: investigation.targetId,
      stage: deriveInvestigationStage(investigation.signals),
      signals: [...investigation.signals]
        .reverse()
        .map((signal) => ({
          id: signal.id,
          kind: signal.kind,
          // A known target's handle is evidence the player already has; the
          // signal never carries a machine, service, or actor id it has not
          // earned.
          targetHandle:
            targetHandles.get(investigation.targetId) ??
            investigation.targetId,
          worldMinute: signal.surfacedWorldMinute,
        })),
    });
  }

  return visible;
}

/**
 * Project the probe tells, newest first, and only the observable half of each
 * record: who probed and whether they were right stay in the simulation, where
 * P3 can be genuinely fooled by them.
 */
function projectProbes(state: WorldState): VisibleProbe[] {
  return [...state.probes].reverse().map((probe) => ({
    id: probe.id,
    artifactKind: probeArtifactOf(probe.subject),
    worldMinute: probe.worldMinute,
  }));
}

function projectPhysicalSignals(state: WorldState): VisiblePhysicalSignal[] {
  const currentLocationId = derivePresence(state.economy.housing).locationId;

  return [...state.physicalThreats].reverse().map((threat) => ({
    id: threat.id,
    kind: threat.signalKind,
    worldMinute: threat.worldMinute,
    atCurrentLocation: threat.locationId === currentLocationId,
  }));
}

function projectCompromises(state: WorldState): VisibleCompromise[] {
  return [...state.compromises].reverse().map((record) => ({
    id: record.id,
    kind: record.kind,
    label: compromiseLabel(record.kind),
    worldMinute: record.worldMinute,
  }));
}

const RUN_ENDING_LABELS: Record<RunEndingStatus, string> = {
  arrested: "ARRESTED",
  unmasked: "UNMASKED",
  missing: "MISSING",
  compromised: "COMPROMISED",
  stranded: "STRANDED",
  retired: "RETIRED",
  vanished: "VANISHED",
};

function projectEnding(state: WorldState): VisibleRunEnding | null {
  if (!state.ending) {
    return null;
  }

  const retirementOutcome =
    state.ending.causeKind === "retirement"
      ? deriveRetirementOutcome(state)
      : null;

  return {
    status: state.ending.status,
    label: RUN_ENDING_LABELS[state.ending.status],
    worldMinute: state.ending.worldMinute,
    ...(retirementOutcome
      ? {
          variant: retirementOutcome.variant,
          detail: retirementOutcome.detail,
        }
      : {}),
  };
}

function projectRetirement(state: WorldState): VisibleRetirement | null {
  const plan = state.retirement;
  if (!plan) {
    return null;
  }

  if (plan.stage === "planning") {
    return {
      status: "planning",
      blockers: retirementBlockers(state),
      startedWorldMinute: plan.startedWorldMinute,
    };
  }

  return {
    status: retirementStatus(state),
    blockers: [],
    startedWorldMinute: plan.startedWorldMinute,
    committedWorldMinute: plan.committedWorldMinute,
    readyWorldMinute: plan.coolingUntilWorldMinute,
  };
}

function projectLongRunPressure(
  state: WorldState,
): VisibleLongRunPressure {
  const pressure = deriveLongRunPressure(state);

  return {
    band: pressure.band,
    reasons: [...pressure.reasons],
  };
}

function projectClockJob(state: WorldState): VisibleClockJob | null {
  const job = runningJobFor(state.jobQueue, "clock");

  if (!job) {
    return null;
  }

  const kind = job.kind as TimeJobKind;

  return {
    kind,
    startedWorldMinute: job.startedWorldMinute,
    targetWorldMinute: job.dueWorldMinute,
    interruptible: isInterruptibleKind(kind),
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
    clockJob: projectClockJob(state),
    player: {
      handle: state.player.handle,
      rank: state.player.rank,
    },
    targets,
    machines,
    services,
    analysis: projectAnalysis(state, knownTargets),
    operation: state.operation ? structuredClone(state.operation) : null,
    footprint: {
      score: footprintScore,
      level: footprintLevel(footprintScore),
      traceCount: state.traces.length,
    },
    reactions,
    investigations: projectInvestigations(state, knownTargets),
    probes: projectProbes(state),
    physicalSignals: projectPhysicalSignals(state),
    compromises: projectCompromises(state),
    postmortems: derivePostmortems(state),
    ending: projectEnding(state),
    retirement: projectRetirement(state),
    longRunPressure: projectLongRunPressure(state),
    descriptors: deriveReputationDescriptors(state),
    underground: projectUnderground(state, knownTargets),
    economy: projectEconomy(state, handles),
    presence: derivePresence(state.economy.housing),
    ...(state.slice ? { slice: projectNightshadeBriefing(state) } : {}),
  };
}
