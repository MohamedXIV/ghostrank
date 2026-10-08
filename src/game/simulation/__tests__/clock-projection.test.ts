import { describe, expect, it } from "vitest";

import { MAX_ADVANCE_MINUTES } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

function quietRuntime() {
  return createGameRuntime(
    createInitialWorldState({ player: { handle: "CobaltXZ", rank: 100_256 } }),
  );
}

describe("clock projection (Game-First G1)", () => {
  it("shows a free clock as no job", () => {
    const runtime = quietRuntime();

    expect(projectWorld(runtime.snapshot()).clockJob).toBeNull();
    expect(runtime.projection.getCell("meta", "clock", "jobKind")).toBe("");
  });

  it("shows a sleep that owns the clock, marked interruptible", () => {
    const runtime = quietRuntime();
    runtime.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + DAY });

    expect(projectWorld(runtime.snapshot()).clockJob).toEqual({
      kind: "sleep",
      startedWorldMinute: 0,
      targetWorldMinute: MAX_ADVANCE_MINUTES + DAY,
      interruptible: true,
    });
    expect(runtime.projection.getCell("meta", "clock", "jobKind")).toBe("sleep");
    expect(
      runtime.projection.getCell("meta", "clock", "jobTargetWorldMinute"),
    ).toBe(MAX_ADVANCE_MINUTES + DAY);
    expect(runtime.projection.getCell("meta", "clock", "interruptible")).toBe(true);
  });

  it("shows a wait as a job that cannot be halted", () => {
    const runtime = quietRuntime();
    runtime.execute({ type: "advanceTime", minutes: MAX_ADVANCE_MINUTES + DAY });

    expect(projectWorld(runtime.snapshot()).clockJob).toEqual(
      expect.objectContaining({ kind: "wait", interruptible: false }),
    );
    expect(runtime.projection.getCell("meta", "clock", "interruptible")).toBe(false);
  });

  it("clears the job once it is halted", () => {
    const runtime = quietRuntime();
    runtime.execute({ type: "sleep", minutes: MAX_ADVANCE_MINUTES + DAY });
    runtime.execute({ type: "cancelAdvance" });

    expect(projectWorld(runtime.snapshot()).clockJob).toBeNull();
    expect(runtime.projection.getCell("meta", "clock", "jobKind")).toBe("");
  });
});
