import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import {
  endRun,
  forcedEndingTick,
} from "@/game/simulation/systems/endings";
import { derivePresence } from "@/game/simulation/systems/location";
import { physicalThreatPercent } from "@/game/simulation/systems/physical-retaliation";
import {
  PLAYER_ACTOR_ID,
  type CompromiseRecord,
  type PhysicalThreat,
  type WorldState,
} from "@/game/simulation/state/world-state";

const MINUTE = 360;
const ACTOR_ID = "kestrel";
const LOCATION = "housing-rented-lab";

function threat(
  state: WorldState,
  overrides: Partial<PhysicalThreat> = {},
): PhysicalThreat {
  return {
    id: "physical:1",
    actorId: ACTOR_ID,
    kind: "property-hit",
    signalKind: "strange-vehicle",
    sourceProbeId: "probe:1",
    sourceInvestigationIds: ["investigation:1"],
    locationId: derivePresence(state.economy.housing).locationId,
    worldMinute: MINUTE,
    affectedBuildIds: [],
    destroyedHardwareIds: ["hw:1"],
    ...overrides,
  };
}

function compromise(
  kind: CompromiseRecord["kind"],
  overrides: Partial<CompromiseRecord> = {},
): CompromiseRecord {
  return {
    id: "compromise:" + kind,
    kind,
    sourceThreatId: "physical:1",
    sourceProbeId: "probe:1",
    sourceInvestigationIds: ["investigation:1"],
    locationId: LOCATION,
    worldMinute: MINUTE,
    ...overrides,
  };
}

function identityWorld(signalCount: number): WorldState {
  const state = createSliceWorldState();
  state.economy.housing = LOCATION;
  state.physicalThreats = [threat(state)];
  state.compromises = [compromise("identity-exposed")];
  state.investigations = [
    {
      id: "investigation:1",
      targetId: "nightshade",
      openedWorldMinute: 0,
      progress: 16,
      sourceIds: ["trace:1"],
      signals: Array.from({ length: signalCount }, (_, index) => ({
        id: "signal:" + (index + 1),
        kind: (
          ["unusual-login", "marketplace-behavior", "suspicious-message"] as const
        )[index]!,
        surfacedWorldMinute: (index + 1) * 120,
      })),
    },
  ];
  return state;
}

function addSameActorUnmasking(state: WorldState): void {
  state.underground.retaliations.push({
    id: "retaliation:unmask",
    actorId: ACTOR_ID,
    kind: "unmasking",
    worldMinute: 300,
  });
}

function integratedForcedEndingWorld(): WorldState {
  const state = createSliceWorldState();
  state.economy.housing = LOCATION;
  state.economy.credits = 1_000;

  // Enough genuine player footprint for P1 investigation material to reach the
  // P4 identity-exposure threshold at the first review boundary. Only one
  // signal has surfaced by then, so the P1 forced ending is MISSING rather than
  // ARRESTED.
  state.traces = [
    {
      id: "trace:1",
      targetId: "nightshade",
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 0,
    },
    {
      id: "trace:2",
      targetId: "nightshade",
      cause: "operation-disengagement",
      stage: "intrusive",
      severity: "elevated",
      weight: 2,
      worldMinute: 0,
    },
    {
      id: "trace:3",
      targetId: "nightshade",
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 0,
    },
    {
      id: "trace:4",
      targetId: "nightshade",
      cause: "operation-disengagement",
      stage: "intrusive",
      severity: "elevated",
      weight: 2,
      worldMinute: 0,
    },
    {
      id: "trace:5",
      targetId: "nightshade",
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 0,
    },
    {
      id: "trace:6",
      targetId: "nightshade",
      cause: "operation-disengagement",
      stage: "intrusive",
      severity: "elevated",
      weight: 2,
      worldMinute: 0,
    },
    {
      id: "trace:7",
      targetId: "nightshade",
      cause: "operation-disengagement",
      stage: "recon",
      severity: "low",
      weight: 1,
      worldMinute: 0,
    },
  ];

  state.probes = [
    {
      id: "probe:1",
      actorId: ACTOR_ID,
      subject: "dwelling",
      correct: true,
      locationId: LOCATION,
      worldMinute: 0,
    },
  ];

  for (const actor of state.underground.actors) {
    actor.activity = 0;
  }

  state.underground.relationships = [
    {
      id: "relationship:" + ACTOR_ID + ":player",
      fromId: ACTOR_ID,
      toId: PLAYER_ACTOR_ID,
      trust: 0,
      fear: 0,
      grudge: 100,
      updatedWorldMinute: 0,
    },
  ];

  state.builds = [
    {
      id: "workflow:1",
      specId: "workflow-net-monitor",
      modelId: "model-cloud-frontier",
      startedWorldMinute: 0,
      dueWorldMinute: MINUTE,
      outcome: "clean",
    },
  ];

  const actor = state.underground.actors.find((entry) => entry.id === ACTOR_ID);
  if (!actor) {
    throw new Error("slice world lost kestrel");
  }

  const percent = physicalThreatPercent(state, actor);
  for (let seed = 1; seed < 50_000; seed += 1) {
    if (
      hashUnit(seed, "physical-retaliation", "probe:1", ACTOR_ID) * 100 <
      percent
    ) {
      state.underground.seed = seed;
      return state;
    }
  }

  throw new Error("no deterministic forced-ending seed found");
}

