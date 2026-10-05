import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { findModelItem } from "@/content/model-catalog";
import {
  probeArtifactOf,
  probeCandidates,
  probeCorrectPercent,
  probeTick,
  PROBE_ACTIVE_INTRUSION_ADJUST,
  PROBE_ANONYMITY_ADJUST,
  PROBE_ASSIST_QUALITY_PER_POINT,
  PROBE_BASE_PERCENT,
  PROBE_EXPOSURE_ADJUST,
  PROBE_MAX_CORRECT_PERCENT,
  PROBE_MIN_CORRECT_PERCENT,
  PROBE_MIN_GRUDGE,
  PROBE_MISTAKE_PENALTY,
  PROBE_QUIET_HABIT_ADJUST,
  RIVAL_PROBE_SUBJECTS,
} from "@/game/simulation/systems/probes";
import { MAX_CATCHUP_TICKS, TICK_MINUTES } from "@/game/simulation/systems/underground";
import { npcAssistDeltas } from "@/game/simulation/systems/npc-ai";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import {
  createInitialWorldState,
  PLAYER_ACTOR_ID,
  type OperationTrace,
  type UndergroundActor,
  type UndergroundRelationship,
  type WorldState,
} from "@/game/simulation/state/world-state";

/**
 * Phase 6 P2 — rival probes: the third seat of the assist math.
 *
 * The load-bearing facts this file defends: peers probe on *grudge*, never on
 * rank; an unprobed world replays byte-for-byte as it did before this module
 * existed (the golden ecosystem digests below were captured from the pre-P2
 * code, and the same scenarios are shown to really produce probes, so the
 * identity is not vacuous); read accuracy is assembled only from exposure and
 * counterplay the player controls; the hidden half of every record (`actorId`,
 * `correct`) never reaches the projection or the store; probes are ecosystem
 * *actions*, so they obey the catch-up cap (a skipped tick never happened) and
 * split-invariance below it; and no probe gates a target, a verb, or a lease.
 */

const DAY = 24 * 60;

const LEGACY_PHASE_7_ACTOR_IDS = new Set([
  "nightshade",
  "vesper",
  "lattice",
  "halfmoon",
  "kestrel",
]);

/**
 * Phase 8 P2 intentionally broadens the canonical world. Phase 6's historical
 * byte-identity proof still matters, so replay that proof against the exact
 * pre-Content-Alpha roster instead of pretending new authored peers are a
 * simulation regression.
 */
function preContentAlphaBreadthWorld(): WorldState {
  const state = createSliceWorldState();

  state.underground.actors = state.underground.actors.filter((actor) =>
    LEGACY_PHASE_7_ACTOR_IDS.has(actor.id),
  );
  state.targets = state.targets.filter((target) => target.id === "nightshade");
  state.underground.relationships = state.underground.relationships.filter(
    (entry) =>
      LEGACY_PHASE_7_ACTOR_IDS.has(entry.fromId) &&
      (entry.toId === PLAYER_ACTOR_ID ||
        LEGACY_PHASE_7_ACTOR_IDS.has(entry.toId)),
  );

  return state;
}


/** Waits in <= 7 day steps, the ecosystem tests' discipline against capped catch-up. */
function wait(bus: CommandBus, minutes: number) {
  let remaining = minutes;

  while (remaining > 0) {
    const step = Math.min(remaining, 7 * DAY);
    bus.execute({ type: "advanceTime", minutes: step });
    remaining -= step;
  }
}

/**
 * One reckless cycle — the sequence the P1 file uses. It leaves a weight-5
 * footprint *and* provokes the target's owner (grudge 25, far above the probe
 * floor), which is what makes peers interested.
 */
function recklessCycles(bus: CommandBus, cycles: number) {
  for (let index = 0; index < cycles; index += 1) {
    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
    bus.execute({ type: "escalateOperation" });
    bus.execute({ type: "disengageOperation" });
  }
}

function probedWorld(rank = 100_256, cycles = 1): WorldState {
  const state = createSliceWorldState();
  state.player.rank = rank;
  const bus = new CommandBus(state);
  recklessCycles(bus, cycles);

  return bus.snapshot();
}

