import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { PhysicalIntent } from "@/game/phaser/types";

export function physicalIntentToCommand(
  intent: PhysicalIntent,
): SimulationCommand {
  switch (intent.type) {
    case "wait":
      return {
        type: "advanceTime",
        minutes: intent.minutes,
      };
  }
}
