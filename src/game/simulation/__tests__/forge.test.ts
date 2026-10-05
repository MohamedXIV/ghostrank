import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState, SLICE_WORLD_SEED } from "@/game/runtime/slice-world";
import {
  buildMinutes,
  deliverableEffect,
  poolForNewBuild,
  rollBuildOutcome,
  workflowEffects,
} from "@/game/simulation/systems/builds";
import { combinedActionDurationFactor } from "@/game/simulation/systems/tools";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { findSoftwareItem } from "@/content/software-catalog";
import {
  WORKFLOW_SPEC_CATALOG,
  findWorkflowSpec,
} from "@/content/workflow-spec-catalog";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { HardwareCapability } from "@/content/hardware-catalog";
import type { WorldState } from "@/game/simulation/state/world-state";

const CLOUD_FRONTIER = "model-cloud-frontier"; // ×0.7, r5 c4 rel3, cloud 0/0
const CLOUD_COMPACT = "model-cloud-compact"; // ×0.85, r3 c2 rel4, cloud 0/0
const LOCAL_WORKHORSE = "model-local-workhorse"; // ×0.9, 900, r3 c2 rel4, fp 2/1
const LOCAL_TUNED = "model-local-tuned"; // ×0.8, 1600, r4 c3 rel2, fp 4/2

const NET_MONITOR = "workflow-net-monitor"; // 120 min, fp 1/1, network +2
const AUTO_RECON = "workflow-auto-recon"; // 300 min, fp 2/2, memory +2 net +1
const ANALYSIS_PIPELINE = "workflow-analysis-pipeline"; // 600 min, fp 3/2, ×0.85

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

/** A funded world with a starter rig: compute 1, so estimates are bare base. */
function richState(): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = 10_000;
  return state;
}

/**
 * A funded bus with a cloud model running — every build needs the assistant,
 * and cloud keeps the clock tests free of local-footprint contention.
 */
function forgeBus(modelId: string = CLOUD_FRONTIER): CommandBus {
  const bus = new CommandBus(richState());
  bus.execute({ type: "runModel", modelId });

  return bus;
}

const specOf = findWorkflowSpec;

describe("the workflow spec catalog", () => {
  it("mirrors the premium licenses one-for-one", () => {
    // The exit criterion needs a bijection: one spec per distinct premium
    // license, and every `replaces` id a real catalog entry.
    const replaces = WORKFLOW_SPEC_CATALOG.map((spec) => spec.replaces);

    expect(WORKFLOW_SPEC_CATALOG).toHaveLength(5);
    expect(new Set(replaces).size).toBe(5);
    for (const id of replaces) {
      expect(findSoftwareItem(id)).toBeDefined();
    }
  });

  it("delivers the same effect as the license it replaces", () => {
    // The exit criterion, made a checkable fact: for every spec, a *clean*
    // copy's effect is byte-identical to the premium license it substitutes.
    for (const spec of WORKFLOW_SPEC_CATALOG) {
      const license = findSoftwareItem(spec.replaces);

      if (!license) {
        throw new Error(`spec ${spec.id} replaces unknown license`);
      }
      expect(deliverableEffect(spec, "clean")).toEqual(license.effect);
    }
  });

  it("is safe virtual data: steps are IR text, never executable syntax", () => {
    // Specs are fictional pipeline notation (`fn(args) → outcome`); nothing
    // here is a command, script, or file path the runtime could execute.
    for (const spec of WORKFLOW_SPEC_CATALOG) {
      for (const step of spec.steps) {
        expect(step).toMatch(/^[a-z_]+\([^)]*\) → [a-z ]+$/);
      }
    }
  });

  it("findWorkflowSpec skips stale ids instead of throwing", () => {
    expect(specOf("workflow-does-not-exist")).toBeUndefined();
  });
});

