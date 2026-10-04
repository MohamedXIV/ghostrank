import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState, SLICE_WORLD_SEED } from "@/game/runtime/slice-world";
import { runAnalysis } from "@/game/simulation/systems/analysis";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { findModelItem } from "@/content/model-catalog";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type {
  MachineState,
  WorldState,
} from "@/game/simulation/state/world-state";

const CLOUD_FRONTIER = "model-cloud-frontier"; // r5 c4 rel3: 4 claims/pass, odds 0.48, high band
const CLOUD_COMPACT = "model-cloud-compact"; // r3 c2 rel4: 2 claims/pass, odds 0.64, medium band
const LOCAL_TUNED = "model-local-tuned"; // r4 c3 rel2: 3 claims/pass, odds 0.32, medium band

/** A fixed topology shared by the generator suites. */
const FIXTURE_MACHINES: MachineState[] = [
  {
    id: "ns-relay",
    label: "Relay",
    role: "relay",
    services: [
      { id: "ns-signal", label: "Signal", kind: "signal", state: "online" },
      { id: "ns-proxy", label: "Proxy", kind: "proxy", state: "online" },
    ],
  },
  {
    id: "ns-vault",
    label: "Vault",
    role: "vault",
    services: [
      { id: "ns-archive", label: "Archive", kind: "archive", state: "online" },
    ],
  },
];

const propertiesOf = (id: string) => {
  const item = findModelItem(id);

  if (!item) {
    throw new Error(`missing model ${id}`);
  }

  return item.properties;
};

function generate(
  modelId: string,
  worldMinute: number,
  observedMachineIds: Iterable<string> = [],
  observedServiceIds: Iterable<string> = [],
) {
  return runAnalysis({
    modelId,
    properties: propertiesOf(modelId),
    machines: FIXTURE_MACHINES,
    observedMachineIds: new Set(observedMachineIds),
    observedServiceIds: new Set(observedServiceIds),
    seed: SLICE_WORLD_SEED,
    worldMinute,
  });
}

/**
 * A funded bus with nightshade observed, its operation open, and both machines
 * surveyed. Services stay unseen — the structure left for the assistant to
 * predict.
 */
function surveyedRig(): CommandBus {
  const state = createSliceWorldState();
  state.economy.credits = 5_000;
  const bus = new CommandBus(state);

  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  // The starter rig discovers one machine per survey; two passes map them all.
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });

  return bus;
}

