import { describe, expect, it } from "vitest";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { createInitialWorldState } from "@/game/simulation/state/world-state";
import type { WorldState } from "@/game/simulation/state/world-state";
import type { NetworkRouteChallenge } from "../systems/network-routes";

function example(): WorldState {
  const puzzle: NetworkRouteChallenge = {
    id: "challenge-1", targetId: "harbor",
    entryMachineId: "gate", objectiveMachineId: "private-hidden-machine",
    candidates: [
      { id: "east", label: "Eastern tunnel", carrier: "public", echo: "triangle" },
      { id: "west", label: "Western tunnel", carrier: "sealed", echo: "circle" },
      { id: "north", label: "Northern tunnel", carrier: "sealed", echo: "triangle" },
    ],
    requiredCarrier: "sealed", requiredEcho: "triangle",
    epoch: 0, baseMinutes: 4, traceWeight: 1,
    observations: [], tests: [],
  };
  return createInitialWorldState({
    worldMinute: 10, player: { handle: "GammaX", rank: 1000 },
    targets: [{
      id: "harbor", handle: "Harbor", rank: 1, machines: [
        { id: "gate", label: "Gate", role: "gateway",
          services: [{ id: "service-signal", label: "Signal", kind: "fiction", state: "online" }] },
        { id: "private-hidden-machine", label: "Vault", role: "storage", services: [] },
      ],
    }],
    knownTargetIds: ["harbor"],
    operation: { targetId: "harbor", stage: "recon", openedWorldMinute: 0 },
    networkChallenges: [puzzle],
  });
}

describe("player-safe Network Mapping projection", () => {
  it("does not render a challenge before the entry machine is discovered", () => {
    const world = example();
    expect(projectWorld(world).networkRoutes).toBeUndefined();
    world.networkChallenges = undefined;
    expect(projectWorld(world).networkRoutes).toBeUndefined();
  });

  it("reveals candidate paths but not hidden objective, solution or future echo", () => {
    const world = example();
    world.evidence.push({ id: "entry", kind: "machine-presence",
      subjectId: "gate", confidence: "observed",
      source: "direct-observation", worldMinute: 1 });
    const graph = projectWorld(world).networkRoutes;
    expect(graph).toHaveLength(1);
    expect(graph![0]!.candidates).toHaveLength(3);
    expect(graph![0]!.known).toEqual({});
    expect(graph![0]!.preview).toBeNull();
    expect(graph![0]!.candidates.map(x => x.status)).toEqual([
      "candidate", "candidate", "candidate",
    ]);
    const json = JSON.stringify(graph);
    expect(json).not.toContain("private-hidden-machine");
    expect(json).not.toContain("requiredCarrier");
    expect(json).not.toContain("requiredEcho");
    expect(json).not.toContain("correctRouteId");
  });

  it("surfaces only sourced current-epoch clues and derives refutation status", () => {
    const world = example();
    world.evidence.push({ id: "entry", kind: "machine-presence",
      subjectId: "gate", confidence: "observed",
      source: "direct-observation", worldMinute: 1 });
    const c = world.networkChallenges![0]!;
    c.observations.push({
      id: "manifest", kind: "carrier", value: "sealed",
      sourceId: "gate", epoch: 0, worldMinute: 2,
    }, {
      id: "broker", kind: "echo", value: "triangle",
      sourceId: "service-signal", epoch: 0, worldMinute: 3,
    });
    c.tests.push({ routeId: "east", epoch: 0, result: "refuted", worldMinute: 4 });
    const data = projectWorld(world).networkRoutes![0]!;
    expect(data.known).toEqual({ carrier: "sealed", echo: "triangle" });
    expect(data.candidates.find(x => x.id === "east")!.status).toBe("refuted");
    expect(data.preview).toMatchObject({ minutes: 4, traceWeight: 1 });
    c.epoch = 1; c.requiredEcho = "circle";
    const later = projectWorld(world).networkRoutes![0]!;
    expect(later.known).toEqual({});
    expect(later.preview).toBeNull();
    expect(later.candidates.find(x => x.id === "east")!.status).toBe("stale");
    expect(JSON.stringify(later)).not.toContain('"expectedEcho"');
  });
});