describe("the build duration math", () => {
  it("at a compute-1 rig with no shortcut, pays the full base", () => {
    const spec = specOf(NET_MONITOR)!;
    expect(buildMinutes(spec, pool())).toBe(120);
    expect(buildMinutes(specOf(ANALYSIS_PIPELINE)!, pool())).toBe(600);
  });

  it("compute accelerates with the same curve as operation actions", () => {
    const spec = specOf(AUTO_RECON)!; // 300 base
    expect(buildMinutes(spec, pool({ compute: 2 }))).toBe(150);
    expect(buildMinutes(spec, pool({ compute: 3 }))).toBe(100);
    expect(buildMinutes(spec, pool({ compute: 4 }))).toBe(75);
  });

  it("the delivered shortcut scales accelerated minutes, floored at one", () => {
    const spec = specOf(NET_MONITOR)!;
    expect(buildMinutes(spec, pool(), 0.7)).toBe(84); // ceil(120 × 0.7)
    expect(buildMinutes(spec, pool({ compute: 400 }), 0.7)).toBe(1);
  });

  it("an under-provisioned rig is slower for builds than an empty one", () => {
    const spec = specOf(ANALYSIS_PIPELINE)!; // fp 3/2
    const bigRig = pool({ vram: 8, storage: 8 });
    const alone = poolForNewBuild(bigRig, [], spec);
    const queued = poolForNewBuild(
      bigRig,
      [
        {
          id: "workflow:1",
          specId: AUTO_RECON, // fp 2/2
          modelId: LOCAL_TUNED,
          startedWorldMinute: 0,
          dueWorldMinute: 999,
          outcome: "clean",
        },
      ],
      spec,
    );

    // The second job sees 3/4 VRAM and 4/6 storage left after its own 3/2
    // takes its share: a queued build really does shrink the pool a later
    // commission (or a running model) is measured against.
    expect(queued.vram).toBe(3);
    expect(queued.storage).toBe(4);
    expect(alone.vram).toBe(5);
  });
});

describe("the build quality roll", () => {
  const spec = specOf(NET_MONITOR)!;
  // Frontier properties: reasoning 5 → clean odds 0.7 (the cap).
  const frontier = { reasoning: 5, context: 4, reliability: 3 };

  it("is deterministic: the same inputs roll the same report card", () => {
    const first = rollBuildOutcome(SLICE_WORLD_SEED, 300, CLOUD_FRONTIER, spec, {
      reasoning: 5,
      context: 4,
      reliability: 3,
    });
    const second = rollBuildOutcome(SLICE_WORLD_SEED, 300, CLOUD_FRONTIER, spec, {
      reasoning: 5,
      context: 4,
      reliability: 3,
    });

    expect(second).toBe(first);
  });

  it("clean odds stay capped below certainty even for the frontier class", () => {
    // Sweep 60 start minutes: a reasoning-5 model must fail sometimes —
    // the docs' "remains fallible" rule, made structural by the 0.7 cap.
    let clean = 0;
    for (let minute = 0; minute < 600; minute += 10) {
      const outcome = rollBuildOutcome(
        SLICE_WORLD_SEED,
        minute,
        CLOUD_FRONTIER,
        spec,
        frontier,
      );
      if (outcome === "clean") {
        clean += 1;
      }
    }

    expect(clean).toBeGreaterThan(0);
    expect(clean).toBeLessThan(60);
  });

  it("a low-reliability model splits its failures toward defects", () => {
    const count = (modelId: string, properties: { reasoning: number; context: number; reliability: number }) => {
      let defective = 0;
      let warnings = 0;
      for (let minute = 0; minute < 1440; minute += 5) {
        const outcome = rollBuildOutcome(
          SLICE_WORLD_SEED,
          minute,
          modelId,
          spec,
          properties,
        );
        if (outcome === "defective") {
          defective += 1;
        }
        if (outcome === "warnings") {
          warnings += 1;
        }
      }
      return { defective, warnings };
    };

    // rel4 (compact): when something goes wrong it is usually cosmetic.
    // rel2 (tuned): mistakes bite.
    const reliable = count(CLOUD_COMPACT, { reasoning: 3, context: 2, reliability: 4 });
    const unreliable = count(LOCAL_TUNED, { reasoning: 4, context: 3, reliability: 2 });
    const ratio = (c: { defective: number; warnings: number }) =>
      (c.defective + c.warnings) === 0
        ? 0
        : c.defective / (c.defective + c.warnings);

    expect(ratio(unreliable)).toBeGreaterThan(ratio(reliable));
  });

  it("only the three documented outcomes ever appear", () => {
    for (let minute = 0; minute < 2880; minute += 7) {
      expect(["clean", "warnings", "defective"]).toContain(
        rollBuildOutcome(SLICE_WORLD_SEED, minute, LOCAL_WORKHORSE, spec, {
          reasoning: 3,
          context: 2,
          reliability: 4,
        }),
      );
    }
  });
});

