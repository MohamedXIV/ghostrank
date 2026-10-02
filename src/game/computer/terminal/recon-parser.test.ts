import { describe, expect, it } from "vitest";

import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("recon terminal commands", () => {
  it("maps survey to a target reconnaissance command", () => {
    expect(parseTerminalCommand("survey nightshade")).toEqual({
      ok: true,
      command: {
        type: "surveyTarget",
        targetId: "nightshade",
      },
    });
  });

  it("maps inspect to a machine inspection command", () => {
    expect(parseTerminalCommand("inspect ns-relay")).toEqual({
      ok: true,
      command: {
        type: "inspectMachine",
        machineId: "ns-relay",
      },
    });
  });

  it("rejects malformed recon arguments", () => {
    expect(parseTerminalCommand("survey")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
    expect(parseTerminalCommand("inspect one two")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
  });
});
