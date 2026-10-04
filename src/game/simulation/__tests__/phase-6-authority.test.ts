import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { parsePortableRunSave, serializePortableRunSave } from "@/persistence/portable-run-save";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  advanceInvestigations,
  deriveInvestigationStage,
  INVESTIGATION_OPEN_FOOTPRINT,
  INVESTIGATION_REVIEW_ATTENTION,
  INVESTIGATION_SIGNAL_KINDS,
  INVESTIGATION_SIGNAL_THRESHOLDS,
} from "@/game/simulation/systems/investigations";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";
import {
  createInitialWorldState,
  type OperationTrace,
  type WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P1 — authority investigations as a deadline-driven read.
 *
 * The load-bearing facts this file defends: a case file grows only from the
 * footprint the player already emitted (no roll, no difficulty score, no rank),
 * it moves on the world's existing review boundaries so splitting a wait changes
 * nothing, what reaches the player is *evidence* with no number and no
 * countdown, laying low is a real response, and an untouched world has no file
 * at all.
 */

const DAY = 24 * 60;

function boundaryAfter(minute: number): number {
  return (Math.floor(minute / TICK_MINUTES) + 1) * TICK_MINUTES;
}

/** Waits in <= 7 day steps, the ecosystem tests' discipline against capped catch-up. */
function wait(bus: CommandBus, minutes: number) {
  const events: ReturnType<CommandBus["execute"]>["events"] = [];
  let remaining = minutes;

  while (remaining > 0) {
    const step = Math.min(remaining, 7 * DAY);
    events.push(...bus.execute({ type: "advanceTime", minutes: step }).events);
    remaining -= step;
  }

  return events;
}

/**
 * One reckless cycle: observe, open, escalate (weight 3), exit intrusively
 * (weight 2). Standing footprint 5 — exactly the opening level, and exactly the
 * level that already triggered a defensive watch in Phase 2.
 */
function recklessCycle(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });

  return bus.execute({ type: "disengageOperation" });
}

function recklessWorld(rank = 100_256, seed?: number): WorldState {
  const state = createSliceWorldState();
  state.player.rank = rank;

  if (seed !== undefined) {
    state.underground.seed = seed;
  }

  const bus = new CommandBus(state);
  recklessCycle(bus);

  return bus.snapshot();
}

function investigate(state: WorldState, minutes: number): Run {
  const bus = new CommandBus(state);
  const events = wait(bus, minutes);

  return { bus, events, state: bus.snapshot() };
}

interface Run {
  bus: CommandBus;
  events: ReturnType<CommandBus["execute"]>["events"];
  state: WorldState;
}

function trace(
  id: string,
  weight: number,
  severity: OperationTrace["severity"],
  worldMinute: number,
): OperationTrace {
  return {
    id,
    targetId: "nightshade",
    cause: "operation-escalation",
    stage: "intrusive",
    severity,
    weight,
    worldMinute,
  };
}

describe("zero regression: an untouched world has no case file", () => {
  it("starts with an empty array, like every optional Phase 5 field", () => {
    const state = createSliceWorldState();

    expect(state.investigations).toEqual([]);
    expect(createInitialWorldState().investigations).toEqual([]);
  });

  it("emits nothing and mutates nothing when there is no footprint", () => {
    const state = createSliceWorldState();
    const before = structuredClone(state);

    expect(advanceInvestigations(state, 30 * DAY)).toEqual([]);
    expect(state).toEqual(before);
  });

  it("a long idle wait produces no investigation event at all", () => {
    const bus = new CommandBus(createSliceWorldState());

    const events = wait(bus, 30 * DAY);

    expect(
      events.some((event) => event.type === "InvestigationAdvanced"),
    ).toBe(false);
    expect(bus.snapshot().investigations).toEqual([]);
  });

  it("leaves a low-footprint early exit uninvestigated", () => {
    const state = createSliceWorldState();
    const bus = new CommandBus(state);

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    // One recon-stage disengagement: weight 1, below the opening level.
    bus.execute({ type: "disengageOperation" });

    wait(bus, 10 * DAY);

    expect(bus.snapshot().traces).toHaveLength(1);
    expect(bus.snapshot().investigations).toEqual([]);
  });
});

