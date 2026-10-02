export type SimulationEvent =
  | {
      type: "TargetObserved";
      targetId: string;
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
      type: "WorldTimeAdvanced";
      fromMinute: number;
      toMinute: number;
    };
