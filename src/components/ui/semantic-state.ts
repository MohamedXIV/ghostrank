export type TruthLevel =
  | "confirmed"
  | "observed"
  | "inferred"
  | "rumored"
  | "stale"
  | "unknown";

export interface TruthLevelMeta {
  label: string;
  glyph: string;
}

/**
 * Presentation-only epistemic vocabulary.
 *
 * These labels never determine simulation truth. UI callers must choose a
 * level from player-safe projection facts they already received.
 */
export const TRUTH_LEVEL_META: Readonly<Record<TruthLevel, TruthLevelMeta>> = {
  confirmed: { label: "CONFIRMED", glyph: "✓" },
  observed: { label: "OBSERVED", glyph: "◉" },
  inferred: { label: "INFERRED", glyph: "◇" },
  rumored: { label: "RUMORED", glyph: "≈" },
  stale: { label: "STALE", glyph: "◷" },
  unknown: { label: "UNKNOWN", glyph: "?" },
};

export function truthLevelMeta(level: TruthLevel): TruthLevelMeta {
  return TRUTH_LEVEL_META[level];
}