describe("Phase 7 P1 — forced ending eligibility", () => {
  it("arrests only when a cited authority file has visibly converged", () => {
    const state = identityWorld(3);

    const events = forcedEndingTick(state, MINUTE);

    expect(state.ending).toEqual({
      status: "arrested",
      causeKind: "investigation",
      causeId: "investigation:1",
      worldMinute: MINUTE,
    });
    expect(events).toContainEqual(
      expect.objectContaining({ type: "RunEnded", status: "arrested" }),
    );
  });

  it("uses UNMASKED when the same physical actor already crossed the social unmasking taboo", () => {
    const state = identityWorld(2);
    addSameActorUnmasking(state);

    forcedEndingTick(state, MINUTE);

    expect(state.ending).toEqual({
      status: "unmasked",
      causeKind: "compromise",
      causeId: "compromise:identity-exposed",
      worldMinute: MINUTE,
    });
  });

  it("uses MISSING for physical identity exposure without a converged visible case or same-actor unmasking", () => {
    const state = identityWorld(1);

    forcedEndingTick(state, MINUTE);

    expect(state.ending).toEqual({
      status: "missing",
      causeKind: "physical-threat",
      causeId: "physical:1",
      worldMinute: MINUTE,
    });
  });

  it("does not let a different actor's old unmasking rewrite the physical ending", () => {
    const state = identityWorld(2);
    state.underground.retaliations.push({
      id: "retaliation:other",
      actorId: "nightshade",
      kind: "unmasking",
      worldMinute: 300,
    });

    forcedEndingTick(state, MINUTE);

    expect(state.ending?.status).toBe("missing");
  });

  it("ends STRANDED only from the explicit P4 resource-floor condition", () => {
    const state = createSliceWorldState();
    state.compromises = [compromise("stranded")];

    forcedEndingTick(state, MINUTE);

    expect(state.ending).toEqual({
      status: "stranded",
      causeKind: "compromise",
      causeId: "compromise:stranded",
      worldMinute: MINUTE,
    });
  });

  it("requires both rig and dwelling loss on the same boundary for generic COMPROMISED", () => {
    const onlyRig = createSliceWorldState();
    onlyRig.compromises = [compromise("rig-lost")];
    expect(forcedEndingTick(onlyRig, MINUTE)).toEqual([]);
    expect(onlyRig.ending).toBeNull();

    const both = createSliceWorldState();
    both.compromises = [
      compromise("rig-lost", { id: "compromise:1" }),
      compromise("dwelling-lost", { id: "compromise:2" }),
    ];

    forcedEndingTick(both, MINUTE);

    expect(both.ending).toEqual({
      status: "compromised",
      causeKind: "compromise",
      causeId: "compromise:2",
      worldMinute: MINUTE,
    });
  });

  it("does not retroactively terminalize historical Phase 6 compromise records", () => {
    const state = createSliceWorldState();
    state.compromises = [
      compromise("identity-exposed", { worldMinute: MINUTE }),
    ];

    expect(forcedEndingTick(state, 2 * MINUTE)).toEqual([]);
    expect(state.ending).toBeNull();
  });

  it("is independent of player rank", () => {
    const low = identityWorld(1);
    low.player.rank = 1;
    const high = structuredClone(low);
    high.player.rank = 999_999;

    const lowEvents = forcedEndingTick(low, MINUTE);
    const highEvents = forcedEndingTick(high, MINUTE);

    expect(high.ending).toEqual(low.ending);
    expect(highEvents).toEqual(lowEvents);
  });

  it("freezes a long wait at the exact ending tick before social/probe/build tail work", () => {
    const bus = new CommandBus(integratedForcedEndingWorld());

    const result = bus.execute({ type: "advanceTime", minutes: 24 * 60 });
    const state = bus.snapshot();

    expect(result.ok).toBe(true);
    expect(state.worldMinute).toBe(MINUTE);
    expect(state.underground.lastTickMinute).toBe(MINUTE);
    expect(state.ending).toEqual({
      status: "missing",
      causeKind: "physical-threat",
      causeId: "physical:1",
      worldMinute: MINUTE,
    });

    expect(result.events[0]).toEqual({
      type: "WorldTimeAdvanced",
      fromMinute: 0,
      toMinute: MINUTE,
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RunEnded",
        status: "missing",
        worldMinute: MINUTE,
      }),
    );

    // Exact-tick build completion is after the physical/P4/P1 boundary and must
    // never happen once the run ended there.
    expect(state.builds.map((build) => build.id)).toEqual(["workflow:1"]);
    expect(state.economy.ownedWorkflows).toEqual([]);
    expect(
      result.events.some((event) => event.type === "BuildCompleted"),
    ).toBe(false);

    // Social retaliation/offers/current-tick probes are later in the ecosystem
    // tick and are frozen out by terminality.
    expect(
      result.events.some(
        (event) =>
          event.type === "Retaliation" ||
          event.type === "ContractOffered" ||
          (event.type === "RivalProbe" && event.worldMinute === MINUTE),
      ),
    ).toBe(false);

    expect(bus.execute({ type: "advanceTime", minutes: 1 })).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });
  });

  it("keeps first-ending-wins if an evaluator is accidentally called twice", () => {
    const state = identityWorld(1);
    forcedEndingTick(state, MINUTE);

    const second = endRun(state, {
      status: "stranded",
      causeKind: "compromise",
      causeId: "compromise:late",
      worldMinute: MINUTE,
    });

    expect(second).toEqual([]);
    expect(state.ending?.status).toBe("missing");
  });
});
