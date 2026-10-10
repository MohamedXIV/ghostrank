import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { worldStateSchema } from "@/persistence/world-state-schema";

/**
 * The starting scene is stored with the run (Game-First G2, #78; D065). A save
 * from before G2 has no scene and must read as the canonical scene, so its
 * meaning does not change; a generated scene must round-trip intact.
 */
function savedJson(state: ReturnType<typeof createSliceWorldState>): unknown {
  return JSON.parse(JSON.stringify(state));
}

describe("run scenario persistence (Game-First G2, #78; D065)", () => {
  it("reads a save with no scene as the canonical scene", () => {
    const legacy = savedJson(createSliceWorldState({ seed: 42, handle: "BetaStress" })) as Record<
      string,
      unknown
    >;
    delete legacy.scenario;

    expect(worldStateSchema.parse(legacy).scenario).toBe("canonical");
  });

  it("round-trips a generated scene with its own people", () => {
    const world = createSliceWorldState({
      seed: 7,
      handle: "Night_Wren",
      scenario: "fresh-scene",
    });
    const parsed = worldStateSchema.parse(savedJson(world));

    expect(parsed.scenario).toBe("fresh-scene");
    expect(parsed.underground.actors.map((actor) => actor.id)).toEqual(
      world.underground.actors.map((actor) => actor.id),
    );
    expect(parsed.targets.map((target) => target.handle)).toEqual(
      world.targets.map((target) => target.handle),
    );
  });

  it("round-trips a generated scene's organizations, and a canonical save has none", () => {
    const generated = createSliceWorldState({ seed: 11, handle: "Night_Wren", scenario: "high-pressure" });
    const parsed = worldStateSchema.parse(savedJson(generated));

    expect(parsed.underground.organizations).toEqual(generated.underground.organizations);
    expect(parsed.underground.organizations?.length).toBeGreaterThan(0);

    const canonical = worldStateSchema.parse(
      savedJson(createSliceWorldState({ seed: 11, handle: "Night_Wren", scenario: "canonical" })),
    );
    expect(canonical.underground.organizations).toBeUndefined();
  });

  it("refuses a scene the game does not know", () => {
    const saved = savedJson(createSliceWorldState({ seed: 42 })) as Record<string, unknown>;

    expect(() => worldStateSchema.parse({ ...saved, scenario: "moon-base" })).toThrow();
  });
});
