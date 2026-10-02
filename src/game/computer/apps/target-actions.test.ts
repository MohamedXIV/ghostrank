import { describe, expect, it } from "vitest";

import { observeTargetFromGui } from "@/game/computer/apps/target-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("target GUI actions", () => {
  it("uses the exact same domain command as the terminal route", () => {
    const terminal = parseTerminalCommand("observe nightshade");

    expect(terminal.ok).toBe(true);
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }

    expect(observeTargetFromGui("nightshade")).toEqual(terminal.command);
  });
});
