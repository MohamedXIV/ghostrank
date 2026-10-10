import { describe, expect, it } from "vitest";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { createInitialWorldState } from "@/game/simulation/state/world-state";
import type { NetworkRouteChallenge } from "@/game/simulation/systems/network-routes";

const route = (): NetworkRouteChallenge => ({
  id: "route:alpha", targetId: "target-1", entryMachineId: "entry", objectiveMachineId: "vault",
  candidates: [
    { id: "c1", label: "Public", carrier: "public", echo: "triangle" },
    { id: "c2", label: "Sealed A", carrier: "sealed", echo: "circle" },
    { id: "c3", label: "Sealed B", carrier: "sealed", echo: "triangle" },
  ],
  requiredCarrier: "sealed", requiredEcho: "triangle",
  epoch: 0, baseMinutes: 4, traceWeight: 1,
  observations: [{ id: "obs:1", kind: "carrier", value: "sealed", sourceId: "entry",
    epoch: 0, worldMinute: 2 }],
  tests: [],
});

const base = () => ({
  worldMinute: 10, player: { handle: "CobaltXZ", rank: 100256 },
  targets: [{ id: "target-1", handle: "Alpha", rank: 99,
    machines: [
      { id: "entry", label: "Entry", role: "gateway", services: [] },
      { id: "vault", label: "Vault", role: "storage", services: [] },
    ],
  }],
  knownTargetIds: [],
});

describe("G3 optional generic network route persistence", () => {
  it("never adds a challenge field to legacy worlds", () => {
    const legacy = worldStateSchema.parse(base());
    expect(Object.hasOwn(legacy, "networkChallenges")).toBe(false);
    const created = createInitialWorldState({ targets: base().targets });
    expect(Object.hasOwn(created, "networkChallenges")).toBe(false);
  });

  it("round-trips explicit valid authored challenges and clones initial input", () => {
    const input = { ...base(), networkChallenges: [route()] };
    const parsed = worldStateSchema.parse(input);
    expect(parsed.networkChallenges).toEqual(input.networkChallenges);
    const created = createInitialWorldState({
      targets: input.targets, networkChallenges: parsed.networkChallenges,
    });
    expect(created.networkChallenges).toEqual(input.networkChallenges);
    created.networkChallenges![0]!.observations.push({
      id: "obs:2", kind: "echo", value: "triangle", sourceId: "entry",
      epoch: 0, worldMinute: 4,
    });
    expect(input.networkChallenges[0]!.observations).toHaveLength(1);
  });

  it("rejects duplicate candidate and challenge IDs", () => {
    const duplicateRoute = route();
    duplicateRoute.candidates[1]!.id = "c1";
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [duplicateRoute],
    }).success).toBe(false);
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [route(), route()],
    }).success).toBe(false);
  });

  it("rejects mismatched target/machine references and a missing entry source", () => {
    for (const patch of [
      { targetId: "other-target" },
      { entryMachineId: "unknown-entry" },
      { objectiveMachineId: "unknown-vault" },
      { entryMachineId: "vault", objectiveMachineId: "vault" },
    ]) {
      expect(worldStateSchema.safeParse({
        ...base(), networkChallenges: [{ ...route(), ...patch }],
      }).success).toBe(false);
    }
    const unsupported = route();
    unsupported.observations[0]!.sourceId = "invisible";
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [unsupported],
    }).success).toBe(false);
  });

  it("rejects contradictory current-epoch sourced carrier and echo clues", () => {
    const wrongCarrier = route();
    wrongCarrier.observations[0]!.value = "public";
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [wrongCarrier],
    }).success).toBe(false);

    const wrongEcho = route();
    wrongEcho.observations.push({
      id: "echo:wrong", kind: "echo", value: "circle",
      sourceId: "entry", epoch: 0, worldMinute: 3,
    });
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [wrongEcho],
    }).success).toBe(false);
  });

  it("rejects impossible current-epoch recorded test results", () => {
    const impossibleConfirmed = route();
    impossibleConfirmed.tests = [
      { routeId: "c1", epoch: 0, result: "confirmed", worldMinute: 5 },
    ];
    const impossibleRefuted = route();
    impossibleRefuted.tests = [
      { routeId: "c3", epoch: 0, result: "refuted", worldMinute: 5 },
    ];
    for (const challenge of [impossibleConfirmed, impossibleRefuted]) {
      expect(worldStateSchema.safeParse({
        ...base(), networkChallenges: [challenge],
      }).success).toBe(false);
    }

    const valid = route();
    valid.tests = [
      { routeId: "c1", epoch: 0, result: "refuted", worldMinute: 5 },
      { routeId: "c3", epoch: 0, result: "confirmed", worldMinute: 6 },
    ];
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [valid],
    }).success).toBe(true);
  });

  it("preserves historical observations and outcomes across defender rotation", () => {
    const rotated = route();
    rotated.epoch = 1;
    rotated.requiredEcho = "circle";
    rotated.observations.push(
      { id: "echo:old", kind: "echo", value: "triangle",
        sourceId: "entry", epoch: 0, worldMinute: 3 },
      { id: "carrier:new", kind: "carrier", value: "sealed",
        sourceId: "entry", epoch: 1, worldMinute: 5 },
      { id: "echo:new", kind: "echo", value: "circle",
        sourceId: "entry", epoch: 1, worldMinute: 5 },
    );
    rotated.tests = [
      { routeId: "c3", epoch: 0, result: "confirmed", worldMinute: 4 },
      { routeId: "c3", epoch: 1, result: "refuted", worldMinute: 6 },
      { routeId: "c2", epoch: 1, result: "confirmed", worldMinute: 7 },
    ];
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [rotated],
    }).success).toBe(true);
  });

  it("rejects impossible or ambiguous solutions and malformed epoch/provenance", () => {
    const variants = [
      { requiredCarrier: "public", requiredEcho: "circle" },
      { requiredCarrier: "sealed", requiredEcho: "triangle", epoch: -1 },
      { requiredCarrier: "sealed", requiredEcho: "triangle", baseMinutes: 0 },
      { requiredCarrier: "sealed", requiredEcho: "triangle", traceWeight: -1 },
    ];
    for (const patch of variants) {
      expect(worldStateSchema.safeParse({
        ...base(), networkChallenges: [{ ...route(), ...patch }],
      }).success).toBe(false);
    }
    const future = route();
    future.observations[0]!.worldMinute = 20;
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [future],
    }).success).toBe(false);
    const wrongEpoch = route();
    wrongEpoch.observations[0]!.epoch = 2;
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [wrongEpoch],
    }).success).toBe(false);
    const duplicateTest = route();
    duplicateTest.tests = [
      { routeId: "c1", epoch: 0, result: "refuted", worldMinute: 3 },
      { routeId: "c1", epoch: 0, result: "refuted", worldMinute: 4 },
    ];
    expect(worldStateSchema.safeParse({
      ...base(), networkChallenges: [duplicateTest],
    }).success).toBe(false);
  });
});
