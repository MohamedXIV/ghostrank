import { describe, expect, it } from "vitest";

import { createObserveTargetCommand } from "@/game/interfaces/gui/commands";
import { parseTerminalCommand } from "@/game/interfaces/terminal/parser";

describe("terminal and GUI command parity", () => {
  it("produces the exact same observe command from terminal and GUI", () => {
    const guiCommand = createObserveTargetCommand("ghost");
    const terminal = parseTerminalCommand("observe ghost");

    expect(terminal).toEqual({
      ok: true,
      command: guiCommand,
    });
  });

  it("maps terminal wait to the normal simulation time command", () => {
    expect(parseTerminalCommand("wait 15")).toEqual({
      ok: true,
      command: {
        type: "advanceTime",
        minutes: 15,
      },
    });
  });

  it("rejects malformed or unknown terminal input before domain execution", () => {
    expect(parseTerminalCommand("observe")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENTS",
    });
    expect(parseTerminalCommand("rm -rf /")).toEqual({
      ok: false,
      error: "UNKNOWN_COMMAND",
    });
  });
});