function trace(
  id: string,
  weight: number,
  cause: OperationTrace["cause"],
  worldMinute: number,
): OperationTrace {
  return {
    id,
    targetId: "nightshade",
    cause,
    stage: cause === "operation-escalation" ? "intrusive" : "recon",
    severity: "elevated",
    weight,
    worldMinute,
  };
}

function synthActor(overrides: Partial<UndergroundActor> = {}): UndergroundActor {
  return {
    id: "prober",
    handle: "PROBER",
    rank: 40_000,
    network: "white",
    skill: 40,
    defense: 35,
    discretion: 50,
    activity: 20,
    ...overrides,
  };
}

function grudge(fromId: string, value: number): UndergroundRelationship {
  return {
    id: `relationship:${fromId}`,
    fromId,
    toId: PLAYER_ACTOR_ID,
    trust: 0,
    fear: 0,
    grudge: value,
    updatedWorldMinute: 0,
  };
}

/**
 * The exact payload the throwaway pre-P2 harness digested six scenarios into.
 * No probe input is in it: rank, traces and ledger are here because the probe
 * fold *reads* them, so equality across the slice boundary proves the shared
 * roll stream — incidents, rumors, relationships, contracts, everything — is
 * untouched wherever nothing probes. The values were captured from the code
 * *before* P2 existed.
 */
function preP3ContractVocabulary(state: WorldState): WorldState {
  const legacy = structuredClone(state);
  const { seed } = legacy.underground;

  for (const contract of legacy.underground.contracts) {
    const tickIndex = contract.offeredWorldMinute / TICK_MINUTES;
    const oldObjective =
      hashUnit(seed, "offer-objective", tickIndex, contract.issuerId) < 0.5
        ? "recon-report"
        : "intrusion";

    contract.objective = oldObjective;
    delete contract.requiredMachines;

    if (oldObjective === "recon-report") {
      const target = legacy.targets.find(
        (candidate) => candidate.id === contract.targetId,
      );
      const serviceCount =
        target?.machines.reduce(
          (sum, machine) => sum + machine.services.length,
          0,
        ) ?? 1;
      const asked =
        1 +
        Math.floor(
          hashUnit(seed, "offer-services", tickIndex, contract.issuerId) * 2,
        );
      contract.requiredServices = Math.max(
        1,
        Math.min(asked, serviceCount),
      );
    } else {
      delete contract.requiredServices;
    }

    if (
      contract.acceptedWorldMinute !== undefined &&
      contract.dueWorldMinute !== undefined
    ) {
      contract.dueWorldMinute =
        contract.acceptedWorldMinute +
        (oldObjective === "recon-report" ? 2 * DAY : 4 * DAY);
    }
  }

  return legacy;
}

/**
 * P3 intentionally changes only the contract objective vocabulary in these
 * historical worlds. Normalize that one later feature back to the pre-P3
 * stateless-hash mapping, then demand the original Phase 6 digest unchanged.
 */
function historicalEcosystemDigest(state: WorldState): string {
  return ecosystemDigest(preP3ContractVocabulary(state));
}

function ecosystemDigest(state: WorldState): string {
  const {
    incidents,
    rumors,
    messages,
    contracts,
    retaliations,
    forumPosts,
    relationships,
    lastTickMinute,
    actors,
  } = state.underground;
  const payload = JSON.stringify({
    incidents,
    rumors,
    messages,
    contracts,
    retaliations,
    forumPosts,
    relationships,
    lastTickMinute,
    actors,
    rank: state.player.rank,
    traces: state.traces,
    reactions: state.reactions,
    investigations: state.investigations,
    credits: state.economy.credits,
    ledger: state.economy.ledger,
  });

  return createHash("sha256").update(payload).digest("hex");
}

const PRE_P2_DIGESTS = {
  "idle-60d": "594b4e47b69050aa8ef43663a31e8b8be1a5ad0be770de596af773a07f4c330c",
  "quiet-30d": "9dcfa8b14a9fb7c4bed465bd4758fa2655b4b4d4f8650d48ac2db4eeab3b94ff",
  "reckless-6d": "640de03492b45d425b97cc70a21a85a34045b626b75ba00fd59e8417241527f9",
  "reckless-60d": "72b5680415362425a36ee68cf69412b0b80c05b3c7faec9804a699087b78b1ef",
  "provoked-30d": "464a3b297783fc481a26f20652ca319f5251a5b3ba5d5bd2aaf40871af943b24",
  "housed-20d": "23fb2ab99c68ccb1cea9cdfbd8965e6aadc165c94bba61a50f9dae783e8fe3b9",
} as const;

