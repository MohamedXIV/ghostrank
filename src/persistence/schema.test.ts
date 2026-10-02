import { describe, expect, it } from "vitest";

import {
  persistedEventSchema,
  runSnapshotSchema,
} from "@/persistence/schema";

describe("persistence schemas", () => {
  it("accepts versioned event records with non-negative world time", () => {
    const event = persistedEventSchema.parse({
      id: "evt-1",
      runId: "run-1",
      worldMinute: 90,
      type: "TargetObserved",
      payload: {
        targetId: "ghost",
      },
      schemaVersion: 1,
    });

    expect(event.worldMinute).toBe(90);
  });

  it("rejects impossible negative snapshot time", () => {
    expect(() =>
      runSnapshotSchema.parse({
        id: "snapshot-1",
        runId: "run-1",
        worldMinute: -1,
        state: {},
        schemaVersion: 1,
      }),
    ).toThrow();
  });
});
