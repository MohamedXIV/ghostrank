/**
 * Player-facing words for the Nightshade briefing (G3, D071), shared by the
 * terminal and the desktop so the two surfaces never say different things about
 * the same state. Pure: it reads a projection or a world and returns text.
 */

import {
  SLICE_CLUES,
  SLICE_OUTCOME_TEXT,
} from "@/content/nightshade-slice";
import { formatWorldTime } from "@/game/computer/format-world-time";
import type { VisibleNightshadeBriefing } from "@/game/simulation/projection/project-world";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  sliceFailureClue,
  type SlicePreview,
} from "@/game/simulation/systems/nightshade-slice";
import type { WorldState } from "@/game/simulation/state/world-state";

export interface BriefingNotice {
  badge: string;
  glyph: string;
  text: string;
}

const yesNo = (value: boolean): string => (value ? "yes" : "no");

/** A failed command, with the in-world reason first and the raw code kept as an identifier. */
export function briefingFailureText(
  error: string,
  world: WorldState,
): string | null {
  const clue = sliceFailureClue(world, error);

  return clue ? `${clue} // ${error.toLowerCase()}` : null;
}

export function briefingBriefLines(slice: VisibleNightshadeBriefing): string[] {
  const lines: string[] = [];
  const status = slice.outcome
    ? SLICE_OUTCOME_TEXT[slice.outcome].title
    : "open";

  lines.push(`NIGHTSHADE BRIEFING // ${status.toUpperCase()}`);
  lines.push(
    `Footprint ${slice.footprint} // watch ${slice.watched ? "active" : "not yet"} // map ${slice.map.known}/${slice.map.needed} (relay ${yesNo(slice.map.relayOnMap)}, vault ${yesNo(slice.map.vaultOnMap)})`,
  );
  lines.push(`Briefing window closes ${formatWorldTime(slice.windowEndWorldMinute)}`);
  if (slice.rules === "nightshade-v2") {
    lines.push("Network Mapping: survey the relay, inspect its broker, then combine the known carrier and current echo mark.");
    lines.push("Use: path map nightshade | path inspect nightshade <challenge> <route> | path test nightshade <challenge> <route>");
    lines.push("Broker intelligence is a clue, not automatic Vault evidence.");
  }

  if (slice.review) {
    lines.push(
      slice.review.status === "ran"
        ? "Owner review: ran. The vault's key was rotated."
        : `Owner review: due ${formatWorldTime(slice.review.dueWorldMinute)}`,
    );
  }

  for (const pending of slice.pendingClues) {
    lines.push(
      `Broker answer pending: ${pending.title} at ${formatWorldTime(pending.dueWorldMinute)}`,
    );
  }

  if (slice.outcome) {
    lines.push(`${SLICE_OUTCOME_TEXT[slice.outcome].title}. ${SLICE_OUTCOME_TEXT[slice.outcome].text}`);
  }

  lines.push("Clues:");
  for (const clue of slice.clues) {
    lines.push(`  ${clue.title}: ${clue.text}`);
  }

  lines.push("Record:");
  for (const entry of slice.log) {
    lines.push(
      `  ${formatWorldTime(entry.worldMinute)} // ${entry.text} (footprint ${entry.footprint})`,
    );
  }

  return lines;
}

/** The trace cost the player reads before committing (D071). Every number is a rule, not hidden state. */
export function briefingPreviewLines(preview: SlicePreview): string[] {
  const lines: string[] = [];
  const { escalate, disengage } = preview;

  if (escalate.blockedBy) {
    lines.push(`Escalate: not now // ${escalate.blockedBy.toLowerCase()}`);
  } else {
    lines.push(
      `Escalate: +${escalate.traceWeight} high trace, ${escalate.minutes} min. Footprint ${escalate.footprintAfter} after.`,
    );

    if (escalate.startsWatch) {
      lines.push(
        `  The owner starts watching at ${preview.watchFootprint}. Review due ${escalate.reviewDueWorldMinute === null ? "at the next boundary" : formatWorldTime(escalate.reviewDueWorldMinute)}.`,
      );
    }
  }

  if (disengage.blockedBy) {
    lines.push(`Leave: not now // ${disengage.blockedBy.toLowerCase()}`);
  } else {
    lines.push(
      `Leave: +${disengage.traceWeight} trace, ${disengage.minutes} min. Footprint ${disengage.footprintAfter} after.`,
    );
    lines.push(
      disengage.endsWith
        ? `  Leaving now ends the briefing: ${SLICE_OUTCOME_TEXT[disengage.endsWith].title}.`
        : "  Leaving now keeps the briefing open.",
    );
  }

  lines.push(
    `Burn line ${preview.burnFootprint}. Watch line ${preview.watchFootprint}.`,
  );

  return lines;
}

/** Notices for the events a command produced, so an outcome or a review is never silent. */
export function briefingEventNotices(events: readonly SimulationEvent[]): BriefingNotice[] {
  const notices: BriefingNotice[] = [];

  for (const event of events) {
    if (event.type === "SliceClueGranted") {
      const clue = SLICE_CLUES[event.clueId as keyof typeof SLICE_CLUES];

      if (clue) {
        notices.push({
          badge: "CLUE",
          glyph: "✦",
          text: `${clue.title}: ${clue.text}`,
        });
      }
    }

    if (event.type === "SliceReviewScheduled") {
      notices.push({
        badge: "WATCH",
        glyph: "◉",
        text: `The owner is watching Nightshade. Review due ${formatWorldTime(event.dueWorldMinute)}.`,
      });
    }

    if (event.type === "SliceReviewRan") {
      notices.push({
        badge: "REVIEW",
        glyph: "◐",
        text: "The owner's review rotated the Cold Vault's key. The vault is off your map until the broker gives you the rotated routing.",
      });
    }

    if (event.type === "SliceEnded") {
      const outcome = SLICE_OUTCOME_TEXT[event.outcome as keyof typeof SLICE_OUTCOME_TEXT];

      if (outcome) {
        notices.push({
          badge: event.outcome.toUpperCase(),
          glyph: event.outcome === "delivered" ? "✓" : "✕",
          text: `${outcome.title}. ${outcome.text}`,
        });
      }
    }
  }

  return notices;
}

/**
 * Reads the briefing view the projection store keeps as one JSON cell. A missing
 * or unreadable cell means there is no briefing to show, never a crash.
 */
export function parseBriefingView(
  json: unknown,
): VisibleNightshadeBriefing | null {
  if (typeof json !== "string" || json.length === 0) {
    return null;
  }

  try {
    return JSON.parse(json) as VisibleNightshadeBriefing;
  } catch {
    return null;
  }
}
