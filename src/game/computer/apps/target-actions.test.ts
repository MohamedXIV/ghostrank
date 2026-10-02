import { describe, expect, it } from "vitest";

import {
  inspectMachineFromGui,
  observeTargetFromGui,
  surveyTargetFromGui,
} from "@/game/computer/apps/target-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("target GUI actions", () => {
  it("uses the exact same observe command as the terminal route", () => {
    const terminal = parseTerminalCommand("observe nightshade");

    expect(terminal.ok).toBe(true);
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }

    expect(observeTargetFromGui("nightshade")).toEqual(terminal.command);
  });

  it("uses the exact same survey command as the terminal route", () => {
    const terminal = parseTerminalCommand("survey nightshade");

    expect(terminal.ok).toBe(true);
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }

    expect(surveyTargetFromGui("nightshade")).toEqual(terminal.command);
  });

  it("uses the exact same inspect command as the terminal route", () => {
    const terminal = parseTerminalCommand("inspect ns-relay");

    expect(terminal.ok).toBe(true);
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }

    expect(inspectMachineFromGui("ns-relay")).toEqual(terminal.command);
  });
});
