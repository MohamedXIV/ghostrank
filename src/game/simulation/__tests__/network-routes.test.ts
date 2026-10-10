import { describe, expect, it } from "vitest";
import {
  assessNetworkRoute,
  matchingNetworkRoute,
  observedNetworkConstraints,
  recordNetworkObservation,
  rotateNetworkRoute,
  type NetworkRouteChallenge,
} from "../systems/network-routes";

function fixture(): NetworkRouteChallenge {
  return {
    id: "route:test",
    targetId: "test-target",
    entryMachineId: "relay",
    objectiveMachineId: "storage",
    candidates: [
      { id: "amber", label: "Amber", carrier: "public", echo: "triangle" },
      { id: "cobalt", label: "Cobalt", carrier: "sealed", echo: "circle" },
      { id: "ivory", label: "Ivory", carrier: "sealed", echo: "triangle" },
    ],
    requiredCarrier: "sealed",
    requiredEcho: "triangle",
    epoch: 0,
    baseMinutes: 4,
    traceWeight: 1,
    observations: [],
    tests: [],
  };
}

describe("shared fictional network-route reasoning", () => {
  it("uses both constraints rather than a specific route display label", () => {
    const challenge = fixture();
    expect(matchingNetworkRoute(challenge, "ivory")).toBe(true);
    expect(matchingNetworkRoute(challenge, "amber")).toBe(false);
    expect(matchingNetworkRoute(challenge, "cobalt")).toBe(false);
    const renamed = { ...challenge, candidates: challenge.candidates.map((candidate) => ({
      ...candidate, id: `other-${candidate.id}`, label: `Other ${candidate.label}`,
    })) };
    expect(matchingNetworkRoute(renamed, "other-ivory")).toBe(true);
  });

  it("refuses a hypothesis without both earned clues", () => {
    const challenge = fixture();
    expect(observedNetworkConstraints(challenge)).toEqual({});
    expect(assessNetworkRoute(challenge, "ivory")).toEqual({
      ok: false, error: "CLUES_INCOMPLETE",
    });
  });

  it("requires two sourced observations and refuses repeated guesses in the epoch", () => {
    const challenge = fixture();
    recordNetworkObservation(challenge, {
      id: "manifest", kind: "carrier", value: "sealed",
      sourceId: "relay-manifest", epoch: 0, worldMinute: 1,
    });
    expect(assessNetworkRoute(challenge, "ivory")).toEqual({
      ok: false, error: "CLUES_INCOMPLETE",
    });
    recordNetworkObservation(challenge, {
      id: "signal", kind: "echo", value: "triangle",
      sourceId: "trusted-broker", epoch: 0, worldMinute: 360,
    });
    expect(observedNetworkConstraints(challenge)).toEqual({
      carrier: "sealed", echo: "triangle",
    });
    expect(assessNetworkRoute(challenge, "ivory")).toEqual({ ok: true });
    challenge.tests.push({ routeId: "ivory", epoch: 0, result: "confirmed", worldMinute: 365 });
    expect(assessNetworkRoute(challenge, "ivory")).toEqual({
      ok: false, error: "ROUTE_ALREADY_TESTED",
    });
    expect(assessNetworkRoute(challenge, "not-a-route")).toEqual({
      ok: false, error: "ROUTE_UNKNOWN",
    });
  });

  it("retains historical knowledge but requires current-epoch clues after rotation", () => {
    const challenge = fixture();
    recordNetworkObservation(challenge, {
      id: "carrier-0", kind: "carrier", value: "sealed",
      sourceId: "manifest", epoch: 0, worldMinute: 1,
    });
    recordNetworkObservation(challenge, {
      id: "echo-0", kind: "echo", value: "triangle",
      sourceId: "broker", epoch: 0, worldMinute: 360,
    });
    challenge.tests.push({ routeId: "ivory", epoch: 0, result: "confirmed", worldMinute: 363 });
    rotateNetworkRoute(challenge, "circle");
    expect(challenge.epoch).toBe(1);
    expect(matchingNetworkRoute(challenge, "cobalt")).toBe(true);
    expect(matchingNetworkRoute(challenge, "ivory")).toBe(false);
    expect(observedNetworkConstraints(challenge)).toEqual({});
    expect(assessNetworkRoute(challenge, "cobalt")).toEqual({
      ok: false, error: "CLUES_INCOMPLETE",
    });
    recordNetworkObservation(challenge, {
      id: "carrier-1", kind: "carrier", value: "sealed",
      sourceId: "relay", epoch: 1, worldMinute: 370,
    });
    recordNetworkObservation(challenge, {
      id: "echo-1", kind: "echo", value: "circle",
      sourceId: "broker", epoch: 1, worldMinute: 720,
    });
    expect(assessNetworkRoute(challenge, "cobalt")).toEqual({ ok: true });
  });

  it("rejects invalid provenance, duplicate clues and unsolvable rotations", () => {
    const challenge = fixture();
    expect(() => recordNetworkObservation(challenge, {
      id: "bad", kind: "echo", value: "square" as "circle",
      sourceId: "broker", epoch: 0, worldMinute: 1,
    })).toThrow(/invalid/i);
    expect(() => recordNetworkObservation(challenge, {
      id: "future", kind: "echo", value: "triangle",
      sourceId: "broker", epoch: 1, worldMinute: 1,
    })).toThrow(/epoch/i);
    expect(() => rotateNetworkRoute(
      { ...challenge, candidates: challenge.candidates.filter((item) => item.id !== "cobalt") },
      "circle",
    )).toThrow(/unique/i);
    expect(challenge.observations).toEqual([]);
    expect(challenge.epoch).toBe(0);
  });
});