describe("byte identity: probes only fire where they are earned", () => {
  it("replays pre-P2 golden digests wherever Phase 7 P5 remains neutral", () => {
    const idle = new CommandBus(preContentAlphaBreadthWorld());
    wait(idle, 60 * DAY);
    expect(historicalEcosystemDigest(idle.snapshot())).toBe(
      PRE_P2_DIGESTS["idle-60d"],
    );

    const quiet = new CommandBus(preContentAlphaBreadthWorld());
    quiet.execute({ type: "observeTarget", targetId: "nightshade" });
    quiet.execute({ type: "openOperation", targetId: "nightshade" });
    quiet.execute({ type: "disengageOperation" });
    wait(quiet, 30 * DAY);
    expect(historicalEcosystemDigest(quiet.snapshot())).toBe(
      PRE_P2_DIGESTS["quiet-30d"],
    );

    const reckless6 = new CommandBus(preContentAlphaBreadthWorld());
    recklessCycles(reckless6, 1);
    wait(reckless6, 6 * DAY);
    expect(historicalEcosystemDigest(reckless6.snapshot())).toBe(
      PRE_P2_DIGESTS["reckless-6d"],
    );

    // The older 20–60 day reckless/provoked fixtures are intentionally no
    // longer byte-identity contracts: Phase 7 P5 is the first later slice whose
    // explicit job is to let accumulated veteran history alter those runs.
    // P5 owns deterministic coverage of that activation and split invariance.
  });

  it("the provoked scenarios really do produce probes — the identity is not vacuous", () => {
    const provoked = new CommandBus(createSliceWorldState());
    recklessCycles(provoked, 1);
    wait(provoked, 6 * DAY);
    expect(provoked.snapshot().probes.length).toBeGreaterThan(0);

    // The unprovable ones stay empty: one weight-1 exit never reaches the
    // grudge floor, so no candidate exists, so no probe roll is ever drawn, so
    // the shared stream is byte-identical above.
    const quiet = new CommandBus(createSliceWorldState());
    quiet.execute({ type: "observeTarget", targetId: "nightshade" });
    quiet.execute({ type: "openOperation", targetId: "nightshade" });
    quiet.execute({ type: "disengageOperation" });
    wait(quiet, 30 * DAY);
    expect(quiet.snapshot().probes).toEqual([]);

    const idle = new CommandBus(createSliceWorldState());
    wait(idle, 60 * DAY);
    expect(idle.snapshot().probes).toEqual([]);
  });

  it("starts empty on every fresh world", () => {
    expect(createSliceWorldState().probes).toEqual([]);
    expect(createInitialWorldState().probes).toEqual([]);
  });

  it("a tick with no candidates emits nothing and touches nothing", () => {
    const state = createSliceWorldState();
    const before = structuredClone(state);

    expect(probeTick(state, 1, TICK_MINUTES, [])).toEqual([]);
    expect(state).toEqual(before);
  });
});

