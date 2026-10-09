import { describe, expect, it } from "vitest";

import { isStoredPlayerHandle } from "@/game/identity/player-handle";
import { instantiateWorldContent } from "@/content/world-content";
import {
  createNewRunWorldState,
  createSliceWorldState,
  DEFAULT_PLAYER_HANDLE,
} from "@/game/runtime/slice-world";
import { endRun } from "@/game/simulation/systems/endings";
import { deriveCompletedRunSummary } from "@/game/simulation/systems/run-history";
import { worldStateSchema } from "@/persistence/world-state-schema";

/** A save as the browser would hold it: plain JSON, read back through the schema. */
function savedRoundTrip<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value));
}

describe("player-chosen run identity (Game-First G2, #78)", () => {
  it("opens a new run under the handle the player chose", () => {
    const run = createNewRunWorldState({ handle: "Night_Wren", seed: 7 });

    expect(run.player.handle).toBe("Night_Wren");
  });

  it("keeps the canonical default for callers that choose no handle", () => {
    expect(createSliceWorldState().player.handle).toBe(DEFAULT_PLAYER_HANDLE);
    expect(DEFAULT_PLAYER_HANDLE).toBe("CobaltXZ");
  });

  it("refuses to open a run under an authored actor or target name", () => {
    expect(() => createNewRunWorldState({ handle: "nightshade", seed: 7 })).toThrow(
      RangeError,
    );
    expect(() => createNewRunWorldState({ handle: "nightshade", seed: 7 })).toThrow(
      "taken",
    );
  });

  it("refuses a malformed handle at the factory as well as at the entry screen", () => {
    expect(() => createNewRunWorldState({ handle: "two words", seed: 7 })).toThrow(
      "invalid-characters",
    );
  });

  it("gives every authored roster name a shape that a save can hold", () => {
    const content = instantiateWorldContent();

    for (const entry of [...content.actors, ...content.targets]) {
      expect(isStoredPlayerHandle(entry.handle)).toBe(true);
    }
  });

  it("persists the chosen handle through a save and reads it back", () => {
    const run = createNewRunWorldState({ handle: "Night_Wren", seed: 7 });
    const restored = worldStateSchema.parse(savedRoundTrip(run));

    expect(restored.player.handle).toBe("Night_Wren");
  });

  it("still loads a legacy save that carries the canonical handle", () => {
    const legacy = savedRoundTrip(createSliceWorldState({ seed: 7 }));
    const restored = worldStateSchema.parse(legacy);

    expect(restored.player.handle).toBe("CobaltXZ");
  });

  it("rejects a stored handle the entry screen could not have produced", () => {
    const run = savedRoundTrip(createSliceWorldState({ seed: 7 })) as {
      player: { handle: string };
    };

    for (const malformed of ["", "  padded", "a".repeat(17)]) {
      run.player.handle = malformed;
      expect(worldStateSchema.safeParse(run).success).toBe(false);
    }
  });

  it("records the chosen handle in History when the run ends", () => {
    // endRun records the ending on the world in place and returns its events.
    const run = createNewRunWorldState({ handle: "Night_Wren", seed: 7 });
    endRun(run, {
      status: "stranded",
      causeKind: "compromise",
      causeId: "compromise:identity-test",
      worldMinute: 360,
    });

    expect(deriveCompletedRunSummary(run).handle).toBe("Night_Wren");
  });
});
