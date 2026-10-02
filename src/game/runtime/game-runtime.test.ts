import { describe, expect, it } from "vitest";

import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

describe("GameRuntime", () => {
  it("publishes command results through the player-visible TinyBase projection", () => {
    const runtime = createGameRuntime(
      createInitialWorldState({
        player: {
          handle: "CobaltXZ",
          rank: 100_256,
        },
        targets: [
          {
            id: "nightshade",
            handle: "NIGHTSHADE",
            rank: 10,
            hidden: {
              operationalSkill: 99,
            },
          },
        ],
      }),
    );

    expect(runtime.projection.getTable("targets")).toEqual({});

    const result = runtime.execute({
      type: "observeTarget",
      targetId: "nightshade",
    });

    expect(result.ok).toBe(true);
    expect(runtime.projection.getTable("targets")).toEqual({
      nightshade: {
        handle: "NIGHTSHADE",
        rank: 10,
        known: true,
      },
    });
  });

  it("updates the visible world clock after time commands", () => {
    const runtime = createGameRuntime(createInitialWorldState());

    runtime.execute({ type: "advanceTime", minutes: 30 });

    expect(
      runtime.projection.getCell("meta", "world", "worldMinute"),
    ).toBe(30);
  });
});
