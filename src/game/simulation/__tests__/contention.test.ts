import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  contestedModelFactor,
  modelPoolCoverage,
} from "@/game/simulation/systems/contention";
import { combinedActionDurationFactor } from "@/game/simulation/systems/tools";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { HardwareCapability } from "@/content/hardware-catalog";
import type { WorldState } from "@/game/simulation/state/world-state";

const CLOUD_FRONTIER = "model-cloud-frontier"; // ×0.7, cloud, footprint 0/0
const LOCAL_WORKHORSE = "model-local-workhorse"; // ×0.9, 900, footprint 2/1
const LOCAL_TUNED = "model-local-tuned"; // ×0.8, 1_600, footprint 4/2
const DAY_MINUTES = 24 * 60;

function pool(
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

/** A starter-rig world (vram 0 / storage 1) with room for catalog purchases. */
function richState(): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = 5_000;
  return state;
}

function listing(state: WorldState, modelId: string) {
  const entry = projectWorld(state).economy.modelListings.find(
    (item) => item.id === modelId,
  );

  if (!entry) {
    throw new Error(`missing listing ${modelId}`);
  }

  return entry;
}

describe("the contention math", () => {
  it("a zero need is fully covered, a zero pool covers nothing", () => {
    expect(modelPoolCoverage({ vram: 0, storage: 0 }, pool({ vram: 0 }))).toBe(
      1,
    );
    expect(modelPoolCoverage({ vram: 2, storage: 1 }, pool({ vram: 0 }))).toBe(
      0,
    );
  });

  it("coverage caps at 1 on an over-provisioned rig", () => {
    expect(
      modelPoolCoverage({ vram: 2, storage: 1 }, pool({ vram: 10, storage: 10 })),
    ).toBe(1);
  });

  it("the scarcer axis bottlenecks coverage", () => {
    // VRAM fits exactly, storage halves: the model needs both, so min wins.
    expect(
      modelPoolCoverage({ vram: 4, storage: 2 }, pool({ vram: 4, storage: 1 })),
    ).toBe(0.5);
  });

  it("delivers the catalog factor in full at complete coverage", () => {
    const fit = pool({ vram: 4, storage: 5 });
    expect(contestedModelFactor(0.9, { vram: 2, storage: 1 }, fit)).toBe(0.9);
    expect(contestedModelFactor(0.8, { vram: 4, storage: 2 }, fit)).toBe(0.8);
  });

  it("interpolates linearly between the factor and 1", () => {
    // Half the VRAM needed: half the promised saving survives.
    expect(
      contestedModelFactor(0.9, { vram: 2, storage: 1 }, pool({ vram: 1 })),
    ).toBeCloseTo(0.95, 10);
  });

  it("a fully starved model delivers exactly the no-model baseline", () => {
    expect(
      contestedModelFactor(0.9, { vram: 2, storage: 1 }, pool({ vram: 0 })),
    ).toBe(1);
  });

  it("never lands outside [factor, 1] for any pool", () => {
    for (const vram of [0, 1, 3, 8]) {
      for (const storage of [0, 1, 4]) {
        const delivered = contestedModelFactor(
          0.8,
          { vram: 4, storage: 2 },
          pool({ vram, storage }),
        );
        expect(delivered).toBeGreaterThanOrEqual(0.8);
        expect(delivered).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("cloud models are never contended", () => {
  it("a zero footprint delivers its factor on any rig", () => {
    const bus = new CommandBus(richState());
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const survey = () => projectWorld(bus.snapshot()).economy.actionMinutes.survey;
    expect(survey()).toBe(9); // ceil(12 × 0.7), starter rig

    bus.execute({ type: "buyHardware", catalogId: "gpu-entry" });
    expect(survey()).toBe(9);

    bus.execute({ type: "buyHardware", catalogId: "storage-array" });
    expect(survey()).toBe(9);
  });

  it("its listing matches factor and shows a zero footprint", () => {
    const state = richState();
    const entry = listing(state, CLOUD_FRONTIER);
    expect(entry.factor).toBe(0.7);
    expect(entry.deliveredFactor).toBe(0.7);
    expect(entry.footprint).toEqual({ vram: 0, storage: 0 });
  });
});

describe("a local model contends with the rig", () => {
  it("is starved to exactly the no-model baseline on the starter rig", () => {
    // Starter pool vram 0 / storage 1 against a 2/1 footprint: VRAM bottlenecks
    // coverage to 0, so the ×0.9 promise arrives as ×1.
    const bus = new CommandBus(richState());
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });

    expect(listing(bus.snapshot(), LOCAL_WORKHORSE).deliveredFactor).toBe(1);

    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    const starved = projectWorld(bus.snapshot()).economy;
    expect(starved.actionDurationFactor).toBe(1);
    expect(starved.actionMinutes.survey).toBe(12);
    // Running a starved model is still allowed — it helps less, never blocks.
    expect(starved.activeModelId).toBe(LOCAL_WORKHORSE);
  });

  it("delivers in full once an accelerator fits the footprint", () => {
    // Entry Accelerator: vram 4 ≥ 2, starter storage 1 ≥ 1 → coverage 1.
    const bus = new CommandBus(richState());
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "buyHardware", catalogId: "gpu-entry" });

    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.actionDurationFactor).toBe(0.9);
    // survey: hardware minutes 12 (network stays 1) → ceil(12 × 0.9) = 11.
    expect(economy.actionMinutes.survey).toBe(11);
  });

  it("the tuned model lifts in stages as the rig grows", () => {
    const bus = new CommandBus(richState());
    bus.execute({ type: "acquireModel", modelId: LOCAL_TUNED });
    bus.execute({ type: "runModel", modelId: LOCAL_TUNED });

    // Starter (vram 0 / storage 1) against 4/2: starved → survey 12.
    expect(projectWorld(bus.snapshot()).economy.actionMinutes.survey).toBe(12);

    // An accelerator covers VRAM but storage is the bottleneck (1 of 2):
    // coverage 0.5 → delivered 1 − 0.2 × 0.5 = 0.9 → survey 11.
    bus.execute({ type: "buyHardware", catalogId: "gpu-entry" });
    const halfFed = projectWorld(bus.snapshot()).economy;
    expect(halfFed.actionDurationFactor).toBeCloseTo(0.9, 10);
    expect(halfFed.actionMinutes.survey).toBe(11);

    // A cold-storage array completes the pool → full ×0.8 → survey 10.
    bus.execute({ type: "buyHardware", catalogId: "storage-array" });
    const fed = projectWorld(bus.snapshot()).economy;
    expect(fed.actionDurationFactor).toBe(0.8);
    expect(fed.actionMinutes.survey).toBe(10);
  });

  it("machines count toward the pool the same way components do", () => {
    // The Attack Cluster carries vram 3 / storage 2 — a box can host the
    // workhorse (2/1) exactly like a dedicated GPU would.
    const bus = new CommandBus(richState());
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    expect(projectWorld(bus.snapshot()).economy.actionMinutes.survey).toBe(12);

    bus.execute({ type: "buyMachine", catalogId: "box-attack-cluster" });
    const economy = projectWorld(bus.snapshot()).economy;
    // Coverage hits 1 off the rack's own vram/storage → full ×0.9 (starved,
    // it would read exactly 1). The box's NIC also accelerates survey:
    // network 1+2 = 3 → 12/3 = 4 hardware minutes → ceil(4 × 0.9) = 4.
    expect(economy.actionDurationFactor).toBe(0.9);
    expect(economy.actionMinutes.survey).toBe(4);
  });

  it("never slows an action below the no-model baseline", () => {
    const bus = new CommandBus(richState());
    const before = projectWorld(bus.snapshot()).economy.actionMinutes;

    bus.execute({ type: "acquireModel", modelId: LOCAL_TUNED });
    bus.execute({ type: "runModel", modelId: LOCAL_TUNED });

    const starved = projectWorld(bus.snapshot()).economy.actionMinutes;
    for (const action of Object.keys(before) as (keyof typeof before)[]) {
      expect(starved[action]).toBeLessThanOrEqual(before[action]);
    }
  });

  it("starvation never touches licenses or tools", () => {
    const bus = new CommandBus(richState());
    bus.execute({ type: "enableSoftware", softwareId: "software-analysis-pipeline" }); // ×0.85
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });

    // Starved: the model drops out entirely and the license keeps its math.
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    expect(projectWorld(bus.snapshot()).economy.actionDurationFactor).toBe(0.85);

    // Fed: the shortcut stacks multiplicatively again, one floor shared.
    bus.execute({ type: "buyHardware", catalogId: "gpu-entry" });
    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.actionDurationFactor).toBeCloseTo(0.765, 10);
    // survey: ceil(12 × 0.765) = ceil(9.18) = 10.
    expect(economy.actionMinutes.survey).toBe(10);
  });

  it("is pure derived physics — no reservation state to desync", () => {
    const state = richState();
    state.economy.activeModel = LOCAL_WORKHORSE;

    // The same state read twice agrees exactly, and the pool itself is
    // untouched by running a model: contention consumes nothing stored.
    const capability = effectiveCapability(state.economy);
    const first = combinedActionDurationFactor(state.economy, capability);
    const second = combinedActionDurationFactor(state.economy, capability);
    expect(second).toBe(first);
    expect(capability).toEqual(effectiveCapability(richState().economy));
  });

  it("a starved local model still bills nothing across days", () => {
    const bus = new CommandBus(richState());
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });

    const credits = bus.snapshot().economy.credits;
    bus.execute({ type: "advanceTime", minutes: 3 * DAY_MINUTES });

    expect(bus.snapshot().economy.credits).toBe(credits);
    expect(bus.snapshot().economy.activeModel).toBe(LOCAL_WORKHORSE);
  });
});

