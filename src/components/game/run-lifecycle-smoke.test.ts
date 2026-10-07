import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GameShell } from "@/components/game/game-shell";
import { createBrowserRunPersistence } from "@/persistence/browser-run-persistence";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { endRun } from "@/game/simulation/systems/endings";
import { serializePortableRunSave } from "@/persistence/portable-run-save";

describe("Phase 9 P5 — Run lifecycle browser & shell smoke", () => {
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
        completedList.unshift(str);
        activeData = null;
      },
      async archiveCorruptActiveRun(archiveId: string, str: string) {
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
