import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { NIGHTSHADE_TARGET_ID, RELAY_MACHINE_ID, VAULT_MACHINE_ID, SLICE_CONTRACT_ID } from "@/content/nightshade-slice";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { SLICE_RUN_SCENARIO } from "@/game/simulation/state/run-scenario";
import { rotateNetworkRoute } from "@/game/simulation/systems/network-routes";
import { nightshadeV2IntrusiveSignal } from "@/game/simulation/systems/nightshade-slice";

function start() {
  const bus = new CommandBus(createSliceWorldState({
    scenario: SLICE_RUN_SCENARIO, nightshadeRules: "nightshade-v2",
  }));
  const run = (command: Parameters<CommandBus["execute"]>[0]) => {
    const result = bus.execute(command);
    if (!result.ok) throw new Error(`${command.type}: ${result.error}`);
    return result;
  };
  run({ type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID });
  run({ type: "acceptContract", contractId: SLICE_CONTRACT_ID });
  run({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID });
  run({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID });
  run({ type: "inspectMachine", machineId: RELAY_MACHINE_ID });
  return { bus, run };
}

const presence = (bus: CommandBus) =>
  bus.snapshot().evidence.some(e =>
    e.kind === "machine-presence" &&
    e.subjectId === VAULT_MACHINE_ID && e.retiredWorldMinute === undefined);