describe("interest is social, never reputational", () => {
  it("candidates are exactly the peers at or above the grudge floor", () => {
    const state = createSliceWorldState();
    state.underground.relationships = [
      grudge("lattice", PROBE_MIN_GRUDGE),
      grudge("kestrel", PROBE_MIN_GRUDGE - 1),
      grudge("halfmoon", 200),
    ];

    expect(probeCandidates(state).map((entry) => entry.id)).toEqual([
      "lattice",
      "halfmoon",
    ]);
  });

  it("a quiet world has no candidates at all", () => {
    expect(probeCandidates(createSliceWorldState())).toEqual([]);
  });

  it("the probe record stream is identical at rank 1 and rank 999999", () => {
    const nobody = new CommandBus(probedWorld(1, 3));
    wait(nobody, 30 * DAY);
    const famous = new CommandBus(probedWorld(999_999, 3));
    wait(famous, 30 * DAY);

    expect(famous.snapshot().probes).toEqual(nobody.snapshot().probes);
    expect(
      famous.snapshot().probes.length,
      "an equality over an empty list would prove nothing",
    ).toBeGreaterThan(0);
  });

  it("rank appears nowhere in the accuracy arithmetic", () => {
    const state = probedWorld(7, 2);
    const [actor] = state.underground.actors;
    const before = probeCorrectPercent(state, actor!, 3);

    state.player.rank = 999_999;
    expect(probeCorrectPercent(state, actor!, 3)).toBe(before);
  });

  it("never gates a target, a verb, or a lease however many probes pile up", () => {
    const bus = new CommandBus(probedWorld(100_256, 1));
    wait(bus, 6 * DAY);
    expect(bus.snapshot().probes.length).toBeGreaterThan(0);

    expect(bus.execute({ type: "observeTarget", targetId: "nightshade" }).ok).toBe(
      true,
    );
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    expect(bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok).toBe(
      true,
    );
    expect(bus.execute({ type: "escalateOperation" }).ok).toBe(true);
    expect(bus.execute({ type: "disengageOperation" }).ok).toBe(true);
    expect(
      bus.execute({ type: "rentHousing", housingId: "housing-basement-cot" }).ok,
    ).toBe(true);
  });
});

