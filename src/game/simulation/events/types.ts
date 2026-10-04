import type {
  ContractObjectiveKind,
  ForumSubjectKind,
  LedgerCauseKind,
  LedgerDirection,
  OpponentReactionKind,
  RetaliationKind,
  UndergroundNetwork,
  UndergroundIncidentOutcome,
  UndergroundRumorKind,
  OperationStage,
  TraceCause,
  TraceSeverity,
} from "@/game/simulation/state/world-state";

export type SimulationEvent =
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
      type: "WorldTimeAdvanced";
      fromMinute: number;
      toMinute: number;
    };
