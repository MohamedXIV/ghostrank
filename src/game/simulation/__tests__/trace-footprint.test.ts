import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { createSliceWorldState } from "@/game/runtime/slice-world";

function openReconOperation(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
}

function prepareEscalation(bus: CommandBus) {
  openReconOperation(bus);
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
}

describe("operation trace footprint", () => {
  it("records a low-severity causal trace for early recon disengagement", () => {
    const bus = new CommandBus(createSliceWorldState());
    openReconOperation(bus);

    const result = bus.execute({ type: "disengageOperation" });

    expect(result.events).toContainEqual({
      type: "TraceRecorded",
      traceId: "trace:1",
      targetId: "nightshade",
      cause: "operation-disengagement",
      severity: "low",
      worldMinute: 3,
    });

    expect(bus.snapshot().traces).toEqual([
      {
        id: "trace:1",
        targetId: "nightshade",
        cause: "operation-disengagement",
        stage: "recon",
        severity: "low",
        weight: 1,
        worldMinute: 3,
      },
    ]);

    expect(projectWorld(bus.snapshot()).footprint).toEqual({
      score: 1,
      level: "low",
      traceCount: 1,
    });
  });

  it("makes escalation materially louder than early disengagement", () => {
    const bus = new CommandBus(createSliceWorldState());
    prepareEscalation(bus);

    const escalation = bus.execute({ type: "escalateOperation" });

    expect(escalation.events).toContainEqual({
      type: "TraceRecorded",
      traceId: "trace:1",
      targetId: "nightshade",
      cause: "operation-escalation",
      severity: "high",
      worldMinute: 25,
    });

    const disengage = bus.execute({ type: "disengageOperation" });

    expect(disengage.events).toContainEqual({
      type: "TraceRecorded",
      traceId: "trace:2",
      targetId: "nightshade",
      cause: "operation-disengagement",
      severity: "elevated",
      worldMinute: 28,
    });

    expect(bus.snapshot().traces).toEqual([
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
    ]);

    expect(projectWorld(bus.snapshot()).footprint).toEqual({
      score: 5,
      level: "severe",
      traceCount: 2,
    });
  });

  it("produces identical trace records for identical state and commands", () => {
    const first = new CommandBus(createSliceWorldState());
    const second = new CommandBus(createSliceWorldState());

    for (const bus of [first, second]) {
      prepareEscalation(bus);
      bus.execute({ type: "escalateOperation" });
      bus.execute({ type: "disengageOperation" });
    }

    expect(first.snapshot().traces).toEqual(second.snapshot().traces);
  });
});