describe("defective delivery", () => {
  it("a clean or warning copy delivers the full spec", () => {
    for (const outcome of ["clean", "warnings"] as const) {
      expect(deliverableEffect(specOf(AUTO_RECON)!, outcome)).toEqual(
        specOf(AUTO_RECON)!.effect,
      );
    }
  });

  it("a defective capability copy loses half its axes but never zeroes out", () => {
    const delivered = deliverableEffect(
      specOf(AUTO_RECON)!,
      "defective",
    );

    // memory 2 → 1, network 1 → 1 (floor keeps any nonzero axis alive).
    expect(delivered).toEqual({
      kind: "capability",
      capability: { compute: 0, memory: 1, vram: 0, storage: 0, network: 1 },
    });
  });

  it("a defective modifier copy keeps half its shortcut and never past ×1", () => {
    const delivered = deliverableEffect(
      specOf(ANALYSIS_PIPELINE)!,
      "defective",
    );

    expect(delivered.kind === "modifier").toBe(true);
    if (delivered.kind === "modifier") {
      expect(delivered.discount.factor).toBeCloseTo(0.925, 10);
      expect(delivered.discount.factor).toBeGreaterThan(0.85);
      expect(delivered.discount.factor).toBeLessThanOrEqual(1);
    }
  });

  it("workflowEffects skips stale specs and empty inventory is identity", () => {
    expect(workflowEffects([])).toEqual([]);
    expect(
      workflowEffects([
        {
          id: "workflow:9",
          specId: "workflow-dropped",
          label: "Gone",
          outcome: "clean",
          builtWithModelId: CLOUD_FRONTIER,
          acquiredWorldMinute: 0,
        },
      ]),
    ).toEqual([]);
  });
});

describe("the build command", () => {
  it("needs the assistant — no active model, no commission", () => {
    const bus = new CommandBus(richState());

    expect(bus.execute({ type: "startBuild", specId: NET_MONITOR }).error).toBe(
      "NO_ACTIVE_MODEL",
    );
    expect(bus.snapshot().builds).toEqual([]);
    // The rule gates the forge only: every other command is untouched.
    expect(
      bus.execute({ type: "observeTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
  });

  it("rejects an unknown spec before asking for a model", () => {
    const bus = new CommandBus(richState());

    expect(
      bus.execute({ type: "startBuild", specId: "workflow-nope" }).error,
    ).toBe("WORKFLOW_SPEC_NOT_FOUND");
  });

  it("costs no credits and no immediate time, and freezes the clock", () => {
    const bus = forgeBus();
    const before = bus.snapshot();
    const minute = before.worldMinute;

    const result = bus.execute({ type: "startBuild", specId: NET_MONITOR });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "BuildStarted",
        buildId: "workflow:1",
        specId: NET_MONITOR,
        modelId: CLOUD_FRONTIER,
        // 120 base × frontier 0.7 (cloud, never contended) = 84.
        minutes: 84,
        worldMinute: minute,
      },
    ]);

    const state = bus.snapshot();
    expect(state.economy.credits).toBe(before.economy.credits);
    expect(state.worldMinute).toBe(minute);
    expect(state.builds).toHaveLength(1);
    expect(state.builds[0].dueWorldMinute).toBe(minute + 84);
  });

  it("a split wait lands the same frozen outcome at the same minute", () => {
    const split = forgeBus();
    const whole = forgeBus();

    split.execute({ type: "startBuild", specId: NET_MONITOR });
    whole.execute({ type: "startBuild", specId: NET_MONITOR });

    // One long wait vs many short ones: same due minute, same completion.
    split.execute({ type: "advanceTime", minutes: 30 });
    split.execute({ type: "advanceTime", minutes: 30 });
    split.execute({ type: "advanceTime", minutes: 24 });
    whole.execute({ type: "advanceTime", minutes: 84 });

    const splitState = split.snapshot();
    const wholeState = whole.snapshot();

    expect(splitState.economy.ownedWorkflows).toEqual(
      wholeState.economy.ownedWorkflows,
    );
    expect(splitState.builds).toEqual([]);
    expect(wholeState.builds).toEqual([]);
    expect(splitState.economy.ownedWorkflows[0].acquiredWorldMinute).toBe(84);
  });

  it("stopping the model mid-build cannot re-time or re-roll the job", () => {
    const bus = forgeBus(LOCAL_WORKHORSE);
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    const started = bus.execute({ type: "startBuild", specId: AUTO_RECON });
    expect(started.ok).toBe(true);

    const due = bus.snapshot().builds[0].dueWorldMinute;
    const outcome = bus.snapshot().builds[0].outcome;

    bus.execute({ type: "stopModel" });
    expect(bus.snapshot().builds[0].dueWorldMinute).toBe(due);
    expect(bus.snapshot().builds[0].outcome).toBe(outcome);
  });

  it("abort frees the queue slot with no penalty", () => {
    const bus = forgeBus();
    bus.execute({ type: "startBuild", specId: AUTO_RECON });

    const result = bus.execute({ type: "abortBuild", buildId: "workflow:1" });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "BuildAborted",
        buildId: "workflow:1",
        specId: AUTO_RECON,
        worldMinute: 0,
      },
    ]);
    expect(bus.snapshot().builds).toEqual([]);
    expect(bus.snapshot().economy.ownedWorkflows).toEqual([]);
    expect(
      bus.execute({ type: "abortBuild", buildId: "workflow:1" }).error,
    ).toBe("BUILD_NOT_FOUND");
  });

  it("build ids never collide across the queue and the garage", () => {
    const bus = forgeBus();
    bus.execute({ type: "startBuild", specId: NET_MONITOR });
    bus.execute({ type: "startBuild", specId: AUTO_RECON });
    expect(bus.snapshot().builds.map((b) => b.id)).toEqual([
      "workflow:1",
      "workflow:2",
    ]);

    // Complete job 1 (due 84), then start a new one: job 2 (due 210) is still
    // in flight, and the fresh commission follows the max suffix across both
    // the queue and the garage.
    bus.execute({ type: "advanceTime", minutes: 105 });
    expect(bus.snapshot().economy.ownedWorkflows.map((w) => w.id)).toEqual([
      "workflow:1",
    ]);
    bus.execute({ type: "startBuild", specId: ANALYSIS_PIPELINE });
    expect(bus.snapshot().builds.map((b) => b.id)).toEqual([
      "workflow:2",
      "workflow:3",
    ]);
  });
});

