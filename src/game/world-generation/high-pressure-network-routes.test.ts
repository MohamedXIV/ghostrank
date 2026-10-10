import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { matchingNetworkRoute } from "@/game/simulation/systems/network-routes";
import { createNewRunWorldState, createSliceWorldState } from "@/game/runtime/slice-world";
import { worldStateSchema } from "@/persistence/world-state-schema";

describe("G3 Network Mapping is playable in new High Pressure runs (#119)", () => {
  it("attaches one solvable, reproducible challenge across 120 High Pressure seeds", () => {
    const differentLayouts = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const world = createNewRunWorldState({ scenario: "high-pressure", seed });
      expect(world.slice).toBeUndefined();
      expect(world.networkChallenges, `seed ${seed}`).toHaveLength(1);
      const challenge = world.networkChallenges![0]!;
      const target = world.targets.find(t => t.id === challenge.targetId);
      expect(target).toBeDefined();
      expect(target!.machines.map(m => m.id)).toContain(challenge.entryMachineId);
      expect(target!.machines.map(m => m.id)).toContain(challenge.objectiveMachineId);
      expect(challenge.candidates.filter(c => matchingNetworkRoute(challenge, c.id))).toHaveLength(1);
      expect(worldStateSchema.parse(world).networkChallenges).toEqual(world.networkChallenges);
      expect(createNewRunWorldState({ scenario: "high-pressure", seed }).networkChallenges)
        .toEqual(world.networkChallenges);
      differentLayouts.add(challenge.candidates.map(c => c.id).join("/"));
    }
    expect(differentLayouts.size).toBeGreaterThan(1);
  });

  it("earns clues by recon, hides the unseen objective, and can commit a paid route test", () => {
    const initial = createNewRunWorldState({ scenario: "high-pressure", seed: 17 });
    const challenge = initial.networkChallenges![0]!;
    const bus = new CommandBus(initial);
    const act = (command: Parameters<CommandBus["execute"]>[0]) => {
      const result = bus.execute(command);
      expect(result.ok, `${command.type}: ${result.error}`).toBe(true);
      return result;
    };
    expect(projectWorld(bus.snapshot()).networkRoutes ?? []).toHaveLength(0);
    act({ type: "observeTarget", targetId: challenge.targetId });
    act({ type: "openOperation", targetId: challenge.targetId });
    act({ type: "surveyTarget", targetId: challenge.targetId });
    expect(bus.snapshot().networkChallenges![0]!.observations.map(o => o.kind)).toEqual(["carrier"]);
    expect(bus.snapshot().evidence.some(e =>
      e.kind === "machine-presence" && e.subjectId === challenge.objectiveMachineId)).toBe(false);
    act({ type: "inspectMachine", machineId: challenge.entryMachineId });
    expect(bus.snapshot().networkChallenges![0]!.observations.map(o => o.kind)).toEqual(["carrier", "echo"]);
    const visible = projectWorld(bus.snapshot()).networkRoutes![0]!;
    expect(visible.known).toEqual({ carrier: challenge.requiredCarrier, echo: challenge.requiredEcho });
    expect(JSON.stringify(visible)).not.toContain(challenge.objectiveMachineId);
    const correct = challenge.candidates.find(c => matchingNetworkRoute(challenge, c.id))!;
    const before = bus.snapshot().worldMinute;
    const result = act({ type: "testNetworkRoute", targetId: challenge.targetId,
      challengeId: challenge.id, routeId: correct.id });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "NetworkRouteTested", routeId: correct.id, result: "confirmed",
    }));
    expect(bus.snapshot().worldMinute - before).toBe(challenge.baseMinutes);
    expect(bus.snapshot().traces.at(-1)).toMatchObject({
      cause: "network-route-test", weight: challenge.traceWeight,
    });
    expect(bus.snapshot().evidence.some(e =>
      e.kind === "machine-presence" && e.subjectId === challenge.objectiveMachineId)).toBe(true);
  });

  it("keeps fixture factories and explicitly opted-out runs unchanged", () => {
    for (const scenario of ["high-pressure", "fresh-scene"] as const) {
      const fixture = createSliceWorldState({ scenario, seed: 17 });
      const optedOut = createNewRunWorldState({
        scenario, seed: 17, networkMappingDemo: false,
      });
      expect(fixture.networkChallenges).toBeUndefined();
      expect(optedOut.networkChallenges).toBeUndefined();
      expect(optedOut).toEqual(fixture);
    }
    for (const scenario of ["canonical", "nightshade-slice"] as const) {
      expect(createNewRunWorldState({ scenario, seed: 17 }).networkChallenges ?? [])
        .toHaveLength(scenario === "canonical" ? 0 : 1);
    }
  });
});
