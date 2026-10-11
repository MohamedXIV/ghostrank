import type { ModelSource } from "@/content/model-catalog";
import type { WorkflowOutcome } from "@/game/simulation/state/world-state";
import type {
  CompromiseKind,
  ContractObjectiveKind,
  ForumSubjectKind,
  InvestigationSignalKind,
  InvestigationStage,
  LedgerCauseKind,
  LedgerDirection,
  OpponentReactionKind,
  PhysicalSignalKind,
  PhysicalThreatKind,
  RetaliationKind,
  RunEndingCauseKind,
  RunEndingStatus,
  RivalProbeArtifactKind,
  RivalProbeSubject,
  UndergroundNetwork,
  OrganizationAgenda,
  UndergroundIncidentOutcome,
  UndergroundRumorKind,
  OperationStage,
  TraceCause,
  TraceSeverity,
} from "@/game/simulation/state/world-state";

export type SimulationEvent =
  | {
      type: "NetworkRouteTested";
      targetId: string;
      challengeId: string;
      routeId: string;
      epoch: number;
      result: "confirmed" | "refuted" | "stale";
      worldMinute: number;
    }
  | {
      type: "SliceClueGranted";
      clueId: string;
      targetId: string;
      worldMinute: number;
    }
  | {
      type: "SliceReviewScheduled";
      targetId: string;
      dueWorldMinute: number;
      worldMinute: number;
    }
  | {
      type: "SliceReviewRan";
      targetId: string;
      retiredMachineIds: string[];
      worldMinute: number;
    }
  | {
      type: "SliceEnded";
      targetId: string;
      outcome: string;
      worldMinute: number;
    }
  | {
      type: "TargetObserved";
      targetId: string;
      worldMinute: number;
    }
  | {
      type: "OperationOpened";
      targetId: string;
      stage: "recon";
      worldMinute: number;
    }
  | {
      type: "MachineObserved";
      targetId: string;
      machineId: string;
      worldMinute: number;
    }
  | {
      type: "ServiceObserved";
      targetId: string;
      machineId: string;
      serviceId: string;
      worldMinute: number;
    }
  | {
      type: "OperationEscalated";
      targetId: string;
      fromStage: "recon";
      toStage: "intrusive";
      worldMinute: number;
    }
  | {
      type: "OperationDisengaged";
      targetId: string;
      stage: OperationStage;
      worldMinute: number;
    }
  | {
      type: "TraceRecorded";
      traceId: string;
      targetId: string;
      cause: TraceCause;
      severity: TraceSeverity;
      worldMinute: number;
    }
  | {
      type: "OpponentReactionTriggered";
      reactionId: string;
      targetId: string;
      kind: OpponentReactionKind;
      sourceTraceIds: string[];
      footprintScore: number;
      worldMinute: number;
    }
  | {
      /** Authority event only: an NPC's internal priorities are not public evidence. */
      type: "OrganizationAgendaShifted";
      organizationId: string;
      from: OrganizationAgenda;
      to: OrganizationAgenda;
      reason: "rival-breach" | "quiet-recovery";
      causeIncidentId: string;
      worldMinute: number;
    }
  | {
      type: "UndergroundActivity";
      incidentId: string;
      actorId: string;
      counterpartId: string;
      outcome: UndergroundIncidentOutcome;
      public: boolean;
      worldMinute: number;
    }
  | {
      type: "ActorRankChanged";
      actorId: string;
      fromRank: number;
      toRank: number;
      incidentId: string;
      worldMinute: number;
    }
  | {
      type: "RelationshipChanged";
      relationshipId: string;
      fromId: string;
      toId: string;
      trust: number;
      fear: number;
      grudge: number;
      causeKind:
        | "content"
        | "opportunity"
        | "incident"
        | "reaction"
        | "rumor"
        | "contract"
        | "intrusion"
        | "retaliation"
        | "unmasking";
      causeId: string;
      worldMinute: number;
    }
  | {
      type: "RumorSpread";
      rumorId: string;
      kind: UndergroundRumorKind;
      sourceId: string;
      relayId: string;
      accurate: boolean;
      worldMinute: number;
    }
  | {
      type: "MessageDelivered";
      messageId: string;
      fromId: string;
      rumorId: string;
      worldMinute: number;
    }
  | {
      type: "MessageRead";
      messageId: string;
      worldMinute: number;
    }
  | {
      type: "NarrativeOpened";
      sceneId: string;
      worldMinute: number;
    }
  | {
      type: "NarrativeChoiceRecorded";
      sceneId: string;
      choiceIndex: number;
      worldMinute: number;
    }
  | {
      type: "OpportunityDiscovered";
      leadId: string;
      origin: "public-incident" | "relay-report";
      worldMinute: number;
    }
  | {
      type: "OpportunityExpired";
      leadId: string;
      worldMinute: number;
    }
  | {
      type: "OpportunityInvestigated";
      leadId: string;
      worldMinute: number;
    }
  | {
      type: "OpportunityResolved";
      leadId: string;
      approach: "disclose" | "trade" | "exploit" | "ignore";
      worldMinute: number;
    }
  | {
      type: "ContractOffered";
      contractId: string;
      issuerId: string;
      targetId: string;
      objective: ContractObjectiveKind;
      expiresWorldMinute: number;
      worldMinute: number;
    }
  | {
      type: "ContractAccepted";
      contractId: string;
      dueWorldMinute: number;
      worldMinute: number;
    }
  | {
      type: "ContractDeclined";
      contractId: string;
      worldMinute: number;
    }
  | {
      type: "ContractDelivered";
      contractId: string;
      worldMinute: number;
    }
  | {
      type: "ContractExpired";
      contractId: string;
      stage: "offer" | "accepted";
      worldMinute: number;
    }
  | {
      /** Authority event: a resolved authored reaction, not a player-safe projection. */
      type: "ContentReactionResolved";
      reactionId: string;
      ruleId: string;
      sourceContractId: string;
      result: "applied" | "blocked";
      reason: "applied" | "missing-actor" | "invalid-source" | "insufficient-resource";
      worldMinute: number;
    }
  | {
      type: "PlayerRankChanged";
      fromRank: number;
      toRank: number;
      causeKind: "contract" | "retaliation";
      causeId: string;
      worldMinute: number;
    }
  | {
      type: "Retaliation";
      retaliationId: string;
      actorId: string;
      kind: RetaliationKind;
      worldMinute: number;
    }
  | {
      type: "ForumPosted";
      postId: string;
      board: UndergroundNetwork;
      authorId: string;
      subjectKind: ForumSubjectKind;
      subjectId: string;
      worldMinute: number;
    }
  | {
      type: "ValueTransferred";
      entryId: string;
      direction: LedgerDirection;
      amount: number;
      balanceAfter: number;
      causeKind: LedgerCauseKind;
      causeId: string;
      counterparty: string;
      worldMinute: number;
    }
  | {
      type: "HardwareAcquired";
      hardwareId: string;
      catalogId: string;
      cost: number;
      worldMinute: number;
    }
  | {
      type: "HousingChanged";
      housingId: string | null;
      dailyCost: number;
      worldMinute: number;
    }
  | {
      type: "SoftwareChanged";
      softwareId: string;
      active: boolean;
      dailyCost: number;
      worldMinute: number;
    }
  | {
      type: "PlayerToolAcquired";
      toolId: string;
      catalogId: string;
      /** Provenance edge: the author this copy was bought from. */
      author: string;
      cost: number;
      worldMinute: number;
    }
  | {
      type: "PlayerToolSold";
      toolId: string;
      catalogId: string;
      author: string;
      proceeds: number;
      worldMinute: number;
    }
  | {
      type: "MachineAcquired";
      machineId: string;
      catalogId: string;
      /** The display name at purchase (the catalog label). */
      label: string;
      cost: number;
      worldMinute: number;
    }
  | {
      type: "MachineSold";
      machineId: string;
      catalogId: string;
      label: string;
      proceeds: number;
      worldMinute: number;
    }
  | {
      type: "MachineRenamed";
      machineId: string;
      label: string;
      worldMinute: number;
    }
  | {
      type: "ModelAcquired";
      modelId: string;
      label: string;
      /** One-time credits paid for the local copy. */
      cost: number;
      worldMinute: number;
    }
  | {
      type: "ModelChanged";
      modelId: string;
      /** True when the model is now running; false when stopped or lapsed. */
      active: boolean;
      /** Which economic shape it carries: rented cloud or owned local. */
      source: ModelSource;
      /** Credits per world day while it runs (0 for a local model). */
      dailyCost: number;
      worldMinute: number;
    }
  | {
      type: "AnalysisCompleted";
      targetId: string;
      /** The assistant that produced the read. */
      modelId: string;
      /** How many claims the record carries; 0 means the target held nothing unseen. */
      claimCount: number;
      worldMinute: number;
    }
  | {
      type: "BuildStarted";
      buildId: string;
      specId: string;
      /** The assistant commissioned for the job. */
      modelId: string;
      /** Frozen build duration in world minutes. */
      minutes: number;
      worldMinute: number;
    }
  | {
      type: "BuildCompleted";
      buildId: string;
      specId: string;
      modelId: string;
      /** The frozen roll, revealed only now — the report card lands with it. */
      outcome: WorkflowOutcome;
      worldMinute: number;
    }
  | {
      type: "BuildAborted";
      buildId: string;
      specId: string;
      worldMinute: number;
    }
  | {
      type: "InvestigationAdvanced";
      investigationId: string;
      targetId: string;
      /** The evidence item this review surfaced, citable in a postmortem. */
      signalId: string;
      kind: InvestigationSignalKind;
      /** The visible band, derived from how much evidence has surfaced. */
      stage: InvestigationStage;
      worldMinute: number;
    }
  | {
      type: "RivalProbe";
      probeId: string;
      /**
       * Who looked. World truth, citable by P3 and P5 — the projection never
       * carries it, because you cannot observe a rival's belief, only the tell
       * they left behind.
       */
      actorId: string;
      /** Which seat of the player's infrastructure was aimed at. */
      subject: RivalProbeSubject;
      /** The observable artifact: the only part of a probe a player can see. */
      artifactKind: RivalProbeArtifactKind;
      worldMinute: number;
    }
  | {
      type: "PhysicalThreat";
      threatId: string;
      /** Hidden cause truth for simulation provenance; projections omit it. */
      actorId: string;
      kind: PhysicalThreatKind;
      signalKind: PhysicalSignalKind;
      sourceProbeId: string;
      affectedBuildIds: string[];
      destroyedHardwareIds: string[];
      worldMinute: number;
    }
  | {
      type: "NpcAssistantAdopted";
      actorId: string;
      modelId: string;
      causeThreatId: string;
      worldMinute: number;
    }
  | {
      type: "CompromiseRecorded";
      compromiseId: string;
      kind: CompromiseKind;
      sourceThreatId: string;
      sourceProbeId: string;
      sourceInvestigationIds: string[];
      worldMinute: number;
    }
  | {
      type: "RunEnded";
      status: RunEndingStatus;
      causeKind: RunEndingCauseKind;
      causeId: string;
      worldMinute: number;
    }
  | {
      type: "RetirementPlanned";
      worldMinute: number;
    }
  | {
      type: "RetirementCoolingStarted";
      readyWorldMinute: number;
      worldMinute: number;
    }
  | {
      type: "RetirementCancelled";
      stage: "planning" | "cooling";
      worldMinute: number;
    }
  | {
      type: "WorldTimeAdvanced";
      fromMinute: number;
      toMinute: number;
    }
  | {
      type: "TimeJobStarted";
      jobId: string;
      kind: "wait" | "sleep" | "fast-forward";
      startedWorldMinute: number;
      targetWorldMinute: number;
    }
  | {
      type: "TimeJobProgressed";
      jobId: string;
      kind: "wait" | "sleep" | "fast-forward";
      worldMinute: number;
      targetWorldMinute: number;
    }
  | {
      type: "TimeJobCompleted";
      jobId: string;
      kind: "wait" | "sleep" | "fast-forward";
      worldMinute: number;
    }
  | {
      type: "TimeJobInterrupted";
      jobId: string;
      kind: "wait" | "sleep" | "fast-forward";
      worldMinute: number;
      targetWorldMinute: number;
      /** The event type that stopped the job, for the player-facing reason. */
      cause: string;
    }
  | {
      type: "TimeJobCancelled";
      jobId: string;
      kind: "wait" | "sleep" | "fast-forward";
      worldMinute: number;
      targetWorldMinute: number;
    };
