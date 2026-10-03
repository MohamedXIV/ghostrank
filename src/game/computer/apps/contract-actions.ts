import type { SimulationCommand } from "@/game/simulation/commands/types";

export type ContractVerb = "accept" | "decline" | "deliver";

export function contractActionFromGui(
  verb: ContractVerb,
  contractId: string,
): SimulationCommand {
  switch (verb) {
    case "accept":
      return { type: "acceptContract", contractId };
    case "decline":
      return { type: "declineContract", contractId };
    case "deliver":
      return { type: "deliverContract", contractId };
  }
}
