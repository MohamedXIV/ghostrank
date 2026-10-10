import type { SimulationCommand } from "@/game/simulation/commands/types";

export function observeTargetFromGui(targetId: string): SimulationCommand {
  return {
    type: "observeTarget",
    targetId,
  };
}

export function openOperationFromGui(targetId: string): SimulationCommand {
  return {
    type: "openOperation",
    targetId,
  };
}

export function surveyTargetFromGui(targetId: string): SimulationCommand {
  return {
    type: "surveyTarget",
    targetId,
  };
}

export function analyzeTargetFromGui(targetId: string): SimulationCommand {
  return {
    type: "analyzeTarget",
    targetId,
  };
}

export function inspectMachineFromGui(machineId: string): SimulationCommand {
  return {
    type: "inspectMachine",
    machineId,
  };
}

export function escalateOperationFromGui(): SimulationCommand {
  return {
    type: "escalateOperation",
  };
}

export function disengageOperationFromGui(): SimulationCommand {
  return {
    type: "disengageOperation",
  };
}

/** Shared committed route action; Recon and terminal use the same CommandBus. */
export function testNetworkRouteFromGui(
  targetId: string,
  challengeId: string,
  routeId: string,
): SimulationCommand {
  return { type: "testNetworkRoute", targetId, challengeId, routeId };
}
