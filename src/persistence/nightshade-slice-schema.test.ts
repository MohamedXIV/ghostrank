import { describe, expect, it } from "vitest";

import {
  NIGHTSHADE_TARGET_ID,
  RELAY_MACHINE_ID,
  SLICE_CONTRACT_ID,
} from "@/content/nightshade-slice";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { SLICE_RUN_SCENARIO } from "@/game/simulation/state/run-scenario";
import { worldStateSchema } from "@/persistence/world-state-schema";

/** A briefing played through its owner review, so every persisted slice field is populated. */
function playedThroughReview(): CommandBus {
  const bus = new CommandBus(
    createSliceWorldState({ scenario: SLICE_RUN_SCENARIO }),
  );
  const ok = (result: { ok: boolean; error?: string }) => {
    if (!result.ok) throw new Error(`refused: ${result.error}`);
  };

  ok(bus.execute({ type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID }));
  ok(bus.execute({ type: "acceptContract", contractId: SLICE_CONTRACT_ID }));
  ok(bus.execute({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID }));
  ok(bus.execute({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID }));
  ok(bus.execute({ type: "inspectMachine", machineId: RELAY_MACHINE_ID }));
  ok(bus.execute({ type: "escalateOperation", confirmed: true }));
  ok(bus.execute({ type: "advanceTime", minutes: 400 }));

  return bus;
}

describe("Nightshade briefing: persistence (D071)", () => {
  it("round-trips a played briefing through the world save schema", () => {
    const bus = playedThroughReview();
    const world = bus.snapshot();
    const reloaded = worldStateSchema.parse(JSON.parse(JSON.stringify(world)));

    expect(reloaded.slice).toEqual(world.slice);
    expect(reloaded.slice?.review?.status).toBe("ran");
    expect(reloaded.traces.some((trace) => trace.cause === "operation-probe")).toBe(true);
    expect(
      reloaded.evidence.some(
        (record) => record.kind === "machine-presence" && record.retiredWorldMinute !== undefined,
      ),
    ).toBe(true);
  });

  it("keeps the briefing closed after a save and reload", () => {
    const bus = playedThroughReview();
    bus.execute({ type: "disengageOperation" });
    const reloaded = worldStateSchema.parse(JSON.parse(JSON.stringify(bus.snapshot())));
    const resumed = new CommandBus(reloaded);

    expect(reloaded.slice?.outcome).toBe("locked-out");
    expect(resumed.execute({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID })).toEqual({
      ok: false,
      events: [],
      error: "SLICE_ENDED",
    });
  });

  it("loads a legacy canonical save with no briefing as before", () => {
    const legacy = worldStateSchema.parse({
      worldMinute: 15,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
    });

    expect(legacy.slice).toBeUndefined();
  });

  it("rejects a briefing whose outcome is not a known outcome", () => {
    const world = JSON.parse(JSON.stringify(playedThroughReview().snapshot()));
    world.slice.outcome = "won";

    expect(worldStateSchema.safeParse(world).success).toBe(false);
  });

  it("rejects a briefing clue that does not exist", () => {
    const world = JSON.parse(JSON.stringify(playedThroughReview().snapshot()));
    world.slice.clues = ["mystery-clue"];

    expect(worldStateSchema.safeParse(world).success).toBe(false);
  });

  it("rejects a briefing attached to a canonical world", () => {
    const world = JSON.parse(JSON.stringify(playedThroughReview().snapshot()));
    world.scenario = "canonical";

    expect(worldStateSchema.safeParse(world).success).toBe(false);
  });

  it("rejects a briefing scenario that carries no briefing", () => {
    const world = JSON.parse(JSON.stringify(playedThroughReview().snapshot()));
    delete world.slice;

    expect(worldStateSchema.safeParse(world).success).toBe(false);
  });
});
