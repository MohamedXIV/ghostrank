import { describe, expect, it } from "vitest";

import { worldStateSchema } from "@/persistence/world-state-schema";

describe("worldStateSchema", () => {
  it("accepts a valid resumable world snapshot", () => {
    const state = worldStateSchema.parse({
      worldMinute: 15,
      player: {
        handle: "CobaltXZ",
        rank: 100256,
      },
      targets: [],
      knownTargetIds: [],
    });

    expect(state.worldMinute).toBe(15);
  });

  it("rejects negative time and malformed ranks", () => {
    expect(() =>
      worldStateSchema.parse({
        worldMinute: -1,
        player: {
          handle: "CobaltXZ",
          rank: 0,
        },
        targets: [],
        knownTargetIds: [],
      }),
    ).toThrow();
  });
});
