import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { worldStateSchema } from "@/persistence/world-state-schema";

const legacyPayload = {
  worldMinute: 90,
  player: { handle: "CobaltXZ", rank: 100256 },
  targets: [],
  knownTargetIds: [],
  evidence: [],
  operation: null,
  traces: [],
  reactions: [],
};

describe("underground persistence schema", () => {
  it("loads legacy saves with an empty ecosystem at the saved minute", () => {
    const parsed = worldStateSchema.parse(legacyPayload);

    expect(parsed.underground).toEqual({
      seed: 0,
      lastTickMinute: 90,
      playerNetwork: null,
      actors: [],
      relationships: [],
      incidents: [],
      rumors: [],
      messages: [],
      contracts: [],
    });
  });

  it("round-trips a played ecosystem exactly", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "advanceTime", minutes: 9 * 24 * 60 });
    const snapshot = bus.snapshot();

    const parsed = worldStateSchema.parse(
      JSON.parse(JSON.stringify(snapshot)),
    );

    expect(parsed.underground).toEqual(snapshot.underground);
    expect(parsed.underground.incidents.length).toBeGreaterThan(0);
  });

  it("rejects an unknown network", () => {
    const result = worldStateSchema.safeParse({
      ...legacyPayload,
      underground: {
        seed: 1,
        lastTickMinute: 0,
        playerNetwork: "grey",
        actors: [],
        relationships: [],
        incidents: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an actor with a non-positive rank", () => {
    const result = worldStateSchema.safeParse({
      ...legacyPayload,
      underground: {
        seed: 1,
        lastTickMinute: 0,
        playerNetwork: null,
        actors: [
          {
            id: "a",
            handle: "A",
            rank: 0,
            network: "white",
            skill: 10,
            defense: 10,
            discretion: 10,
            activity: 10,
          },
        ],
        relationships: [],
        incidents: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects out-of-range relationship values", () => {
    const result = worldStateSchema.safeParse({
      ...legacyPayload,
      underground: {
        seed: 1,
        lastTickMinute: 0,
        playerNetwork: null,
        actors: [],
        relationships: [
          {
            id: "rel:a>player",
            fromId: "a",
            toId: "player",
            trust: 500,
            fear: 0,
            grudge: 0,
            updatedWorldMinute: 0,
          },
        ],
        incidents: [],
      },
    });

    expect(result.success).toBe(false);
  });
});
