import { describe, expect, it } from "vitest";

import { worldStateSchema } from "@/persistence/world-state-schema";

describe("trace persistence schema", () => {
  it("round-trips operation traces", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 28,
      player: {
        handle: "CobaltXZ",
        rank: 100256,
      },
      targets: [],
      knownTargetIds: [],
      evidence: [],
      operation: null,
      traces: [
        {
          id: "trace:1",
          targetId: "nightshade",
          cause: "operation-escalation",
          stage: "intrusive",
          severity: "high",
          weight: 3,
          worldMinute: 25,
        },
      ],
    });

    expect(parsed.traces).toEqual([
      {
        id: "trace:1",
        targetId: "nightshade",
        cause: "operation-escalation",
        stage: "intrusive",
        severity: "high",
        weight: 3,
        worldMinute: 25,
      },
    ]);
  });

  it("defaults legacy snapshots to an empty trace history", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 0,
      player: {
        handle: "CobaltXZ",
        rank: 100256,
      },
      targets: [],
      knownTargetIds: [],
      evidence: [],
      operation: null,
    });

    expect(parsed.traces).toEqual([]);
  });
});
