/**
 * Player handle rules (Game-First G2, #78).
 *
 * The handle is the name the player operates under. It is typed once at run
 * start, stored on the run, and shown through the desktop header, the public
 * rank listing, the ending and History. It is chosen, not earned: nothing in
 * this module reads rank, and no handle grants a bonus or a gate (AGENTS.md).
 *
 * Two rules, kept apart on purpose:
 *
 * - The shape rule is a save-data invariant. Every stored handle satisfies it,
 *   so the persistence boundary can never hold a name the entry screen could
 *   not have produced. Shape never reads the roster, so a later content change
 *   cannot make an existing save unreadable.
 * - The roster rule is an entry rule. A new run may not take the name of an
 *   authored actor or target, because the player would otherwise appear to be
 *   someone the world already knows. It is checked when a run is started.
 */

export const PLAYER_HANDLE_MIN_LENGTH = 3;
export const PLAYER_HANDLE_MAX_LENGTH = 16;

/**
 * ASCII letters and digits, with at most one `-` or `_` between parts. ASCII
 * only, so a look-alike spelled with another alphabet (a Cyrillic "А" in
 * NIGHTSHADE, say) cannot pass for an authored name.
 */
const HANDLE_SHAPE = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;

export type PlayerHandleRejection =
  | "empty"
  | "too-short"
  | "too-long"
  | "invalid-characters"
  | "taken";

export type PlayerHandleResult =
  | { ok: true; handle: string }
  | { ok: false; reason: PlayerHandleRejection };

/**
 * The shape rule applied to an exact string, with no trimming. A stored handle
 * was trimmed on entry, so surrounding space is itself an invalid shape.
 */
export function checkPlayerHandleShape(
  value: string,
): PlayerHandleRejection | null {
  if (value.length === 0) {
    return "empty";
  }

  if (value.length < PLAYER_HANDLE_MIN_LENGTH) {
    return "too-short";
  }

  if (value.length > PLAYER_HANDLE_MAX_LENGTH) {
    return "too-long";
  }

  if (!HANDLE_SHAPE.test(value)) {
    return "invalid-characters";
  }

  return null;
}

/** True when a stored handle satisfies the shape rule. Used by the save schema. */
export function isStoredPlayerHandle(value: string): boolean {
  return checkPlayerHandleShape(value) === null;
}

/**
 * Validates a handle the player typed. Surrounding space is trimmed first. The
 * roster comparison ignores case, because `nightshade` and `NIGHTSHADE` are the
 * same name on the network.
 */
export function validatePlayerHandle(
  input: string,
  reservedHandles: readonly string[] = [],
): PlayerHandleResult {
  const handle = input.trim();
  const shape = checkPlayerHandleShape(handle);

  if (shape !== null) {
    return { ok: false, reason: shape };
  }

  const folded = handle.toLowerCase();

  if (reservedHandles.some((name) => name.toLowerCase() === folded)) {
    return { ok: false, reason: "taken" };
  }

  return { ok: true, handle };
}

const REJECTION_COPY: Record<PlayerHandleRejection, string> = {
  empty: "Choose a handle to start.",
  "too-short": `A handle needs at least ${PLAYER_HANDLE_MIN_LENGTH} characters.`,
  "too-long": `A handle can be at most ${PLAYER_HANDLE_MAX_LENGTH} characters.`,
  "invalid-characters":
    "Use letters and numbers only. One - or _ may join two parts.",
  taken: "Another handle on this network already uses that name.",
};

/** Player-facing wording for a rejection. It names the rule, never a hidden cause. */
export function describePlayerHandleRejection(
  reason: PlayerHandleRejection,
): string {
  return REJECTION_COPY[reason];
}

/** The standing rule shown beside the field before the player has typed anything. */
export const PLAYER_HANDLE_HINT =
  `${PLAYER_HANDLE_MIN_LENGTH}–${PLAYER_HANDLE_MAX_LENGTH} letters or numbers. ` +
  "One - or _ may join two parts.";
