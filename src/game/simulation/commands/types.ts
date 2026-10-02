export type SimulationCommand =
  | {
      type: "observeTarget";
      targetId: string;
    }
  | {
      type: "surveyTarget";
      targetId: string;
    }
  | {
      type: "inspectMachine";
      machineId: string;
    }
  | {
      type: "advanceTime";
      minutes: number;
    };
