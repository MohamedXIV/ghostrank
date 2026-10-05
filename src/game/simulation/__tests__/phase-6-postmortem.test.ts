import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  derivePostmortem,
  derivePostmortems,
} from "@/game/simulation/systems/postmortem";
import { probeArtifactOf } from "@/game/simulation/systems/probes";
import type {
  CompromiseRecord,
  WorldState,
} from "@/game/simulation/state/world-state";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

const DAY = 24 * 60;
const TICK = 360;

function completeWorld(): WorldState {
  const state = createSliceWorldState();
  state.knownTargetIds = ["nightshade"];
  state.evidence = [
    {
      id: "target-profile:nightshade",
      kind: "target-profile",
      subjectId: "nightshade",
      confidence: "observed",
      source: "direct-observation",
      worldMinute: 0,
    },
  ];
  state.traces = [
    {
      id: "trace:1",
      targetId: "nightshade",
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 20,
    },
    {
      id: "trace:2",
      targetId: "nightshade",
      cause: "operation-disengagement",
      stage: "intrusive",
      severity: "elevated",
      weight: 2,
      worldMinute: 30,
    },
  ];
  state.reactions = [
    {
      id: "reaction:1",
      targetId: "nightshade",
      kind: "defensive-watch",
      status: "active",
      sourceTraceIds: ["trace:1", "trace:2"],
      footprintScore: 5,
      triggeredWorldMinute: 30,
      playerVisible: true,
    },
  ];
  state.investigations = [
    {
      id: "investigation:1",
      targetId: "nightshade",
      openedWorldMinute: 360,
      progress: 18,
      sourceIds: ["trace:1", "trace:2", "reaction:1"],
      signals: [
        {
          id: "signal:1",
          kind: "unusual-login",
          surfacedWorldMinute: 360,
        },
        {
          id: "signal:2",
          kind: "marketplace-behavior",
          surfacedWorldMinute: 720,
        },
      ],
    },
  ];
  state.probes = [
    {
      id: "probe:1",
      actorId: "kestrel",
      subject: "dwelling",
      correct: true,
      locationId: "housing-rented-lab",
      worldMinute: 720,
    },
  ];
  state.physicalThreats = [
    {
      id: "physical:1",
      actorId: "kestrel",
      kind: "property-hit",
      signalKind: "strange-vehicle",
      sourceProbeId: "probe:1",
      sourceInvestigationIds: ["investigation:1"],
      locationId: "housing-rented-lab",
      worldMinute: 1080,
      affectedBuildIds: [],
      destroyedHardwareIds: ["hw:1"],
    },
  ];
  state.compromises = [
    {
      id: "compromise:1",
      kind: "identity-exposed",
      sourceThreatId: "physical:1",
      sourceProbeId: "probe:1",
      sourceInvestigationIds: ["investigation:1"],
      locationId: "housing-rented-lab",
      worldMinute: 1080,
    },
  ];
  return state;
}

function recklessCycle(bus: CommandBus): void {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });
  bus.execute({ type: "disengageOperation" });
}

function compromisedRealChain(): WorldState {
  for (let seed = 1; seed <= 64; seed += 1) {
    const state = createSliceWorldState();
    state.underground.seed = seed;
    const bus = new CommandBus(state);

    for (let cycle = 0; cycle < 5; cycle += 1) {
      recklessCycle(bus);
    }

    while (bus.snapshot().worldMinute < 10 * DAY) {
      bus.execute({ type: "advanceTime", minutes: TICK });
      const snapshot = bus.snapshot();
      if (snapshot.compromises.length > 0) {
        return snapshot;
      }
    }
  }

  throw new Error("64-seed P4 baseline no longer yields a compromise");
}

