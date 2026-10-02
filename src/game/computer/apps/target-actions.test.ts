import { describe, expect, it } from "vitest";

import {
  disengageOperationFromGui,
  escalateOperationFromGui,
  inspectMachineFromGui,
  observeTargetFromGui,
  openOperationFromGui,
  surveyTargetFromGui,
} from "@/game/computer/apps/target-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("GUI domain actions", () => {
  const expectParity = (
    terminalInput: string,
    guiCommand: ReturnType<
      | typeof observeTargetFromGui
      | typeof openOperationFromGui
      | typeof surveyTargetFromGui
      | typeof inspectMachineFromGui
      | typeof escalateOperationFromGui
      | typeof disengageOperationFromGui
    >,
  ) => {
    const terminal = parseTerminalCommand(terminalInput);

    expect(terminal.ok).toBe(true);
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }

    expect(guiCommand).toEqual(terminal.command);
  };

  it("shares target observation with Terminal", () => {
    expectParity("observe nightshade", observeTargetFromGui("nightshade"));
  });

  it("shares operation opening with Terminal", () => {
    expectParity("op open nightshade", openOperationFromGui("nightshade"));
  });

  it("shares survey with Terminal", () => {
    expectParity("survey nightshade", surveyTargetFromGui("nightshade"));
  });

  it("shares machine inspection with Terminal", () => {
    expectParity("inspect ns-relay", inspectMachineFromGui("ns-relay"));
  });

  it("shares escalation with Terminal", () => {
    expectParity("op escalate", escalateOperationFromGui());
  });

  it("shares disengagement with Terminal", () => {
    expectParity("op exit", disengageOperationFromGui());
  });
});
