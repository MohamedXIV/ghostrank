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

    case "analyze":
      return singleIdCommand(args, (targetId) => ({
        type: "analyzeTarget",
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

    case "box":
      return parseBoxCommand(args);

    case "model":
      return parseModelCommand(args);

    case "build":
      return parseBuildCommand(args);

    case "op":
      return parseOperationCommand(args);

    case "contract":
      return parseContractCommand(args);

    case "retire":
      return parseRetirementCommand(args);

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

function parseRetirementCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;
  if (rest.length !== 0) {
    return { ok: false, error: "INVALID_ARGUMENT" };
  }

  switch (subcommand?.toLowerCase()) {
    case "plan":
      return { ok: true, command: { type: "startRetirement" } };
    case "commit":
      return { ok: true, command: { type: "commitRetirement" } };
    case "cancel":
      return { ok: true, command: { type: "cancelRetirement" } };
    default:
      return { ok: false, error: "INVALID_ARGUMENT" };
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

function parseBoxCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;

  switch (subcommand?.toLowerCase()) {
    case "buy":
      return singleIdCommand(rest, (catalogId) => ({
        type: "buyMachine",
        catalogId,
      }));

    case "sell":
      return singleIdCommand(rest, (machineId) => ({
        type: "sellMachine",
        machineId,
      }));

    case "name":
      // `box name <instance-id> <label...>` — the label is free text (trimmed,
      // length-capped, and rejected if empty by the simulation), so the rest of
      // the arguments are rejoined rather than requiring a single token.
      if (rest.length < 2) {
        return { ok: false, error: "INVALID_ARGUMENT" };
      }
      return {
        ok: true,
        command: {
          type: "renameMachine",
          machineId: rest[0],
          label: rest.slice(1).join(" "),
        },
      };

    default:
      return { ok: false, error: "INVALID_ARGUMENT" };
  }
}

function parseModelCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;

  switch (subcommand?.toLowerCase()) {
    case "buy":
      return singleIdCommand(rest, (modelId) => ({
        type: "acquireModel",
        modelId,
      }));

    case "run":
      return singleIdCommand(rest, (modelId) => ({
        type: "runModel",
        modelId,
      }));

    case "stop":
      if (rest.length !== 0) {
        return { ok: false, error: "INVALID_ARGUMENT" };
      }
      return { ok: true, command: { type: "stopModel" } };

    default:
      return { ok: false, error: "INVALID_ARGUMENT" };
  }
}

function parseBuildCommand(args: string[]): TerminalParseResult {
  const [subcommand, ...rest] = args;

  switch (subcommand?.toLowerCase()) {
    case undefined:
      return { ok: false, error: "INVALID_ARGUMENT" };

    case "abort":
      return singleIdCommand(rest, (buildId) => ({
        type: "abortBuild",
        buildId,
      }));

    default:
      // `build <spec-id>` — a bare argument is the spec to commission.
      return singleIdCommand(args, (specId) => ({
        type: "startBuild",
        specId,
      }));
  }
}

function parseContractCommand(args: string[]): TerminalParseResult {  const [subcommand, ...rest] = args;

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
