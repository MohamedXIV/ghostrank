import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { deriveCompletedRunSummary } from "@/game/simulation/systems/run-history";

describe("Phase 7 P4 — completed-run summary", () => {
  it("refuses to summarize a live authoritative state", () => {
    expect(() =>
      deriveCompletedRunSummary(createSliceWorldState()),
    ).toThrow("live Ghostrank run");
  });

  it("derives browse data from the final state without exposing hidden ending provenance", () => {
    const state = createSliceWorldState();
    state.worldMinute = 2_940;
    state.player.rank = 42_000;
    state.economy.credits = 700;
    state.economy.ledger.push({
      id: "ledger:1",
      worldMinute: 120,
      direction: "credit",
      amount: 300,
      balanceAfter: 300,
      cause: { kind: "contract", id: "contract:1" },
      counterparty: "vesper",
    });
    state.underground.contracts.push(
      {
        id: "contract:1",
        issuerId: "vesper",
        targetId: "nightshade",
        objective: "recon-report",
        requiredServices: 1,
        status: "completed",
        offeredWorldMinute: 0,
        expiresWorldMinute: 1_440,
        acceptedWorldMinute: 10,
        dueWorldMinute: 2_880,
        resolvedWorldMinute: 120,
      },
      {
        id: "contract:2",
        issuerId: "vesper",
        targetId: "nightshade",
        objective: "recon-report",
        requiredServices: 1,
        status: "completed",
        offeredWorldMinute: 0,
        expiresWorldMinute: 1_440,
        acceptedWorldMinute: 20,
        dueWorldMinute: 2_880,
        resolvedWorldMinute: 180,
      },
    );
    state.traces.push({
      id: "trace:1",
      targetId: "nightshade",
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 200,
    });
    state.retirement = {
      stage: "cooling",
      startedWorldMinute: 0,
      committedWorldMinute: 60,
      coolingUntilWorldMinute: 2_940,
    };
    state.ending = {
      status: "retired",
      causeKind: "retirement",
      causeId: "retirement:hidden:source",
      worldMinute: 2_940,
    };

    const summary = deriveCompletedRunSummary(state);

    expect(summary).toEqual(
      expect.objectContaining({
        handle: "CobaltXZ",
        endingStatus: "retired",
        endingLabel: "RETIRED",
        endingWorldMinute: 2_940,
        retirementVariant: "white-quiet",
        finalRank: 42_000,
        finalCredits: 700,
        valueMoved: 300,
        completedContracts: 2,
        operationEscalations: 1,
        authoredWorkflows: 0,
        compromiseCount: 0,
      }),
    );
    expect(summary.descriptors.map((descriptor) => descriptor.id)).toContain(
      "professional",
    );
    expect(JSON.stringify(summary)).not.toContain("retirement:hidden:source");
    expect(JSON.stringify(summary)).not.toContain("causeId");
    expect(JSON.stringify(summary)).not.toContain("playerNetwork");
    expect(JSON.stringify(summary)).not.toContain("relationships");
  });

  it("reuses the player-safe postmortem read instead of exposing raw compromise provenance", () => {
    const state = createSliceWorldState();
    state.worldMinute = 720;
    state.compromises.push({
      id: "compromise:history:1",
      kind: "rig-lost",
      sourceThreatId: "physical:hidden:1",
      sourceProbeId: "probe:hidden:1",
      sourceInvestigationIds: ["investigation:hidden:1"],
      locationId: "location:hidden:1",
      worldMinute: 720,
    });
    state.ending = {
      status: "compromised",
      causeKind: "compromise",
      causeId: "compromise:hidden:cause",
      worldMinute: 720,
    };

    const summary = deriveCompletedRunSummary(state);

    expect(summary.postmortems).toEqual([
      expect.objectContaining({
        compromiseId: "compromise:history:1",
        compromiseLabel: "RIG LOST",
        attribution: "incomplete",
      }),
    ]);

    const visible = JSON.stringify(summary);
    expect(visible).not.toContain("physical:hidden:1");
    expect(visible).not.toContain("probe:hidden:1");
    expect(visible).not.toContain("investigation:hidden:1");
    expect(visible).not.toContain("location:hidden:1");
    expect(visible).not.toContain("compromise:hidden:cause");
  });

  it("builds a time-ordered player-safe timeline from archived surfaced records", () => {
    const state = createSliceWorldState();
    state.worldMinute = 900;
    const publicTarget = state.targets.find((target) => target.id === "nightshade")!;
    const hiddenTarget = state.targets.find((target) => target.id !== publicTarget.id)!;
    hiddenTarget.handle = "UnlearnedPrivateHandle";
    state.evidence = [
      {
        id: "target-profile:public",
        kind: "target-profile",
        subjectId: publicTarget.id,
        confidence: "observed",
        source: "direct-observation",
        worldMinute: 1,
      },
    ];
    state.traces.push({
      id: "trace:hidden:1",
      targetId: hiddenTarget.id,
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 100,
    });
    state.reactions.push({
      id: "reaction:hidden:1",
      targetId: hiddenTarget.id,
      kind: "defensive-watch",
      status: "active",
      sourceTraceIds: ["trace:hidden:1"],
      footprintScore: 3,
      triggeredWorldMinute: 200,
      playerVisible: true,
    });
    state.investigations.push({
      id: "investigation:hidden:1",
      targetId: publicTarget.id,
      openedWorldMinute: 300,
      progress: 91,
      sourceIds: ["trace:hidden:1"],
      signals: [
        {
          id: "signal:hidden:1",
          kind: "unusual-login",
          surfacedWorldMinute: 300,
        },
      ],
    });
    state.probes.push({
      id: "probe:hidden:1",
      actorId: "unseen-actor-id",
      subject: "habits",
      correct: false,
      worldMinute: 400,
    });
    state.underground.retaliations.push({
      id: "retaliation:hidden:1",
      actorId: "unseen-actor-id",
      kind: "smear",
      worldMinute: 450,
    });
    state.physicalThreats.push({
      id: "physical:hidden:1",
      actorId: "unseen-actor-id",
      kind: "warning",
      signalKind: "knock",
      sourceProbeId: "probe:hidden:1",
      sourceInvestigationIds: ["investigation:hidden:1"],
      locationId: "hidden-location",
      worldMinute: 500,
      affectedBuildIds: [],
      destroyedHardwareIds: [],
    });
    state.ending = {
      status: "vanished",
      causeKind: "physical-threat",
      causeId: "physical:hidden:1",
      worldMinute: 900,
    };

    const summary = deriveCompletedRunSummary(state);
    const visible = JSON.stringify(summary);

    expect(summary.timeline.map((beat) => beat.kind)).toEqual([
      "escalation",
      "consequence",
      "investigation",
      "rival-probe",
      "retaliation",
      "physical-threat",
      "ending",
    ]);
    expect(summary.timeline.map((beat) => beat.worldMinute)).toEqual([
      100, 200, 300, 400, 450, 500, 900,
    ]);
    expect(visible).toContain("a target");
    expect(visible).not.toContain("UnlearnedPrivateHandle");
    expect(visible).not.toContain("unseen-actor-id");
    expect(visible).not.toContain("correct");
    expect(visible).not.toContain("progress");
    expect(visible).not.toContain("trace:hidden:1");
    expect(visible).not.toContain("physical:hidden:1");
    expect(visible).not.toContain("hidden-location");
  });
});
