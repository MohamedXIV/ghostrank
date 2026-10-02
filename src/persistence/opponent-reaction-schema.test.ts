import { describe, expect, it } from "vitest";

import { worldStateSchema } from "@/persistence/world-state-schema";

describe("opponent reaction persistence schema", () => {
  it("round-trips reaction provenance", () => {
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
        {
          id: "trace:2",
          targetId: "nightshade",
          cause: "operation-disengagement",
          stage: "intrusive",
          severity: "elevated",
          weight: 2,
          worldMinute: 28,
        },
      ],
      reactions: [
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
      ],
    });

    expect(parsed.reactions).toEqual([
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
  });

  it("defaults legacy snapshots to no reactions", () => {
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
      traces: [],
    });

    expect(parsed.reactions).toEqual([]);
  });
});