describe("accuracy is exposure and counterplay the player controls", () => {
  const plain = synthActor();

  it("mirrors the footprint bands: quieter work is harder to read", () => {
    const state = createSliceWorldState();
    state.traces = [];

    // No assistant, baseline public dwelling: the arithmetic is visible.
    expect(probeCorrectPercent(state, plain, 0)).toBe(
      PROBE_BASE_PERCENT + PROBE_EXPOSURE_ADJUST["none"]! + PROBE_ANONYMITY_ADJUST["public"]!,
    );

    state.traces = [trace("trace:1", 2, "operation-escalation", 0)];
    const low = probeCorrectPercent(state, plain, 0);
    state.traces = [trace("trace:1", 4, "operation-escalation", 0)];
    const elevated = probeCorrectPercent(state, plain, 0);
    state.traces = [trace("trace:1", 9, "operation-escalation", 0)];
    const severe = probeCorrectPercent(state, plain, 0);

    expect(low).toBeLessThan(elevated);
    expect(elevated).toBeLessThan(severe);
  });

  it("consumes the dwelling anonymity band D031 shipped with no reader", () => {
    const state = createSliceWorldState();
    state.traces = [trace("trace:1", 3, "operation-escalation", 0)];

    const public_ = probeCorrectPercent(state, plain, 0);
    state.economy.housing = "housing-basement-cot";
    const quiet = probeCorrectPercent(state, plain, 0);
    state.economy.housing = "housing-sleeper-unit";
    const hidden = probeCorrectPercent(state, plain, 0);

    expect(public_).toBeGreaterThan(quiet);
    expect(quiet).toBeGreaterThan(hidden);
  });

  it("quiet exits outnumbering escalations means your habits have no signature", () => {
    // Same total footprint weight in both worlds, so only the *mix* of causes
    // differs — one exit per escalation is a tie and applies nothing...
    const state = createSliceWorldState();
    state.traces = [
      trace("trace:1", 2, "operation-disengagement", 0),
      trace("trace:2", 2, "operation-escalation", 60),
    ];
    const tied = probeCorrectPercent(state, plain, 0);

    // ...while two quiet exits against one escalation is the "changes relays"
    // shape, and it lifts the read's difficulty by exactly the term.
    const quiet = createSliceWorldState();
    quiet.traces = [
      trace("trace:1", 1, "operation-disengagement", 0),
      trace("trace:2", 1, "operation-disengagement", 60),
      trace("trace:3", 2, "operation-escalation", 120),
    ];
    expect(probeCorrectPercent(quiet, plain, 0)).toBe(
      tied + PROBE_QUIET_HABIT_ADJUST,
    );
  });

  it("an intrusively open operation is the loudest thing you can be doing", () => {
    const state = createSliceWorldState();
    state.traces = [trace("trace:1", 1, "operation-disengagement", 0)];

    const closed = probeCorrectPercent(state, plain, 0);
    state.operation = {
      targetId: "nightshade",
      stage: "intrusive",
      openedWorldMinute: 0,
    };
    expect(probeCorrectPercent(state, plain, 0)).toBe(
      closed + PROBE_ACTIVE_INTRUSION_ADJUST,
    );
  });

  it("is fallible, never deterministic: bounded away from both certainties", () => {
    // The most readable player the fiction allows, read by the best model in
    // the catalog over a sweep of ticks and probers.
    const loud = createSliceWorldState();
    loud.traces = [trace("trace:1", 100, "operation-escalation", 0)];
    loud.operation = {
      targetId: "nightshade",
      stage: "intrusive",
      openedWorldMinute: 0,
    };

    for (let tick = 0; tick < 120; tick += 1) {
      for (const entry of [
        ...loud.underground.actors,
        synthActor({ modelId: "model-cloud-frontier" }),
      ]) {
        const percent = probeCorrectPercent(loud, entry, tick);
        expect(percent).toBeLessThanOrEqual(PROBE_MAX_CORRECT_PERCENT);
        expect(percent).toBeGreaterThanOrEqual(PROBE_MIN_CORRECT_PERCENT);
      }
    }

    // The quietest conceivable player: no footprint, outskirts dwelling. The
    // raw terms land *below* the floor — which is exactly what the floor is
    // for: no player is ever unreadable, so "never deterministic" holds.
    const calm = createSliceWorldState();
    calm.traces = [];
    calm.economy.housing = "housing-sleeper-unit";
    expect(
      PROBE_BASE_PERCENT +
        PROBE_EXPOSURE_ADJUST["none"]! +
        PROBE_ANONYMITY_ADJUST["hidden"]!,
    ).toBeLessThan(PROBE_MIN_CORRECT_PERCENT);
    expect(probeCorrectPercent(calm, plain, 0)).toBe(PROBE_MIN_CORRECT_PERCENT);
  });

  it("the probe seat consumes the same npcAssistDeltas read as offence and defence", () => {
    const state = probedWorld();
    const assisted = state.underground.actors.find((entry) => entry.modelId);
    expect(assisted).toBeDefined();

    const unassisted = synthActor({ id: assisted!.id });
    const quiet = createSliceWorldState();
    quiet.traces = [];
    quiet.operation = null;

    let lifts = 0;
    let misses = 0;

    for (let tick = 0; tick < 200; tick += 1) {
      const deltas = npcAssistDeltas(
        state.underground.seed,
        tick,
        assisted!.id,
        findModelItem(assisted!.modelId!),
      );
      const percent = probeCorrectPercent(quiet, assisted!, tick);
      const bare = probeCorrectPercent(quiet, unassisted, tick);

      if (deltas.skillDelta > 0) {
        lifts += 1;
        // The lift branch adds quality, exactly the same delta the offence
        // seat gets — the math is shared, not re-invented.
        expect(percent).toBe(
          Math.min(
            PROBE_MAX_CORRECT_PERCENT,
            bare + deltas.skillDelta * PROBE_ASSIST_QUALITY_PER_POINT,
          ),
        );
      } else if (deltas.skillDelta < 0) {
        misses += 1;
        // The mistake branch lands twice: negative delta * quality, plus the
        // penalty for reading a pattern wrong with confidence.
        expect(percent).toBe(
          Math.max(
            PROBE_MIN_CORRECT_PERCENT,
            bare +
              deltas.skillDelta * PROBE_ASSIST_QUALITY_PER_POINT -
              PROBE_MISTAKE_PENALTY,
          ),
        );
      }
    }

    // A 13B workhorse at reliability 4 misses (6−4)/12 = 1 in 6 of its ticks;
    // the sweep must have seen both branches for the seat to be proven here.
    expect(lifts).toBeGreaterThan(0);
    expect(misses).toBeGreaterThan(0);
  });
});

