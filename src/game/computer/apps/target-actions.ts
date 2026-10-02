import type { SimulationCommand } from "@/game/simulation/commands/types";

export function observeTargetFromGui(targetId: string): SimulationCommand {
  return {
    type: "observeTarget",
    targetId,
  };
}

export function surveyTargetFromGui(targetId: string): SimulationCommand {
  return {
    type: "surveyTarget",
    targetId,
  };
}

export function inspectMachineFromGui(machineId: string): SimulationCommand {
  return {
    type: "inspectMachine",
    machineId,
  };
}
