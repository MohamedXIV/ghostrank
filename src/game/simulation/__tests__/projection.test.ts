import { describe, expect, it } from "vitest";

import { projectWorld } from "@/game/simulation/projection/project-world";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

describe("projectWorld", () => {
  it("does not leak hidden target facts into the player-visible projection", () => {
    const state = createInitialWorldState({
      targets: [
        {
          id: "ghost",
          handle: "ghost",
          rank: 73_122,
          hidden: {
            operationalSkill: 97,
            sponsorId: "top-ten-group",
          },
        },
      ],
    });

    const projection = projectWorld(state);

    expect(projection.targets[0]).toEqual({
      id: "ghost",
      handle: "ghost",
      rank: 73_122,
      known: false,
    });
    expect(projection.targets[0]).not.toHaveProperty("hidden");
    expect(projection.targets[0]).not.toHaveProperty("operationalSkill");
    expect(projection.targets[0]).not.toHaveProperty("sponsorId");
  });
});
