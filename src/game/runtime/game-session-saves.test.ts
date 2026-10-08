import { describe, expect, it } from "vitest";

import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { createGameSession } from "@/game/runtime/game-session";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import type { RunPersistence } from "@/persistence/run-persistence";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

/**
 * Save and event-log contracts (Game-First G1, #77). The clock saves after every
 * successful command and reads new events by cursor. These tests pin the three
 * promises that make that cheap without losing anything: a burst of commands
 * costs at most one trailing save, every event reaches the adapter exactly once
 * and in order, and releasing events the reader has read never drops one the
 * adapter still needs.
 */

const nextTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("game session saves and event log", () => {
  it("coalesces commands issued while a save is in flight into one trailing save", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let gated = false;
    const saves: Array<{ worldMinute: number; events: number }> = [];

    const persistence: RunPersistence = {
      loadActiveState: async () => null,
      saveActiveState: async (state, events) => {
        if (state.worldMinute > 0 && !gated) {
          gated = true;
          await gate;
        }
        saves.push({ worldMinute: state.worldMinute, events: events.length });
      },
    };

    const session = await createGameSession({
      initialState: createInitialWorldState(),
      persistence,
    });

    session.execute({ type: "advanceTime", minutes: 20 });
    await nextTurn(); // the first save has taken its snapshot and is waiting

    for (let i = 0; i < 4; i += 1) {
      session.execute({ type: "advanceTime", minutes: 5 });
    }

    release();
    await session.flush();

    expect(saves.map((save) => save.worldMinute)).toEqual([0, 20, 40]);
    expect(saves.reduce((total, save) => total + save.events, 0)).toBe(
      session.eventCount(),
    );
  });

  it("delivers every event to the adapter exactly once, in order, while readers release them", async () => {
    const delivered: SimulationEvent[] = [];
    const persistence: RunPersistence = {
      loadActiveState: async () => null,
      saveActiveState: async (_state, events) => {
        delivered.push(...events);
      },
    };

    const session = await createGameSession({
      initialState: createInitialWorldState(),
      persistence,
    });

    const expected: SimulationEvent[] = [];
    const commands: SimulationCommand[] = [
      { type: "advanceLive", minutes: 3 },
      { type: "advanceTime", minutes: 400 },
      { type: "advanceLive", minutes: 1 },
      { type: "sleep", minutes: 120 },
      ...Array.from({ length: 12 }, () => ({ type: "pumpTime" as const, minutes: 7 })),
      { type: "advanceTime", minutes: 720 },
    ];

    let cursor = session.eventCount();
    for (const command of commands) {
      const result = session.execute(command);
      expected.push(...result.events);

      // The clock reads what is new after each step, which releases what it read.
      cursor += session.eventsSince(cursor).length;
      await nextTurn();
    }

    await session.flush();

    expect(delivered).toEqual(expected);
    expect(session.eventCount()).toBe(expected.length);
    expect(session.eventsSince(cursor)).toEqual([]);
  });

  it("without persistence, a reader that keeps up leaves nothing held", async () => {
    const session = await createGameSession({
      initialState: createInitialWorldState(),
      persistence: null,
    });

    let cursor = session.eventCount();
    let seen = 0;
    let lastBatch: readonly SimulationEvent[] = [];

    for (let i = 0; i < 200; i += 1) {
      const result = session.execute({ type: "advanceLive", minutes: 1 });
      seen += result.events.length;
      lastBatch = session.eventsSince(cursor);
      cursor += lastBatch.length;
    }

    // A reader names the count it had consumed before each read, so the batch it
    // just read is released on its next read. At most one batch is ever held.
    expect(seen).toBeGreaterThan(0);
    expect(session.eventCount()).toBe(seen);
    expect(session.eventsSince(0)).toEqual(lastBatch);
  });
});

describe("GameRuntime event release", () => {
  it("drops consumed events without shifting absolute indices", () => {
    const runtime = createGameRuntime(createInitialWorldState());

    runtime.execute({ type: "advanceTime", minutes: 1 });
    runtime.execute({ type: "advanceTime", minutes: 2 });
    const third = runtime.execute({ type: "advanceTime", minutes: 3 });
    const total = runtime.eventCount();

    expect(total).toBeGreaterThan(third.events.length);

    runtime.releaseEventsBefore(total - third.events.length);

    expect(runtime.eventCount()).toBe(total);
    expect(runtime.eventsSince(total - third.events.length)).toEqual(third.events);
    expect(runtime.eventsSince(total)).toEqual([]);

    // Releasing backwards or past the end changes nothing it should not.
    runtime.releaseEventsBefore(0);
    runtime.releaseEventsBefore(total + 100);
    expect(runtime.eventCount()).toBe(total);
    expect(runtime.eventsSince(total)).toEqual([]);
  });
});
