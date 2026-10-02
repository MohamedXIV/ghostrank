export type SimulationEvent =
  | {
      type: "TargetObserved";
      targetId: string;
      worldMinute: number;
    }
  | {
      type: "WorldTimeAdvanced";
      fromMinute: number;
      toMinute: number;
    };
