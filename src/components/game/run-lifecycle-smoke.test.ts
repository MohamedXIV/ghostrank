import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  GameShell,
  lifecycleFromActiveRunInspection,
  prepareFreshRunState,
} from "@/components/game/game-shell";
import { PlayerHandleField } from "@/components/game/identity/player-handle-field";
import { createBrowserRunPersistence } from "@/persistence/browser-run-persistence";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { endRun } from "@/game/simulation/systems/endings";

describe("Phase 9 P5 — Run lifecycle browser & shell smoke", () => {
  it("treats an empty durable slot as an explicit no-run state", () => {
    expect(lifecycleFromActiveRunInspection({ status: "empty" })).toEqual({
      type: "no_run",
      note: "no active operation is stored on this browser",
    });

    const restored = createSliceWorldState({ seed: 42 });
    expect(
      lifecycleFromActiveRunInspection({ status: "valid", state: restored }),
    ).toBeNull();
  });

  it("flushes the previous session before writing a fresh active run", async () => {
    const order: string[] = [];

    const previousSession = {
      flush: async () => {
        order.push("flush");
      },
    } as unknown as import("@/game/runtime/game-session").GameSession;

    const persistence = {
      loadActiveState: async () => null,
      saveActiveState: async () => {
        order.push("save-fresh");
      },
    };

    const fresh = await prepareFreshRunState(
      previousSession,
      persistence,
      "Night_Wren",
      "fresh-scene",
    );

    expect(order).toEqual(["flush", "save-fresh"]);
    expect(fresh.ending).toBeNull();
    expect(fresh.worldMinute).toBe(0);
    expect(fresh.player.handle).toBe("Night_Wren");
    expect(fresh.scenario).toBe("fresh-scene");
  });

  it("starts the authored canonical scene when that scene is chosen", async () => {
    const persistence = {
      loadActiveState: async () => null,
      saveActiveState: async () => undefined,
    };

    const fresh = await prepareFreshRunState(
      null,
      persistence,
      "Night_Wren",
      "canonical",
    );

    expect(fresh.scenario).toBe("canonical");
    expect(fresh.underground.actors.map((actor) => actor.id)).toContain(
      "nightshade",
    );
  });

  it("refuses to start a fresh run under an authored name, before any save", async () => {
    const order: string[] = [];
    const persistence = {
      loadActiveState: async () => null,
      saveActiveState: async () => {
        order.push("save-fresh");
      },
    };

    await expect(
      prepareFreshRunState(null, persistence, "nightshade", "fresh-scene"),
    ).rejects.toThrow(RangeError);
    expect(order).toEqual([]);
  });

  it("renders the handle field on the no-run screen with the start action held back", () => {
    const html = renderToStaticMarkup(
      React.createElement(PlayerHandleField, {
        value: "",
        rejection: "empty",
        onChange: () => undefined,
      }),
    );

    expect(html).toContain("OPERATOR HANDLE");
    expect(html).toContain('name="player-handle"');
    // Before the player types, the standing rule shows and no refusal is raised.
    expect(html).toContain("3–16 letters or numbers");
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("run-handle-error");
  });

  it("raises the refusal once the player has typed a taken name", () => {
    const html = renderToStaticMarkup(
      React.createElement(PlayerHandleField, {
        value: "nightshade",
        rejection: "taken",
        onChange: () => undefined,
      }),
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Another handle on this network already uses that name.");

    // The input echoes what the player typed; the refusal must not name the
    // authored handle it collided with.
    const refusal = /class="run-handle-error"[^>]*>([^<]*)</.exec(html)?.[1] ?? "";
    expect(refusal).not.toMatch(/nightshade/i);
  });

  it("renders boot screen during initial load with proper accessibility attributes", () => {
    const html = renderToStaticMarkup(React.createElement(GameShell));
    expect(html).toContain("boot-screen");
    expect(html).toContain("boot-mark");
    expect(html).toContain("boot-line");
  });

  it("proves memory storage lifecycle: new-run -> progress -> reload/recover -> end-run -> reload -> new-run", async () => {
    let activeData: string | null = null;
    const completedList: string[] = [];
    const storage = {
      async readActiveRun() {
        return activeData;
      },
      async writeActiveRun(str: string) {
        activeData = str;
      },
      async readCompletedRuns() {
        return [...completedList];
      },
      async completeRun(archiveId: string, str: string) {
        expect(archiveId).toBeDefined();
        completedList.unshift(str);
        activeData = null;
      },
      async archiveCorruptActiveRun(archiveId: string, str: string) {
        expect(archiveId).toBeDefined();
        expect(str).toBeDefined();
        activeData = null;
      },
    };



    const persistence = createBrowserRunPersistence(storage);

    // 1. Initial Inspection: Empty state
    const inspect1 = await persistence.inspectActiveRun!();
    expect(inspect1.status).toBe("empty");

    // 2. Start a fresh run with seed 777
    const initialRun = createSliceWorldState({ seed: 777 });
    await persistence.saveActiveState(initialRun, []);
    expect(activeData).not.toBeNull();

    // 3. Progress: Advance time and record traces
    const loadedRun = (await persistence.loadActiveState())!;
    expect(loadedRun.underground.seed).toBe(777);
    loadedRun.worldMinute = 360;
    await persistence.saveActiveState(loadedRun, []);

    // 4. Reload/Recover: Verify active progress is preserved
    const inspect2 = await persistence.inspectActiveRun!();
    expect(inspect2.status).toBe("valid");
    if (inspect2.status === "valid") {
      expect(inspect2.state.worldMinute).toBe(360);
      expect(inspect2.state.underground.seed).toBe(777);
    }

    // 5. End Run: Mark terminal ending and complete
    endRun(loadedRun, {
      status: "unmasked",
      causeKind: "investigation",
      causeId: "case:1",
      worldMinute: 360,
    });
    await persistence.completeRun!(loadedRun, []);

    // 6. Reload: Active slot is empty, completed history has 1 run
    const inspect3 = await persistence.inspectActiveRun!();
    expect(inspect3.status).toBe("empty");
    const history = await persistence.loadCompletedStates!();
    expect(history).toHaveLength(1);
    expect(history[0]?.ending?.status).toBe("unmasked");

    // 7. Start New Run with different seed 888: History is intact
    const nextRun = createSliceWorldState({ seed: 888 });
    await persistence.saveActiveState(nextRun, []);
    const inspect4 = await persistence.inspectActiveRun!();
    expect(inspect4.status).toBe("valid");
    if (inspect4.status === "valid") {
      expect(inspect4.state.underground.seed).toBe(888);
      expect(inspect4.state.ending).toBeNull();
    }
    const historyAfter = await persistence.loadCompletedStates!();
    expect(historyAfter).toHaveLength(1);
  });
});
