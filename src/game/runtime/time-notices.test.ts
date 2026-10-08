import { describe, expect, it } from "vitest";

import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  describeLiveEvent,
  describeTimeJobEvent,
  formatClockMinute,
} from "@/game/runtime/time-notices";

describe("clock calendar (Game-First G1)", () => {
  it("reads world minutes as day and time of day", () => {
    expect(formatClockMinute(0)).toBe("Day 1 · 00:00");
    expect(formatClockMinute(24 * 60 + 360)).toBe("Day 2 · 06:00");
    expect(formatClockMinute(5 * 24 * 60 + 23 * 60 + 59)).toBe("Day 6 · 23:59");
  });
});

describe("player-safe clock notices (Game-First G1)", () => {
  it("stays silent for the clock doing its ordinary work", () => {
    const quiet: SimulationEvent[] = [
      {
        type: "TimeJobStarted",
        jobId: "job:1",
        kind: "sleep",
        startedWorldMinute: 0,
        targetWorldMinute: 1440,
      },
      {
        type: "TimeJobProgressed",
        jobId: "job:1",
        kind: "sleep",
        worldMinute: 360,
        targetWorldMinute: 1440,
      },
      { type: "TimeJobCompleted", jobId: "job:1", kind: "sleep", worldMinute: 1440 },
    ];

    for (const event of quiet) {
      expect(describeTimeJobEvent(event)).toBeNull();
    }
  });

  it("names a halt by where the clock stopped", () => {
    expect(
      describeTimeJobEvent({
        type: "TimeJobCancelled",
        jobId: "job:1",
        kind: "fast-forward",
        worldMinute: 2 * 1440 + 720,
        targetWorldMinute: 9000,
      }),
    ).toEqual({
      tone: "notice",
      text: "Clock halted at Day 3 · 12:00.",
      worldMinute: 2 * 1440 + 720,
    });
  });

  it("reports a lapsed lease in plain words", () => {
    expect(
      describeTimeJobEvent({
        type: "TimeJobInterrupted",
        jobId: "job:1",
        kind: "sleep",
        worldMinute: 1440,
        targetWorldMinute: 4320,
        cause: "HousingChanged",
      }),
    ).toEqual({
      tone: "interrupt",
      text: "Your lease ended at Day 2 · 00:00. Time stopped there.",
      worldMinute: 1440,
    });
  });

  it("never exposes the hidden cause behind an interruption", () => {
    const notice = describeTimeJobEvent({
      type: "TimeJobInterrupted",
      jobId: "job:1",
      kind: "sleep",
      worldMinute: 720,
      targetWorldMinute: 4320,
      cause: "PhysicalThreat",
    });

    expect(notice?.text).toBe(
      "Something needs your attention. Time stopped at Day 1 · 12:00.",
    );
    expect(notice?.text).not.toMatch(/PhysicalThreat|actor|probe|trace/i);
  });
});

describe("live-time notices (Game-First G1, D056)", () => {
  it("names a lease that lapses during live time", () => {
    expect(
      describeLiveEvent({
        type: "HousingChanged",
        housingId: null,
        dailyCost: 0,
        worldMinute: 1440,
      }),
    ).toEqual({
      tone: "interrupt",
      text: "Your lease ended at Day 2 · 00:00. Time stopped there.",
      worldMinute: 1440,
    });
  });

  it("leaves a run ending to the ending screen, and quiet steps unannounced", () => {
    expect(
      describeLiveEvent({
        type: "RunEnded",
        status: "stranded",
        causeKind: "compromise",
        causeId: "compromise:x",
        worldMinute: 360,
      }),
    ).toBeNull();
    expect(
      describeLiveEvent({
        type: "WorldTimeAdvanced",
        fromMinute: 0,
        toMinute: 360,
      }),
    ).toBeNull();
  });
});

