import { describe, expect, it } from "vitest";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";

describe("G3 player-safe TinyBase route projection", () => {
  it("does not create a puzzle table in ordinary canonical worlds", () => {
    const rt = createGameRuntime(createSliceWorldState());
    expect(rt.projection.getTable("networkRoutes")).toEqual({});
  });
  it("sends only earned candidate facts and no hidden objective or correct-route flag", () => {
    const initial = createSliceWorldState({
      scenario: "nightshade-slice", nightshadeRules: "nightshade-v2",
    });
    const rt = createGameRuntime(initial);
    expect(rt.projection.getTable("networkRoutes")).toEqual({});
    rt.execute({ type: "observeTarget", targetId: "nightshade" });
    rt.execute({ type: "acceptContract", contractId: "contract:nightshade-briefing" });
    rt.execute({ type: "openOperation", targetId: "nightshade" });
    rt.execute({ type: "surveyTarget", targetId: "nightshade" });
    const data = rt.projection.getTable("networkRoutes");
    const json = String(Object.values(data)[0]?.json ?? "");
    expect(json).toContain("candidates");
    expect(json).not.toContain("ns-vault");
    expect(json).not.toContain("objectiveMachineId");
    expect(json).not.toContain("requiredEcho");
    expect(json).not.toContain("correctRouteId");
    expect(JSON.parse(json).known).toEqual({});
    rt.execute({ type: "inspectMachine", machineId: "ns-relay" });
    const updated = String(Object.values(rt.projection.getTable("networkRoutes"))[0]?.json ?? "");
    expect(JSON.parse(updated).known).toEqual({ carrier: "sealed" });
  });
});
