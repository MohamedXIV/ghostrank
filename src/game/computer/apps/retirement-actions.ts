import type { SimulationCommand } from "@/game/simulation/commands/types";

export type RetirementVerb = "plan" | "commit" | "cancel";

export function retirementActionFromGui(
  verb: RetirementVerb,
): SimulationCommand {
  switch (verb) {
    case "plan":
      return { type: "startRetirement" };
    case "commit":
      return { type: "commitRetirement" };
    case "cancel":
      return { type: "cancelRetirement" };
  }
}
