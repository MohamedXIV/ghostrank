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
      type: "enableSoftware";
      softwareId: string;
    }
  | {
      type: "disableSoftware";
      softwareId: string;
    }
  | {
      type: "buyPlayerTool";
      toolId: string;
    }
  | {
      type: "sellPlayerTool";
      toolId: string;
    }
  | {
      type: "buyMachine";
      catalogId: string;
    }
  | {
      type: "sellMachine";
      machineId: string;
    }
  | {
      type: "renameMachine";
      machineId: string;
      label: string;
    }
  | {
      type: "acquireModel";
      modelId: string;
    }
  | {
      type: "runModel";
      modelId: string;
    }
  | {
      type: "stopModel";
    }
  | {
      type: "analyzeTarget";
      targetId: string;
    }
  | {
      type: "startBuild";
      specId: string;
    }
  | {
      type: "abortBuild";
      buildId: string;
    }
  | {
      type: "advanceTime";
      minutes: number;
    }
  | {
      type: "startRetirement";
    }
  | {
      type: "commitRetirement";
    }
  | {
      type: "cancelRetirement";
    }
  | {
      type: "finishRetirement";
    }
  | {
      /** Interruptible: stops early on threats and decisions (Game-First G1). */
      type: "sleep";
      minutes: number;
    }
  | {
      /** Interruptible: stops early on threats, decisions and notices. */
      type: "fastForward";
      minutes: number;
    }
  | {
      /** Halts an interruptible time job at the current minute. */
      type: "cancelAdvance";
    }
  | {
      /**
       * Advances the active time job by at most `minutes` of world time (at most
       * MAX_PUMP_MINUTES). The runtime clock issues these; the player never types
       * one. A stoppable job is judged minute by minute, so the pump size never
       * changes where it stops (D056).
       */
      type: "pumpTime";
      minutes: number;
    }
  | {
      /**
       * One bounded step of live world time (D056). The runtime clock issues
       * these while the player is idle on LIVE. A step never crosses more than
       * one ecosystem boundary, so every boundary is still run, in order.
       */
      type: "advanceLive";
      minutes: number;
    };