describe("the analysis generator", () => {
  it("is deterministic: identical inputs give byte-identical claims", () => {
    const first = generate(CLOUD_FRONTIER, 300);
    const second = generate(CLOUD_FRONTIER, 300);

    expect(second).toEqual(first);
  });

  it("reads only unseen structure — observed machines drop out of claims", () => {
    const all = generate(CLOUD_FRONTIER, 300);
    const oneSeen = generate(CLOUD_FRONTIER, 300, ["ns-vault"]);

    // The frontier attempts 4 claims per kind; with ns-vault already surveyed,
    // its role is no longer a candidate. The assistant never restates what
    // recon already proved.
    expect(all.filter((c) => c.kind === "machine-role")).toHaveLength(2);
    expect(
      oneSeen.filter((c) => c.kind === "machine-role"),
    ).toHaveLength(1);
    expect(oneSeen.some((claim) => claim.subjectId === "ns-vault")).toBe(false);
  });

  it("a fully recon'd target yields no claims", () => {
    const claims = generate(
      CLOUD_FRONTIER,
      300,
      ["ns-relay", "ns-vault"],
      ["ns-signal", "ns-proxy", "ns-archive"],
    );

    expect(claims).toEqual([]);
  });

  it("service claims appear only once their host is surveyed", () => {
    const noneSurveyed = generate(CLOUD_FRONTIER, 300, [], ["ns-signal"]);
    expect(
      noneSurveyed.every((claim) => claim.kind === "machine-role"),
    ).toBe(true);

    const surveyed = generate(CLOUD_FRONTIER, 300, ["ns-relay"], ["ns-proxy"]);
    const services = surveyed.filter((c) => c.kind === "service-kind");

    // Only ns-signal remains unseen on the surveyed host; ns-proxy is already
    // observed, so it never appears — accurate or not.
    expect(services.length).toBeGreaterThan(0);
    expect(services.some((claim) => claim.subjectId === "ns-proxy")).toBe(false);
    expect(
      services.every((claim) => claim.subjectId === "ns-signal" || claim.subjectId === null),
    ).toBe(true);
  });

  it("claim count is context-driven, capped by unseen structure", () => {
    // Compact/workhorse: round(context 2) = 2 per kind, both machines unseen.
    const compact = generate(CLOUD_COMPACT, 300);
    expect(compact.filter((c) => c.kind === "machine-role")).toHaveLength(2);

    // Frontier: round(context 4) = 4, but only 2 machines exist unseen.
    const frontier = generate(CLOUD_FRONTIER, 300);
    expect(frontier.filter((c) => c.kind === "machine-role")).toHaveLength(
      FIXTURE_MACHINES.length,
    );
  });

  it("confidence bands come from reasoning + context, never accuracy", () => {
    for (const minute of [0, 300, 1_170]) {
      for (const claim of generate(CLOUD_FRONTIER, minute)) {
        expect(claim.confidence).toBe("high"); // 5 + 4 = 9 >= 8
      }

      for (const claim of generate(LOCAL_TUNED, minute)) {
        expect(claim.confidence).toBe("medium"); // 4 + 3 = 7
      }

      for (const claim of generate(CLOUD_COMPACT, minute)) {
        expect(claim.confidence).toBe("medium"); // 3 + 2 = 5
      }
    }

    // The tuned model's confident claims are still sometimes wrong: the band is
    // independent of the hidden `accurate` flag (docs/AI_SYSTEMS.md
    // "overstate confidence").
    const wrong = generate(LOCAL_TUNED, 120).filter((claim) => !claim.accurate);
    expect(wrong.length).toBeGreaterThan(0);
    expect(wrong.every((claim) => claim.confidence === "medium")).toBe(true);
  });

  it("inaccurate role claims either mislabel a real host or hallucinate one", () => {
    let hallucinated = 0;
    let mislabelled = 0;

    for (let minute = 0; minute < 600; minute += 7) {
      for (const claim of generate(CLOUD_COMPACT, minute)) {
        if (claim.accurate) {
          continue;
        }

        if (claim.subjectId === null) {
          hallucinated += 1;
          continue;
        }

        mislabelled += 1;
        const truth = FIXTURE_MACHINES.find((m) => m.id === claim.subjectId);
        expect(claim.assertion).not.toBe(truth?.role);
      }
    }

    expect(hallucinated).toBeGreaterThan(0);
    expect(mislabelled).toBeGreaterThan(0);
  });

  it("assertions stay inside the fictional vocabularies", () => {
    const roles = new Set(["relay", "vault", "gateway", "bastion", "cache"]);
    const kinds = new Set(["signal", "archive", "http", "ssh", "proxy"]);

    for (let minute = 0; minute < 400; minute += 11) {
      for (const claim of generate(CLOUD_FRONTIER, minute)) {
        expect(
          claim.kind === "machine-role"
            ? roles.has(claim.assertion)
            : kinds.has(claim.assertion),
        ).toBe(true);
      }
    }
  });

  it("accuracy odds follow reliability and never reach certainty", () => {
    const count = (modelId: string) => {
      let accurate = 0;
      let total = 0;

      for (let minute = 0; minute < 2_880; minute += 13) {
        for (const claim of generate(modelId, minute)) {
          total += 1;
          if (claim.accurate) {
            accurate += 1;
          }
        }
      }

      return { accurate, total };
    };

    // A sweep across two world-days: the reliable model is right noticeably
    // more often than the unreliable one, and no model is right everywhere.
    const compact = count(CLOUD_COMPACT); // reliability 4 -> odds 0.64
    const tuned = count(LOCAL_TUNED); // reliability 2 -> odds 0.32

    expect(compact.total).toBeGreaterThan(0);
    expect(compact.accurate / compact.total).toBeGreaterThan(
      tuned.accurate / tuned.total,
    );
    expect(compact.accurate).toBeLessThan(compact.total);
    expect(tuned.accurate).toBeLessThan(tuned.total);
  });
});