describe("the forge as a second pool tenant", () => {
  it("an in-flight build taxes a running local model's delivered shortcut", () => {
    const state = richState();
    state.economy.hardware.push(
      { id: "hw:2", catalogId: "gpu-entry", acquiredWorldMinute: 0 },
      { id: "hw:3", catalogId: "storage-array", acquiredWorldMinute: 0 },
    );
    // Pool now vram 4 / storage 6: the tuned model (4/2) fits alone.
    state.economy.ownedModels = [LOCAL_TUNED];
    state.economy.activeModel = LOCAL_TUNED;

    const bus = new CommandBus(state);
    const alone = projectWorld(bus.snapshot()).economy.actionMinutes.survey;

    // Queue the pipeline (fp 3/2): VRAM left is 1, coverage 0.25 of what the
    // tuned model needs, so its delivered shortcut drifts toward ×1 and the
    // survey minute count rises — but never past the no-model baseline of 12.
    bus.execute({ type: "startBuild", specId: ANALYSIS_PIPELINE });
    const pressured = projectWorld(bus.snapshot()).economy.actionMinutes.survey;

    expect(pressured).toBeGreaterThan(alone);
    expect(pressured).toBeLessThanOrEqual(12);
  });

  it("a cloud assistant ignores the queue entirely", () => {
    const bus = forgeBus(CLOUD_FRONTIER);
    const before = projectWorld(bus.snapshot()).economy.actionMinutes.survey;
    bus.execute({ type: "startBuild", specId: AUTO_RECON });
    const after = projectWorld(bus.snapshot()).economy.actionMinutes.survey;

    expect(after).toBe(before);
  });

  it("an empty queue and empty garage change no pre-P3 number", () => {
    const state = createSliceWorldState();
    const projected = projectWorld(state);

    expect(projected.economy.builds).toEqual([]);
    expect(projected.economy.ownedWorkflows).toEqual([]);
    expect(projected.economy.workflows).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(combinedActionDurationFactor(state.economy)).toBe(1);
    expect(effectiveCapability(state.economy)).toEqual(
      effectiveCapability({
        ...state.economy,
        ownedWorkflows: [],
      }),
    );
  });
});

