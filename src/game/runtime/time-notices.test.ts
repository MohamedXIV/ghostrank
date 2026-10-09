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

describe("contract expiry notices (Game-First G1 closeout, D063)", () => {
  const expiry = (contractId: string, worldMinute: number): SimulationEvent => ({
    type: "ContractExpired",
    contractId,
    stage: "offer",
    worldMinute,
  });
  const stop = (worldMinute: number): SimulationEvent => ({
    type: "TimeJobInterrupted",
    jobId: "job:1",
    kind: "sleep",
    worldMinute,
    targetWorldMinute: 4320,
    cause: "ContractExpired",
  });
  const known = (...ids: string[]) => (id: string) => ids.includes(id);

  it("names a deadline the player knows, as a deadline and nothing more", () => {
    const batch = [expiry("contract:1", 1800), stop(1800)];

    expect(
      describeTimeJobEvent(stop(1800), {
        batch,
        contractKnown: known("contract:1"),
      }),
    ).toEqual({
      tone: "interrupt",
      text: "A known contract deadline passed. Time stopped at Day 2 · 06:00.",
      worldMinute: 1800,
    });
  });

  it("keeps the generic wording for a deadline the player does not know", () => {
    const batch = [expiry("contract:1", 1800), stop(1800)];

    expect(
      describeTimeJobEvent(stop(1800), { batch, contractKnown: known() })?.text,
    ).toBe("Something needs your attention. Time stopped at Day 2 · 06:00.");
  });

  it("names only a contract that expired at the stop itself", () => {
    // A known contract expired an earlier minute; this stop has no expiry of its own.
    const batch = [expiry("contract:1", 1440), stop(1800)];

    expect(
      describeTimeJobEvent(stop(1800), {
        batch,
        contractKnown: known("contract:1"),
      })?.text,
    ).toBe("Something needs your attention. Time stopped at Day 2 · 06:00.");
  });

  it("is named by a known expiry in the same batch, not by a hidden one beside it", () => {
    const batch = [expiry("contract:hidden", 1800), expiry("contract:1", 1800), stop(1800)];

    expect(
      describeTimeJobEvent(stop(1800), {
        batch,
        contractKnown: known("contract:1"),
      })?.text,
    ).toBe("A known contract deadline passed. Time stopped at Day 2 · 06:00.");
  });

  it("never counts or names the expiries it does not show", () => {
    const batch = [
      expiry("contract:a", 1800),
      expiry("contract:b", 1800),
      stop(1800),
    ];
    const text = describeTimeJobEvent(stop(1800), {
      batch,
      contractKnown: known("contract:a"),
    })?.text;

    expect(text).not.toMatch(/contract:|\d+ contracts?|two|both/i);
  });

  it("names a live expiry only when the player knows that contract", () => {
    const live = expiry("contract:1", 1800);

    expect(
      describeLiveEvent(live, { batch: [live], contractKnown: known("contract:1") })?.text,
    ).toBe("A known contract deadline passed. Time stopped at Day 2 · 06:00.");
    expect(
      describeLiveEvent(live, { batch: [live], contractKnown: known() })?.text,
    ).toBe("Something needs your attention. Time stopped at Day 2 · 06:00.");
  });

  it("keeps the generic wording with no context, as every older caller does", () => {
    expect(describeTimeJobEvent(stop(1800))?.text).toBe(
      "Something needs your attention. Time stopped at Day 2 · 06:00.",
    );
    expect(describeLiveEvent(expiry("contract:1", 1800))?.text).toBe(
      "Something needs your attention. Time stopped at Day 2 · 06:00.",
    );
  });
});

