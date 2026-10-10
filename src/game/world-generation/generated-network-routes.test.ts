import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { matchingNetworkRoute } from "@/game/simulation/systems/network-routes";

describe("G3 independent G2 Fresh Scene Network Mapping consumer", () => {
  const make = (seed: number) =>
    createSliceWorldState({ scenario: "fresh-scene", seed, networkMappingDemo: true });
  it("attaches sourced and uniquely solvable opt-in generated challenges across 120 seeds", () => {
    const arrangements = new Set<string>();
    for (let seed = 1; seed <= 120; seed++) {
      const world = make(seed);
      expect(world.slice).toBeUndefined();
      expect(world.networkChallenges).toHaveLength(1);
      const challenge = world.networkChallenges![0]!;
      const target = world.targets.find(x => x.id === challenge.targetId)!;
      expect(target).toBeDefined();
      expect(target.id).not.toBe("nightshade");
      expect(target.machines.map(x => x.id)).toContain(challenge.entryMachineId);
      expect(target.machines.map(x => x.id)).toContain(challenge.objectiveMachineId);
      expect(target.machines.flatMap(x => x.services.map(y => y.id))).toContain(
        challenge.observations[0]?.sourceId ?? target.machines[0]!.services[0]!.id,
      );
      expect(challenge.candidates.filter(x => matchingNetworkRoute(challenge, x.id))).toHaveLength(1);
      expect(worldStateSchema.parse(world).networkChallenges).toEqual(world.networkChallenges);
      arrangements.add(challenge.candidates.map(x => x.id).join(","));
      expect(make(seed).networkChallenges).toEqual(world.networkChallenges);
    }
    expect(arrangements.size).toBeGreaterThan(1);
  });

  it("a generated consumer earns clues through survey and inspect, then commits the same command", () => {
    const initial = make(17);
    const challenge = initial.networkChallenges![0]!;
    const bus = new CommandBus(initial);
    const run = (command: Parameters<CommandBus["execute"]>[0]) => {
      const result = bus.execute(command);
      if (!result.ok) throw new Error(`${command.type}: ${result.error}`);
      return result;
    };
    run({ type: "observeTarget", targetId: challenge.targetId });
    run({ type: "openOperation", targetId: challenge.targetId });
    run({ type: "surveyTarget", targetId: challenge.targetId });
    expect(bus.snapshot().networkChallenges![0]!.observations.map(x => x.kind)).toEqual(["carrier"]);
    // A route objective is inferred, not handed out by an ordinary broad survey.
    expect(bus.snapshot().evidence.some(e =>
      e.kind === "machine-presence" &&
      e.subjectId === challenge.objectiveMachineId &&
      e.retiredWorldMinute === undefined)).toBe(false);
    run({ type: "inspectMachine", machineId: challenge.entryMachineId });
    expect(bus.snapshot().networkChallenges![0]!.observations.map(x => x.kind)).toEqual(["carrier", "echo"]);
    const visible = projectWorld(bus.snapshot()).networkRoutes![0]!;
    expect(visible.known).toMatchObject({ carrier: challenge.requiredCarrier, echo: challenge.requiredEcho });
    expect(JSON.stringify(visible)).not.toContain(challenge.objectiveMachineId);
    const routeId = challenge.candidates.find(x => matchingNetworkRoute(challenge, x.id))!.id;
    const result = run({ type: "testNetworkRoute", targetId: challenge.targetId, challengeId: challenge.id, routeId });
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "NetworkRouteTested", routeId, result: "confirmed",
    }));
    expect(bus.snapshot().networkChallenges![0]!.tests).toHaveLength(1);
  });

  it("ordinary Fresh Scene remains byte-identical unless route exercise is selected", () => {
    const ordinary = createSliceWorldState({ scenario: "fresh-scene", seed: 17 });
    expect(ordinary.networkChallenges).toBeUndefined();
    const optional = make(17);
    const restored = structuredClone(optional);
    delete restored.networkChallenges;
    expect(restored).toEqual(ordinary);
  });
});
