import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  BASELINE_CAPABILITY,
  acceleratedMinutes,
  actionDuration,
} from "@/game/simulation/systems/compute";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { HardwareCapability } from "@/content/hardware-catalog";
import type { WorldState } from "@/game/simulation/state/world-state";

function capability(
  overrides: Partial<HardwareCapability> = {},
): HardwareCapability {
  return {
    compute: 1,
    memory: 1,
    vram: 0,
    storage: 1,
    network: 1,
    ...overrides,
  };
}

describe("acceleratedMinutes", () => {
  it("leaves the baseline capability untouched", () => {
    expect(acceleratedMinutes(12, BASELINE_CAPABILITY)).toBe(12);
    expect(acceleratedMinutes(12, 0)).toBe(12);
    expect(acceleratedMinutes(5, 1)).toBe(5);
  });

  it("shortens work with diminishing returns and never drops below one minute", () => {
    expect(acceleratedMinutes(12, 2)).toBe(6);
    expect(acceleratedMinutes(12, 4)).toBe(3);
    expect(acceleratedMinutes(12, 8)).toBe(2);
    expect(acceleratedMinutes(5, 100)).toBe(1);
  });

  it("is monotonically non-increasing as capability grows", () => {
    let previous = acceleratedMinutes(12, 1);
    for (const cap of [2, 3, 4, 6, 8, 12, 24]) {
      const next = acceleratedMinutes(12, cap);
      expect(next).toBeLessThanOrEqual(previous);
      previous = next;
    }
  });
});

describe("actionDuration axes", () => {
  it("draws survey on network and inspect/escalate on compute", () => {
    expect(actionDuration("survey", capability({ network: 4 }))).toBe(3);
    expect(actionDuration("inspect", capability({ network: 4 }))).toBe(8);
    expect(actionDuration("inspect", capability({ compute: 4 }))).toBe(2);
    expect(actionDuration("escalate", capability({ compute: 4 }))).toBe(2);
  });

  it("never speeds up disengagement", () => {
    expect(
      actionDuration("disengage", capability({ compute: 20, network: 20 })),
    ).toBe(3);
  });

  it("keeps the starter rig at base durations for every action", () => {
    const starter = capability();
    expect(actionDuration("survey", starter)).toBe(12);
    expect(actionDuration("inspect", starter)).toBe(8);
    expect(actionDuration("escalate", starter)).toBe(5);
    expect(actionDuration("disengage", starter)).toBe(3);
  });
});