describe("case files open from the causal footprint", () => {
  it("opens one file on the first review boundary after the footprint crosses", () => {
    const state = recklessWorld();
    const traceMinute = Math.max(
      ...state.traces.map((trace) => trace.worldMinute),
    );
    const { state: later } = investigate(state, 2 * DAY);

    expect(later.investigations).toHaveLength(1);

    const [file] = later.investigations;
    expect(file?.targetId).toBe("nightshade");
    // Not "now": the boundary the crossing minute falls into, so a wait that
    // covers it and a wait that lands on it agree.
    expect(file?.openedWorldMinute).toBe(boundaryAfter(traceMinute));
    expect(file?.progress).toBe(INVESTIGATION_OPEN_FOOTPRINT);
  });

  it("cites the traces that built it and the reaction that noticed them", () => {
    const state = recklessWorld();
    expect(state.reactions).toHaveLength(1);

    const { state: later } = investigate(state, 2 * DAY);
    const [file] = later.investigations;

    expect(file?.sourceIds).toEqual(["trace:1", "trace:2", "reaction:1"]);
  });

  it("never double-charges a reaction: its footprint is the traces' weight", () => {
    const state = recklessWorld();
    const { state: later } = investigate(state, 2 * DAY);
    const [file] = later.investigations;
    const traceWeight = state.traces.reduce((sum, trace) => sum + trace.weight, 0);

    expect(state.reactions[0]?.footprintScore).toBe(traceWeight);
    expect(file?.progress).toBe(traceWeight);
  });

  it("opens at most one file per target", () => {
    const state = recklessWorld();
    const bus = new CommandBus(state);

    wait(bus, 30 * DAY);

    const targets = new Set(
      bus.snapshot().investigations.map((entry) => entry.targetId),
    );
    expect(bus.snapshot().investigations).toHaveLength(targets.size);
  });

  it("stays closed below the opening level however long you wait", () => {
    // Recon noise alone (weight 1 + 1) never becomes a case file.
    const state = createSliceWorldState();
    state.traces = [
      trace("trace:1", 1, "low", 0),
      trace("trace:2", 1, "low", 30),
    ];

    const { state: later } = investigate(state, 40 * DAY);

    expect(later.investigations).toEqual([]);
  });
});

