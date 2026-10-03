import type { SimulationCommand } from "@/game/simulation/commands/types";

export function buyHardwareFromGui(catalogId: string): SimulationCommand {
  return {
    type: "buyHardware",
    catalogId,
  };
}
