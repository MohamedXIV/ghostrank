export type SimulationCommand =
  | {
      type: "observeTarget";
      targetId: string;
    }
  | {
      type: "openOperation";
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
      type: "escalateOperation";
    }
  | {
      type: "disengageOperation";
    }
  | {
      type: "advanceTime";
      minutes: number;
    };
