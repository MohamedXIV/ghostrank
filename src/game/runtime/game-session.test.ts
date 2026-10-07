import { describe, expect, it } from "vitest";

import { createGameSession } from "@/game/runtime/game-session";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import type { RunPersistence } from "@/persistence/run-persistence";
import {
  createNewRunWorldState,
  createSliceWorldState,
} from "@/game/runtime/slice-world";
import {
  createInitialWorldState,
  type WorldState,
} from "@/game/simulation/state/world-state";
import { endRun } from "@/game/simulation/systems/endings";


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

  it("retries unpersisted events after a failed save", async () => {
    let attempts = 0;
    const eventCounts: number[] = [];

    const stored = createInitialWorldState();

    const persistence: RunPersistence = {
      loadActiveState: async () => stored,
      saveActiveState: async (_state, events) => {
        attempts += 1;
        eventCounts.push(events.length);

        if (attempts === 1) {
          throw new Error("disk unavailable");
        }
      },
    };

    const session = await createGameSession({
      initialState: createInitialWorldState(),
      persistence,
    });

    session.execute({
      type: "advanceTime",
      minutes: 10,
    });

    await expect(session.flush()).rejects.toThrow("disk unavailable");

    session.execute({
      type: "advanceTime",
      minutes: 5,
    });

    await session.flush();

    expect(eventCounts).toEqual([1, 2]);
    expect(session.snapshot().worldMinute).toBe(15);
  });
  it("restores time and discovered targets across a session restart", async () => {
    let storedState = null as ReturnType<typeof createSliceWorldState> | null;

    const persistence: RunPersistence = {
      loadActiveState: async () =>
        storedState ? structuredClone(storedState) : null,
      saveActiveState: async (state) => {
        storedState = structuredClone(state);
      },
    };

    const first = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    first.execute({
      type: "observeTarget",
      targetId: "nightshade",
    });
    first.execute({
      type: "advanceTime",
      minutes: 45,
    });
    await first.flush();

    const restarted = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(restarted.snapshot().worldMinute).toBe(45);
    expect(restarted.snapshot().knownTargetIds).toContain("nightshade");
    expect(restarted.projection.getRow("targets", "nightshade")).toEqual({
      handle: "NIGHTSHADE",
      rank: 10,
      known: true,
    });
  });

  it("restores reconnaissance evidence across a session restart", async () => {
    let storedState = null as ReturnType<typeof createSliceWorldState> | null;

    const persistence: RunPersistence = {
      loadActiveState: async () =>
        storedState ? structuredClone(storedState) : null,
      saveActiveState: async (state) => {
        storedState = structuredClone(state);
      },
    };

    const first = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    first.execute({
      type: "observeTarget",
      targetId: "nightshade",
    });
    first.execute({
      type: "openOperation",
      targetId: "nightshade",
    });
    first.execute({
      type: "surveyTarget",
      targetId: "nightshade",
    });
    first.execute({
      type: "inspectMachine",
      machineId: "ns-relay",
    });
    await first.flush();

    const restarted = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(restarted.snapshot().worldMinute).toBe(20);
    expect(restarted.snapshot().operation).toEqual({
      targetId: "nightshade",
      stage: "recon",
      openedWorldMinute: 0,
    });
    expect(restarted.projection.getRow("machines", "ns-relay")).toEqual({
      targetId: "nightshade",
      label: "Outer Relay",
      role: "relay",
    });
    expect(restarted.projection.getRow("services", "ns-signal")).toEqual({
      targetId: "nightshade",
      machineId: "ns-relay",
      label: "Signal Broker",
      kind: "signal",
      state: "online",
    });

    expect(restarted.projection.getRow("machines", "ns-vault")).toEqual({});
    expect(restarted.projection.getRow("services", "ns-archive")).toEqual({});
  });

  it("restores the exact causal footprint across a session restart", async () => {
    let storedState = null as ReturnType<typeof createSliceWorldState> | null;

    const persistence: RunPersistence = {
      loadActiveState: async () =>
        storedState ? structuredClone(storedState) : null,
      saveActiveState: async (state) => {
        storedState = structuredClone(state);
      },
    };

    const first = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    first.execute({ type: "observeTarget", targetId: "nightshade" });
    first.execute({ type: "openOperation", targetId: "nightshade" });
    first.execute({ type: "surveyTarget", targetId: "nightshade" });
    first.execute({ type: "inspectMachine", machineId: "ns-relay" });
    first.execute({ type: "escalateOperation" });
    first.execute({ type: "disengageOperation" });
    await first.flush();

    const restarted = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(restarted.snapshot().worldMinute).toBe(28);
    expect(restarted.snapshot().operation).toBeNull();
    expect(restarted.snapshot().traces).toEqual([
      {
        id: "trace:1",
        targetId: "nightshade",
        cause: "operation-escalation",
        stage: "intrusive",
        severity: "high",
        weight: 3,
        worldMinute: 25,
      },
      {
        id: "trace:2",
        targetId: "nightshade",
        cause: "operation-disengagement",
        stage: "intrusive",
        severity: "elevated",
        weight: 2,
        worldMinute: 28,
      },
    ]);
    expect(restarted.projection.getRow("footprint", "current")).toEqual({
      score: 5,
      level: "severe",
      traceCount: 2,
    });
  });

  it("restores opponent reaction provenance across a session restart", async () => {
    let storedState = null as ReturnType<typeof createSliceWorldState> | null;

    const persistence: RunPersistence = {
      loadActiveState: async () =>
        storedState ? structuredClone(storedState) : null,
      saveActiveState: async (state) => {
        storedState = structuredClone(state);
      },
    };

    const first = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    first.execute({ type: "observeTarget", targetId: "nightshade" });
    first.execute({ type: "openOperation", targetId: "nightshade" });
    first.execute({ type: "surveyTarget", targetId: "nightshade" });
    first.execute({ type: "inspectMachine", machineId: "ns-relay" });
    first.execute({ type: "escalateOperation" });
    first.execute({ type: "disengageOperation" });
    await first.flush();

    const restarted = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(restarted.snapshot().reactions).toEqual([
      {
        id: "reaction:1",
        targetId: "nightshade",
        kind: "defensive-watch",
        status: "active",
        sourceTraceIds: ["trace:1", "trace:2"],
        footprintScore: 5,
        triggeredWorldMinute: 28,
        playerVisible: true,
      },
    ]);
    expect(restarted.projection.getRow("reactions", "reaction:1")).toEqual({
      targetId: "nightshade",
      kind: "defensive-watch",
      status: "active",
      sourceTraceIds: "trace:1,trace:2",
      footprintScore: 5,
      triggeredWorldMinute: 28,
    });
  });
  it("archives an ended session, derives safe history, and starts fresh on the next boot", async () => {
    const ready = createSliceWorldState();
    ready.worldMinute = 2_940;
    ready.retirement = {
      stage: "cooling",
      startedWorldMinute: 0,
      committedWorldMinute: 60,
      coolingUntilWorldMinute: 2_940,
    };

    let active: typeof ready | null = structuredClone(ready);
    const completed: typeof ready[] = [];

    const persistence: RunPersistence = {
      loadActiveState: async () =>
        active ? structuredClone(active) : null,
      saveActiveState: async (state) => {
        active = structuredClone(state) as typeof ready;
      },
      completeRun: async (state) => {
        if (!state.ending) {
          throw new Error("cannot archive live run");
        }
        completed.unshift(structuredClone(state) as typeof ready);
        active = null;
      },
      loadCompletedStates: async () => structuredClone(completed),
    };

    const first = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(first.execute({ type: "finishRetirement" }).ok).toBe(true);
    await first.flush();

    expect(active).toBeNull();
    expect(first.snapshot().ending?.status).toBe("retired");
    expect(await first.history()).toEqual([
      expect.objectContaining({
        handle: "CobaltXZ",
        endingStatus: "retired",
        endingLabel: "RETIRED",
        endingWorldMinute: 2_940,
        retirementVariant: "mixed-exit",
      }),
    ]);

    const second = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(second.snapshot().ending).toBeNull();
    expect(second.snapshot().worldMinute).toBe(0);
    expect(active?.ending).toBeNull();
    expect(await second.history()).toHaveLength(1);
  });

  it("recovers a terminal active snapshot into history on boot without reviving it", async () => {
    const ended = createSliceWorldState();
    ended.worldMinute = 720;
    ended.ending = {
      status: "compromised",
      causeKind: "compromise",
      causeId: "compromise:1",
      worldMinute: 720,
    };

    let active: typeof ended | null = structuredClone(ended);
    const completed: typeof ended[] = [];

    const persistence: RunPersistence = {
      loadActiveState: async () =>
        active ? structuredClone(active) : null,
      saveActiveState: async (state) => {
        active = structuredClone(state) as typeof ended;
      },
      completeRun: async (state) => {
        completed.unshift(structuredClone(state) as typeof ended);
        active = null;
      },
      loadCompletedStates: async () => structuredClone(completed),
    };

    const session = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(session.snapshot().ending).toEqual(ended.ending);
    expect(active).toBeNull();
    expect(await session.history()).toEqual([
      expect.objectContaining({
        endingStatus: "compromised",
        endingWorldMinute: 720,
      }),
    ]);
    expect(session.execute({ type: "advanceTime", minutes: 1 })).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });
  });

  it("falls back to a terminal active snapshot if completed-run archival fails", async () => {
    const ready = createSliceWorldState();
    ready.worldMinute = 2_940;
    ready.retirement = {
      stage: "cooling",
      startedWorldMinute: 0,
      committedWorldMinute: 60,
      coolingUntilWorldMinute: 2_940,
    };

    let active: typeof ready | null = structuredClone(ready);
    const persistence: RunPersistence = {
      loadActiveState: async () =>
        active ? structuredClone(active) : null,
      saveActiveState: async (state) => {
        active = structuredClone(state) as typeof ready;
      },
      completeRun: async () => {
        throw new Error("archive unavailable");
      },
      loadCompletedStates: async () => [],
    };

    const session = await createGameSession({
      initialState: createSliceWorldState(),
      persistence,
    });

    expect(session.execute({ type: "finishRetirement" }).ok).toBe(true);
    await expect(session.flush()).rejects.toThrow("archive unavailable");

    expect(active?.ending?.status).toBe("retired");
    expect(active?.worldMinute).toBe(2_940);
  });

  describe("Phase 9 P5 — seed variation and lifecycle hardening", () => {
    it("two independently created new runs receive varying random seeds", () => {
      const seeds = new Set<number>();
      for (let i = 0; i < 20; i += 1) {
        const run = createNewRunWorldState();
        seeds.add(run.underground.seed);
      }
      expect(seeds.size).toBeGreaterThan(1);
    });

    it("the same chosen seed remains strictly deterministic across commands", () => {
      const explicitSeed = 998_244_353;
      const first = createSliceWorldState({ seed: explicitSeed });
      const second = createSliceWorldState({ seed: explicitSeed });

      const firstRuntime = createGameRuntime(first);
      const secondRuntime = createGameRuntime(second);

      firstRuntime.execute({ type: "advanceTime", minutes: 720 });
      secondRuntime.execute({ type: "advanceTime", minutes: 720 });

      expect(firstRuntime.snapshot().underground).toEqual(
        secondRuntime.snapshot().underground,
      );
      expect(firstRuntime.snapshot().underground.seed).toBe(explicitSeed);
    });

    it("completed history survives starting a fresh run", async () => {
      let active: WorldState | null = null;
      const completed: WorldState[] = [];

      const persistence: RunPersistence = {
        loadActiveState: async () => (active ? structuredClone(active) : null),
        saveActiveState: async (state) => {
          active = structuredClone(state);
        },
        completeRun: async (state) => {
          completed.unshift(structuredClone(state));
          active = null;
        },
        loadCompletedStates: async () => structuredClone(completed),
      };

      // 1. Run 1 starts, finishes retirement, archives into history
      const run1State = createSliceWorldState({ seed: 101 });
      run1State.worldMinute = 2_940;
      run1State.retirement = {
        stage: "cooling",
        startedWorldMinute: 0,
        committedWorldMinute: 60,
        coolingUntilWorldMinute: 2_940,
      };

      const session1 = await createGameSession({
        initialState: run1State,
        persistence,
      });
      session1.execute({ type: "finishRetirement" });
      await session1.flush();

      expect(completed).toHaveLength(1);
      expect(active).toBeNull();

      // 2. Run 2 starts fresh with different seed
      const run2State = createSliceWorldState({ seed: 202 });
      const session2 = await createGameSession({
        initialState: run2State,
        persistence,
      });

      expect(session2.snapshot().underground.seed).toBe(202);
      expect(session2.snapshot().ending).toBeNull();

      // Completed history remains intact with run 1
      const hist = await session2.history();
      expect(hist).toHaveLength(1);
      expect(hist[0]?.endingStatus).toBe("retired");
    });

    it("ended run cannot revive across session reloads", async () => {
      const endedWorld = createSliceWorldState();
      endedWorld.worldMinute = 500;
      endRun(endedWorld, {
        status: "arrested",
        causeKind: "investigation",
        causeId: "case:1",
        worldMinute: 500,
      });

      let storedState: WorldState | null = structuredClone(endedWorld);
      const persistence: RunPersistence = {
        loadActiveState: async () => (storedState ? structuredClone(storedState) : null),
        saveActiveState: async (state) => {
          storedState = structuredClone(state);
        },
      };

      const session = await createGameSession({
        initialState: createSliceWorldState(),
        persistence,
      });

      expect(session.snapshot().ending?.status).toBe("arrested");
      expect(session.execute({ type: "advanceTime", minutes: 10 })).toEqual({
        ok: false,
        events: [],
        error: "RUN_ENDED",
      });

      // Reloading again
      const reloaded = await createGameSession({
        initialState: createSliceWorldState(),
        persistence,
      });
      expect(reloaded.snapshot().ending?.status).toBe("arrested");
    });
  });
});

