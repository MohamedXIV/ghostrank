import { describe, expect, it } from "vitest";

import {
  INFRASTRUCTURE_MAP_OBJECTIVE,
  INFRASTRUCTURE_MAP_VARIANTS,
} from "@/content/contract-objectives";
import { evaluateContractObjective } from "@/game/content/contract-objectives";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { contractDueMinute, isObjectiveMet } from "@/game/simulation/systems/underground";
import { contractPayout } from "@/game/simulation/systems/economy";
import {
  type UndergroundContract,
  type WorldState,
} from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";

const DAY = 1440;
type Scene = "canonical" | "fresh-scene" | "high-pressure";

function makeWorld(
  scenario: Scene = "canonical",
  seed = 19,
  requiredMachines?: number,
): WorldState {
  const world = createSliceWorldState({
    scenario, seed, handle: "CuriousHawk",
  });
  const starting = world.underground.contracts[0];
  const targetId = starting?.targetId ?? world.targets[0].id;
  const issuerId = starting?.issuerId ??
    world.underground.actors.find((actor) => actor.id === "vesper")?.id ??
    world.underground.actors.find((actor) => actor.targetId !== targetId)?.id;
  if (!issuerId) throw new Error("test fixture missing broker");

  world.underground.contracts = [
    {
      id: "contract:g9",
      objective: "infrastructure-map",
      issuerId,
      targetId,
      ...(requiredMachines === undefined ? {} : { requiredMachines }),
      status: "offered",
      offeredWorldMinute: 0,
      expiresWorldMinute: DAY,
    },
  ];
  return world;
}

function entry(world: WorldState): UndergroundContract {
  return world.underground.contracts[0];
}

/** Frozen test-only oracle. It is NEVER imported by gameplay code. */
function oldMapPredicate(world: WorldState, contract: UndergroundContract): boolean {
  const target = world.targets.find((candidate) => candidate.id === contract.targetId);
  if (!target) return false;
  const knownMachines = new Set(
    world.evidence
      .filter((record) =>
        record.kind === "machine-presence" && record.retiredWorldMinute === undefined,
      )
      .map((record) => record.subjectId),
  );
  const count = target.machines.filter((machine) => knownMachines.has(machine.id)).length;
  return count >= (contract.requiredMachines ?? 1);
}

function addObservedMachine(
  world: WorldState,
  machineId: string,
  opts: { retired?: boolean; worldMinute?: number } = {},
): void {
  world.evidence.push({
    id: `machine-presence:${machineId}:${world.evidence.length}`,
    kind: "machine-presence",
    subjectId: machineId,
    confidence: "observed",
    source: "direct-observation",
    worldMinute: opts.worldMinute ?? world.worldMinute,
    ...(opts.retired ? { retiredWorldMinute: world.worldMinute } : {}),
  });
}

function accept(bus: CommandBus) {
  return bus.execute({ type: "acceptContract", contractId: "contract:g9" });
}
function deliver(bus: CommandBus) {
  return bus.execute({ type: "deliverContract", contractId: "contract:g9" });
}