describe("evidence surfaces as a list, not a meter", () => {
  it("surfaces the first signal on the review that opens the file", () => {
    const state = recklessWorld();
    const { events, state: later } = investigate(state, 2 * DAY);

    const advanced = events.filter(
      (event) => event.type === "InvestigationAdvanced",
    );

    expect(advanced).toHaveLength(1);
    expect(advanced[0]).toEqual({
      type: "InvestigationAdvanced",
      investigationId: "investigation:1",
      targetId: "nightshade",
      signalId: "signal:1",
      kind: INVESTIGATION_SIGNAL_KINDS[0],
      stage: "probing",
      worldMinute: later.investigations[0]?.openedWorldMinute,
    });
    expect(later.investigations[0]?.signals).toHaveLength(1);
  });

  it("surfaces at most one signal per review boundary", () => {
    // One enormous burst: 30 weight of footprint in a single minute, enough for
    // every level at once. The evidence still arrives one item per boundary.
    const state = recklessWorld();
    state.traces.push(trace("trace:9", 30, "high", state.worldMinute));
    const { state: later } = investigate(state, 10 * DAY);

    expect(later.investigations[0]?.signals).toHaveLength(
      INVESTIGATION_SIGNAL_THRESHOLDS.length,
    );
    const minutes =
      later.investigations[0]?.signals.map((signal) => signal.surfacedWorldMinute) ?? [];
    expect(new Set(minutes).size).toBe(minutes.length);
  });

  it("the three signals are the docs' kinds in order, then silence", () => {
    const state = recklessWorld();
    state.traces.push(trace("trace:9", 30, "high", state.worldMinute));

    const { state: later } = investigate(state, 60 * DAY);

    expect(later.investigations[0]?.signals.map((signal) => signal.kind)).toEqual(
      INVESTIGATION_SIGNAL_KINDS,
    );
  });

  it("keeps accruing hidden material after the last visible band", () => {
    const state = recklessWorld();
    state.traces.push(trace("trace:9", 30, "high", state.worldMinute));

    const { state: later } = investigate(state, 60 * DAY);
    const [file] = later.investigations;

    // P3 and P4 read the pressure behind the band; the player never sees it.
    expect(file?.progress).toBeGreaterThan(
      INVESTIGATION_SIGNAL_THRESHOLDS[INVESTIGATION_SIGNAL_THRESHOLDS.length - 1] ??
        0,
    );
    expect(deriveInvestigationStage(file?.signals ?? [])).toBe("converging");
  });

  it("derives the stage from surfaced evidence only", () => {
    const signal = (index: number) => ({
      id: `signal:${index + 1}`,
      kind: INVESTIGATION_SIGNAL_KINDS[index],
      surfacedWorldMinute: index * TICK_MINUTES,
    });

    expect(deriveInvestigationStage([])).toBe("probing");
    expect(deriveInvestigationStage([signal(0)])).toBe("probing");
    expect(deriveInvestigationStage([signal(0), signal(1)])).toBe("warming");
    expect(
      deriveInvestigationStage([signal(0), signal(1), signal(2)]),
    ).toBe("converging");
  });

  it("a second reckless cycle warms the file and cites the new traces", () => {
    const first = recklessWorld();
    const { state: warmed } = investigate(first, 2 * DAY);

    const bus = new CommandBus(warmed);
    // A fresh operation on the same target: escalate + intrusive exit again.
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "escalateOperation" });
    bus.execute({ type: "disengageOperation" });
    const events = wait(bus, 3 * DAY);

    const [file] = bus.snapshot().investigations;
    expect(
      events.filter((event) => event.type === "InvestigationAdvanced"),
    ).toHaveLength(1);
    expect(deriveInvestigationStage(file?.signals ?? [])).toBe("warming");
    expect(file?.progress).toBe(
      INVESTIGATION_OPEN_FOOTPRINT +
        INVESTIGATION_REVIEW_ATTENTION +
        5 +
        // the cycle's own weight, plus the earlier opening material
        0,
    );
    expect(file?.sourceIds.filter((id) => id.startsWith("trace:"))).toHaveLength(
      4,
    );
  });
});

describe("laying low cools a file; it does not thicken", () => {
  it("adds no material when a review finds nothing new", () => {
    const state = recklessWorld();
    const { state: early } = investigate(state, 2 * DAY);
    const openedProgress = early.investigations[0]?.progress;

    const { state: later } = investigate(early, 20 * DAY);

    expect(later.investigations[0]?.progress).toBe(openedProgress);
    expect(later.investigations[0]?.signals).toHaveLength(1);
    expect(later.investigations[0]?.sourceIds).toEqual(
      early.investigations[0]?.sourceIds,
    );
  });

  it("never loses material that was already noticed", () => {
    const state = recklessWorld();
    const { state: early } = investigate(state, 2 * DAY);
    const { state: later } = investigate(early, 40 * DAY);

    expect(later.investigations[0]?.signals.length).toBeGreaterThanOrEqual(1);
    expect(later.investigations[0]?.progress).toBeGreaterThanOrEqual(
      INVESTIGATION_OPEN_FOOTPRINT,
    );
  });
});

