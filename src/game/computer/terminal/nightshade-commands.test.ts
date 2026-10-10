import { describe, expect, it } from "vitest";

import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("terminal: escalation confirmation (D071)", () => {
  it("parses a bare escalation as an unconfirmed command", () => {
    expect(parseTerminalCommand("op escalate")).toEqual({
      ok: true,
      command: { type: "escalateOperation" },
    });
  });

  it("parses `op escalate confirm` as the confirmed command the bus expects", () => {
    expect(parseTerminalCommand("op escalate confirm")).toEqual({
      ok: true,
      command: { type: "escalateOperation", confirmed: true },
    });
  });

  it("refuses any other argument to escalation rather than guessing what was meant", () => {
    expect(parseTerminalCommand("op escalate now")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
    expect(parseTerminalCommand("op escalate confirm now")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
  });
});
