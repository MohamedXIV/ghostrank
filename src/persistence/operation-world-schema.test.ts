import { describe, expect, it } from "vitest";

import { worldStateSchema } from "@/persistence/world-state-schema";

describe("operation world persistence schema", () => {
  it("round-trips typed operation truth and evidence", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 15,
      player: {
        handle: "CobaltXZ",
        rank: 100256,
      },
      knownTargetIds: [],
      targets: [
        {
          id: "nightshade",
          handle: "NIGHTSHADE",
          rank: 10,
          machines: [
            {
              id: "ns-relay",
              label: "Outer Relay",
              role: "relay",
              services: [
                {
                  id: "ns-signal",
                  label: "Signal Broker",
                  kind: "signal",
                  state: "online",
                },
              ],
            },
          ],
        },
      ],
      evidence: [
        {
          id: "target-profile:nightshade",
          kind: "target-profile",
          subjectId: "nightshade",
          confidence: "observed",
          source: "direct-observation",
          worldMinute: 4,
        },
      ],
    });

    expect(parsed.targets[0]?.machines[0]?.services[0]?.id).toBe("ns-signal");
    expect(parsed.evidence[0]?.subjectId).toBe("nightshade");
  });

  it("upgrades legacy known target ids into target-profile evidence", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 15,
      player: {
        handle: "CobaltXZ",
        rank: 100256,
      },
      targets: [
        {
          id: "nightshade",
          handle: "NIGHTSHADE",
          rank: 10,
          hidden: {
            legacy: true,
          },
        },
      ],
      knownTargetIds: ["nightshade"],
    });

    expect(parsed.evidence).toContainEqual({
      id: "target-profile:nightshade",
      kind: "target-profile",
      subjectId: "nightshade",
      confidence: "observed",
      source: "legacy-discovery",
      worldMinute: 15,
    });
    expect(parsed.targets[0]?.machines).toEqual([]);
  });
});
