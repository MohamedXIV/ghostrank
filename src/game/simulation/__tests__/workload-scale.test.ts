import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { discoveryScope } from "@/game/simulation/systems/scale";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { WorldState } from "@/game/simulation/state/world-state";

function stateWithRig(catalogIds: string[]): WorldState {
  const state = createSliceWorldState();
  state.economy.hardware = catalogIds.map((catalogId, index) => ({
    id: `hw:${index + 1}`,
    catalogId,
    acquiredWorldMinute: 0,
  }));
  return state;
}

function openOp(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
}

describe("discoveryScope", () => {
  it("keeps the starter rig at a single item per pass", () => {
    expect(discoveryScope(1)).toBe(1);
    expect(discoveryScope(0)).toBe(1);
    expect(discoveryScope(-3)).toBe(1);
  });

  it("widens a pass with memory and floors fractional capability", () => {
    expect(discoveryScope(4)).toBe(4);
    expect(discoveryScope(5)).toBe(5);
    expect(discoveryScope(2.9)).toBe(2);
  });
});

describe("workload scale in the command bus", () => {
  it("a modest rig still discovers everything across more passes", () => {
    const bus = new CommandBus(createSliceWorldState());
    openOp(bus);

    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    const afterFirst = bus
      .snapshot()
      .evidence.filter((record) => record.kind === "machine-presence").length;

    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    const afterSecond = bus
      .snapshot()
      .evidence.filter((record) => record.kind === "machine-presence").length;

    expect(afterFirst).toBe(1);
    expect(afterSecond).toBe(2);
  });

  it("a memory bank discovers several machines in a single pass", () => {
    // rig-starter (memory 1) + ram-bank (memory 4) => memory 5 => scope 5.
    const bus = new CommandBus(
      stateWithRig(["rig-starter", "ram-bank"]),
    );
    openOp(bus);

    const result = bus.execute({
      type: "surveyTarget",
      targetId: "nightshade",
    });

    expect(result.ok).toBe(true);
    // One survey charges one block of time yet yields every remaining machine.
    expect(
      result.events.filter((event) => event.type === "WorldTimeAdvanced"),
    ).toHaveLength(1);
    expect(
      result.events.filter((event) => event.type === "MachineObserved"),
    ).toHaveLength(2);
    expect(
      bus
        .snapshot()
        .evidence.filter((record) => record.kind === "machine-presence").length,
    ).toBe(2);
  });

  it("a memory bank inspects several services of a machine in one pass", () => {
    const state = stateWithRig(["rig-starter", "ram-bank"]);
    // Give ns-relay a second service so scope>1 has room to widen.
    state.targets[0].machines[0].services.push({
      id: "ns-cache",
      label: "Cache",
      kind: "cache",
      state: "online",
    });
    const bus = new CommandBus(state);
    openOp(bus);
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    const result = bus.execute({
      type: "inspectMachine",
      machineId: "ns-relay",
    });

    expect(result.ok).toBe(true);
    expect(
      result.events.filter((event) => event.type === "ServiceObserved"),
    ).toHaveLength(2);
    expect(
      projectWorld(bus.snapshot()).services.map((service) => service.id),
    ).toEqual(["ns-signal", "ns-cache"]);
  });

  it("scale is breadth, not a gate — every pass still costs its own time", () => {
    const wide = new CommandBus(stateWithRig(["rig-starter", "ram-bank"]));
    openOp(wide);
    wide.execute({ type: "surveyTarget", targetId: "nightshade" });
    const wideMinute = wide.snapshot().worldMinute;

    const narrow = new CommandBus(createSliceWorldState());
    openOp(narrow);
    narrow.execute({ type: "surveyTarget", targetId: "nightshade" });
    narrow.execute({ type: "surveyTarget", targetId: "nightshade" });

    // Both discover the same two machines; the wide rig got there in one pass.
    expect(
      wide.snapshot().evidence.filter((r) => r.kind === "machine-presence")
        .length,
    ).toBe(2);
    expect(narrow.snapshot().evidence.length).toBeGreaterThanOrEqual(
      wide.snapshot().evidence.length,
    );
    expect(wideMinute).toBeLessThan(narrow.snapshot().worldMinute);
  });

  it("is deterministic and resumes identically after a restore", () => {
    const rig = () => stateWithRig(["rig-starter", "ram-bank"]);

    const one = new CommandBus(rig());
    openOp(one);
    one.execute({ type: "surveyTarget", targetId: "nightshade" });

    const two = new CommandBus(rig());
    openOp(two);
    two.execute({ type: "surveyTarget", targetId: "nightshade" });

    expect(one.snapshot()).toEqual(two.snapshot());

    const beforeRestore = new CommandBus(rig());
    openOp(beforeRestore);
    const resumed = new CommandBus(beforeRestore.snapshot());
    resumed.execute({ type: "surveyTarget", targetId: "nightshade" });
    expect(
      resumed
        .snapshot()
        .evidence.filter((r) => r.kind === "machine-presence").length,
    ).toBe(2);
  });
});

describe("scale projection and sync", () => {
  it("surfaces scope 1 for the starter rig", () => {
    const runtime = createGameRuntime(createSliceWorldState());

    expect(projectWorld(runtime.snapshot()).economy.discoveryScope).toBe(1);
    expect(runtime.projection.getRow("rig", "scale")).toEqual({
      discoveryScope: 1,
    });
  });

  it("widens scope once a memory bank is bought", () => {
    const state = createSliceWorldState();
    state.economy.credits = 1_000;
    const runtime = createGameRuntime(state);

    runtime.execute({ type: "buyHardware", catalogId: "ram-bank" });

    expect(
      runtime.projection.getCell("rig", "scale", "discoveryScope"),
    ).toBe(5);
  });
});