describe("Phase 6 P5 — postmortem causal chain", () => {
  it("derives a chronological chain from citable player-visible facts", () => {
    const chain = derivePostmortems(completeWorld())[0]!;

    expect(chain.attribution).toBe("complete");
    expect(chain.compromiseLabel).toBe("IDENTITY EXPOSED");
    expect(chain.steps.map((step) => step.kind)).toEqual([
      "player-action",
      "player-action",
      "defensive-reaction",
      "authority-evidence",
      "authority-evidence",
      "probe-tell",
      "physical-evidence",
      "compromise",
    ]);
    expect(chain.steps.map((step) => step.worldMinute)).toEqual([
      20, 30, 30, 360, 720, 720, 1080, 1080,
    ]);
    expect(chain.steps.map((step) => step.text)).toEqual([
      "you escalated an operation against NIGHTSHADE",
      "you disengaged from NIGHTSHADE after an intrusive operation",
      "you saw NIGHTSHADE shift into a defensive watch",
      "an unfamiliar login touched NIGHTSHADE",
      "the market started answering you differently about NIGHTSHADE",
      "an unknown number asked for you by name",
      "the same unfamiliar vehicle watched the entrance",
      "IDENTITY EXPOSED",
    ]);
  });

  it("is a pure read that never mutates authoritative world state", () => {
    const state = completeWorld();
    const before = structuredClone(state);

    derivePostmortems(state);
    derivePostmortem(state, state.compromises[0]!);

    expect(state).toEqual(before);
  });

  it("reports incomplete attribution instead of inventing a player mistake", () => {
    const state = completeWorld();
    state.investigations[0]!.sourceIds = ["reaction:1"];

    const chain = derivePostmortems(state)[0]!;

    expect(chain.attribution).toBe("incomplete");
    expect(chain.note).toContain("no citable player-caused trace");
    expect(chain.steps.some((step) => step.kind === "player-action")).toBe(false);
    expect(chain.steps.map((step) => step.kind)).toEqual([
      "defensive-reaction",
      "authority-evidence",
      "authority-evidence",
      "probe-tell",
      "physical-evidence",
      "compromise",
    ]);
  });

  it("never leaks a hidden target handle through a source investigation", () => {
    const state = completeWorld();
    state.knownTargetIds = [];
    state.evidence = [];

    const chain = derivePostmortems(state)[0]!;
    const serialized = JSON.stringify(chain);

    expect(serialized).not.toContain("NIGHTSHADE");
    expect(chain.steps.some((step) => step.kind === "authority-evidence")).toBe(
      false,
    );
    expect(chain.steps[0]!.text).toContain("a target");
  });

  it("projection and TinyBase contain no hidden causal fields", () => {
    const state = completeWorld();
    const projection = projectWorld(state);
    const serialized = JSON.stringify(projection.postmortems);

    for (const forbidden of [
      "actorId",
      "sourceThreatId",
      "sourceProbeId",
      "sourceInvestigationIds",
      "locationId",
      "correct",
      "progress",
      "seed",
      "kestrel",
      "housing-rented-lab",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);

    expect(store.getTable("postmortems")).toEqual({
      "compromise:1": {
        compromiseKind: "identity-exposed",
        compromiseLabel: "IDENTITY EXPOSED",
        worldMinute: 1080,
        attribution: "complete",
        note:
          "The links below are supported by stored provenance; hidden identities and hidden correctness remain withheld.",
        stepCount: 8,
      },
    });
    const tinySerialized = JSON.stringify({
      postmortems: store.getTable("postmortems"),
      steps: store.getTable("postmortemSteps"),
    });
    for (const forbidden of [
      "actorId",
      "sourceThreatId",
      "sourceProbeId",
      "sourceInvestigationIds",
      "locationId",
      "correct",
      "progress",
      "seed",
      "kestrel",
      "housing-rented-lab",
    ]) {
      expect(tinySerialized).not.toContain(forbidden);
    }
  });

  it("derives the probe tell from the hidden subject rather than revealing it", () => {
    const state = completeWorld();
    const probe = state.probes[0]!;
    const chain = derivePostmortems(state)[0]!;
    const tell = chain.steps.find((step) => step.kind === "probe-tell")!;

    expect(probeArtifactOf(probe.subject)).toBe("caller-question");
    expect(tell.text).toBe("an unknown number asked for you by name");
    expect(JSON.stringify(tell)).not.toContain("dwelling");
  });

  it("keeps the compromise step even when provenance rows are partially missing", () => {
    const state = completeWorld();
    state.physicalThreats = [];
    state.probes = [];

    const chain = derivePostmortems(state)[0]!;

    expect(chain.attribution).toBe("incomplete");
    expect(chain.steps.at(-1)).toEqual({
      id: "compromise:1:step:6",
      kind: "compromise",
      worldMinute: 1080,
      text: "IDENTITY EXPOSED",
    });
  });

  it("finds a full player-mistake→probe→physical→compromise chain in the real seeded P1→P5 path", () => {
    const state = compromisedRealChain();
    const chains = derivePostmortems(state);
    const complete = chains.find((chain) => chain.attribution === "complete");

    expect(complete).toBeDefined();
    const kinds = complete!.steps.map((step) => step.kind);
    expect(kinds).toContain("player-action");
    expect(kinds).toContain("probe-tell");
    expect(kinds).toContain("physical-evidence");
    expect(kinds.at(-1)).toBe("compromise");
    expect(
      complete!.steps.find((step) => step.kind === "player-action")!.worldMinute,
    ).toBeLessThan(
      complete!.steps.find((step) => step.kind === "physical-evidence")!
        .worldMinute,
    );
  });

  it("adds no authoritative postmortem state and emits no ending", () => {
    const state = completeWorld();
    const beforeKeys = Object.keys(state).sort();
    const projection = projectWorld(state);

    expect(Object.keys(state).sort()).toEqual(beforeKeys);
    expect("postmortems" in state).toBe(false);
    expect(projection.postmortems).toHaveLength(1);
    expect(JSON.stringify(projection.postmortems)).not.toContain("RunEnded");
  });
});
