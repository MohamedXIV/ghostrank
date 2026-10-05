import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  endRun,
  runEndingLabel,
} from "@/game/simulation/systems/run-lifecycle";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

describe("Phase 7 P0 — run lifecycle", () => {
  it("starts active and legacy saves default to an active run", () => {
    expect(createSliceWorldState().run).toEqual({ status: "active" });

    const legacy = worldStateSchema.parse({
      worldMinute: 120,
      player: { handle: "legacy", rank: 44_000 },
      targets: [],
      knownTargetIds: [],
    });

    expect(legacy.run).toEqual({ status: "active" });
  });

  it("ends exactly once and preserves the first terminal cause", () => {
    const state = createSliceWorldState();

    const first = endRun(state, {
      kind: "compromised",
      causeKind: "compromise",
      causeId: "compromise:4",
      worldMinute: 720,
    });
    const afterFirst = structuredClone(state);

    const duplicate = endRun(state, {
      kind: "arrested",
      causeKind: "investigation",
      causeId: "investigation:late",
      worldMinute: 1080,
    });

    expect(first).toEqual([
      {
        type: "RunEnded",
        endingId: "run-ending:1",
        kind: "compromised",
        causeKind: "compromise",
        causeId: "compromise:4",
        worldMinute: 720,
      },
    ]);
    expect(duplicate).toEqual([]);
    expect(state).toEqual(afterFirst);
    expect(state.run).toEqual({
      status: "ended",
      ending: {
        id: "run-ending:1",
        kind: "compromised",
        causeKind: "compromise",
        causeId: "compromise:4",
        worldMinute: 720,
      },
    });
  });

  it("makes every simulation command terminal after the ending", () => {
    const state = createSliceWorldState();
    endRun(state, {
      kind: "unmasked",
      causeKind: "compromise",
      causeId: "compromise:1",
      worldMinute: 360,
    });
    const bus = new CommandBus(state);
    const before = bus.snapshot();

    for (const command of [
      { type: "advanceTime", minutes: 60 } as const,
      { type: "observeTarget", targetId: "nightshade" } as const,
      { type: "buyHardware", catalogId: "cpu-overclock" } as const,
      { type: "rentHousing", housingId: "housing-sleeper-unit" } as const,
    ]) {
      expect(bus.execute(command)).toEqual({
        ok: false,
        events: [],
        error: "RUN_ENDED",
      });
      expect(bus.snapshot()).toEqual(before);
    }
  });

  it("persists the terminal lifecycle without inventing an ending for active saves", () => {
    const ended = createSliceWorldState();
    endRun(ended, {
      kind: "vanished",
      causeKind: "retirement",
      causeId: "exit-plan:1",
      worldMinute: 10_080,
    });

    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(ended)),
    );

    expect(restored.run).toEqual(ended.run);
    expect(worldStateSchema.parse(createSliceWorldState()).run).toEqual({
      status: "active",
    });
  });

  it("projects only the terminal label/minute and never the hidden cause", () => {
    const state = createSliceWorldState();
    endRun(state, {
      kind: "arrested",
      causeKind: "investigation",
      causeId: "investigation:nightshade",
      worldMinute: 1_440,
    });

    const projection = projectWorld(state);
    expect(projection.run).toEqual({
      status: "ended",
      ending: {
        kind: "arrested",
        label: "ARRESTED",
        worldMinute: 1_440,
      },
    });

    const serialized = JSON.stringify(projection.run);
    expect(serialized).not.toContain("causeId");
    expect(serialized).not.toContain("causeKind");
    expect(serialized).not.toContain("investigation:nightshade");

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);
    expect(store.getTable("run")).toEqual({
      current: {
        status: "ended",
        endingKind: "arrested",
        endingLabel: "ARRESTED",
        endedWorldMinute: 1_440,
      },
    });
  });

  it("has stable player-facing labels for the documented ending vocabulary", () => {
    expect(
      [
        "arrested",
        "unmasked",
        "captured",
        "killed",
        "missing",
        "compromised",
        "stranded",
        "forced-disappearance",
        "retired",
        "vanished",
      ].map((kind) => runEndingLabel(kind as Parameters<typeof runEndingLabel>[0])),
    ).toEqual([
      "ARRESTED",
      "UNMASKED",
      "CAPTURED",
      "KILLED",
      "MISSING",
      "COMPROMISED",
      "STRANDED",
      "FORCED DISAPPEARANCE",
      "RETIRED",
      "VANISHED",
    ]);
  });
});
