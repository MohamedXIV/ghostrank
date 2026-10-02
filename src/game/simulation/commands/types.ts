export type SimulationCommand =
  | {
      type: "observeTarget";
      targetId: string;
    }
  | {
      type: "advanceTime";
      minutes: number;
    };
