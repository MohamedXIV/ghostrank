import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  EXOTIC_MACHINE_ID,
  exoticMachineAvailability,
  machineMarketVisible,
} from "@/game/simulation/systems/exotic-capability";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { LONG_RUN_PRESSURE_START_MINUTES } from "@/game/simulation/systems/long-run-pressure";
import type {
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { buyMachineFromGui } from "@/game/computer/apps/economy-actions";

function completedContract(index: number): UndergroundContract {
  return {
    id: `contract:exotic:${index}`,
    issuerId: "vesper",
    targetId: "nightshade",
    objective: "recon-report",
    requiredServices: 1,
    status: "completed",
    offeredWorldMinute: 10 + index,
    expiresWorldMinute: 1_440,
    acceptedWorldMinute: 20 + index,
    dueWorldMinute: 2_880,
    resolvedWorldMinute: 100 + index,
  };
}

function veteranWorld(cleanWorkflow = false): WorldState {
  const world = createSliceWorldState();
  world.worldMinute = LONG_RUN_PRESSURE_START_MINUTES;
  world.economy.credits = 10_000;
  world.underground.contracts = Array.from(
    { length: 20 },
    (_, index) => completedContract(index + 1),
  );

  if (cleanWorkflow) {
    world.economy.ownedWorkflows.push({
      id: "workflow:exotic:1",
      specId: "workflow-net-monitor",
      label: "Homegrown Monitoring Loop",
      outcome: "clean",
      builtWithModelId: "model-local-workhorse",
      acquiredWorldMinute: 10_000,
    });
  }

  return world;
}

describe("Phase 7 P6 — bounded exotic capability", () => {
  it("keeps exotic stock hidden and unbuyable on an ordinary run", () => {
    const world = createSliceWorldState();
    world.economy.credits = 10_000;

    expect(exoticMachineAvailability(world)).toBe("not-veteran");
    expect(machineMarketVisible(world, EXOTIC_MACHINE_ID)).toBe(false);
    expect(
      projectWorld(world).economy.machineListings.some(
        (item) => item.id === EXOTIC_MACHINE_ID,
      ),
    ).toBe(false);

    const bus = new CommandBus(world);
    const denied = bus.execute({
      type: "buyMachine",
      catalogId: EXOTIC_MACHINE_ID,
    });

    expect(denied).toEqual({
      ok: false,
      events: [],
      error: "EXOTIC_NOT_AVAILABLE",
    });
    expect(bus.snapshot().economy.credits).toBe(10_000);
  });

  it("requires both veteran causal history and a clean self-authored workflow", () => {
    const veteran = veteranWorld(false);
    expect(exoticMachineAvailability(veteran)).toBe("no-clean-workflow");

    veteran.economy.ownedWorkflows.push({
      id: "workflow:exotic:1",
      specId: "workflow-net-monitor",
      label: "Homegrown Monitoring Loop",
      outcome: "warnings",
      builtWithModelId: "model-local-workhorse",
      acquiredWorldMinute: 10_000,
    });
    expect(exoticMachineAvailability(veteran)).toBe("no-clean-workflow");

    veteran.economy.ownedWorkflows[0].outcome = "clean";
    expect(exoticMachineAvailability(veteran)).toBe("available");
  });

  it("does not use player rank or the starting White/Black board", () => {
    const lowWhite = veteranWorld(true);
    lowWhite.player.rank = 1;
    lowWhite.underground.playerNetwork = "white";

    const highBlack = structuredClone(lowWhite);
    highBlack.player.rank = 999_999;
    highBlack.underground.playerNetwork = "black";

    expect(exoticMachineAvailability(lowWhite)).toBe("available");
    expect(exoticMachineAvailability(highBlack)).toBe("available");
  });

  it("projects the earned stock as explicitly exotic and keeps standard stock visible", () => {
    const ordinary = projectWorld(createSliceWorldState()).economy.machineListings;
    expect(ordinary.some((item) => item.id === "box-analysis-node")).toBe(true);
    expect(ordinary.some((item) => item.id === EXOTIC_MACHINE_ID)).toBe(false);

    const earned = projectWorld(veteranWorld(true)).economy.machineListings;
    const exotic = earned.find((item) => item.id === EXOTIC_MACHINE_ID);

    expect(exotic).toEqual({
      id: EXOTIC_MACHINE_ID,
      label: "Cryogenic Annealing Rack",
      cost: 4_500,
      ownedCount: 0,
      capability: {
        compute: 0,
        memory: 8,
        vram: 5,
        storage: 4,
        network: 0,
      },
      exotic: true,
    });
  });

  it("reuses the ordinary machine purchase path but adds no operation-speed axis", () => {
    const world = veteranWorld(true);
    const before = projectWorld(world).economy;
    const beforeCapability = effectiveCapability(world.economy);
    const bus = new CommandBus(world);

    const result = bus.execute({
      type: "buyMachine",
      catalogId: EXOTIC_MACHINE_ID,
    });

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({
      type: "MachineAcquired",
      machineId: "machine:1",
      catalogId: EXOTIC_MACHINE_ID,
      label: "Cryogenic Annealing Rack",
      cost: 4_500,
      worldMinute: LONG_RUN_PRESSURE_START_MINUTES,
    });

    const afterWorld = bus.snapshot();
    const after = projectWorld(afterWorld).economy;
    const afterCapability = effectiveCapability(afterWorld.economy);

    expect(afterCapability.compute).toBe(beforeCapability.compute);
    expect(afterCapability.network).toBe(beforeCapability.network);
    expect(afterCapability.memory - beforeCapability.memory).toBe(8);
    expect(afterCapability.vram - beforeCapability.vram).toBe(5);
    expect(afterCapability.storage - beforeCapability.storage).toBe(4);

    expect(after.actionMinutes).toEqual(before.actionMinutes);
    expect(after.discoveryScope - before.discoveryScope).toBe(8);
    expect(afterWorld.economy.ledger).toContainEqual(
      expect.objectContaining({
        direction: "debit",
        amount: 4_500,
        cause: { kind: "machine", id: EXOTIC_MACHINE_ID },
        counterparty: "market",
      }),
    );
  });

  it("is one-shot for the run even after resale and save/restore", () => {
    const bus = new CommandBus(veteranWorld(true));
    expect(
      bus.execute({ type: "buyMachine", catalogId: EXOTIC_MACHINE_ID }).ok,
    ).toBe(true);
    expect(
      bus.execute({ type: "sellMachine", machineId: "machine:1" }).ok,
    ).toBe(true);

    const sold = bus.snapshot();
    expect(sold.economy.ownedMachines).toEqual([]);
    expect(exoticMachineAvailability(sold)).toBe("already-claimed");
    expect(machineMarketVisible(sold, EXOTIC_MACHINE_ID)).toBe(false);

    const restored = parsePortableRunSave(serializePortableRunSave(sold));
    expect(exoticMachineAvailability(restored)).toBe("already-claimed");

    const retry = new CommandBus(restored).execute({
      type: "buyMachine",
      catalogId: EXOTIC_MACHINE_ID,
    });
    expect(retry.error).toBe("EXOTIC_ALREADY_CLAIMED");
  });

  it("keeps Terminal and GUI parity through the existing box purchase command", () => {
    const terminal = parseTerminalCommand(
      `box buy ${EXOTIC_MACHINE_ID}`,
    );

    expect(terminal).toEqual({
      ok: true,
      command: {
        type: "buyMachine",
        catalogId: EXOTIC_MACHINE_ID,
      },
    });
    expect(buyMachineFromGui(EXOTIC_MACHINE_ID)).toEqual(
      terminal.ok ? terminal.command : null,
    );
  });
});
