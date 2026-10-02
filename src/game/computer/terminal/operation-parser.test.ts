import { describe, expect, it } from "vitest";

import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("operation terminal commands", () => {
  it("maps op open to the operation command", () => {
    expect(parseTerminalCommand("op open nightshade")).toEqual({
      ok: true,
      command: {
        type: "openOperation",
        targetId: "nightshade",
      },
    });
  });

  it("maps op escalate and op exit", () => {
    expect(parseTerminalCommand("op escalate")).toEqual({
      ok: true,
      command: {
        type: "escalateOperation",
      },
    });
    expect(parseTerminalCommand("op exit")).toEqual({
      ok: true,
      command: {
        type: "disengageOperation",
      },
    });
  });

  it("rejects malformed operation commands", () => {
    expect(parseTerminalCommand("op open")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
    expect(parseTerminalCommand("op escalate extra")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
  });
});
