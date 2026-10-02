import { describe, expect, it } from "vitest";

import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";

describe("parseTerminalCommand", () => {
  it("maps observe to the same domain command used by the simulation", () => {
    expect(parseTerminalCommand("observe nightshade")).toEqual({
      ok: true,
      command: {
        type: "observeTarget",
        targetId: "nightshade",
      },
    });
  });

  it("maps wait to world-time advancement", () => {
    expect(parseTerminalCommand("wait 15")).toEqual({
      ok: true,
      command: {
        type: "advanceTime",
        minutes: 15,
      },
    });
  });

  it("returns a readable fictional-shell error for unknown commands", () => {
    expect(parseTerminalCommand("rm -rf /")).toEqual({
      ok: false,
      error: "UNKNOWN_COMMAND",
    });
  });
});