describe("probes are ecosystem actions: splits under the cap, honest skipping over it", () => {
  it("the same span in chunks reaches the same probe records", () => {
    const state = probedWorld(100_256, 2);

    const whole = new CommandBus(structuredClone(state));
    whole.execute({ type: "advanceTime", minutes: 6 * DAY });

    const hourly = new CommandBus(structuredClone(state));
    for (let hour = 0; hour < 6 * 24; hour += 1) {
      hourly.execute({ type: "advanceTime", minutes: 60 });
    }

    expect(hourly.snapshot().probes).toEqual(whole.snapshot().probes);
    expect(whole.snapshot().probes.length).toBeGreaterThan(0);
  });

  it("a split across a retaliation still agrees: standing is re-read every tick", () => {
    // Retaliation spends grudge *mid-command*. A candidate list cached for the
    // command would keep probing a peer who has already spent its standing in
    // the big wait but not in the small ones; re-deriving per tick makes the
    // records a function of world history alone.
    const state = probedWorld(100_256, 4);

    const big = new CommandBus(structuredClone(state));
    big.execute({ type: "advanceTime", minutes: 5 * DAY });

    const small = new CommandBus(structuredClone(state));
    for (let day = 0; day < 5; day += 1) {
      small.execute({ type: "advanceTime", minutes: DAY });
    }

    expect(small.snapshot().probes).toEqual(big.snapshot().probes);
    expect(big.snapshot().probes.length).toBeGreaterThan(0);
  });

  it("the catch-up cap skips probes instead of fabricating them", () => {
    const state = probedWorld(100_256, 3);

    const capped = new CommandBus(structuredClone(state));
    capped.execute({ type: "advanceTime", minutes: 60 * DAY });

    const chunked = new CommandBus(structuredClone(state));
    wait(chunked, 60 * DAY);

    const cappedProbes = capped.snapshot().probes;
    const chunkedProbes = chunked.snapshot().probes;
    expect(cappedProbes.length).toBeGreaterThan(0);

    // Unlike P1's derived case material, a skipped tick is a probe that never
    // happened: everything the capped run recorded lies inside the tick window
    // it actually ran — nothing from the skipped stretch appears as a record.
    const lastTick = Math.floor(capped.snapshot().worldMinute / TICK_MINUTES);
    const firstRan = lastTick - MAX_CATCHUP_TICKS + 1;
    for (const probe of cappedProbes) {
      expect(probe.worldMinute % TICK_MINUTES).toBe(0);
      expect(probe.worldMinute / TICK_MINUTES).toBeGreaterThanOrEqual(firstRan);
    }

    // And the full-history run saw probes the capped run structurally could
    // not: its first record predates the capped window.
    expect(chunkedProbes[0]!.worldMinute).toBeLessThan(cappedProbes[0]!.worldMinute);
    // Ids stay append-sequential in both runs.
    expect(cappedProbes.map((probe) => probe.id)).toEqual(
      cappedProbes.map((_, index) => `probe:${index + 1}`),
    );
  });

  it("survives a portable save round-trip verbatim", () => {
    const bus = new CommandBus(probedWorld(100_256, 2));
    wait(bus, 10 * DAY);
    const state = bus.snapshot();

    expect(state.probes.length).toBeGreaterThan(0);
    expect(parsePortableRunSave(serializePortableRunSave(state))).toEqual(state);
  });

  it("a restored world keeps being fooled the same way — correct persists", () => {
    const bus = new CommandBus(probedWorld(100_256, 3));
    wait(bus, 10 * DAY);
    const midway = bus.snapshot();

    const resumed = new CommandBus(
      parsePortableRunSave(serializePortableRunSave(midway)),
    );
    wait(resumed, 15 * DAY);

    const straight = new CommandBus(probedWorld(100_256, 3));
    wait(straight, 25 * DAY);

    expect(resumed.snapshot().probes).toEqual(straight.snapshot().probes);
    expect(
      resumed.snapshot().probes.some((probe) => !probe.correct),
      "a rival that was fooled must still be fooled after a restore",
    ).toBe(true);
  });

  it("loads a legacy save with no probes at all", () => {
    const legacy = JSON.stringify({
      worldMinute: 4_000,
      player: { handle: "CobaltXZ", rank: 100_256 },
      targets: [],
      knownTargetIds: [],
      traces: [],
      reactions: [],
    });

    const parsed = worldStateSchema.parse(JSON.parse(legacy));

    expect(parsed.probes).toEqual([]);
  });
});

