import type { SimulationCommand } from "@/game/simulation/commands/types";

export function createObserveTargetCommand(targetId: string): SimulationCommand {
  return {
    type: "observeTarget",
    targetId,
  };
}
