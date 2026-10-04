import type { SimulationCommand } from "@/game/simulation/commands/types";

export type TerminalParseResult =
  | {
      ok: true;
      command: SimulationCommand;
    }
  | {
      ok: false;
      error: "EMPTY_COMMAND" | "UNKNOWN_COMMAND" | "INVALID_ARGUMENT";
    };

export function parseTerminalCommand(input: string): TerminalParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: "EMPTY_COMMAND",
    };
  }

  const [verb, ...args] = trimmed.split(/\s+/);

  switch (verb.toLowerCase()) {
    case "observe":
      return singleIdCommand(args, (targetId) => ({
        type: "observeTarget",
        targetId,
      }));

    case "survey":
      return singleIdCommand(args, (targetId) => ({
        type: "surveyTarget",
        targetId,
      }));

    case "inspect":
      return singleIdCommand(args, (machineId) => ({
        type: "inspectMachine",
        machineId,
      }));

    case "read":
      return singleIdCommand(args, (messageId) => ({
        type: "readMessage",
        messageId,
      }));

    case "buy":
      return singleIdCommand(args, (catalogId) => ({
        type: "buyHardware",
        catalogId,
      }));

    case "rent":
      return singleIdCommand(args, (housingId) => ({
        type: "rentHousing",
        housingId,
      }));

    case "lease":
      return parseLeaseCommand(args);

    case "use":
      return singleIdCommand(args, (softwareId) => ({
        type: "enableSoftware",
        softwareId,
      }));

    case "stop":
      return singleIdCommand(args, (softwareId) => ({
        type: "disableSoftware",
        softwareId,
      }));

    case "buytool":
      return singleIdCommand(args, (toolId) => ({
        type: "buyPlayerTool",
        toolId,
      }));

    case "selltool":
      return singleIdCommand(args, (toolId) => ({
        type: "sellPlayerTool",
        toolId,
      }));

    case "op":
      return parseOperationCommand(args);

    case "contract":
      return parseContractCommand(args);

    case "wait": {
      if (args.length !== 1) {
        return {
          ok: false,
          error: "INVALID_ARGUMENT",
        };
      }

      const minutes = Number(args[0]);

      if (!Number.isInteger(minutes) || minutes <= 0) {
        return {
          ok: false,
          error: "INVALID_ARGUMENT",
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

function parseOperationCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;

  switch (subcommand?.toLowerCase()) {
    case "open":
      return singleIdCommand(rest, (targetId) => ({
        type: "openOperation",
        targetId,
      }));

    case "escalate":
      if (rest.length !== 0) {
        return { ok: false, error: "INVALID_ARGUMENT" };
      }
      return {
        ok: true,
        command: {
          type: "escalateOperation",
        },
      };

    case "exit":
      if (rest.length !== 0) {
        return { ok: false, error: "INVALID_ARGUMENT" };
      }
      return {
        ok: true,
        command: {
          type: "disengageOperation",
        },
      };

    default:
      return {
        ok: false,
        error: "INVALID_ARGUMENT",
      };
  }
}

function parseLeaseCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;

  switch (subcommand?.toLowerCase()) {
    case "break":
      if (rest.length !== 0) {
        return { ok: false, error: "INVALID_ARGUMENT" };
      }
      return {
        ok: true,
        command: {
          type: "breakLease",
        },
      };

    default:
      return { ok: false, error: "INVALID_ARGUMENT" };
  }
}

function parseContractCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;

  switch (subcommand?.toLowerCase()) {
    case "accept":
      return singleIdCommand(rest, (contractId) => ({
        type: "acceptContract",
        contractId,
      }));

    case "decline":
      return singleIdCommand(rest, (contractId) => ({
        type: "declineContract",
        contractId,
      }));

    case "deliver":
      return singleIdCommand(rest, (contractId) => ({
        type: "deliverContract",
        contractId,
      }));

    default:
      return { ok: false, error: "INVALID_ARGUMENT" };
  }
}

function singleIdCommand(
  args: string[],
  create: (id: string) => SimulationCommand,
): TerminalParseResult {
  const id = args[0];

  if (!id || args.length !== 1) {
    return {
      ok: false,
      error: "INVALID_ARGUMENT",
    };
  }

  return {
    ok: true,
    command: create(id),
  };
}
