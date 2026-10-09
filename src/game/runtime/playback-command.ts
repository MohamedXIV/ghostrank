import type { ClockSpeed } from "@/game/runtime/time-driver";

/**
 * The terminal's playback verbs (G1 closeout, D062): `pause`, `resume` and
 * `speed <1|4|16>`.
 *
 * They change how the clock plays on this screen and nothing else. They are
 * parsed here, before the simulation parser, and applied to the presentation
 * clock driver. They never become a `SimulationCommand`, so they write no world
 * event and cannot double-advance time.
 */

export type PlaybackRequest =
  | { type: "pause" }
  | { type: "resume" }
  | { type: "speed"; speed: Exclude<ClockSpeed, "paused"> };

export type PlaybackParse =
  | { ok: true; request: PlaybackRequest }
  | { ok: false; error: string };

/** Only the three listed arguments are speeds; prototype keys are not. */
function speedArgument(value: string | undefined): Exclude<ClockSpeed, "paused"> | null {
  switch (value) {
    case "1":
      return "1x";
    case "4":
      return "4x";
    case "16":
      return "16x";
    default:
      return null;
  }
}

/**
 * A playback request, a usage error for a playback verb, or null when the input
 * is not a playback verb at all (so the simulation parser handles it).
 */
export function parsePlaybackCommand(input: string): PlaybackParse | null {
  const parts = input.trim().split(/\s+/);
  const verb = parts[0]?.toLowerCase();

  if (verb === "pause" || verb === "resume") {
    if (parts.length !== 1) {
      return { ok: false, error: `Usage: ${verb}` };
    }

    return { ok: true, request: { type: verb } };
  }

  if (verb === "speed") {
    const speed = speedArgument(parts[1]);

    if (parts.length !== 2 || speed === null) {
      return { ok: false, error: "Usage: speed <1|4|16>" };
    }

    return { ok: true, request: { type: "speed", speed } };
  }

  return null;
}
