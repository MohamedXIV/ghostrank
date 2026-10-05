import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { endRun } from "@/game/simulation/systems/endings";
import { createInitialWorldState } from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

describe("Phase 7 P0 — terminal run contract", () => {
  it("starts live and legacy saves default to ending null", () => {
    expect(createInitialWorldState().ending).toBeNull();

    const legacy = worldStateSchema.parse({
      worldMinute: 120,
      player: { handle: "legacy", rank: 90_000 },
      targets: [],
      knownTargetIds: [],
    });

    expect(legacy.ending).toBeNull();
  });

  it("records the first ending once and emits one RunEnded event", () => {
    const state = createSliceWorldState();

    const first = endRun(state, {
      status: "unmasked",
      causeKind: "compromise",
      causeId: "compromise:7",
      worldMinute: 1440,
    });
    const second = endRun(state, {
      status: "arrested",
      causeKind: "investigation",
      causeId: "investigation:9",
      worldMinute: 1800,
    });

    expect(first).toEqual([
      {
        type: "RunEnded",
        status: "unmasked",
        causeKind: "compromise",
        causeId: "compromise:7",
        worldMinute: 1440,
      },
    ]);
    expect(second).toEqual([]);
    expect(state.ending).toEqual({
      status: "unmasked",
      causeKind: "compromise",
      causeId: "compromise:7",
      worldMinute: 1440,
    });
  });

  it("rejects every later gameplay command without mutating the ended world", () => {
    const state = createSliceWorldState();
    endRun(state, {
      status: "compromised",
      causeKind: "compromise",
      causeId: "compromise:1",
      worldMinute: state.worldMinute,
    });

    const bus = new CommandBus(state);
    const before = bus.snapshot();

    expect(bus.execute({ type: "advanceTime", minutes: 360 })).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });
    expect(
      bus.execute({ type: "observeTarget", targetId: "nightshade" }),
    ).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });
    expect(bus.snapshot()).toEqual(before);
  });

  it("round-trips the terminal record through the canonical portable save", () => {
    const state = createSliceWorldState();
    endRun(state, {
      status: "stranded",
      causeKind: "compromise",
      causeId: "compromise:3",
      worldMinute: 2880,
    });

    const restored = parsePortableRunSave(serializePortableRunSave(state));

    expect(restored.ending).toEqual(state.ending);
  });

  it("projects only the final status and minute, never the hidden cause id", () => {
    const state = createSliceWorldState();
    endRun(state, {
      status: "missing",
      causeKind: "physical-threat",
      causeId: "physical:hidden:17",
      worldMinute: 2220,
    });

    const projection = projectWorld(state);

    expect(projection.ending).toEqual({
      status: "missing",
      label: "MISSING",
      worldMinute: 2220,
    });
    expect(JSON.stringify(projection.ending)).not.toContain("cause");
    expect(JSON.stringify(projection.ending)).not.toContain("physical:hidden:17");
  });

  it("syncs a safe terminal surface into TinyBase and clears it for live runs", () => {
    const ended = createSliceWorldState();
    endRun(ended, {
      status: "retired",
      causeKind: "retirement",
      causeId: "retirement:1",
      worldMinute: 4320,
    });

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projectWorld(ended));

    expect(store.getRow("meta", "run")).toEqual({
      ended: true,
      status: "retired",
      label: "RETIRED",
      worldMinute: 4320,
      variant: "",
      detail: "",
    });
    expect(JSON.stringify(store.getRow("meta", "run"))).not.toContain(
      "retirement:1",
    );

    syncWorldProjection(store, projectWorld(createSliceWorldState()));

    expect(store.getRow("meta", "run")).toEqual({
      ended: false,
      status: "",
      label: "",
      worldMinute: 0,
      variant: "",
      detail: "",
    });
  });

  it("does not create terminal state until an ending system explicitly asks for it", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = bus.execute({ type: "advanceTime", minutes: 24 * 60 });

    expect(result.ok).toBe(true);
    expect(bus.snapshot().ending).toBeNull();
    expect(result.events.some((event) => event.type === "RunEnded")).toBe(false);
  });
});
