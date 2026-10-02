import { describe, expect, it } from "vitest";

import { projectWorld } from "@/game/simulation/projection/project-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";

describe("reconnaissance capabilities", () => {
  it("requires target-profile evidence before surveying infrastructure", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = bus.execute({
      type: "surveyTarget",
      targetId: "nightshade",
    });

    expect(result).toEqual({
      ok: false,
      events: [],
      error: "NO_ACTIVE_OPERATION",
    });
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("discovers exactly one machine and charges deterministic world time", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({
      type: "observeTarget",
      targetId: "nightshade",
    });
    bus.execute({
      type: "openOperation",
      targetId: "nightshade",
    });

    const result = bus.execute({
      type: "surveyTarget",
      targetId: "nightshade",
    });

    expect(result).toEqual({
      ok: true,
      events: [
        {
          type: "WorldTimeAdvanced",
          fromMinute: 0,
          toMinute: 12,
        },
        {
          type: "MachineObserved",
          targetId: "nightshade",
          machineId: "ns-relay",
          worldMinute: 12,
        },
      ],
    });

    const state = bus.snapshot();
    expect(state.worldMinute).toBe(12);
    expect(state.evidence).toContainEqual({
      id: "machine-presence:ns-relay",
      kind: "machine-presence",
      subjectId: "ns-relay",
      confidence: "observed",
      source: "direct-observation",
      worldMinute: 12,
    });

    const projection = projectWorld(state);
    expect(projection.machines.map((machine) => machine.id)).toEqual([
      "ns-relay",
    ]);
    expect(projection.services).toEqual([]);
  });

  it("keeps sibling machines hidden until a later survey", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    expect(
      projectWorld(bus.snapshot()).machines.map((machine) => machine.id),
    ).toEqual(["ns-relay"]);

    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    expect(
      projectWorld(bus.snapshot()).machines.map((machine) => machine.id),
    ).toEqual(["ns-relay", "ns-vault"]);
    expect(bus.snapshot().worldMinute).toBe(24);
  });

  it("requires machine evidence before service inspection", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = bus.execute({
      type: "inspectMachine",
      machineId: "ns-relay",
    });

    expect(result).toEqual({
      ok: false,
      events: [],
      error: "NO_ACTIVE_OPERATION",
    });
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("discovers exactly one service and records its completion time", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    const result = bus.execute({
      type: "inspectMachine",
      machineId: "ns-relay",
    });

    expect(result).toEqual({
      ok: true,
      events: [
        {
          type: "WorldTimeAdvanced",
          fromMinute: 12,
          toMinute: 20,
        },
        {
          type: "ServiceObserved",
          targetId: "nightshade",
          machineId: "ns-relay",
          serviceId: "ns-signal",
          worldMinute: 20,
        },
      ],
    });

    const state = bus.snapshot();
    expect(state.evidence).toContainEqual({
      id: "service-presence:ns-signal",
      kind: "service-presence",
      subjectId: "ns-signal",
      confidence: "observed",
      source: "direct-observation",
      worldMinute: 20,
    });
    expect(
      projectWorld(state).services.map((service) => service.id),
    ).toEqual(["ns-signal"]);
  });

  it("does not charge time when no new service evidence exists", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });

    const result = bus.execute({
      type: "inspectMachine",
      machineId: "ns-relay",
    });

    expect(result).toEqual({
      ok: false,
      events: [],
      error: "NO_NEW_SERVICE_EVIDENCE",
    });
    expect(bus.snapshot().worldMinute).toBe(20);
  });
});
