import { describe, expect, it } from "vitest";

import { createGameSession } from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { endRun } from "@/game/simulation/systems/endings";
import {
  createBrowserRunPersistence,
  type BrowserRunStorage,
} from "@/persistence/browser-run-persistence";
import { serializePortableRunSave } from "@/persistence/portable-run-save";

function createMemoryStorage(): BrowserRunStorage {
  let value: string | null = null;
  const history = new Map<string, string>();
  const corruptArchive = new Map<string, string>();

  return {
    async readActiveRun() {
      return value;
    },
    async writeActiveRun(next) {
      value = next;
    },
    async readCompletedRuns() {
      return [...history.values()].reverse();
    },
    async completeRun(archiveId, serialized) {
      // Mirror the IndexedDB idempotency rule: only the holder of an active
      // slot can perform the atomic move. A successful retry sees no active row.
      if (value === null) {
        return;
      }

      history.set(archiveId, serialized);
      value = null;
    },
    async archiveCorruptActiveRun(archiveId, metadataJson) {
      corruptArchive.set(archiveId, metadataJson);
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

  it("moves one terminal authoritative state from active into history", async () => {
    const storage = createMemoryStorage();
    const persistence = createBrowserRunPersistence(storage);
    const state = createSliceWorldState();
    state.worldMinute = 720;
    endRun(state, {
      status: "compromised",
      causeKind: "compromise",
      causeId: "compromise:1",
      worldMinute: 720,
    });

    await persistence.saveActiveState(state, []);
    expect(await persistence.loadActiveState()).toEqual(state);

    await persistence.completeRun!(state, []);

    expect(await persistence.loadActiveState()).toBeNull();
    expect(await persistence.loadCompletedStates!()).toEqual([state]);
  });

  it("makes a repeated successful completion idempotent", async () => {
    const storage = createMemoryStorage();
    const persistence = createBrowserRunPersistence(storage);
    const state = createSliceWorldState();
    endRun(state, {
      status: "retired",
      causeKind: "retirement",
      causeId: "retirement:0:60",
      worldMinute: 2_940,
    });

    await persistence.saveActiveState(state, []);
    await persistence.completeRun!(state, []);
    await persistence.completeRun!(state, []);

    expect(await persistence.loadCompletedStates!()).toHaveLength(1);
  });

  it("rejects archiving a live state", async () => {
    const persistence = createBrowserRunPersistence(createMemoryStorage());

    await expect(
      persistence.completeRun!(createSliceWorldState(), []),
    ).rejects.toThrow("before it ends");
    expect(await persistence.loadCompletedStates!()).toEqual([]);
  });

  it("rejects a live/corrupt entry in completed history", async () => {
    const live = serializePortableRunSave(createSliceWorldState());
    const storage: BrowserRunStorage = {
      async readActiveRun() {
        return null;
      },
      async writeActiveRun() {},
      async readCompletedRuns() {
        return [live];
      },
      async completeRun() {},
    };
    const persistence = createBrowserRunPersistence(storage);

    await expect(persistence.loadCompletedStates!()).rejects.toThrow(
      "history contains a live run",
    );
  });

  it("non-destructively inspects corrupt active run and can archive it safely", async () => {
    const storage = createMemoryStorage();
    await storage.writeActiveRun("broken-json-data");

    const persistence = createBrowserRunPersistence(storage);
    const inspectResult = await persistence.inspectActiveRun!();

    expect(inspectResult.status).toBe("diagnostic_error");
    if (inspectResult.status !== "diagnostic_error") return;

    expect(inspectResult.error.kind).toBe("corrupt_json");
    expect(inspectResult.rawContent).toBe("broken-json-data");

    // The corrupt save has not been destroyed or overwritten yet
    expect(await storage.readActiveRun()).toBe("broken-json-data");

    // Archive corrupt save into backup and clear active slot
    await persistence.archiveCorruptActiveRun!(inspectResult.error);
    expect(await storage.readActiveRun()).toBeNull();
  });
});

