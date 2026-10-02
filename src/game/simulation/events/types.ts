import type {
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
      type: "WorldTimeAdvanced";
      fromMinute: number;
      toMinute: number;
    };
