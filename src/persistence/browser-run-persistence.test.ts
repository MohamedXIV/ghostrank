import { describe, expect, it } from "vitest";

import { createGameSession } from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  createBrowserRunPersistence,
  type BrowserRunStorage,
} from "@/persistence/browser-run-persistence";

function createMemoryStorage(): BrowserRunStorage {
  let value: string | null = null;
  const history = new Map<string, string>();

  return {
    async readActiveRun() {
      return value;
    },
    async writeActiveRun(next) {
      value = next;
    },
    async readCompletedRuns() {
      return [...history.values()];
    },
    async completeRun(archiveId, serialized) {
      history.set(archiveId, serialized);
      value = null;
    },
  };
}

describe("browser run persistence", () => {
  it("restores the complete active run across adapter/session recreation", async () => {
    const storage = createMemoryStorage();

    const firstPersistence = createBrowserRunPersistence(storage);
    const first = await createGameSession({
      initialState: createSliceWorldState(),
      persistence: firstPersistence,
    });

    first.execute({ type: "observeTarget", targetId: "nightshade" });
    first.execute({ type: "openOperation", targetId: "nightshade" });
    first.execute({ type: "surveyTarget", targetId: "nightshade" });
    first.execute({ type: "inspectMachine", machineId: "ns-relay" });
    first.execute({ type: "escalateOperation" });
    first.execute({ type: "disengageOperation" });
    await first.flush();

    const secondPersistence = createBrowserRunPersistence(storage);
    const restarted = await createGameSession({
      initialState: createSliceWorldState(),
      persistence: secondPersistence,
    });

    expect(restarted.snapshot().worldMinute).toBe(28);
    expect(restarted.snapshot().operation).toBeNull();
    expect(restarted.snapshot().traces).toHaveLength(2);
    expect(restarted.snapshot().reactions).toEqual([
      expect.objectContaining({
        id: "reaction:1",
        targetId: "nightshade",
        sourceTraceIds: ["trace:1", "trace:2"],
      }),
    ]);
    expect(restarted.projection.getRow("services", "ns-signal")).toEqual({
      targetId: "nightshade",
      machineId: "ns-relay",
      label: "Signal Broker",
      kind: "signal",
      state: "online",
    });
  });

  it("rejects corrupt durable state instead of fabricating a run", async () => {
    const storage: BrowserRunStorage = {
      async readActiveRun() {
        return JSON.stringify({
          format: "ghostrank-run",
          version: 1,
          state: { broken: true },
        });
      },
      async writeActiveRun() {},
      async readCompletedRuns() {
        return [];
      },
      async completeRun() {},
    };

    const persistence = createBrowserRunPersistence(storage);

    await expect(persistence.loadActiveState()).rejects.toThrow();
  });
  it("moves a terminal state out of the active slot into durable history", async () => {
    const storage = createMemoryStorage();
    const persistence = createBrowserRunPersistence(storage);
    const state = createSliceWorldState();
    state.run = {
      status: "ended",
      ending: {
        id: "run-ending:1",
        kind: "compromised",
        causeKind: "compromise",
        causeId: "compromise:1",
        worldMinute: 720,
      },
    };

    await persistence.saveActiveState(state, []);
    expect(await persistence.loadActiveState()).not.toBeNull();

    await persistence.completeRun!(state, []);

    expect(await persistence.loadActiveState()).toBeNull();
    expect(await persistence.loadCompletedStates!()).toEqual([state]);
  });

  it("rejects archiving an active state", async () => {
    const persistence = createBrowserRunPersistence(createMemoryStorage());

    await expect(
      persistence.completeRun!(createSliceWorldState(), []),
    ).rejects.toThrow("before it ends");
    expect(await persistence.loadCompletedStates!()).toEqual([]);
  });

});
