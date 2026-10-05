import { describe, expect, it } from "vitest";

import { HARDWARE_CATALOG } from "@/content/hardware-catalog";
import { MACHINE_CATALOG } from "@/content/machine-catalog";
import { MODEL_CATALOG } from "@/content/model-catalog";
import { PLAYER_TOOL_CATALOG } from "@/content/player-tool-catalog";
import {
  SOFTWARE_CATALOG,
  findSoftwareItem,
} from "@/content/software-catalog";
import { WORKFLOW_SPEC_CATALOG } from "@/content/workflow-spec-catalog";
import {
  acquireModelFromGui,
  buyHardwareFromGui,
  buyMachineFromGui,
  buyPlayerToolFromGui,
  enableSoftwareFromGui,
  runModelFromGui,
  startBuildFromGui,
} from "@/game/computer/apps/economy-actions";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";

const NEW_HARDWARE_IDS = ["cpu-balanced", "gpu-memory"] as const;
const NEW_MACHINE_IDS = ["box-archive-node", "box-model-host"] as const;
const NEW_MODEL_IDS = ["model-cloud-context", "model-local-reliable"] as const;
const NEW_TOOL_IDS = ["tool-map-stitcher", "tool-trace-comparator"] as const;
const NEW_SOFTWARE_IDS = [
  "software-storage-index",
  "software-batch-scheduler",
] as const;
const NEW_WORKFLOW_IDS = [
  "workflow-storage-index",
  "workflow-batch-scheduler",
] as const;

function richWorld(rank: number) {
  const state = createSliceWorldState();
  state.player.rank = rank;
  state.economy.credits = 50_000;
  return state;
}

describe("Phase 8 P5 — market breadth", () => {
  it("expands each authored market catalog without duplicate ids", () => {
    expect(HARDWARE_CATALOG).toHaveLength(8);
    expect(MACHINE_CATALOG).toHaveLength(7);
    expect(MODEL_CATALOG).toHaveLength(7);
    expect(PLAYER_TOOL_CATALOG).toHaveLength(5);
    expect(SOFTWARE_CATALOG).toHaveLength(5);
    expect(WORKFLOW_SPEC_CATALOG).toHaveLength(5);

    for (const catalog of [
      HARDWARE_CATALOG,
      MACHINE_CATALOG,
      MODEL_CATALOG,
      PLAYER_TOOL_CATALOG,
      SOFTWARE_CATALOG,
      WORKFLOW_SPEC_CATALOG,
    ]) {
      const ids = catalog.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("surfaces every new listing through the existing projection", () => {
    const economy = projectWorld(createSliceWorldState()).economy;

    expect(economy.catalog.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...NEW_HARDWARE_IDS]),
    );
    expect(economy.machineListings.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...NEW_MACHINE_IDS]),
    );
    expect(economy.modelListings.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...NEW_MODEL_IDS]),
    );
    expect(economy.toolListings.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...NEW_TOOL_IDS]),
    );
    expect(economy.softwareListings.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...NEW_SOFTWARE_IDS]),
    );
    expect(economy.workflowSpecs.map((entry) => entry.id)).toEqual(
      expect.arrayContaining([...NEW_WORKFLOW_IDS]),
    );
  });

  it("keeps market actions rank-independent for new content", () => {
    const commands = [
      buyHardwareFromGui("cpu-balanced"),
      buyMachineFromGui("box-archive-node"),
      buyPlayerToolFromGui("tool-map-stitcher"),
      enableSoftwareFromGui("software-storage-index"),
      acquireModelFromGui("model-local-reliable"),
    ];

    for (const command of commands) {
      const low = new CommandBus(richWorld(1));
      const high = new CommandBus(richWorld(999_999));

      expect(low.execute(command)).toEqual(high.execute(command));
      expect(low.snapshot().economy.credits).toBe(
        high.snapshot().economy.credits,
      );
    }
  });

  it("keeps cloud and local model economics on the existing source rules", () => {
    const state = richWorld(1);
    const bus = new CommandBus(state);

    const cloudStart = bus.execute(runModelFromGui("model-cloud-context"));
    expect(cloudStart.ok).toBe(true);
    expect(bus.snapshot().economy.activeModel).toBe("model-cloud-context");
    expect(bus.snapshot().economy.credits).toBe(50_000);

    expect(bus.execute({ type: "stopModel" }).ok).toBe(true);

    const localStart = bus.execute(runModelFromGui("model-local-reliable"));
    expect(localStart.error).toBe("LOCAL_MODEL_NOT_OWNED");

    expect(
      bus.execute(acquireModelFromGui("model-local-reliable")).ok,
    ).toBe(true);
    expect(bus.execute(runModelFromGui("model-local-reliable")).ok).toBe(true);
    expect(bus.snapshot().economy.activeModel).toBe("model-local-reliable");
  });

  it("gives each new premium license a self-built equivalent with the same effect", () => {
    for (const specId of NEW_WORKFLOW_IDS) {
      const spec = WORKFLOW_SPEC_CATALOG.find((entry) => entry.id === specId);
      expect(spec).toBeDefined();

      const license = findSoftwareItem(spec!.replaces);
      expect(license).toBeDefined();
      expect(spec!.effect).toEqual(license!.effect);
      expect(spec!.complexityMinutes).toBeGreaterThan(0);
      expect(spec!.steps.length).toBeGreaterThan(0);
      expect(spec!.tests.length).toBeGreaterThan(0);
    }
  });

  it("builds a new workflow through the ordinary forge command path", () => {
    const bus = new CommandBus(richWorld(1));

    expect(bus.execute(runModelFromGui("model-cloud-context")).ok).toBe(true);

    const started = bus.execute(startBuildFromGui("workflow-storage-index"));
    expect(started.ok).toBe(true);
    expect(started.events[0]).toEqual(
      expect.objectContaining({
        type: "BuildStarted",
        specId: "workflow-storage-index",
        modelId: "model-cloud-context",
      }),
    );
    expect(bus.snapshot().builds[0]?.specId).toBe("workflow-storage-index");
  });
});