describe("the observable tell is derived from the seat, not stored beside it", () => {
  it("each seat leaks exactly one tell, and the three tells are distinct", () => {
    expect(probeArtifactOf("rig")).toBe("probe-ping");
    expect(probeArtifactOf("dwelling")).toBe("caller-question");
    expect(probeArtifactOf("habits")).toBe("missing-contact");
    expect(new Set(RIVAL_PROBE_SUBJECTS.map(probeArtifactOf)).size).toBe(3);
  });

  it("the peer tells are disjoint from P1's authority vocabulary", () => {
    const authority = ["unusual-login", "marketplace-behavior", "suspicious-message"];

    for (const tell of RIVAL_PROBE_SUBJECTS.map(probeArtifactOf)) {
      expect(authority).not.toContain(tell);
    }
  });

  it("a world with every read flipped wrong projects the identical tells", () => {
    const bus = new CommandBus(probedWorld(100_256, 2));
    wait(bus, 10 * DAY);
    const state = bus.snapshot();
    expect(state.probes.length).toBeGreaterThan(0);

    const fooled = structuredClone(state);
    fooled.probes = fooled.probes.map((probe) => ({
      ...probe,
      correct: !probe.correct,
    }));

    expect(projectWorld(fooled).probes).toEqual(projectWorld(state).probes);
    expect(createGameRuntime(fooled).projection.getTable("probes")).toEqual(
      createGameRuntime(state).projection.getTable("probes"),
    );
  });
});

describe("projection: the tell with a minute, never the belief", () => {
  it("carries the tells newest-first with exactly the observable keys", () => {
    const bus = new CommandBus(probedWorld(100_256, 2));
    wait(bus, 10 * DAY);
    const state = bus.snapshot();

    const tells = projectWorld(state).probes;
    expect(tells.length).toBe(state.probes.length);
    expect(tells.length).toBeGreaterThan(0);
    expect(Object.keys(tells[0]!).sort()).toEqual(
      ["artifactKind", "id", "worldMinute"].sort(),
    );

    const minutes = tells.map((tell) => tell.worldMinute);
    expect(minutes).toEqual([...minutes].sort((a, b) => b - a));
  });

  it("never leaks who probed, what they aimed at, or whether they were right", () => {
    const bus = new CommandBus(probedWorld(100_256, 2));
    wait(bus, 10 * DAY);

    const serialized = JSON.stringify(projectWorld(bus.snapshot()).probes);

    expect(serialized).not.toContain("actorId");
    expect(serialized).not.toContain("correct");
    expect(serialized).not.toContain("subject");
    expect(serialized).not.toContain("rig");
    expect(serialized).not.toContain("dwelling");
    expect(serialized).not.toContain("habits");
    for (const entry of bus.snapshot().underground.actors) {
      expect(serialized).not.toContain(entry.id);
    }
    // No meter and no countdown — P1's doctrine binds peers exactly as hard.
    expect(serialized).not.toContain("heat");
    expect(serialized).not.toContain("deadline");
    expect(serialized).not.toContain("percent");
  });

  it("adds an empty list to a default world's projection", () => {
    expect(projectWorld(createSliceWorldState()).probes).toEqual([]);
  });

  it("syncs tells into a TinyBase table of artifacts and minutes only", () => {
    const runtime = createGameRuntime(probedWorld(100_256, 2));
    runtime.execute({ type: "advanceTime", minutes: 10 * DAY });

    const table = runtime.projection.getTable("probes");
    const ids = Object.keys(table);
    expect(ids.length).toBeGreaterThan(0);

    for (const id of ids) {
      expect(Object.keys(table[id]!).sort()).toEqual(
        ["artifactKind", "worldMinute"].sort(),
      );
    }

    const storeJson = JSON.stringify(table);
    expect(storeJson).not.toContain("actorId");
    expect(storeJson).not.toContain("correct");
    expect(storeJson).not.toContain("lattice");
  });

  it("grows the tell list as the world keeps probing", () => {
    const runtime = createGameRuntime(probedWorld(100_256, 2));
    runtime.execute({ type: "advanceTime", minutes: 4 * DAY });
    const first = Object.keys(runtime.projection.getTable("probes")).length;

    runtime.execute({ type: "advanceTime", minutes: 12 * DAY });
    const later = Object.keys(runtime.projection.getTable("probes")).length;

    expect(later).toBeGreaterThan(first);
  });
});
