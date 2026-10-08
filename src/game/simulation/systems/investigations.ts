import {
  TICK_MINUTES,
} from "@/game/simulation/systems/underground";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type {
  Investigation,
  InvestigationSignal,
  InvestigationSignalKind,
  InvestigationStage,
  OperationTrace,
  WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P1 — authority investigations. `docs/GAME_DESIGN.md` requires that
 * this kind of threat arrive as *evidence* ("strange probes, missing contacts,
 * unusual logins, changed marketplace behavior, news, vehicles, calls,
 * door-camera activity, outages, rumors, or suspicious messages"), and
 * `docs/WORLD_RUNS_AND_ENDINGS.md` adds "the game should avoid explicit
 * countdown warnings when ambiguity is more effective". This module is the
 * machinery behind those two lines: a case file exists in world truth, it moves
 * on the same fixed review boundaries the ecosystem already uses, and what
 * reaches the player is a short list of noticed things with minutes attached —
 * never a percentage, never a deadline.
 *
 * Four decisions shape the math (see D032):
 *
 * - **Nothing is rolled.** Every ecosystem roll so far is
 *   `hashUnit(seed, purpose, tickIndex, ...)`. An investigation takes none: its
 *   material is arithmetic over the footprint the player already emitted (the
 *   `OperationTrace` weights), plus one unit of follow-up per review that found
 *   something new to look at. That is the only honest reading of "progress
 *   accumulates from the causal footprint, never from a fresh roll against a
 *   hidden difficulty score" — and it is what makes P5's postmortem chain exact
 *   rather than statistical.
 * - **The file is derived; only the evidence list is stored.** `progress` and
 *   the citations are recomputed from the trace history at the current minute,
 *   so they are the same whether the wait was one command or ten. Footprint the
 *   player emitted is not erased by an idle calendar, and no review boundary is
 *   skipped (D054). What
 *   `signals` records is the one thing a pure read cannot recover — which pieces
 *   of evidence the world has already *told* the player about.
 * - **Inactivity cools, it does not thicken.** Material only grows when new
 *   footprint exists, and follow-up only accrues on a review that found some.
 *   Laying low is therefore a real response, and a careful player is never
 *   punished by the calendar. Nothing is ever forgotten either: what was noticed
 *   stays noticed, and a file that has been told about one thing keeps it.
 * - **Rank is not an input.** Not to opening, not to accrual, not to a signal.
 *   Reputation decides who talks about you (the grudge ladder, P2's probes); a
 *   case file grows because of what was done to a target. A test pins that two
 *   identical histories at rank 1 and rank 999_999 produce identical files.
 *
 * Review boundaries reuse `TICK_MINUTES` from the underground rather than
 * inventing a second clock, so upkeep, builds, case files, and the ecosystem all
 * land on one world-time grid.
 */

/** Standing footprint on one target that is enough to open a case file. */
export const INVESTIGATION_OPEN_FOOTPRINT = 5;

/**
 * Case material a review adds when it found new footprint to look at. One unit
 * — deliberate: the player's own traces are the story, the paperwork is only
 * what keeps the file moving. A review that finds nothing new files nothing,
 * which is why a quiet world does not grow a dossier.
 */
export const INVESTIGATION_REVIEW_ATTENTION = 1;

/**
 * Material levels at which a file surfaces evidence, one per visible band. The
 * first equals the opening level on purpose: the reason a file exists *is* the
 * first thing someone noticed, so a single escalate-and-exit cycle produces real
 * evidence rather than a silent dossier. There is deliberately no fourth level:
 * "converging" is the ceiling of what P1 tells the player, and the pressure
 * behind it keeps growing in hidden truth for P3's physical retaliation and P4's
 * compromise to read. Crossing the last level surfaces nothing further, so
 * outliving an investigation is silence rather than a drip of warnings.
 *
 * Because a review surfaces at most one item, a heavy burst of footprint arrives
 * as evidence spread over the following boundaries — the world noticing at its
 * own pace, not one panic message per click.
 */
export const INVESTIGATION_SIGNAL_THRESHOLDS: readonly number[] = [
  INVESTIGATION_OPEN_FOOTPRINT,
  10,
  16,
];

/**
 * The evidence kinds, in surfacing order, drawn from the docs' own list. Two of
 * the list's items are absent on purpose: "strange probes" is P2's rival
 * probing (a peer's curiosity is not an authority's paperwork), and the
 * physical signals (vehicles, knocks, door cameras, outages) belong to P3, where
 * something can actually arrive.
 */
export const INVESTIGATION_SIGNAL_KINDS: readonly InvestigationSignalKind[] = [
  "unusual-login",
  "marketplace-behavior",
  "suspicious-message",
];

/**
 * The band the player is allowed to read. It counts *surfaced evidence*, not
 * material, which is what keeps it a description of what the player has been
 * shown rather than a disguised meter. Three values, names only — the same
 * discipline as `FootprintLevel` and `relationshipStance`.
 */
export function deriveInvestigationStage(
  signals: readonly InvestigationSignal[],
): InvestigationStage {
  if (signals.length <= 1) {
    return "probing";
  }

  if (signals.length === 2) {
    return "warming";
  }

  return "converging";
}

/** The first review boundary at or after `minute`. */
function boundaryAtOrAfter(minute: number): number {
  return Math.ceil(minute / TICK_MINUTES) * TICK_MINUTES;
}

/**
 * The review boundary at which a trace's footprint first gets looked at: the
 * first boundary strictly after the minute it was recorded, so work done exactly
 * on a boundary is caught by the next one rather than the one it landed on.
 */
function reviewOf(traceWorldMinute: number): number {
  return boundaryAtOrAfter(traceWorldMinute + 1);
}

/** The footprint a target had accumulated by `atMinute`, inclusive. */
function materialBy(
  traces: readonly OperationTrace[],
  targetId: string,
  atMinute: number,
): number {
  return traces
    .filter(
      (trace) => trace.targetId === targetId && trace.worldMinute <= atMinute,
    )
    .reduce((sum, trace) => sum + trace.weight, 0);
}

/**
 * The minute the material first reached the opening level, walking the trace
 * history in the order it was recorded (ids are append-assigned, and every trace
 * is stamped by the clock, so recorded order is causal order).
 */
function crossingMinute(
  traces: readonly OperationTrace[],
  targetId: string,
): number | null {
  let running = 0;

  for (const trace of traces) {
    if (trace.targetId !== targetId) {
      continue;
    }

    running += trace.weight;

    if (running >= INVESTIGATION_OPEN_FOOTPRINT) {
      return trace.worldMinute;
    }
  }

  return null;
}

/**
 * The file's material as of `atMinute`: the footprint recorded by then, plus one
 * unit of follow-up for each review boundary in `(opened, atMinute]` that had
 * something new to look at. Inclusive convention throughout: footprint stamped
 * exactly on a boundary is already material for that review.
 */
function progressAt(
  traces: readonly OperationTrace[],
  targetId: string,
  openedMinute: number,
  atMinute: number,
): number {
  const reviewed = new Set<number>();

  for (const trace of traces) {
    if (trace.targetId !== targetId || trace.worldMinute <= openedMinute) {
      continue;
    }

    const review = reviewOf(trace.worldMinute);

    if (review <= atMinute) {
      reviewed.add(review);
    }
  }

  return (
    materialBy(traces, targetId, atMinute) +
    INVESTIGATION_REVIEW_ATTENTION * reviewed.size
  );
}

/**
 * Derive a file's hidden truth at `toMinute`: its material, the ids it is built
 * from, and the evidence its reviews have surfaced by now.
 *
 * `openedMinute` is the boundary the file started on, so a case built entirely
 * before its first review still surfaces its first item on that same boundary.
 * The evidence schedule is computed, not remembered step by step: material is
 * monotone in the boundary, so the item that reaches threshold `n` can only
 * surface either on the earliest boundary the one-per-review rule allows or on a
 * boundary where footprint actually arrived. Those two sets are small, and
 * reading them is what makes a ten-year wait and ten one-year waits produce the
 * same list.
 */
function deriveFile(
  world: WorldState,
  targetId: string,
  openedMinute: number,
  toMinute: number,
): {
  progress: number;
  sourceIds: string[];
  surfaced: { kind: InvestigationSignalKind; worldMinute: number }[];
} {
  const { traces } = world;
  const sources = traces.filter(
    (trace) => trace.targetId === targetId && trace.worldMinute <= toMinute,
  );

  // Boundaries where the material can step up: footprint stamped on or before
  // them, and the reviews that found new footprint to look at.
  const changePoints = new Set<number>([openedMinute]);

  for (const trace of sources) {
    changePoints.add(boundaryAtOrAfter(trace.worldMinute));

    if (trace.worldMinute > openedMinute) {
      changePoints.add(reviewOf(trace.worldMinute));
    }
  }

  const surfaced: { kind: InvestigationSignalKind; worldMinute: number }[] = [];
  let previous = openedMinute - TICK_MINUTES;

  for (let index = 0; index < INVESTIGATION_SIGNAL_THRESHOLDS.length; index += 1) {
    const earliest = previous + TICK_MINUTES;

    if (earliest > toMinute) {
      break;
    }

    const candidates = [...changePoints, earliest]
      .filter((minute) => minute >= earliest && minute <= toMinute)
      .sort((a, b) => a - b);

    const minute = candidates.find(
      (candidate) =>
        progressAt(traces, targetId, openedMinute, candidate) >=
        INVESTIGATION_SIGNAL_THRESHOLDS[index],
    );

    // Material only grows, so if this level is unreachable by now, every later
    // one is too: the file goes quiet rather than drip-warning a laying-low
    // player.
    if (minute === undefined) {
      break;
    }

    surfaced.push({
      kind: INVESTIGATION_SIGNAL_KINDS[index],
      worldMinute: minute,
    });
    previous = minute;
  }

  return {
    progress: progressAt(traces, targetId, openedMinute, toMinute),
    // Traces first, then the reactions that already noticed them: a reaction's
    // footprint *is* those traces' weight, so it is cited for provenance only
    // and never re-counted as material.
    sourceIds: [
      ...sources.map((trace) => trace.id),
      ...world.reactions
        .filter(
          (reaction) =>
            reaction.targetId === targetId &&
            reaction.triggeredWorldMinute <= toMinute,
        )
        .map((reaction) => reaction.id),
    ],
    surfaced,
  };
}

/** Case files are append-only records, so ids follow the `kind:N` house rule. */
function nextInvestigationId(
  investigations: readonly Investigation[],
): string {
  let max = 0;

  for (const investigation of investigations) {
    const match = /^investigation:(\d+)$/.exec(investigation.id);

    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `investigation:${max + 1}`;
}

function nextSignalId(investigations: readonly Investigation[]): string {
  let max = 0;

  for (const investigation of investigations) {
    for (const signal of investigation.signals) {
      const match = /^signal:(\d+)$/.exec(signal.id);

      if (match) {
        max = Math.max(max, Number(match[1]));
      }
    }
  }

  return `signal:${max + 1}`;
}

/**
 * Advance authority case files to `toMinute`. A target whose footprint has
 * reached the opening level gets a file, on the first review boundary strictly
 * after the minute the material crossed; every file then re-derives its material
 * and gains any evidence its reviews have surfaced since the player was last
 * told. With no footprint the fold emits nothing and touches nothing: the
 * untouched pre-Phase-6 baseline.
 */
export function advanceInvestigations(
  world: WorldState,
  toMinute: number,
): SimulationEvent[] {
  const events: SimulationEvent[] = [];

  // 1. Open files, oldest crossing first, so ids are assignment-order stable.
  for (const target of world.targets) {
    if (
      world.investigations.some(
        (investigation) => investigation.targetId === target.id,
      ) ||
      materialBy(world.traces, target.id, toMinute) <
        INVESTIGATION_OPEN_FOOTPRINT
    ) {
      continue;
    }

    const crossed = crossingMinute(world.traces, target.id);

    if (crossed === null) {
      continue;
    }

    // Never "now": the boundary the crossing minute falls into, so a wait that
    // covers it and a wait that lands on it open the file on the same boundary
    // with the same material.
    const openedWorldMinute = reviewOf(crossed);

    if (openedWorldMinute > toMinute) {
      continue;
    }

    world.investigations.push({
      id: nextInvestigationId(world.investigations),
      targetId: target.id,
      openedWorldMinute,
      progress: 0,
      sourceIds: [],
      signals: [],
    });
  }

  // 2. Re-derive every file — existing and newly opened — and collect the
  //    evidence its reviews have surfaced by now. Files are read in world order,
  //    so a tie between two files is broken the same way every fold.
  type Pending = {
    file: Investigation;
    fresh: { kind: InvestigationSignalKind; worldMinute: number }[];
    order: number;
  };
  const pending: Pending[] = [];

  world.investigations.forEach((file, order) => {
    const derived = deriveFile(
      world,
      file.targetId,
      file.openedWorldMinute,
      toMinute,
    );

    file.progress = derived.progress;
    file.sourceIds = derived.sourceIds;

    const fresh = derived.surfaced.slice(file.signals.length);

    if (fresh.length > 0) {
      pending.push({ file, fresh, order });
    }
  });

  // 3. Append in boundary order (ties: file order), so signal ids and the events
  //    they emit are the same whether the wait was one command or ten.
  const queue = pending
    .flatMap((entry) =>
      entry.fresh.map((signal, index) => ({
        entry,
        worldMinute: signal.worldMinute,
        kind: signal.kind,
        index,
      })),
    )
    .sort(
      (a, b) =>
        a.worldMinute - b.worldMinute ||
        a.entry.order - b.entry.order ||
        a.index - b.index,
    );

  for (const item of queue) {
    const signal: InvestigationSignal = {
      id: nextSignalId(world.investigations),
      kind: item.kind,
      surfacedWorldMinute: item.worldMinute,
    };

    item.entry.file.signals.push(signal);

    events.push({
      type: "InvestigationAdvanced",
      investigationId: item.entry.file.id,
      targetId: item.entry.file.targetId,
      signalId: signal.id,
      kind: signal.kind,
      stage: deriveInvestigationStage(item.entry.file.signals),
      worldMinute: item.worldMinute,
    });
  }

  return events;
}
