import { describe, expect, it } from "vitest";
import {
  formatRichCommandResult,
  formatRichError,
  TERMINAL_HELP_TABLE,
} from "@/components/game/terminal/rich-terminal";

describe("Rich Terminal formatting presentation contracts", () => {
  it("provides structured badges and non-color glyphs for all major command results", () => {
    const commands = [
      "observeTarget",
      "openOperation",
      "surveyTarget",
      "inspectMachine",
      "analyzeTarget",
      "escalateOperation",
      "disengageOperation",
      "acceptContract",
      "deliverContract",
      "buyHardware",
      "commitRetirement",
    ] as const;

    for (const cmd of commands) {
      const res = formatRichCommandResult(cmd);
      expect(res.badge.length).toBeGreaterThan(0);
      expect(res.glyph.length).toBeGreaterThan(0);
      expect(res.text.length).toBeGreaterThan(0);
    }
  });

  it("formats error messages with an actionable hint and badge", () => {
    const err = formatRichError("INVALID_ARGUMENT");
    expect(err.badge).toBe("ERROR");
    expect(err.glyph).toBe("✕");
    expect(err.text).toContain("invalid_argument");
    expect(err.text).toContain("help");
  });

  it("includes all command categories in the structured ASCII help directory", () => {
    expect(TERMINAL_HELP_TABLE).toContain("RECONNAISSANCE");
    expect(TERMINAL_HELP_TABLE).toContain("RIG & INFRASTRUCTURE");
    expect(TERMINAL_HELP_TABLE).toContain("UNDERGROUND & CAREER");
  });
});
