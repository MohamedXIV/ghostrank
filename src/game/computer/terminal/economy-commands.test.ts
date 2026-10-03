import { describe, expect, it } from "vitest";

import { buyHardwareFromGui } from "@/game/computer/apps/economy-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("buy command", () => {
  it("shares buyHardware between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("buy cpu-overclock");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "buyHardware", catalogId: "cpu-overclock" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(buyHardwareFromGui("cpu-overclock")).toEqual(terminal.command);
  });

  it("rejects malformed buy arguments", () => {
    for (const input of ["buy", "buy cpu-overclock ram-bank"]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});
