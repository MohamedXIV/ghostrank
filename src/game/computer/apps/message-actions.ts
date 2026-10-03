import type { SimulationCommand } from "@/game/simulation/commands/types";

export function readMessageFromGui(messageId: string): SimulationCommand {
  return {
    type: "readMessage",
    messageId,
  };
}
