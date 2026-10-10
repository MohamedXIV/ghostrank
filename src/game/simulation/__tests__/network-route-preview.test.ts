import { describe, expect, it } from "vitest";
import { createInitialWorldState } from "@/game/simulation/state/world-state";
import type { NetworkRouteChallenge, WorldState } from "@/game/simulation/state/world-state";
import { previewNetworkRoute, seededNetworkRouteOrder } from "../systems/network-routes";

function setup(): WorldState {
  const challenge: NetworkRouteChallenge = {
    id: "link-a", targetId: "company-1",
    entryMachineId: "gate-1", objectiveMachineId: "storage-2",
    candidates: [
      { id: "east", label: "East", carrier: "sealed", echo: "circle" },
      { id: "west", label: "West", carrier: "sealed", echo: "triangle" },
      { id: "north", label: "North", carrier: "public", echo: "triangle" },
    ],
    requiredCarrier: "sealed", requiredEcho: "triangle", epoch: 0,
    baseMinutes: 4, traceWeight: 1,
    observations: [
      { id: "c", kind: "carrier", value: "sealed", sourceId: "gate-1",
        epoch: 0, worldMinute: 5 },
      { id: "e", kind: "echo", value: "triangle", sourceId: "gate-1-svc",
        epoch: 0, worldMinute: 6 },
    ],
    tests: [],
  };
  return createInitialWorldState({
    worldMinute: 20, player: { handle: "GammaX", rank: 999999 },
    targets: [{ id: "company-1", handle: "Company", rank: 1,
      machines: [{ id: "gate-1", label: "Gate", role: "gateway",
        services: [{ id: "gate-1-svc", label: "Broker", kind: "fictional", state: "online" }] },
      { id: "storage-2", label: "Storage", role: "storage", services: [] }] }],
    networkChallenges: [challenge],
    operation: { targetId: "company-1", stage: "recon", openedWorldMinute: 0 },
    evidence: [{ id: "machine-presence:gate-1", kind: "machine-presence",
      subjectId: "gate-1", confidence: "observed",
      source: "direct-observation", worldMinute: 1 }],
    traces: [{ id: "t1", targetId: "company-1", cause: "operation-probe",
      stage: "recon", severity: "low", weight: 2, worldMinute: 2 }],
  });
}

describe("generic route action preview", () => {
  it("computes authoritative time and footprint without mutating any world data", () => {
    const world = setup();
    const before = JSON.stringify(world);
    expect(previewNetworkRoute(world, "company-1", "link-a", "east")).toEqual({
      ok: true, minutes: 4, traceWeight: 1, footprintAfter: 3,
    });
    expect(JSON.stringify(world)).toBe(before);
  });
  it("never grades a route, even when candidate is incorrect", () => {
    const w = setup();
    expect(previewNetworkRoute(w, "company-1", "link-a", "east")).toEqual(
      previewNetworkRoute(w, "company-1", "link-a", "west"),
    );
  });
  it("fails without target access, entry evidence or current clues", () => {
    const w = setup();
    expect(previewNetworkRoute(w, "other", "link-a", "west")).toEqual({
      ok: false, error: "OPERATION_TARGET_MISMATCH",
    });
    expect(previewNetworkRoute(w, "company-1", "invalid", "west")).toEqual({
      ok: false, error: "CHALLENGE_UNKNOWN",
    });
    w.evidence = [];
    expect(previewNetworkRoute(w, "company-1", "link-a", "west")).toEqual({
      ok: false, error: "ENTRY_UNOBSERVED",
    });
    w.evidence.push({ id: "machine-presence:gate-1", kind: "machine-presence",
      subjectId: "gate-1", confidence: "observed",
      source: "direct-observation", worldMinute: 1 });
    w.networkChallenges![0]!.epoch += 1;
    expect(previewNetworkRoute(w, "company-1", "link-a", "west")).toEqual({
      ok: false, error: "CLUES_INCOMPLETE",
    });
  });
  it("changes only the fictional route presentation order across some seeds", () => {
    const challenge = setup().networkChallenges![0]!;
    const original = JSON.stringify(challenge);
    const orders = new Set(Array.from({ length: 120 }, (_, seed) =>
      seededNetworkRouteOrder(seed, challenge).map(c => c.id).join(",")));
    expect(orders.size).toBeGreaterThan(1);
    expect(seededNetworkRouteOrder(17, challenge)).toEqual(
      seededNetworkRouteOrder(17, challenge),
    );
    expect(seededNetworkRouteOrder(17, challenge).map(c => c.id).sort()).toEqual(
      challenge.candidates.map(c => c.id).sort(),
    );
    expect(JSON.stringify(challenge)).toBe(original);
  });
});
