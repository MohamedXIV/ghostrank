import { describe, expect, it } from "vitest";
import { createNewRunWorldState, createSliceWorldState } from "@/game/runtime/slice-world";
import { worldStateSchema } from "@/persistence/world-state-schema";

describe("G3 new-run opt-in without legacy save migration", () => {
  it("starts newly played Nightshade with shared route mechanics", () => {
    const state = createNewRunWorldState({ scenario: "nightshade-slice", seed: 20_261_003 });
    expect(state.slice?.rules).toBe("nightshade-v2");
    expect(state.networkChallenges).toHaveLength(1);
    expect(worldStateSchema.parse(state).networkChallenges).toEqual(state.networkChallenges);
  });
  it("keeps existing authored test fixtures and loaded v1 snapshots unchanged", () => {
    const prior = createSliceWorldState({ scenario: "nightshade-slice", seed: 20_261_003 });
    const restored = worldStateSchema.parse(JSON.parse(JSON.stringify(prior)));
    expect(restored.slice?.rules).toBe("nightshade-v1");
    expect(restored.networkChallenges).toBeUndefined();
  });
  it("provides optional mapping on newly played Fresh Scene without altering historical generation", () => {
    const seed = 17;
    const fresh = createNewRunWorldState({ scenario: "fresh-scene", seed });
    expect(fresh.networkChallenges).toHaveLength(1);
    const old = createSliceWorldState({ scenario: "fresh-scene", seed });
    expect(old.networkChallenges).toBeUndefined();
    const copy = structuredClone(fresh);
    delete copy.networkChallenges;
    expect(copy).toEqual(old);
  });
});
