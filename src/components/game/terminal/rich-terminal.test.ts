import { describe, expect, it } from "vitest";
import {
  formatDetailedHelp,
  formatRichCommandResult,
  formatRichError,
  TERMINAL_GUIDE_TABLE,
  TERMINAL_HELP_TABLE,
  TERMINAL_LEGEND_TABLE,
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
    expect(TERMINAL_HELP_TABLE).toContain("SYSTEM DISCOVERY");
  });

  it("provides detailed syntax help for specific commands", () => {
    const observeHelp = formatDetailedHelp("observe");
    expect(observeHelp).not.toBeNull();
    expect(observeHelp).toContain("observe <target>");
    expect(observeHelp).toContain("Reconnaissance");

    const surveyHelp = formatDetailedHelp("SURVEY");
    expect(surveyHelp).not.toBeNull();
    expect(surveyHelp).toContain("survey <target>");

    expect(formatDetailedHelp("nonexistent_command")).toBeNull();
  });

  it("formats epistemic truth vocabulary and field guide tables cleanly", () => {
    expect(TERMINAL_LEGEND_TABLE).toContain("EPISTEMIC TRUTH VOCABULARY");
    expect(TERMINAL_LEGEND_TABLE).toContain("CONFIRMED (●)");
    expect(TERMINAL_LEGEND_TABLE).toContain("OBSERVED  (○)");
    expect(TERMINAL_LEGEND_TABLE).toContain("INFERRED  (◇)");
    expect(TERMINAL_LEGEND_TABLE).toContain("AI CONFIDENCE PIPS");

    expect(TERMINAL_GUIDE_TABLE).toContain("OPERATIONAL FIELD GUIDE");
    expect(TERMINAL_GUIDE_TABLE).toContain("observe <target>");
    expect(TERMINAL_GUIDE_TABLE).toContain("survey <target>");
    expect(TERMINAL_GUIDE_TABLE).toContain("inspect <machine>");
  });
});
