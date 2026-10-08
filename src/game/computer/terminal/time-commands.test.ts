import { describe, expect, it } from "vitest";

import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { DISCOVERABLE_COMMANDS } from "@/components/game/terminal/command-discovery";
import { formatRichError } from "@/components/game/terminal/rich-terminal";

describe("terminal clock verbs (Game-First G1)", () => {
  it("parses sleep and fast-forward as whole positive minutes", () => {
    expect(parseTerminalCommand("sleep 480")).toEqual({
      ok: true,
      command: { type: "sleep", minutes: 480 },
    });
    expect(parseTerminalCommand("ff 1440")).toEqual({
      ok: true,
      command: { type: "fastForward", minutes: 1440 },
    });
    expect(parseTerminalCommand("FastForward 60")).toEqual({
      ok: true,
      command: { type: "fastForward", minutes: 60 },
    });
  });

  it("maps halt and wake to the one cancel command the GUI also sends", () => {
    expect(parseTerminalCommand("halt")).toEqual({
      ok: true,
      command: { type: "cancelAdvance" },
    });
    expect(parseTerminalCommand("wake")).toEqual({
      ok: true,
      command: { type: "cancelAdvance" },
    });
  });

  it("refuses missing, fractional, zero or negative durations", () => {
    for (const input of ["sleep", "sleep 0", "sleep -3", "sleep 1.5", "ff", "ff 2 3"]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });

  it("refuses arguments on halt", () => {
    expect(parseTerminalCommand("halt now")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
  });

  it("keeps wait exactly as it was", () => {
    expect(parseTerminalCommand("wait 30")).toEqual({
      ok: true,
      command: { type: "advanceTime", minutes: 30 },
    });
  });

  it("documents every clock verb with an example that parses", () => {
    const clockEntries = DISCOVERABLE_COMMANDS.filter((entry) =>
      ["sleep", "ff", "halt"].includes(entry.label),
    );

    expect(clockEntries.map((entry) => entry.label).sort()).toEqual([
      "ff",
      "halt",
      "sleep",
    ]);
    for (const entry of clockEntries) {
      expect(parseTerminalCommand(entry.example).ok).toBe(true);
    }
  });
});

describe("player-facing clock refusals (Game-First G1)", () => {
  it("explains a busy clock in plain words rather than a raw code", () => {
    const message = formatRichError("TIME_JOB_ACTIVE");

    expect(message.badge).toBe("ERROR");
    expect(message.text).toContain("The clock is busy");
    expect(message.text).not.toMatch(/TIME_JOB_ACTIVE/);
  });

  it("says a wait cannot be halted rather than refusing with a code", () => {
    expect(formatRichError("ADVANCE_NOT_CANCELLABLE").text).toBe(
      "This wait cannot be halted // It finishes on its own",
    );
  });

  it("leaves unrelated refusals in their existing form", () => {
    expect(formatRichError("MACHINE_NOT_OBSERVED").text).toBe(
      "machine_not_observed // Type 'help' to review valid command formats",
    );
  });
});
