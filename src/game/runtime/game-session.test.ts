import { describe, expect, it } from "vitest";

import { createGameSession } from "@/game/runtime/game-session";
import type { RunPersistence } from "@/persistence/run-persistence";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

describe("GameSession", () => {
  it("loads an existing active run before creating a new slice", async () => {
    const stored = createInitialWorldState({
      worldMinute: 120,
      player: {
        handle: "RESTORED",
        rank: 44_000,
      },
    });

    const persistence: RunPersistence = {
      loadActiveState: async () => stored,
      saveActiveState: async () => undefined,
    };

    const session = await createGameSession({
      initialState: createInitialWorldState(),
      persistence,
    });

    expect(session.snapshot().worldMinute).toBe(120);
    expect(session.snapshot().player.handle).toBe("RESTORED");
  });

  it("autosaves a successful command with the resulting event log", async () => {
    const saves: Array<{
      worldMinute: number;
      eventCount: number;
    }> = [];

    const persistence: RunPersistence = {
      loadActiveState: async () => null,
      saveActiveState: async (state, events) => {
        saves.push({
          worldMinute: state.worldMinute,
          eventCount: events.length,
        });
      },
    };

    const session = await createGameSession({
      initialState: createInitialWorldState(),
      persistence,
    });

    session.execute({
      type: "advanceTime",
      minutes: 20,
    });

    await session.flush();

    expect(saves.at(-1)).toEqual({
      worldMinute: 20,
      eventCount: 1,
    });
  });
});
