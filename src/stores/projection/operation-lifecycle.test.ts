import { describe, expect, it } from "vitest";

import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { syncWorldProjection } from "@/stores/projection/world-projection";

describe("active operation TinyBase lifecycle", () => {
  it("removes the stale row after disengage and allows a clean next operation", () => {
    const runtime = createGameRuntime(createSliceWorldState());
    const store = runtime.projection;

    expect(store.hasRow("operation", "active")).toBe(false);
    expect(runtime.execute({ type: "observeTarget", targetId: "nightshade" }).ok).toBe(true);
    expect(runtime.execute({ type: "openOperation", targetId: "nightshade" }).ok).toBe(true);

    expect(store.getRow("operation", "active")).toEqual({
      targetId: "nightshade",
      stage: "recon",
      openedWorldMinute: 0,
    });

    // The operation is the only projection table whose row must disappear.
    const playerBefore = store.getTable("player");
    const targetsBefore = store.getTable("targets");

    const disengage = runtime.execute({ type: "disengageOperation" });
    expect(disengage.ok).toBe(true);
    expect(runtime.snapshot().operation).toBeNull();
    expect(projectWorld(runtime.snapshot()).operation).toBeNull();

    // This fails against the old setTable("operation", {}) implementation:
    // TinyBase preserves the previous active row for an empty input.
    expect(store.hasRow("operation", "active")).toBe(false);
    expect(store.getTable("operation")).toEqual({});
    expect(store.getTable("player")).toEqual(playerBefore);
    expect(store.getTable("targets")).toEqual(targetsBefore);
    expect(store.getCell("meta", "world", "worldMinute")).toBe(
      runtime.snapshot().worldMinute,
    );

    // Repeated sync must never resurrect a completed operation.
    syncWorldProjection(store, projectWorld(runtime.snapshot()));
    expect(store.getTable("operation")).toEqual({});

    const reopenedAt = runtime.snapshot().worldMinute;
    expect(runtime.execute({ type: "openOperation", targetId: "nightshade" }).ok).toBe(true);
    expect(store.getRow("operation", "active")).toEqual({
      targetId: "nightshade",
      stage: "recon",
      openedWorldMinute: reopenedAt,
    });
    expect(runtime.snapshot().operation).toMatchObject({
      targetId: "nightshade",
      stage: "recon",
      openedWorldMinute: reopenedAt,
    });
  });
});
