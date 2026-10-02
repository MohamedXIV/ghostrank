import { createObserveTargetCommand } from "@/game/interfaces/commands";
import type { SimulationCommand } from "@/game/simulation/commands/types";

export type TerminalParseError =
  | "EMPTY_COMMAND"
  | "INVALID_ARGUMENTS"
  | "UNKNOWN_COMMAND";

export type TerminalParseResult =
  | {
      ok: true;
      command: SimulationCommand;
    }
  | {
      ok: false;
      error: TerminalParseError;
    };

export function parseTerminalCommand(input: string): TerminalParseResult {
  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      error: "EMPTY_COMMAND",
    };
  }

  const tokens = trimmed.split(/\s+/);
  const [command, ...args] = tokens;

  switch (command) {
    case "observe": {
      if (args.length !== 1 || args[0].length === 0) {
        return {
          ok: false,
          error: "INVALID_ARGUMENTS",
        };
      }

      return {
        ok: true,
        command: createObserveTargetCommand(args[0]),
      };
    }

    case "wait": {
      if (args.length !== 1 || !/^\d+$/.test(args[0])) {
        return {
          ok: false,
          error: "INVALID_ARGUMENTS",
        };
      }

      const minutes = Number(args[0]);

      if (!Number.isSafeInteger(minutes) || minutes <= 0) {
        return {
          ok: false,
          error: "INVALID_ARGUMENTS",
        };
      }

      return {
        ok: true,
        command: {
          type: "advanceTime",
          minutes,
        },
      };
    }

    default:
      return {
        ok: false,
        error: "UNKNOWN_COMMAND",
      };
  }
}
