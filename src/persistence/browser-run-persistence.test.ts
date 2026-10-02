import { describe, expect, it } from "vitest";

import { createGameSession } from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  createBrowserRunPersistence,
  type BrowserRunStorage,
} from "@/persistence/browser-run-persistence";

function createMemoryStorage(): BrowserRunStorage {
  let value: string | null = null;

  return {
    async readActiveRun() {
      return value;
    },
    async writeActiveRun(next) {
      value = next;
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
    };

    const persistence = createBrowserRunPersistence(storage);

    await expect(persistence.loadActiveState()).rejects.toThrow();
  });
});