describe("Nightshade v2 uses general Network Mapping (v1 unchanged)", () => {
  it("instantiates an ordinary optional route challenge with no additional real machines", () => {
    const initial = createSliceWorldState({ scenario: SLICE_RUN_SCENARIO, nightshadeRules: "nightshade-v2" });
    expect(initial.slice?.rules).toBe("nightshade-v2");
    expect(initial.networkChallenges).toHaveLength(1);
    expect(initial.networkChallenges![0]).toMatchObject({
      targetId: NIGHTSHADE_TARGET_ID, entryMachineId: RELAY_MACHINE_ID,
      objectiveMachineId: VAULT_MACHINE_ID,
    });
    expect(worldStateSchema.parse(initial).networkChallenges).toEqual(initial.networkChallenges);
    expect(createSliceWorldState({ scenario: SLICE_RUN_SCENARIO }).slice?.rules).toBe("nightshade-v1");
  });

  it("quiet broker supplies the second clue but route proof is a separate deliberate action", () => {
    const { bus, run } = start();
    expect(presence(bus)).toBe(false);
    expect(bus.snapshot().networkChallenges![0]!.observations.map(x => x.kind)).toEqual(["carrier"]);
    expect(bus.execute({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID })).toMatchObject({
      ok: false, error: "NO_NEW_MACHINE_EVIDENCE",
    });
    const challenge = bus.snapshot().networkChallenges![0]!;
    expect(bus.execute({ type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID,
      challengeId: challenge.id, routeId: challenge.candidates[2]!.id })).toMatchObject({
      ok: false, error: "CLUES_INCOMPLETE",
    });
    const now = bus.snapshot().worldMinute;
    run({ type: "advanceTime", minutes: 360 - now });
    expect(presence(bus)).toBe(false);
    expect(bus.snapshot().networkChallenges![0]!.observations.map(x => x.kind)).toEqual(["carrier", "echo"]);
    const projected = projectWorld(bus.snapshot()).networkRoutes![0]!;
    expect(JSON.stringify(projected)).not.toContain(VAULT_MACHINE_ID);
    const choice = challenge.candidates.find(x =>
      x.carrier === "sealed" && x.echo === "triangle")!.id;
    run({ type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID, challengeId: challenge.id, routeId: choice });
    expect(presence(bus)).toBe(true);
    run({ type: "deliverContract", contractId: SLICE_CONTRACT_ID });
    expect(bus.snapshot().slice?.outcome).toBe("delivered");
  });

  it("intrusive reading supplies faster echo, not vault evidence, and risk remains real", () => {
    const { bus, run } = start();
    const challenge = bus.snapshot().networkChallenges![0]!;
    run({ type: "escalateOperation", confirmed: true });
    expect(presence(bus)).toBe(false);
    expect(bus.snapshot().networkChallenges![0]!.observations.some(x =>
      x.kind === "echo" && x.epoch === 0)).toBe(true);
    expect(bus.snapshot().reactions.some(r => r.status === "active")).toBe(true);
    const choice = challenge.candidates.find(x =>
      x.carrier === "sealed" && x.echo === "triangle")!.id;
    run({ type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID, challengeId: challenge.id, routeId: choice });
    expect(presence(bus)).toBe(true);
  });

  it("owner review retires confirmed evidence, rotates route and requires fresh clues", () => {
    const { bus, run } = start();
    const challenge = bus.snapshot().networkChallenges![0]!;
    run({ type: "escalateOperation", confirmed: true });
    const correct = challenge.candidates.find(x => x.carrier === "sealed" && x.echo === "triangle")!.id;
    run({ type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID, challengeId: challenge.id, routeId: correct });
    const now = bus.snapshot().worldMinute;
    run({ type: "advanceTime", minutes: 360 - now });
    expect(presence(bus)).toBe(false);
    expect(bus.snapshot().networkChallenges![0]!.epoch).toBe(1);
    expect(bus.snapshot().networkChallenges![0]!.requiredEcho).toBe("circle");
    expect(bus.execute({ type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID,
      challengeId: challenge.id, routeId: correct })).toMatchObject({
      ok: false, error: "CLUES_INCOMPLETE",
    });
    run({ type: "inspectMachine", machineId: RELAY_MACHINE_ID });
    const since = bus.snapshot().worldMinute;
    run({ type: "advanceTime", minutes: 720 - since });
    const rotated = challenge.candidates.find(x => x.carrier === "sealed" && x.echo === "circle")!.id;
    expect(bus.snapshot().networkChallenges![0]!.observations.filter(x => x.epoch === 1).map(x => x.kind))
      .toEqual(["carrier", "echo"]);
    run({ type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID, challengeId: challenge.id, routeId: rotated });
    expect(presence(bus)).toBe(true);
  });

  it("resolves a route verification crossing owner review as stale without a trace double charge", () => {
    const { bus, run } = start();
    const challenge = bus.snapshot().networkChallenges![0]!;
    run({ type: "escalateOperation", confirmed: true });
    const current = bus.snapshot().worldMinute;
    run({ type: "advanceTime", minutes: 359 - current });
    const before = bus.snapshot();
    const chosen = challenge.candidates.find(x =>
      x.carrier === "sealed" && x.echo === "triangle")!.id;
    const result = run({
      type: "testNetworkRoute", targetId: NIGHTSHADE_TARGET_ID,
      challengeId: challenge.id, routeId: chosen,
    });
    expect(bus.snapshot().worldMinute).toBe(363);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "SliceReviewRan", worldMinute: 360,
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "NetworkRouteTested", result: "stale", routeId: chosen,
    }));
    expect(bus.snapshot().traces).toEqual(before.traces);
    expect(presence(bus)).toBe(false);
    expect(bus.snapshot().slice?.outcome).toBeNull();
  });

  it("uses the live rotated echo for an intrusive clue, never the old one", () => {
    const world = createSliceWorldState({
      scenario: SLICE_RUN_SCENARIO, nightshadeRules: "nightshade-v2",
    });
    const challenge = world.networkChallenges![0]!;
    rotateNetworkRoute(challenge, "circle");

    nightshadeV2IntrusiveSignal(world);
    expect(challenge.observations.filter(observation =>
      observation.kind === "echo" && observation.epoch === challenge.epoch,
    )).toEqual([expect.objectContaining({ value: "circle" })]);
    expect(worldStateSchema.safeParse(world).success).toBe(true);
  });

  it("serializes and resumes v2 while keeping the legacy v1 gate without generic challenges", () => {
    const { bus } = start();
    const before = bus.snapshot();
    const loaded = worldStateSchema.parse(JSON.parse(JSON.stringify(before)));
    expect(loaded.slice?.rules).toBe("nightshade-v2");
    expect(loaded.networkChallenges).toEqual(before.networkChallenges);
    expect(new CommandBus(loaded).snapshot().networkChallenges).toEqual(before.networkChallenges);
    const legacy = createSliceWorldState({ scenario: SLICE_RUN_SCENARIO });
    expect(legacy.networkChallenges).toBeUndefined();
    expect(worldStateSchema.parse(legacy).slice?.rules).toBe("nightshade-v1");
  });
});
