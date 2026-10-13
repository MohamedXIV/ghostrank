import { describe, expect, it } from "vitest";

import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { syncWorldProjection } from "@/stores/projection/world-projection";

describe("Software Forge TinyBase lifecycle", () => {
  it("removes a commissioned job from the player-visible queue after ABORT", () => {
    const runtime = createGameRuntime(createSliceWorldState());
    const projection = runtime.projection;

    expect(projection.getTable("buildQueue")).toEqual({});
    expect(runtime.execute({ type:"runModel", modelId:"model-cloud-compact" }).ok).toBe(true);
    const started = runtime.execute({ type:"startBuild", specId:"workflow-net-monitor" });
    expect(started.ok).toBe(true);

    const buildId = runtime.snapshot().builds[0]?.id;
    expect(buildId).toBeTruthy();
    if (!buildId) throw new Error("Expected a build id");
    expect(projection.hasRow("buildQueue", buildId)).toBe(true);
    expect(projection.getRow("buildQueue", buildId).specLabel).toBe("Homegrown Monitoring Loop");

    const aborted = runtime.execute({ type:"abortBuild", buildId });
    expect(aborted.ok).toBe(true);
    expect(runtime.snapshot().builds).toEqual([]);
    expect(projectWorld(runtime.snapshot()).economy.builds).toEqual([]);
    expect(projection.hasRow("buildQueue", buildId)).toBe(false);
    expect(projection.getTable("buildQueue")).toEqual({});

    // A subsequent no-op sync must not re-create a ghost row.
    syncWorldProjection(projection, projectWorld(runtime.snapshot()));
    expect(projection.getTable("buildQueue")).toEqual({});

    // New work remains possible after cancellation.
    const restarted = runtime.execute({ type:"startBuild", specId:"workflow-net-monitor" });
    expect(restarted.ok).toBe(true);
    expect(Object.keys(projection.getTable("buildQueue"))).toHaveLength(1);
  });
});
