import { describe, expect, it } from "vitest";

import { retirementActionFromGui } from "@/game/computer/apps/retirement-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("retirement command parity", () => {
  it.each([
    ["retire plan", "plan", { type: "startRetirement" }],
    ["retire commit", "commit", { type: "commitRetirement" }],
    ["retire cancel", "cancel", { type: "cancelRetirement" }],
  ] as const)(
    "maps %s and the GUI %s action to the same simulation command",
    (input, verb, expected) => {
      expect(parseTerminalCommand(input)).toEqual({
        ok: true,
        command: expected,
      });
      expect(retirementActionFromGui(verb)).toEqual(expected);
    },
  );

  it.each([
    "retire",
    "retire now",
    "retire plan extra",
    "retire commit extra",
    "retire cancel extra",
  ])("rejects malformed retirement command %s", (input) => {
    expect(parseTerminalCommand(input)).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
  });
});
