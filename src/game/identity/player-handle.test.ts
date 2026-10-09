import { describe, expect, it } from "vitest";

import {
  PLAYER_HANDLE_HINT,
  PLAYER_HANDLE_MAX_LENGTH,
  PLAYER_HANDLE_MIN_LENGTH,
  checkPlayerHandleShape,
  describePlayerHandleRejection,
  isStoredPlayerHandle,
  validatePlayerHandle,
  type PlayerHandleRejection,
} from "@/game/identity/player-handle";

const ROSTER = ["NIGHTSHADE", "VESPER", "DAYSTAR"] as const;

describe("player handle shape (Game-First G2, #78)", () => {
  it("accepts letters, digits and one separator between parts", () => {
    for (const handle of [
      "CobaltXZ",
      "ghost",
      "Night_Wren",
      "run-7",
      "a1b",
      "Zero0Trace",
    ]) {
      expect(validatePlayerHandle(handle)).toEqual({ ok: true, handle });
    }
  });

  it("accepts exactly the minimum and maximum lengths", () => {
    const shortest = "a".repeat(PLAYER_HANDLE_MIN_LENGTH);
    const longest = "a".repeat(PLAYER_HANDLE_MAX_LENGTH);

    expect(validatePlayerHandle(shortest)).toEqual({ ok: true, handle: shortest });
    expect(validatePlayerHandle(longest)).toEqual({ ok: true, handle: longest });
  });

  it("names the length rule when a handle is too short or too long", () => {
    expect(validatePlayerHandle("ab")).toEqual({ ok: false, reason: "too-short" });
    expect(validatePlayerHandle("a".repeat(PLAYER_HANDLE_MAX_LENGTH + 1))).toEqual({
      ok: false,
      reason: "too-long",
    });
  });

  it("treats a blank or whitespace-only entry as empty", () => {
    expect(validatePlayerHandle("")).toEqual({ ok: false, reason: "empty" });
    expect(validatePlayerHandle("   \t ")).toEqual({ ok: false, reason: "empty" });
  });

  it("trims surrounding space before judging the length and the shape", () => {
    expect(validatePlayerHandle("  Wren  ")).toEqual({ ok: true, handle: "Wren" });
    expect(validatePlayerHandle("  ab  ")).toEqual({ ok: false, reason: "too-short" });
  });

  it.each([
    ["an inner space", "Ghost Runner"],
    ["a leading separator", "-ghost"],
    ["a trailing separator", "ghost_"],
    ["a doubled separator", "a--b"],
    ["mixed separators", "a_-b"],
    ["punctuation", "ghost!"],
    ["a dot", "ghost.run"],
    ["a non-ASCII letter", "Café"],
    ["an emoji", "ghost🙂"],
  ])("rejects %s as invalid characters", (_label, input) => {
    expect(validatePlayerHandle(input)).toEqual({
      ok: false,
      reason: "invalid-characters",
    });
  });

  it("rejects a look-alike spelled with another alphabet", () => {
    // Cyrillic capital A (U+0410) in place of the Latin A in NIGHTSHADE.
    const lookAlike = "NIGHTSHАDE";

    expect(validatePlayerHandle(lookAlike, ROSTER)).toEqual({
      ok: false,
      reason: "invalid-characters",
    });
  });

  it("applies the shape rule to a stored string without trimming it", () => {
    expect(checkPlayerHandleShape(" ghost")).toBe("invalid-characters");
    expect(checkPlayerHandleShape("ghost ")).toBe("invalid-characters");
    expect(checkPlayerHandleShape("ghost")).toBeNull();
  });
});

describe("player handle roster collision (Game-First G2, #78)", () => {
  it("refuses an authored actor or target name, ignoring case", () => {
    for (const taken of ["NIGHTSHADE", "nightshade", "Vesper", " daystar "]) {
      expect(validatePlayerHandle(taken, ROSTER)).toEqual({
        ok: false,
        reason: "taken",
      });
    }
  });

  it("allows a near miss to an authored name", () => {
    expect(validatePlayerHandle("NIGHTSHADE2", ROSTER)).toEqual({
      ok: true,
      handle: "NIGHTSHADE2",
    });
  });

  it("checks the shape before the roster, so a bad name is never reported as taken", () => {
    expect(validatePlayerHandle("NIGHTSHADE!", ROSTER)).toEqual({
      ok: false,
      reason: "invalid-characters",
    });
  });

  it("does not consult a roster it was not given", () => {
    expect(validatePlayerHandle("NIGHTSHADE")).toEqual({
      ok: true,
      handle: "NIGHTSHADE",
    });
  });
});

describe("stored player handle (save-data invariant)", () => {
  it("accepts every handle an existing save or fixture already carries", () => {
    for (const legacy of [
      "CobaltXZ",
      "cobaltxz",
      "ghost",
      "legacy",
      "unknown",
      "BetaStress",
      "PhantomZero",
      "GridRunner",
      "ZeroTrace",
    ]) {
      expect(isStoredPlayerHandle(legacy)).toBe(true);
    }
  });

  it("rejects an empty, padded or malformed stored handle", () => {
    for (const bad of ["", "  x", "x  ", "NIGHTSHADE!", "a".repeat(17)]) {
      expect(isStoredPlayerHandle(bad)).toBe(false);
    }
  });

  it("does not reject a stored handle merely because the roster names it", () => {
    // The roster rule is an entry rule; a save must survive content changes.
    expect(isStoredPlayerHandle("NIGHTSHADE")).toBe(true);
  });
});

describe("player-facing rejection copy", () => {
  const reasons: PlayerHandleRejection[] = [
    "empty",
    "too-short",
    "too-long",
    "invalid-characters",
    "taken",
  ];

  it("gives every rejection a non-empty explanation of the rule", () => {
    for (const reason of reasons) {
      expect(describePlayerHandleRejection(reason).length).toBeGreaterThan(0);
    }
  });

  it("never reveals hidden simulation words or the colliding name", () => {
    for (const reason of reasons) {
      expect(describePlayerHandleRejection(reason)).not.toMatch(
        /actor|probe|trace|rank|seed|hidden|grudge|NIGHTSHADE|VESPER|DAYSTAR/i,
      );
    }
  });

  it("states the standing rule in the hint", () => {
    expect(PLAYER_HANDLE_HINT).toContain("3–16");
  });
});
