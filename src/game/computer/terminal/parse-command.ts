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

    case "path":
      if (args.length === 4 && args[0]?.toLowerCase() === "test" &&
          args.slice(1).every(arg => arg.length > 0)) {
        return {
          ok: true,
          command: { type: "testNetworkRoute",
            targetId: args[1]!, challengeId: args[2]!, routeId: args[3]! },
        };
      }
      return { ok: false, error: args[0]?.toLowerCase() === "map"
        ? "UNKNOWN_COMMAND" : "INVALID_ARGUMENT" };

    case "op":
      return parseOperationCommand(args);

    case "contract":
      return parseContractCommand(args);

    case "lead":
      if (args.length !== 2 || !args[1]) return { ok: false, error: "INVALID_ARGUMENT" };
      if (args[0] === "investigate") return {
        ok: true, command: { type: "investigateLead", leadId: args[1] },
      };
      if (["disclose", "trade", "exploit", "ignore"].includes(args[0])) return {
        ok: true, command: {
          type: "resolveLead",
          leadId: args[1],
          approach: args[0] as "disclose" | "trade" | "exploit" | "ignore",
        },
      };
      return { ok: false, error: "INVALID_ARGUMENT" };

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

    case "sleep":
      return parseDurationCommand(args, (minutes) => ({
        type: "sleep",
        minutes,
      }));

    case "fastforward":
    case "ff":
      return parseDurationCommand(args, (minutes) => ({
        type: "fastForward",
        minutes,
      }));

    case "halt":
    case "wake":
      return args.length === 0
        ? { ok: true, command: { type: "cancelAdvance" } }
        : { ok: false, error: "INVALID_ARGUMENT" };

    default:
      return {
        ok: false,
        error: "UNKNOWN_COMMAND",
      };
  }
}

/** A whole, positive number of minutes, as the clock verbs take it. */
function parseDurationCommand(
  args: string[],
  create: (minutes: number) => SimulationCommand,
): TerminalParseResult {
  if (args.length !== 1) {
    return { ok: false, error: "INVALID_ARGUMENT" };
  }

  const minutes = Number(args[0]);

  if (!Number.isInteger(minutes) || minutes <= 0) {
    return { ok: false, error: "INVALID_ARGUMENT" };
  }

  return { ok: true, command: create(minutes) };
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
    case "finish":
      return { ok: true, command: { type: "finishRetirement" } };
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
      // `op escalate confirm` commits after the trace preview (D071). Canonical
      // escalation takes no confirmation, so the word is harmless there.
      if (rest.length === 0) {
        return {
          ok: true,
          command: {
            type: "escalateOperation",
          },
        };
      }
      if (rest.length === 1 && rest[0]?.toLowerCase() === "confirm") {
        return {
          ok: true,
          command: {
            type: "escalateOperation",
            confirmed: true,
          },
        };
      }
      return { ok: false, error: "INVALID_ARGUMENT" };

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
