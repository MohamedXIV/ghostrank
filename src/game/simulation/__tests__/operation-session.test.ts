import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

describe("operation session lifecycle", () => {
  it("requires target-profile evidence before opening an operation", () => {
    const bus = new CommandBus(createSliceWorldState());

    expect(
      bus.execute({ type: "openOperation", targetId: "nightshade" }),
    ).toEqual({
      ok: false,
      events: [],
      error: "TARGET_NOT_OBSERVED",
    });
    expect(bus.snapshot().operation).toBeNull();
  });

  it("opens one recon-stage operation against a known target", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });

    expect(
      bus.execute({ type: "openOperation", targetId: "nightshade" }),
    ).toEqual({
      ok: true,
      events: [
        {
          type: "OperationOpened",
          targetId: "nightshade",
          stage: "recon",
          worldMinute: 0,
        },
      ],
    });

    expect(bus.snapshot().operation).toEqual({
      targetId: "nightshade",
      stage: "recon",
      openedWorldMinute: 0,
    });
  });

  it("rejects a second operation while one is active", () => {
    const bus = new CommandBus(createInitialWorldState({
      targets: [
        { id: "nightshade", handle: "NIGHTSHADE", rank: 10 },
        { id: "glasswire", handle: "GLASSWIRE", rank: 11 },
      ],
      knownTargetIds: ["nightshade", "glasswire"],
    }));

    bus.execute({ type: "openOperation", targetId: "nightshade" });

    expect(
      bus.execute({ type: "openOperation", targetId: "glasswire" }),
    ).toEqual({
      ok: false,
      events: [],
      error: "OPERATION_ALREADY_ACTIVE",
    });
  });

  it("rejects reconnaissance against a different operation target", () => {
    const bus = new CommandBus(createInitialWorldState({
      targets: [
        {
          id: "nightshade",
          handle: "NIGHTSHADE",
          rank: 10,
          machines: [],
        },
        {
          id: "glasswire",
          handle: "GLASSWIRE",
          rank: 11,
          machines: [
            {
              id: "gw-relay",
              label: "Glass Relay",
              role: "relay",
              services: [],
            },
          ],
        },
      ],
      knownTargetIds: ["nightshade", "glasswire"],
      evidence: [
        {
          id: "machine-presence:gw-relay",
          kind: "machine-presence",
          subjectId: "gw-relay",
          confidence: "observed",
          source: "direct-observation",
          worldMinute: 0,
        },
      ],
    }));

    bus.execute({ type: "openOperation", targetId: "nightshade" });

    expect(
      bus.execute({ type: "surveyTarget", targetId: "glasswire" }),
    ).toEqual({
      ok: false,
      events: [],
      error: "OPERATION_TARGET_MISMATCH",
    });
    expect(
      bus.execute({ type: "inspectMachine", machineId: "gw-relay" }),
    ).toEqual({
      ok: false,
      events: [],
      error: "OPERATION_TARGET_MISMATCH",
    });
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("requires service evidence before escalating", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });

    expect(bus.execute({ type: "escalateOperation" })).toEqual({
      ok: false,
      events: [],
      error: "SERVICE_EVIDENCE_REQUIRED",
    });
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("escalates explicitly after the recon chain and charges five minutes", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });

    expect(bus.execute({ type: "escalateOperation" })).toEqual({
      ok: true,
      events: [
        {
          type: "WorldTimeAdvanced",
          fromMinute: 20,
          toMinute: 25,
        },
        {
          type: "OperationEscalated",
          targetId: "nightshade",
          fromStage: "recon",
          toStage: "intrusive",
          worldMinute: 25,
        },
        {
          type: "TraceRecorded",
          traceId: "trace:1",
          targetId: "nightshade",
          cause: "operation-escalation",
          severity: "high",
          worldMinute: 25,
        },
      ],
    });

    expect(bus.snapshot().operation).toEqual({
      targetId: "nightshade",
      stage: "intrusive",
      openedWorldMinute: 0,
      escalatedWorldMinute: 25,
    });
  });

  it("rejects duplicate escalation without charging more time", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
    bus.execute({ type: "escalateOperation" });

    expect(bus.execute({ type: "escalateOperation" })).toEqual({
      ok: false,
      events: [],
      error: "OPERATION_ALREADY_ESCALATED",
    });
    expect(bus.snapshot().worldMinute).toBe(25);
  });

  it("disengages deliberately and charges three minutes", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });

    expect(bus.execute({ type: "disengageOperation" })).toEqual({
      ok: true,
      events: [
        {
          type: "WorldTimeAdvanced",
          fromMinute: 0,
          toMinute: 3,
        },
        {
          type: "OperationDisengaged",
          targetId: "nightshade",
          stage: "recon",
          worldMinute: 3,
        },
        {
          type: "TraceRecorded",
          traceId: "trace:1",
          targetId: "nightshade",
          cause: "operation-disengagement",
          severity: "low",
          worldMinute: 3,
        },
      ],
    });

    expect(bus.snapshot().operation).toBeNull();
    expect(bus.snapshot().worldMinute).toBe(3);
  });
});