describe("compute budgeting in the command bus", () => {
  function chainMinutes(state: WorldState) {
    const bus = new CommandBus(state);
    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    const afterSurvey = bus.snapshot().worldMinute;
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
    const afterInspect = bus.snapshot().worldMinute;
    bus.execute({ type: "escalateOperation" });
    const afterEscalate = bus.snapshot().worldMinute;
    return { afterSurvey, afterInspect, afterEscalate };
  }

  function stateWithRig(overrides: Partial<HardwareCapability>): WorldState {
    const state = createSliceWorldState();
    // Rig the economy so derived capability equals the overrides by using the
    // catalog: starter rig + cpu-overclock (compute +3) / net-card (network +3).
    state.economy.hardware = [
      { id: "hw:1", catalogId: "rig-starter", acquiredWorldMinute: 0 },
    ];
    if ((overrides.compute ?? 1) > 1) {
      state.economy.hardware.push({
        id: "hw:2",
        catalogId: "cpu-overclock",
        acquiredWorldMinute: 0,
      });
    }
    if ((overrides.network ?? 1) > 1) {
      state.economy.hardware.push({
        id: "hw:3",
        catalogId: "net-card",
        acquiredWorldMinute: 0,
      });
    }
    return state;
  }

  it("charges base minutes for the starter rig", () => {
    const { afterSurvey, afterInspect, afterEscalate } = chainMinutes(
      createSliceWorldState(),
    );

    expect(afterSurvey).toBe(12);
    expect(afterInspect).toBe(20);
    expect(afterEscalate).toBe(25);
  });

  it("finishes the same recon chain faster once the rig is upgraded", () => {
    const slow = chainMinutes(createSliceWorldState());
    const fast = chainMinutes(stateWithRig({ compute: 4, network: 4 }));

    // Upgraded rig (compute 4, network 4) shortens every compute/network action.
    expect(fast.afterSurvey).toBeLessThan(slow.afterSurvey);
    expect(fast.afterInspect).toBeLessThan(slow.afterInspect);
    expect(fast.afterEscalate).toBeLessThan(slow.afterEscalate);
    // Survey is network-bound, so a network upgrade moves it independently.
    expect(fast.afterSurvey).toBe(3);
  });

  it("never blocks an action for a weak rig — capability is speed, not a gate", () => {
    // A bare starter rig has no upgrades, yet the whole chain still completes.
    const { afterEscalate } = chainMinutes(createSliceWorldState());
    expect(afterEscalate).toBe(25);
  });

  it("is deterministic with an upgraded rig", () => {
    const one = chainMinutes(stateWithRig({ compute: 4, network: 4 }));
    const two = chainMinutes(stateWithRig({ compute: 4, network: 4 }));
    expect(one).toEqual(two);
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = chainMinutes(stateWithRig({ compute: 4, network: 4 }));

    const first = new CommandBus(stateWithRig({ compute: 4, network: 4 }));
    first.execute({ type: "observeTarget", targetId: "nightshade" });
    first.execute({ type: "openOperation", targetId: "nightshade" });
    first.execute({ type: "surveyTarget", targetId: "nightshade" });

    const resumed = new CommandBus(first.snapshot());
    resumed.execute({ type: "inspectMachine", machineId: "ns-relay" });
    const afterInspect = resumed.snapshot().worldMinute;
    resumed.execute({ type: "escalateOperation" });

    expect(afterInspect).toBe(straight.afterInspect);
    expect(resumed.snapshot().worldMinute).toBe(straight.afterEscalate);
  });

  it("leaves the wallet untouched: faster work costs no credits", () => {
    const state = stateWithRig({ compute: 4, network: 4 });
    const bus = new CommandBus(state);
    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    const economy = bus.snapshot().economy;

    expect(economy.credits).toBe(0);
    expect(economy.ledger).toEqual([]);
  });
});

describe("compute budgeting projection", () => {
  function rigState(
    hardware: { id: string; catalogId: string }[],
  ): WorldState {
    const state = createSliceWorldState();
    state.economy.hardware = hardware.map((entry, index) => ({
      id: `hw:${index + 1}`,
      catalogId: entry.catalogId,
      acquiredWorldMinute: 0,
    }));
    return state;
  }

  it("surfaces starter-rig durations as the base table", () => {
    const economy = projectWorld(createSliceWorldState()).economy;

    expect(economy.actionMinutes).toEqual({
      survey: 12,
      inspect: 8,
      escalate: 5,
      disengage: 3,
    });
  });

  it("surfaces shortened durations for an upgraded rig", () => {
    const state = rigState([
      { id: "hw:1", catalogId: "rig-starter" },
      { id: "hw:2", catalogId: "cpu-overclock" },
      { id: "hw:3", catalogId: "net-card" },
    ]);

    const economy = projectWorld(state).economy;

    expect(economy.capability).toMatchObject({ compute: 4, network: 4 });
    expect(economy.actionMinutes).toEqual({
      survey: 3,
      inspect: 2,
      escalate: 2,
      disengage: 3,
    });
  });

  it("syncs rig speed to TinyBase and tracks upgrades", () => {
    const state = createSliceWorldState();
    state.economy.credits = 1_000;
    const runtime = createGameRuntime(state);

    expect(runtime.projection.getRow("rig", "actionMinutes")).toEqual({
      survey: 12,
      inspect: 8,
      escalate: 5,
      disengage: 3,
    });

    runtime.execute({ type: "buyHardware", catalogId: "cpu-overclock" });

    expect(
      runtime.projection.getCell("rig", "actionMinutes", "inspect"),
    ).toBe(2);
    expect(
      runtime.projection.getCell("rig", "actionMinutes", "disengage"),
    ).toBe(3);
  });
});