describe("contention in the projection and the runtime", () => {
  it("listings show the footprint and what this rig would deliver", () => {
    const state = richState();
    const listings = projectWorld(state).economy.modelListings;
    expect(listings).toHaveLength(7);

    const workhorse = listings.find((m) => m.id === LOCAL_WORKHORSE);
    expect(workhorse?.factor).toBe(0.9);
    expect(workhorse?.deliveredFactor).toBe(1); // starved on a starter rig
    expect(workhorse?.footprint).toEqual({ vram: 2, storage: 1 });

    const tuned = listings.find((m) => m.id === LOCAL_TUNED);
    expect(tuned?.deliveredFactor).toBe(1);
    expect(tuned?.footprint).toEqual({ vram: 4, storage: 2 });

    const cloud = listings.filter((m) => m.source === "cloud");
    expect(cloud.every((m) => m.deliveredFactor === m.factor)).toBe(true);
    expect(cloud.every((m) => m.footprint.vram === 0)).toBe(true);
  });

  it("the delivered number moves with the rig it describes", () => {
    const bus = new CommandBus(richState());
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    expect(listing(bus.snapshot(), LOCAL_WORKHORSE).deliveredFactor).toBe(1);

    bus.execute({ type: "buyHardware", catalogId: "gpu-entry" });
    expect(listing(bus.snapshot(), LOCAL_WORKHORSE).deliveredFactor).toBe(0.9);
  });

  it("TinyBase mirrors footprint and delivered cells", () => {
    const runtime = createGameRuntime(richState());

    expect(
      runtime.projection.getCell("modelListings", LOCAL_WORKHORSE, "vram"),
    ).toBe(2);
    expect(
      runtime.projection.getCell("modelListings", LOCAL_WORKHORSE, "storage"),
    ).toBe(1);
    expect(
      runtime.projection.getCell("modelListings", LOCAL_WORKHORSE, "deliveredFactor"),
    ).toBe(1);
    expect(
      runtime.projection.getCell("modelListings", CLOUD_FRONTIER, "deliveredFactor"),
    ).toBe(0.7);

    // The assistant row reports what the fold actually used: no saving.
    runtime.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    runtime.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    expect(runtime.projection.getRow("rig", "assistant")).toEqual({
      modelId: LOCAL_WORKHORSE,
      factor: 1,
    });

    // Feeding the rig lifts both the listing and the running assistant row.
    runtime.execute({ type: "buyHardware", catalogId: "gpu-entry" });
    expect(
      runtime.projection.getCell("modelListings", LOCAL_WORKHORSE, "deliveredFactor"),
    ).toBe(0.9);
    expect(runtime.projection.getRow("rig", "assistant")).toEqual({
      modelId: LOCAL_WORKHORSE,
      factor: 0.9,
    });
  });
});
