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
      type: "readMessage";
      messageId: string;
    }
  | {
      type: "acceptContract";
      contractId: string;
    }
  | {
      type: "declineContract";
      contractId: string;
    }
  | {
      type: "deliverContract";
      contractId: string;
    }
  | {
      type: "buyHardware";
      catalogId: string;
    }
  | {
      type: "rentHousing";
      housingId: string;
    }
  | {
      type: "breakLease";
    }
  | {
      type: "advanceTime";
      minutes: number;
    };
