import type { SimulationCommand } from "@/game/simulation/commands/types";

export function observeTargetFromGui(targetId: string): SimulationCommand {
  return {
    type: "observeTarget",
    targetId,
  };
}