describe("the analyze command", () => {
  it("refuses without an active operation, mirroring survey's error order", () => {
    const bus = new CommandBus(createSliceWorldState());

    expect(
      bus.execute({ type: "analyzeTarget", targetId: "nightshade" }).error,
    ).toBe("NO_ACTIVE_OPERATION");

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });

    // The session gate comes first, exactly like survey: an id that is neither
    // the open target nor a real target fails as a mismatch.
    expect(
      bus.execute({ type: "analyzeTarget", targetId: "unknown-host" }).error,
    ).toBe("OPERATION_TARGET_MISMATCH");

    // A real, observed target that is not the operation's target also mismatches.
    const other = createSliceWorldState();
    other.targets.push({
      id: "vesper",
      handle: "VESPER",
      rank: 480,
      machines: [],
    });
    const otherBus = new CommandBus(other);
    otherBus.execute({ type: "observeTarget", targetId: "nightshade" });
    otherBus.execute({ type: "openOperation", targetId: "nightshade" });

    expect(
      otherBus.execute({ type: "analyzeTarget", targetId: "vesper" }).error,
    ).toBe("OPERATION_TARGET_MISMATCH");

    // An operation opened on a target the world no longer carries (a stale save)
    // reaches the lookup gate: found-nothing.
    const stale = createSliceWorldState();
    stale.operation = {
      targetId: "deleted-host",
      stage: "recon",
      openedWorldMinute: 0,
    };
    const staleBus = new CommandBus(stale);

    expect(
      staleBus.execute({ type: "analyzeTarget", targetId: "deleted-host" })
        .error,
    ).toBe("TARGET_NOT_FOUND");
  });

  it("requires the assistant itself — no active model, no read", () => {
    const bus = surveyedRig();

    const result = bus.execute({
      type: "analyzeTarget",
      targetId: "nightshade",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("NO_ACTIVE_MODEL");
    expect(bus.snapshot().analysis).toEqual([]);
    // Recon commands are untouched by this rule: analysis needs the assistant,
    // but the assistant never gates anything else.
    expect(
      bus.execute({ type: "inspectMachine", machineId: "ns-relay" }).ok,
    ).toBe(true);
  });

  it("costs no world time, adds no trace, stores one record per target", () => {
    const bus = surveyedRig();
    const before = bus.snapshot();
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const minute = bus.snapshot().worldMinute;
    const first = bus.execute({ type: "analyzeTarget", targetId: "nightshade" });

    expect(first.ok).toBe(true);
    expect(first.events).toEqual([
      {
        type: "AnalysisCompleted",
        targetId: "nightshade",
        modelId: CLOUD_FRONTIER,
        // Both machines surveyed, so only the two unseen services remain.
        claimCount: 2,
        worldMinute: minute,
      },
    ]);
    expect(bus.snapshot().worldMinute).toBe(minute);
    expect(bus.snapshot().traces).toEqual(before.traces);

    // Re-running replaces the record rather than stacking history.
    bus.execute({ type: "analyzeTarget", targetId: "nightshade" });
    const state = bus.snapshot();
    expect(state.analysis).toHaveLength(1);
    expect(state.analysis[0].id).toBe("analysis:nightshade");
    expect(state.analysis[0].worldMinute).toBe(minute);
  });

  it("a different model at the same minute re-reads the target", () => {
    const bus = surveyedRig();
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "analyzeTarget", targetId: "nightshade" });
    const frontierRead = structuredClone(bus.snapshot().analysis);

    // The tuned model is property: it must be bought, then run — buying alone
    // never starts it. The read at the very same minute differs because the
    // model id is part of the hash.
    bus.execute({ type: "acquireModel", modelId: LOCAL_TUNED });
    expect(bus.snapshot().economy.activeModel).toBe(CLOUD_FRONTIER);
    bus.execute({ type: "runModel", modelId: LOCAL_TUNED });
    bus.execute({ type: "analyzeTarget", targetId: "nightshade" });

    const state = bus.snapshot();
    expect(state.analysis).toHaveLength(1);
    expect(state.analysis[0].modelId).toBe(LOCAL_TUNED);
    expect(state.analysis).not.toEqual(frontierRead);
  });

  it("an unknown active model id fails MODEL_NOT_FOUND without corrupting state", () => {
    const state = createSliceWorldState();
    state.economy.activeModel = "model-from-a-deleted-save";
    const bus = new CommandBus(state);
    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });

    const result = bus.execute({ type: "analyzeTarget", targetId: "nightshade" });

    expect(result.error).toBe("MODEL_NOT_FOUND");
    expect(bus.snapshot().analysis).toEqual([]);
  });

  it("the projection hides the truth: no real ids, no accurate flag", () => {
    const bus = surveyedRig();
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const before = bus.snapshot();
    const truthSubjects = new Set(
      before.targets
        .find((target) => target.id === "nightshade")!
        .machines.flatMap((machine) => [
          machine.id,
          ...machine.services.map((service) => service.id),
        ]),
    );

    bus.execute({ type: "analyzeTarget", targetId: "nightshade" });

    const { analysis } = projectWorld(bus.snapshot());
    const visible = JSON.stringify(analysis);

    // The projection contains only what the player can safely see: anonymous
    // handles, the assertion, the confidence, and which model said it. Real
    // world ids and the hidden `accurate` flag must not appear.
    expect(analysis).toHaveLength(1);
    expect(visible).not.toContain("accurate");
    expect(visible).not.toContain("subjectId");
    for (const subject of truthSubjects) {
      expect(visible).not.toContain(subject);
    }

    for (const claim of analysis[0].claims) {
      expect(claim.subject).toMatch(/^unmapped (host|service) \d+$/);
    }

    // No stored record at all -> empty projection: the pre-P2 shape.
    expect(projectWorld(createSliceWorldState()).analysis).toEqual([]);
  });

  it("restoring a save replays the exact same read", () => {
    const bus = surveyedRig();
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "analyzeTarget", targetId: "nightshade" });

    const saved = bus.snapshot();
    const revived = new CommandBus(saved);
    expect(revived.snapshot().analysis).toEqual(saved.analysis);

    revived.execute({ type: "analyzeTarget", targetId: "nightshade" });
    expect(revived.snapshot().analysis).toEqual(saved.analysis);
  });
});

describe("analysis persistence and parity", () => {
  it("a save→load JSON round-trip preserves a record byte-for-byte", () => {
    const bus = surveyedRig();
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "analyzeTarget", targetId: "nightshade" });

    const snapshot = bus.snapshot();
    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(snapshot)),
    ) as WorldState;

    expect(restored.analysis).toEqual(snapshot.analysis);
    expect(restored.analysis[0].claims.length).toBeGreaterThan(0);
  });

  it("a legacy snapshot without an analysis field loads as no reads stored", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100_256 },
      targets: [],
      knownTargetIds: [],
    });

    expect(parsed.analysis).toEqual([]);
  });
});
