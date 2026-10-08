import { describe, expect, it } from "vitest";

import { DISCOVERABLE_COMMANDS } from "@/components/game/terminal/command-discovery";
import { TERMINAL_HELP_TABLE } from "@/components/game/terminal/rich-terminal";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { parsePlaybackCommand } from "@/game/runtime/playback-command";

describe("terminal playback verbs (Game-First G1 closeout, D062)", () => {
  it("parses pause and resume with no argument", () => {
    expect(parsePlaybackCommand("pause")).toEqual({
      ok: true,
      request: { type: "pause" },
    });
    expect(parsePlaybackCommand("  RESUME  ")).toEqual({
      ok: true,
      request: { type: "resume" },
    });
  });

  it("parses speed as the three speeds the HUD offers", () => {
    expect(parsePlaybackCommand("speed 1")).toEqual({
      ok: true,
      request: { type: "speed", speed: "1x" },
    });
    expect(parsePlaybackCommand("Speed 4")).toEqual({
      ok: true,
      request: { type: "speed", speed: "4x" },
    });
    expect(parsePlaybackCommand("speed 16")).toEqual({
      ok: true,
      request: { type: "speed", speed: "16x" },
    });
  });

  it("refuses any other speed, and says how to use the verb", () => {
    for (const input of ["speed", "speed 2", "speed 0", "speed 16x", "speed 4 4", "speed paused"]) {
      expect(parsePlaybackCommand(input)).toEqual({
        ok: false,
        error: "Usage: speed <1|4|16>",
      });
    }
  });

  it("refuses arguments on pause and resume", () => {
    expect(parsePlaybackCommand("pause now")).toEqual({
      ok: false,
      error: "Usage: pause",
    });
    expect(parsePlaybackCommand("resume 1x")).toEqual({
      ok: false,
      error: "Usage: resume",
    });
  });

  it("treats prototype names as unknown speeds, not as speeds", () => {
    for (const input of ["speed constructor", "speed __proto__", "speed toString"]) {
      expect(parsePlaybackCommand(input)?.ok).toBe(false);
    }
  });

  it("leaves every simulation verb to the simulation parser", () => {
    for (const input of ["sleep 480", "halt", "wait 30", "observe nightshade", ""]) {
      expect(parsePlaybackCommand(input)).toBeNull();
    }
  });

  it("never produces a simulation command, so it cannot write a world event", () => {
    // The playback verbs are not in the simulation grammar at all.
    for (const input of ["pause", "resume", "speed 4"]) {
      expect(parseTerminalCommand(input).ok).toBe(false);
    }
  });

  it("documents each playback verb with an example that parses as playback", () => {
    const entries = DISCOVERABLE_COMMANDS.filter((entry) =>
      ["pause", "resume", "speed"].includes(entry.label),
    );

    expect(entries.map((entry) => entry.label).sort()).toEqual([
      "pause",
      "resume",
      "speed",
    ]);
    for (const entry of entries) {
      expect(parsePlaybackCommand(entry.example)?.ok).toBe(true);
    }
  });

  it("lists the playback verbs in the help table, aligned with the row above them", () => {
    // The table's other rows are not all one width (the contract row is wider),
    // so the check is against the neighbouring row, not the whole table.
    const rows = TERMINAL_HELP_TABLE.split("\n").filter((line) => line.startsWith("│"));
    const index = rows.findIndex((row) => row.includes("pause|resume|speed"));

    expect(index).toBeGreaterThan(0);
    expect([...rows[index]!].length).toBe([...rows[index - 1]!].length);
  });
});
