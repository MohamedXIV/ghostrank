import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

function operationState() {
  return createInitialWorldState({
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
          {
            id: "ns-vault",
            label: "Cold Vault",
            role: "vault",
            services: [
              {
                id: "ns-archive",
                label: "Archive Index",
                kind: "archive",
                state: "online",
              },
            ],
          },
        ],
      },
    ],
    evidence: [],
  });
}

describe("operation truth and player knowledge", () => {
  it("keeps undiscovered targets, machines, and services out of projection", () => {
    const projection = projectWorld(operationState());

    expect(projection.targets).toEqual([]);
    expect(projection.machines).toEqual([]);
    expect(projection.services).toEqual([]);
  });

  it("observing a target records profile evidence without revealing infrastructure", () => {
    const bus = new CommandBus(operationState());

    const result = bus.execute({
      type: "observeTarget",
      targetId: "nightshade",
    });

    expect(result.ok).toBe(true);

    const state = bus.snapshot();
    expect(state.evidence).toContainEqual({
      id: "target-profile:nightshade",
      kind: "target-profile",
      subjectId: "nightshade",
      confidence: "observed",
      source: "direct-observation",
      worldMinute: 0,
    });

    const projection = projectWorld(state);
    expect(projection.targets).toEqual([
      {
        id: "nightshade",
        handle: "NIGHTSHADE",
        rank: 10,
        known: true,
      },
    ]);
    expect(projection.machines).toEqual([]);
    expect(projection.services).toEqual([]);
  });

  it("projects only infrastructure explicitly supported by evidence", () => {
    const state = operationState();

    state.evidence.push(
      {
        id: "target-profile:nightshade",
        kind: "target-profile",
        subjectId: "nightshade",
        confidence: "observed",
        source: "direct-observation",
        worldMinute: 0,
      },
      {
        id: "machine-presence:ns-relay",
        kind: "machine-presence",
        subjectId: "ns-relay",
        confidence: "observed",
        source: "direct-observation",
        worldMinute: 4,
      },
      {
        id: "service-presence:ns-signal",
        kind: "service-presence",
        subjectId: "ns-signal",
        confidence: "observed",
        source: "direct-observation",
        worldMinute: 5,
      },
    );

    const projection = projectWorld(state);

    expect(projection.machines).toEqual([
      {
        id: "ns-relay",
        targetId: "nightshade",
        label: "Outer Relay",
        role: "relay",
      },
    ]);
    expect(projection.services).toEqual([
      {
        id: "ns-signal",
        targetId: "nightshade",
        machineId: "ns-relay",
        label: "Signal Broker",
        kind: "signal",
        state: "online",
      },
    ]);

    expect(projection.machines).not.toContainEqual(
      expect.objectContaining({ id: "ns-vault" }),
    );
    expect(projection.services).not.toContainEqual(
      expect.objectContaining({ id: "ns-archive" }),
    );
  });
});
