import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { createInitialWorldState } from "@/game/simulation/state/world-state";
import type { WorldState } from "@/game/simulation/state/world-state";
import type { NetworkRouteChallenge } from "../systems/network-routes";

function route(): NetworkRouteChallenge {
  return {
    id: "example-route", targetId: "corp", entryMachineId: "relay",
    objectiveMachineId: "vault",
    candidates: [
      { id: "bad", label: "Public", carrier: "public", echo: "triangle" },
      { id: "correct", label: "Sealed", carrier: "sealed", echo: "triangle" },
      { id: "other", label: "Other", carrier: "sealed", echo: "circle" },
    ],
    requiredCarrier: "sealed", requiredEcho: "triangle", epoch: 0,
    baseMinutes: 4, traceWeight: 1,
    observations: [
      { id: "carrier", kind: "carrier", value: "sealed",
        sourceId: "relay", epoch: 0, worldMinute: 2 },
      { id: "echo", kind: "echo", value: "triangle",
        sourceId: "signal", epoch: 0, worldMinute: 3 },
    ],
    tests: [],
  };
}

function world(): WorldState {
  return createInitialWorldState({
    worldMinute: 10, player: { handle: "GammaX", rank: 500000 },
    targets: [{
      id: "corp", handle: "Corp", rank: 1,
      machines: [
        { id: "relay", label: "Relay", role: "gateway",
          services: [{ id: "signal", label: "Signal", kind: "fictional", state: "online" }] },
        { id: "vault", label: "Vault", role: "storage", services: [] },
      ],
    }],
    knownTargetIds: ["corp"],
    evidence: [{ id: "machine-presence:relay", kind: "machine-presence",
      subjectId: "relay", confidence: "observed",
      source: "direct-observation", worldMinute: 1 }],
    operation: { targetId: "corp", stage: "recon", openedWorldMinute: 0 },
    networkChallenges: [route()],
  });
}
const command = (routeId: string) => ({
  type: "testNetworkRoute" as const, targetId: "corp",
  challengeId: "example-route", routeId,
});

describe("Network Mapping CommandBus integration", () => {
  it("charges 4 minutes and 1 trace and records objective evidence on a correct test", () => {
    const bus = new CommandBus(world());
    const result = bus.execute(command("correct"));
    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "NetworkRouteTested", result: "confirmed", routeId: "correct",
    }));
    const state = bus.snapshot();
    expect(state.worldMinute).toBe(14);
    expect(state.traces).toEqual([expect.objectContaining({
      targetId: "corp", cause: "network-route-test", weight: 1, severity: "low",
    })]);
    expect(state.evidence).toContainEqual(expect.objectContaining({
      subjectId: "vault", kind: "machine-presence",
    }));
    expect(state.networkChallenges![0]!.tests).toEqual([{
      routeId: "correct", epoch: 0, result: "confirmed", worldMinute: 14,
    }]);
  });

  it("charges a wrong guess, never grants hidden evidence and refuses repeat guesses for free", () => {
    const bus = new CommandBus(world());
    const wrong = bus.execute(command("bad"));
    expect(wrong.ok).toBe(true);
    expect(wrong.events).toContainEqual(expect.objectContaining({
      type: "NetworkRouteTested", result: "refuted", routeId: "bad",
    }));
    expect(bus.snapshot().evidence.some(x => x.subjectId === "vault")).toBe(false);
    const prior = JSON.stringify(bus.snapshot());
    const repeated = bus.execute(command("bad"));
    expect(repeated).toMatchObject({ ok: false, error: "ROUTE_ALREADY_TESTED", events: [] });
    expect(JSON.stringify(bus.snapshot())).toBe(prior);
  });

  it("rejects unseen routes, absent operation, unknown challenges and unearned clues without cost", () => {
    const scenarios: Array<[WorldState, ReturnType<typeof command>, string]> = [];
    const noOp = world(); noOp.operation = null;
    scenarios.push([noOp, command("correct"), "NO_ACTIVE_OPERATION"]);
    scenarios.push([world(), command("missing"), "ROUTE_UNKNOWN"]);
    scenarios.push([world(), { ...command("correct"), challengeId: "unknown" }, "CHALLENGE_UNKNOWN"]);
    const noClues = world(); noClues.networkChallenges![0]!.observations = [];
    scenarios.push([noClues, command("correct"), "CLUES_INCOMPLETE"]);
    const wrongTarget = world();
    scenarios.push([wrongTarget, { ...command("correct"), targetId: "other" }, "OPERATION_TARGET_MISMATCH"]);
    for (const [initial, request, error] of scenarios) {
      const bus = new CommandBus(initial);
      const before = JSON.stringify(bus.snapshot());
      expect(bus.execute(request)).toMatchObject({ ok: false, error, events: [] });
      expect(JSON.stringify(bus.snapshot())).toBe(before);
    }
  });

  it("replays a route proof identically after a Zod-validated save/restore", () => {
    const original = world();
    const resumed = worldStateSchema.parse(JSON.parse(JSON.stringify(original)));
    const left = new CommandBus(original);
    const right = new CommandBus(resumed);
    const first = left.execute(command("bad"));
    const second = right.execute(command("bad"));
    expect(second).toEqual(first);
    expect(right.snapshot()).toEqual(left.snapshot());
    const midSave = worldStateSchema.parse(JSON.parse(JSON.stringify(left.snapshot())));
    const continued = new CommandBus(midSave);
    expect(continued.execute(command("correct"))).toEqual(
      left.execute(command("correct")),
    );
    expect(continued.snapshot()).toEqual(left.snapshot());
  });

  it("never uses public player or target ranks to solve network routes", () => {
    const highest = world();
    highest.player.rank = 1;
    highest.targets[0]!.rank = 1_000_000;
    const lowest = world();
    lowest.player.rank = 1_000_000;
    lowest.targets[0]!.rank = 1;
    const highBus = new CommandBus(highest);
    const lowBus = new CommandBus(lowest);
    const high = highBus.execute(command("correct"));
    const low = lowBus.execute(command("correct"));
    expect(high.ok).toBe(true);
    expect(low.ok).toBe(true);
    expect(high.events.map(e => e.type)).toEqual(low.events.map(e => e.type));
    expect(highBus.snapshot().networkChallenges).toEqual(
      lowBus.snapshot().networkChallenges,
    );
    expect(highBus.snapshot().worldMinute).toBe(lowBus.snapshot().worldMinute);
  });

  it("does not permit any action after terminal ending", () => {
    const initial = world();
    initial.ending = { status: "arrested", causeKind: "investigation",
      causeId: "investigation:1", worldMinute: initial.worldMinute };
    const bus = new CommandBus(initial);
    expect(bus.execute(command("correct"))).toMatchObject({
      ok: false, error: "RUN_ENDED", events: [],
    });
  });
});
