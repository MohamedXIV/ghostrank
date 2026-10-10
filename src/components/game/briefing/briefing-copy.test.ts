import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  NIGHTSHADE_TARGET_ID,
  RELAY_MACHINE_ID,
  SLICE_CONTRACT_ID,
  SLICE_FAILURE_CLUES,
} from "@/content/nightshade-slice";
import {
  briefingBriefLines,
  briefingEventNotices,
  briefingFailureText,
  briefingPreviewLines,
  parseBriefingView,
} from "@/components/game/briefing/briefing-copy";
import { BriefingProvider } from "@/components/game/briefing/briefing-context";
import { NightshadeBriefingPanel } from "@/components/game/briefing/nightshade-briefing-panel";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import {
  projectWorld,
  type VisibleNightshadeBriefing,
} from "@/game/simulation/projection/project-world";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { previewSliceActions } from "@/game/simulation/systems/nightshade-slice";
import { SLICE_RUN_SCENARIO } from "@/game/simulation/state/run-scenario";

function briefingBus(): CommandBus {
  return new CommandBus(createSliceWorldState({ scenario: SLICE_RUN_SCENARIO }));
}

function viewOf(bus: CommandBus): VisibleNightshadeBriefing {
  const view = projectWorld(bus.snapshot()).slice;
  if (!view) throw new Error("no briefing view");
  return view;
}

/** Renders the panel the way the desktop does: inside its provider, with no pending act. */
function renderPanel(view: VisibleNightshadeBriefing | null): string {
  const runtime = {
    execute: () => ({ ok: true, events: [] }),
  } as unknown as GameRuntime;

  return renderToStaticMarkup(
    createElement(
      BriefingProvider,
      { runtime, view },
      createElement(NightshadeBriefingPanel),
    ),
  );
}

describe("briefing failure text", () => {
  it("gives the in-world reason first and keeps the raw code as an identifier", () => {
    const bus = briefingBus();

    expect(briefingFailureText("TARGET_NOT_OBSERVED", bus.snapshot())).toBe(
      `${SLICE_FAILURE_CLUES.TARGET_NOT_OBSERVED} // target_not_observed`,
    );
    expect(briefingFailureText("NO_ACTIVE_OPERATION", bus.snapshot())).toMatch(
      / \/\/ no_active_operation$/,
    );
  });

  it("has no clue on a canonical world, so the terminal keeps its own wording", () => {
    const canonical = createSliceWorldState();

    expect(briefingFailureText("NO_ACTIVE_OPERATION", canonical)).toBeNull();
  });
});

describe("briefing previews", () => {
  it("names the first blocker when escalation is not yet possible", () => {
    const bus = briefingBus();
    const lines = briefingPreviewLines(previewSliceActions(bus.snapshot())!);

    expect(lines[0]).toBe("Escalate: not now // no_active_operation");
    expect(lines[1]).toBe("Leave: not now // no_active_operation");
  });

  it("prints the trace and the watch consequence before an escalation", () => {
    const bus = briefingBus();
    bus.execute({ type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID });
    bus.execute({ type: "acceptContract", contractId: SLICE_CONTRACT_ID });
    bus.execute({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID });
    bus.execute({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID });
    bus.execute({ type: "inspectMachine", machineId: RELAY_MACHINE_ID });

    const lines = briefingPreviewLines(previewSliceActions(bus.snapshot())!);

    expect(lines.find((line) => line.startsWith("Escalate: +3 high trace"))).toBeDefined();
    expect(lines.some((line) => line.includes("The owner starts watching at 5"))).toBe(true);
    expect(lines.some((line) => line.startsWith("Burn line 8. Watch line 5."))).toBe(true);
  });
});

describe("briefing notices", () => {
  it("turns each briefing event into a notice that is never silent", () => {
    const events: SimulationEvent[] = [
      { type: "SliceClueGranted", clueId: "broker-routing", targetId: NIGHTSHADE_TARGET_ID, worldMinute: 360 },
      { type: "SliceReviewScheduled", targetId: NIGHTSHADE_TARGET_ID, dueWorldMinute: 360, worldMinute: 40 },
      { type: "SliceReviewRan", targetId: NIGHTSHADE_TARGET_ID, retiredMachineIds: ["ns-vault"], worldMinute: 360 },
      { type: "SliceEnded", targetId: NIGHTSHADE_TARGET_ID, outcome: "delivered", worldMinute: 400 },
    ];

    expect(briefingEventNotices(events).map((notice) => notice.badge)).toEqual([
      "CLUE",
      "WATCH",
      "REVIEW",
      "DELIVERED",
    ]);
  });

  it("produces no notice for events that belong to other systems", () => {
    expect(
      briefingEventNotices([
        { type: "WorldTimeAdvanced", fromMinute: 0, toMinute: 10 },
      ]),
    ).toEqual([]);
  });
});

describe("briefing view parsing", () => {
  it("reads a projected view that was stored as one JSON cell", () => {
    const bus = briefingBus();
    const view = viewOf(bus);

    expect(parseBriefingView(JSON.stringify(view))).toEqual(view);
  });

  it("treats a missing, empty or unreadable cell as no briefing, never as a crash", () => {
    expect(parseBriefingView(undefined)).toBeNull();
    expect(parseBriefingView(null)).toBeNull();
    expect(parseBriefingView("")).toBeNull();
    expect(parseBriefingView(3)).toBeNull();
    expect(parseBriefingView("{not json")).toBeNull();
  });
});

describe("briefing brief lines", () => {
  it("opens with the status and lists the clues and the record in order", () => {
    const bus = briefingBus();
    const lines = briefingBriefLines(viewOf(bus));

    expect(lines[0]).toBe("NIGHTSHADE BRIEFING // OPEN");
    expect(lines).toContain("Clues:");
    expect(lines).toContain("Record:");
  });
});

describe("the desktop briefing panel", () => {
  it("renders the offer with ACCEPT and DECLINE while the contract is open", () => {
    const markup = renderPanel(viewOf(briefingBus()));

    expect(markup).toContain("NIGHTSHADE BRIEFING");
    expect(markup).toContain(">ACCEPT<");
    expect(markup).toContain(">DECLINE<");
    expect(markup).toContain("OFFERED");
  });

  it("shows the trace preview before any act that costs trace", () => {
    const bus = briefingBus();
    bus.execute({ type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID });
    bus.execute({ type: "acceptContract", contractId: SLICE_CONTRACT_ID });
    bus.execute({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID });

    const markup = renderPanel(viewOf(bus));

    expect(markup).toContain("BEFORE YOU COMMIT");
    expect(markup).toContain(">DELIVER MAP<");
    expect(markup).not.toContain(">ACCEPT<");
  });

  it("states the outcome, and offers no further act, once the briefing has ended", () => {
    const bus = briefingBus();
    bus.execute({ type: "declineContract", contractId: SLICE_CONTRACT_ID });

    const markup = renderPanel(viewOf(bus));

    // React's server render splits the title from its full stop, so match the body text.
    expect(markup).toContain("Declined");
    expect(markup).toContain("Nothing was touched, and the briefing is closed.");
    expect(markup).not.toContain(">ACCEPT<");
    expect(markup).not.toContain("BEFORE YOU COMMIT");
  });

  it("renders nothing on a canonical world, where there is no briefing", () => {
    expect(renderPanel(null)).toBe("");
  });
});