describe("no roll, no rank, no gate", () => {
  it("is independent of the world seed: no hashUnit, no difficulty score", () => {
    const a = investigate(recklessWorld(100_256, 20_261_003), 6 * DAY).state;
    const b = investigate(recklessWorld(100_256, 7), 6 * DAY).state;

    expect(a.investigations).toEqual(b.investigations);
  });

  it("is identical at rank 1 and rank 999999", () => {
    const famous = investigate(recklessWorld(1), 6 * DAY).state;
    const nobody = investigate(recklessWorld(999_999), 6 * DAY).state;

    expect(famous.investigations).toEqual(nobody.investigations);
    expect(famous.player.rank).toBe(1);
  });

  it("does not change what any other system decides", () => {
    const clean = new CommandBus(createSliceWorldState());
    recklessCycle(clean);
    wait(clean, 6 * DAY);
    const investigated = clean.snapshot();

    expect(investigated.investigations.length).toBeGreaterThan(0);

    // Every verb still answers, at any stage of a converging file.
    const bus = new CommandBus(investigated);
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    expect(bus.execute({ type: "escalateOperation" }).ok).toBe(true);
    expect(bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok).toBe(
      true,
    );
    expect(
      bus.execute({ type: "rentHousing", housingId: "housing-sleeper-unit" }).ok,
    ).toBe(true);
  });

  it("projects the file for a known target only", () => {
    const state = recklessWorld();
    // Same footprint, but the player has lost the profile evidence.
    const blind = structuredClone(state);
    blind.evidence = blind.evidence.filter(
      (record) => record.kind !== "target-profile",
    );
    blind.knownTargetIds = [];

    const { state: later } = investigate(blind, 2 * DAY);

    expect(later.investigations).toHaveLength(1);
    expect(projectWorld(later).investigations).toEqual([]);
  });
});

describe("split and save invariance", () => {
  it("the same wait in chunks reaches the same files", () => {
    const state = recklessWorld();

    const straight = investigate(state, 12 * DAY).state;

    const chunkedBus = new CommandBus(structuredClone(state));
    for (const step of [41, 200, 12 * DAY - 241]) {
      chunkedBus.execute({ type: "advanceTime", minutes: step });
    }

    expect(chunkedBus.snapshot().investigations).toEqual(
      straight.investigations,
    );
  });

  it("a wait that crosses a boundary and one that lands on it agree", () => {
    const state = recklessWorld();
    const traceMinute = Math.max(
      ...state.traces.map((trace) => trace.worldMinute),
    );
    const boundary = boundaryAfter(traceMinute);

    const on = investigate(
      structuredClone(state),
      boundary - state.worldMinute,
    ).state;
    const past = investigate(
      structuredClone(state),
      boundary - state.worldMinute + 1,
    ).state;

    expect(on.investigations).toEqual(past.investigations);
  });

  it("a capped catch-up wait keeps the same file and evidence", () => {
    const state = recklessWorld();

    // One command far beyond the 28-boundary cap: only the most recent reviews
    // run, exactly as the ecosystem's own catch-up works, so the catch-up can
    // neither fabricate a file nor duplicate a piece of evidence.
    const one = new CommandBus(structuredClone(state));
    one.execute({ type: "advanceTime", minutes: 60 * DAY });
    const capped = one.snapshot();

    const chunked = investigate(state, 60 * DAY).state;

    expect(capped.investigations.map((file) => file.targetId)).toEqual(
      chunked.investigations.map((file) => file.targetId),
    );
    expect(
      capped.investigations.map((file) =>
        file.signals.map((signal) => signal.kind),
      ),
    ).toEqual(
      chunked.investigations.map((file) =>
        file.signals.map((signal) => signal.kind),
      ),
    );
    // The file still names the traces that opened it, from the boundary the
    // crossing minute fell into — not from the boundary the catch-up visited.
    expect(capped.investigations[0]?.sourceIds).toEqual(
      chunked.investigations[0]?.sourceIds,
    );
  });

  it("survives a portable save round-trip verbatim", () => {
    const state = recklessWorld();
    const { state: later } = investigate(state, 6 * DAY);

    expect(parsePortableRunSave(serializePortableRunSave(later))).toEqual(later);
  });

  it("loads a legacy save with no case files at all", () => {
    const legacy = JSON.stringify({
      worldMinute: 4_000,
      player: { handle: "CobaltXZ", rank: 100_256 },
      targets: [],
      knownTargetIds: [],
      traces: [],
      reactions: [],
    });

    const parsed = worldStateSchema.parse(JSON.parse(legacy));

    expect(parsed.investigations).toEqual([]);
  });

  it("resumes an open file from a restored save on the same clock", () => {
    const state = recklessWorld();
    const { state: midway } = investigate(state, 3 * DAY);

    const resumed = new CommandBus(
      parsePortableRunSave(serializePortableRunSave(midway)),
    );
    wait(resumed, 9 * DAY);

    const straight = investigate(state, 12 * DAY).state;

    expect(resumed.snapshot().investigations).toEqual(
      straight.investigations,
    );
  });
});