describe("the forge projection", () => {
  it("lists specs with this rig's estimate and the license they replace", () => {
    const projected = projectWorld(createSliceWorldState());
    const monitor = projected.economy.workflowSpecs.find(
      (spec) => spec.id === NET_MONITOR,
    );

    expect(monitor).toBeDefined();
    expect(monitor!.estimatedMinutes).toBe(120); // starter compute 1, no shortcut
    expect(monitor!.replacesLabel).toBe("Commercial Monitoring Suite");
    expect(monitor!.steps.length).toBeGreaterThan(0);
    expect(monitor!.capability).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 2,
    });
  });

  it("hides the frozen outcome while a build is in flight", () => {
    const bus = forgeBus();
    bus.execute({ type: "startBuild", specId: AUTO_RECON });

    const projected = projectWorld(bus.snapshot());
    const queued = projected.economy.builds[0];

    // The visible job carries the plan and occupancy only...
    expect(queued.specLabel).toBe("Automated Recon Pipeline");
    expect(queued.dueWorldMinute).toBeGreaterThan(0);
    // ...and no field of the projection may contain the outcome word.
    expect("outcome" in queued).toBe(false);
    expect(projected.economy.ownedWorkflows).toEqual([]);
    // The frozen roll exists in world truth but never reaches the projection:
    expect(bus.snapshot().builds[0].outcome).toBeDefined();
    expect(JSON.stringify(projected)).not.toContain('"clean"');
    expect(JSON.stringify(projected)).not.toContain('"warnings"');
    expect(JSON.stringify(projected)).not.toContain('"defective"');
  });

  it("projects an owned workflow in full, outcome and tests included", () => {
    const bus = forgeBus();
    bus.execute({ type: "startBuild", specId: NET_MONITOR });
    bus.execute({ type: "advanceTime", minutes: 100 });

    const owned = projectWorld(bus.snapshot()).economy.ownedWorkflows;

    expect(owned).toHaveLength(1);
    expect(owned[0].label).toBe("Homegrown Monitoring Loop");
    expect(owned[0].builtWithLabel).toBe("Frontier Class API");
    expect(owned[0].tests.length).toBeGreaterThan(0);
    expect(["clean", "warnings", "defective"]).toContain(owned[0].outcome);
    // The delivered effect reflects the frozen outcome, never the raw spec
    // unless the build was clean/warnings.
    const delivered = deliverableEffect(
      specOf(NET_MONITOR)!,
      bus.snapshot().economy.ownedWorkflows[0].outcome,
    );
    expect(delivered.kind === "capability").toBe(true);
    if (delivered.kind === "capability") {
      expect(owned[0].capability).toEqual(delivered.capability);
    }
  });
});

describe("build persistence", () => {
  it("a mid-build save replays identical completions", () => {
    const bus = forgeBus();
    bus.execute({ type: "startBuild", specId: AUTO_RECON });

    const state = bus.snapshot();
    const restored = worldStateSchema.parse(JSON.parse(JSON.stringify(state)));

    expect(restored.builds).toEqual(state.builds);
    expect(restored.economy.ownedWorkflows).toEqual([]);

    // A bus rebuilt from the save finishes the job with the same frozen truth.
    const resumed = new CommandBus(restored);
    resumed.execute({ type: "advanceTime", minutes: 150 });
    bus.execute({ type: "advanceTime", minutes: 150 });

    expect(resumed.snapshot().economy.ownedWorkflows).toEqual(
      bus.snapshot().economy.ownedWorkflows,
    );
  });

  it("a legacy save without builds loads as the empty baseline", () => {
    const legacy = {
      worldMinute: 0,
      player: { handle: "cobaltxz", rank: 100_000 },
      targets: [],
      knownTargetIds: [],
    };
    const parsed = worldStateSchema.parse(legacy);

    expect(parsed.builds).toEqual([]);
    expect(parsed.economy.ownedWorkflows).toEqual([]);
  });

  it("build events carry a world minute for the run log", () => {
    const bus = forgeBus();
    bus.execute({ type: "advanceTime", minutes: DAY_MINUTES + 5 });
    const started = bus.execute({ type: "startBuild", specId: NET_MONITOR });

    expect(started.events[0]?.type).toBe("BuildStarted");
    if (started.events[0]?.type !== "BuildStarted") {
      throw new Error("expected BuildStarted");
    }
    expect(started.events[0].worldMinute).toBe(DAY_MINUTES + 5);
  });
});