describe("G9 P3 — migrated infrastructure-map objective", () => {
  it("matches the removed legacy predicate for real targets across three scenario families and seeds", () => {
    for (const scenario of ["canonical", "fresh-scene", "high-pressure"] as const) {
      for (const seed of [1, 7, 42, 1337]) {
        const world = makeWorld(scenario, seed, 1);
        const contract = entry(world);
        const machines = world.targets.find((target) => target.id === contract.targetId)?.machines;
        if (!machines?.length) throw new Error("generated target without machines");

        expect(isObjectiveMet(world, contract)).toBe(oldMapPredicate(world, contract));
        addObservedMachine(world, machines[0].id);
        expect(isObjectiveMet(world, contract)).toBe(oldMapPredicate(world, contract));
        expect(isObjectiveMet(world, contract)).toBe(true);

        addObservedMachine(world, machines[0].id); // duplicates count only once
        expect(isObjectiveMet(world, contract)).toBe(oldMapPredicate(world, contract));
        for (const machine of machines.slice(1)) addObservedMachine(world, machine.id);
        for (const required of [1, 2, machines.length]) {
          contract.requiredMachines = required;
          expect(isObjectiveMet(world, contract), `${scenario} seed ${seed} min ${required}`)
            .toBe(oldMapPredicate(world, contract));
        }

        world.player.rank = 1;
        const small = isObjectiveMet(world, contract);
        world.player.rank = 999999;
        world.targets[0].rank = 1;
        expect(isObjectiveMet(world, contract)).toBe(small);
      }
    }
  });

  it("uses authored configurations with the same binder, no extra objective switch", () => {
    const world = makeWorld();
    const contract = entry(world);
    const machines = world.targets.find((target) => target.id === contract.targetId)!.machines;
    expect(machines.length).toBeGreaterThanOrEqual(2);
    addObservedMachine(world, machines[0].id);

    expect(INFRASTRUCTURE_MAP_OBJECTIVE.id).toBe("contract.infrastructure-map.v1");
    for (const config of INFRASTRUCTURE_MAP_VARIANTS) {
      const variantContract = { ...contract, requiredMachines: config.requiredMachines };
      expect(evaluateContractObjective(world, variantContract)).toBe(
        config.requiredMachines === 1,
      );
    }
    addObservedMachine(world, machines[1].id);
    for (const config of INFRASTRUCTURE_MAP_VARIANTS) {
      expect(evaluateContractObjective(world, { ...contract, ...config })).toBe(true);
    }
  });

  it("preserves pre-acceptance evidence, default 1, retired/foreign ID rules and rejects forged IDs", () => {
    const world = makeWorld();
    const contract = entry(world);
    const target = world.targets.find((t) => t.id === contract.targetId)!;
    addObservedMachine(world, target.machines[0].id); // before acceptance

    expect(contract.requiredMachines).toBeUndefined();
    expect(isObjectiveMet(world, contract)).toBe(true);
    contract.requiredMachines = 2;
    expect(isObjectiveMet(world, contract)).toBe(false);
    addObservedMachine(world, target.machines[0].id); // duplicates
    const foreign = world.targets.find((t) => t.id !== contract.targetId);
    if (foreign?.machines[0]) addObservedMachine(world, foreign.machines[0].id);
    expect(isObjectiveMet(world, contract)).toBe(false);
    addObservedMachine(world, target.machines[1].id, { retired: true });
    expect(isObjectiveMet(world, contract)).toBe(false);
    addObservedMachine(world, target.machines[1].id);
    expect(isObjectiveMet(world, contract)).toBe(true);

    expect(evaluateContractObjective(world, { ...contract, targetId: "forged-target" })).toBe(false);
    expect(evaluateContractObjective(world, {
      ...contract, requiredMachines: -1,
    })).toBe(false);
    expect(evaluateContractObjective(world, {
      ...contract, requiredMachines: 100000,
    })).toBe(false);
    expect(evaluateContractObjective(world, {
      ...contract, objective: "quiet-recon",
    })).toBe(false);
    expect(evaluateContractObjective(world, contract, {
      ...INFRASTRUCTURE_MAP_OBJECTIVE,
      condition: {
        ...INFRASTRUCTURE_MAP_OBJECTIVE.condition,
        targetBinding: "contract.requiredMachines" as "contract.targetId",
      },
    })).toBe(false);
  });

  it("keeps actual accepted/delivered CommandBus rewards, deadline and redacted projection", () => {
    const world = makeWorld("canonical", 19, 2);
    const c = entry(world);
    const target = world.targets.find((t) => t.id === c.targetId)!;
    for (const machine of target.machines.slice(0, 2)) addObservedMachine(world, machine.id);
    const before = projectWorld(world);
    const publicContract = before.underground.contracts.find((x) => x.id === c.id);
    expect(publicContract).toMatchObject({
      id: c.id, objective: "infrastructure-map", requiredMachines: 2,
    });
    expect(JSON.stringify(publicContract)).not.toContain("services");
    expect(JSON.stringify(publicContract)).not.toContain("machine-presence");

    const bus = new CommandBus(world);
    const acceptResult = accept(bus);
    expect(acceptResult.ok).toBe(true);
    expect(bus.snapshot().underground.contracts[0].dueWorldMinute).toBe(3 * DAY);
    expect(contractDueMinute(c, 0)).toBe(3 * DAY);
    const creditsBefore = bus.snapshot().economy.credits;
    const result = deliver(bus);
    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "ContractDelivered", contractId: c.id,
    }));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: "ValueTransferred", causeKind: "contract", causeId: c.id,
    }));
    expect(bus.snapshot().economy.credits - creditsBefore).toBe(contractPayout(c));
    expect(bus.snapshot().underground.contracts[0].status).toBe("completed");
    expect(deliver(bus).error).toBe("CONTRACT_NOT_ACCEPTED");
  });

  it("keeps failed, expired, declined and terminal commands unchanged", () => {
    const world = makeWorld("fresh-scene", 7, 2);
    const bus = new CommandBus(world);
    expect(deliver(bus).error).toBe("CONTRACT_NOT_ACCEPTED");
    expect(accept(bus).ok).toBe(true);
    expect(deliver(bus).error).toBe("OBJECTIVE_NOT_MET");
    expect(bus.execute({ type: "advanceTime", minutes: 3 * DAY + 1 }).ok).toBe(true);
    expect(deliver(bus).error).toBe("CONTRACT_EXPIRED");

    const declined = new CommandBus(makeWorld("canonical"));
    expect(declined.execute({ type: "declineContract", contractId: "contract:g9" }).ok).toBe(true);
    expect(deliver(declined).error).toBe("CONTRACT_NOT_ACCEPTED");
    const ended = makeWorld();
    ended.ending = {
      status: "retired", causeKind: "retirement", causeId: "fixture", worldMinute: 0,
    };
    expect(deliver(new CommandBus(ended)).error).toBe("RUN_ENDED");
  });

  it("preserves save/reload and deterministic bulk/split waits after accepted delivery", () => {
    const state = makeWorld("fresh-scene", 33, 1);
    const target = state.targets.find((t) => t.id === entry(state).targetId)!;
    addObservedMachine(state, target.machines[0].id);
    const bulk = new CommandBus(state);
    const split = new CommandBus(worldStateSchema.parse(JSON.parse(JSON.stringify(state))));
    expect(accept(bulk)).toEqual(accept(split));
    expect(deliver(bulk)).toEqual(deliver(split));
    expect(bulk.execute({ type: "advanceTime", minutes: 720 }).ok).toBe(true);
    expect(split.execute({ type: "advanceTime", minutes: 360 }).ok).toBe(true);
    const resumed = new CommandBus(
      worldStateSchema.parse(JSON.parse(JSON.stringify(split.snapshot()))),
    );
    expect(resumed.execute({ type: "advanceTime", minutes: 360 }).ok).toBe(true);
    expect(resumed.snapshot()).toEqual(bulk.snapshot());
  });
});