describe("projection: evidence with provenance, no number, no countdown", () => {
  it("shows each file as a band and its evidence list", () => {
    const state = recklessWorld();
    const { state: later } = investigate(state, 10 * DAY);

    const [file] = projectWorld(later).investigations;

    expect(file).toBeDefined();
    expect(Object.keys(file ?? {}).sort()).toEqual(
      ["id", "signals", "stage", "targetId"].sort(),
    );
    expect(file?.stage).toBe("probing");

    const [signal] = file?.signals ?? [];
    expect(Object.keys(signal ?? {}).sort()).toEqual(
      ["id", "kind", "targetHandle", "worldMinute"].sort(),
    );
    // The handle is the target's display handle, already visible to the player
    // in the target list — not the world id.
    expect(signal?.targetHandle).toBe("NIGHTSHADE");
  });

  it("never leaks material, provenance, or the opening minute", () => {
    const state = recklessWorld();
    const { state: later } = investigate(state, 10 * DAY);

    const serialized = JSON.stringify(projectWorld(later).investigations);

    expect(serialized).not.toContain("progress");
    expect(serialized).not.toContain("sourceIds");
    expect(serialized).not.toContain("openedWorldMinute");
    expect(serialized).not.toContain("trace:");
    expect(serialized).not.toContain("reaction:");
    // A signal's minute is when it surfaced; there is no future minute to read
    // as a deadline.
    expect(serialized).not.toContain("deadline");
    expect(serialized).not.toContain("expires");
  });

  it("adds an empty list to a default world's projection", () => {
    expect(projectWorld(createSliceWorldState()).investigations).toEqual([]);
  });

  it("syncs the file and its evidence into TinyBase tables", () => {
    const runtime = createGameRuntime(recklessWorld());
    runtime.execute({ type: "advanceTime", minutes: 4 * DAY });

    const files = runtime.projection.getTable("investigations");
    const signals = runtime.projection.getTable("investigationSignals");

    expect(Object.keys(files)).toEqual(["investigation:1"]);
    expect(Object.keys(files["investigation:1"] ?? {}).sort()).toEqual(
      ["stage", "targetId"].sort(),
    );

    const ids = Object.keys(signals);
    expect(ids).toEqual(["signal:1"]);
    expect(Object.keys(signals["signal:1"] ?? {}).sort()).toEqual(
      ["investigationId", "kind", "targetHandle", "targetId", "worldMinute"].sort(),
    );
    expect(signals["signal:1"]?.kind).toBe(INVESTIGATION_SIGNAL_KINDS[0]);
  });

  it("grows the evidence list as the world keeps reviewing", () => {
    const runtime = createGameRuntime(recklessWorld());

    runtime.execute({ type: "advanceTime", minutes: 2 * DAY });
    const first = Object.keys(runtime.projection.getTable("investigationSignals"));

    // Two more cycles, then time for the reviews to notice.
    const bus = runtime;
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "escalateOperation" });
    bus.execute({ type: "disengageOperation" });
    bus.execute({ type: "advanceTime", minutes: 12 * DAY });

    const later = Object.keys(runtime.projection.getTable("investigationSignals"));

    expect(later.length).toBeGreaterThan(first.length);
    expect(
      runtime.projection.getCell("investigations", "investigation:1", "stage"),
    ).toBe("warming");
  });
});
