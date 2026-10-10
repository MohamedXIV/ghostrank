import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { deriveRunTimeline } from "@/game/simulation/systems/run-timeline";
import type { TraceCause } from "@/game/simulation/state/world-state";

const causes: readonly TraceCause[] = [
  "operation-escalation",
  "operation-disengagement",
  "operation-probe",
  "network-route-test",
];

function completedTraceRun() {
  const world = createSliceWorldState();
  const target = world.targets.find((entry) => entry.id === "nightshade")!;
  world.evidence = [{
    id: "evidence:seen-target",
    kind: "target-profile",
    subjectId: target.id,
    confidence: "observed",
    source: "direct-observation",
    worldMinute: 1,
  }];
  world.traces = causes.map((cause, index) => ({
    id: `trace:timeline:${index + 1}`,
    targetId: target.id,
    cause,
    stage: index === 0 ? "intrusive" as const : "recon" as const,
    severity: "low" as const,
    weight: 1,
    worldMinute: (index + 1) * 10,
  }));
  world.worldMinute = 70;
  world.ending = {
    status: "retired",
    causeKind: "retirement",
    causeId: "retirement:timeline-test",
    worldMinute: 70,
  };
  return world;
}

describe("G4 completed-run timeline faithfully describes recorded trace causes (#117)", () => {
  it("distinguishes real exits, probes, route tests and escalations without inventing success", () => {
    const world = completedTraceRun();
    const beats = deriveRunTimeline(world).filter(entry => entry.kind !== "ending");
    expect(beats).toHaveLength(4);
    expect(beats.map(entry => entry.worldMinute)).toEqual([10, 20, 30, 40]);

    const [escalated, disengaged, probed, routed] = beats;
    expect(escalated!.text).toMatch(/escalated/i);
    expect(disengaged!.text).toMatch(/disengaged/i);
    expect(probed!.text).toMatch(/prob(e|ed|ing)/i);
    expect(routed!.text).toMatch(/route/i);
    expect(routed!.text).toMatch(/test(ed|ing)?/i);
    expect(probed!.text).not.toMatch(/disengaged|escalated|succeeded|confirmed/i);
    expect(routed!.text).not.toMatch(/disengaged|escalated|confirmed|refuted|objective found/i);
  });

  it("masks an undiscovered target even when a route-test trace exists", () => {
    const world = completedTraceRun();
    const hidden = world.targets.find(entry => entry.id !== "nightshade")!;
    hidden.handle = "SECRET_NEVER_SEEN";
    world.traces = [{
      id: "trace:hidden-route",
      targetId: hidden.id,
      cause: "network-route-test",
      stage: "recon",
      severity: "low",
      weight: 1,
      worldMinute: 50,
    }];
    const text = JSON.stringify(deriveRunTimeline(world));
    expect(text).toMatch(/a target/i);
    expect(text).not.toContain(hidden.handle);
    expect(text).not.toContain("trace:hidden-route");
  });

  it("does not narrate traces that occur after the first ending", () => {
    const world = completedTraceRun();
    world.traces.push({
      id: "trace:should-not-appear",
      targetId: "nightshade",
      cause: "network-route-test",
      stage: "recon",
      severity: "low",
      weight: 1,
      worldMinute: 71,
    });
    const beats = deriveRunTimeline(world);
    expect(beats).toHaveLength(5);
    expect(beats.at(-1)?.kind).toBe("ending");
    expect(JSON.stringify(beats)).not.toContain("trace:should-not-appear");
  });
});
