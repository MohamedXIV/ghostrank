import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";

describe("createSliceWorldState", () => {
  it("starts with an unknown high-ranked target that rank does not gate", () => {
    const state = createSliceWorldState();

    expect(state.player).toEqual({
      handle: "CobaltXZ",
      rank: 100_256,
    });
    expect(state.knownTargetIds).toEqual([]);
    expect(state.targets).toContainEqual(
      expect.objectContaining({
        id: "nightshade",
        handle: "NIGHTSHADE",
        rank: 10,
      }),
    );
  });
});
