import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  deriveLongRunPressure,
  LONG_RUN_PRESSURE_START_MINUTES,
} from "@/game/simulation/systems/long-run-pressure";
import {
  contractOfferPercent,
  contractOpenLimit,
  advanceUnderground,
  TICK_MINUTES,
} from "@/game/simulation/systems/underground";
import {
  probeAttemptPercent,
  probeCandidates,
} from "@/game/simulation/systems/probes";
import { physicalThreatPercent } from "@/game/simulation/systems/physical-retaliation";
import {
  PLAYER_ACTOR_ID,
  type UndergroundContract,
  type WorldState,
} from "@/game/simulation/state/world-state";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

function completedContract(index: number): UndergroundContract {
  return {
    id: `contract:history:${index}`,
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

function withCompletedHistory(count: number): WorldState {
  const world = createSliceWorldState();
  world.worldMinute = LONG_RUN_PRESSURE_START_MINUTES;
  world.underground.contracts = Array.from(
    { length: count },
    (_, index) => completedContract(index + 1),
  );
  return world;
}

function setRelationship(
  world: WorldState,
  actorId: string,
  values: { trust?: number; grudge?: number },
) {
  world.underground.relationships = world.underground.relationships.filter(
    (entry) =>
      !(entry.fromId === actorId && entry.toId === PLAYER_ACTOR_ID),
  );
  world.underground.relationships.push({
    id: `relationship:${actorId}:player`,
    fromId: actorId,
    toId: PLAYER_ACTOR_ID,
    trust: values.trust ?? 0,
    fear: 0,
    grudge: values.grudge ?? 0,
    updatedWorldMinute: 0,
  });
}

function quietActors(world: WorldState) {
  for (const actor of world.underground.actors) {
    actor.activity = 0;
    delete actor.modelId;
  }
}

function seedWithRollBetween(
  purpose: string,
  tickIndex: number,
  actorId: string,
  minimum: number,
  maximum: number,
): number {
  for (let seed = 1; seed < 100_000; seed += 1) {
    const roll = hashUnit(seed, purpose, tickIndex, actorId) * 100;
    if (roll >= minimum && roll < maximum) {
      return seed;
    }
  }

  throw new Error(`no seed found for ${purpose} in requested range`);
}

describe("Phase 7 P5 — exceptional long-run pressure", () => {
  it("is a strict no-op before two world weeks even with heavy history", () => {
    const world = withCompletedHistory(30);
    world.worldMinute = LONG_RUN_PRESSURE_START_MINUTES - 1;

    expect(deriveLongRunPressure(world)).toEqual({
      band: "ordinary",
      reasons: [],
      contractOfferBonusPercent: 0,
      maxOpenContracts: 3,
      probeAttemptBonusPercent: 0,
      physicalThreatBonusPercent: 0,
    });
    expect(contractOfferPercent(world)).toBe(10);
    expect(contractOpenLimit(world)).toBe(3);
    expect(probeAttemptPercent(world)).toBe(14);
  });

  it("does not punish calendar age without causal history", () => {
    const world = createSliceWorldState();
    world.worldMinute = 120 * 24 * 60;

    expect(deriveLongRunPressure(world)).toEqual({
      band: "ordinary",
      reasons: [],
      contractOfferBonusPercent: 0,
      maxOpenContracts: 3,
      probeAttemptBonusPercent: 0,
      physicalThreatBonusPercent: 0,
    });
  });

  it("raises pressure in bounded bands from accumulated history", () => {
    const known = withCompletedHistory(6);
    const entangled = withCompletedHistory(12);
    const veteran = withCompletedHistory(20);

    expect(deriveLongRunPressure(known)).toEqual(
      expect.objectContaining({
        band: "known",
        reasons: ["completed-work"],
        contractOfferBonusPercent: 4,
        maxOpenContracts: 3,
        probeAttemptBonusPercent: 4,
        physicalThreatBonusPercent: 4,
      }),
    );
    expect(deriveLongRunPressure(entangled)).toEqual(
      expect.objectContaining({
        band: "entangled",
        contractOfferBonusPercent: 8,
        maxOpenContracts: 4,
        probeAttemptBonusPercent: 8,
        physicalThreatBonusPercent: 8,
      }),
    );
    expect(deriveLongRunPressure(veteran)).toEqual(
      expect.objectContaining({
        band: "veteran",
        contractOfferBonusPercent: 12,
        maxOpenContracts: 5,
        probeAttemptBonusPercent: 12,
        physicalThreatBonusPercent: 12,
      }),
    );
  });

  it("uses actual history rather than rank or the starting board", () => {
    const lowWhite = withCompletedHistory(20);
    lowWhite.player.rank = 1;
    lowWhite.underground.playerNetwork = "white";

    const highBlack = structuredClone(lowWhite);
    highBlack.player.rank = 999_999;
    highBlack.underground.playerNetwork = "black";

    expect(deriveLongRunPressure(lowWhite)).toEqual(
      deriveLongRunPressure(highBlack),
    );
    expect(contractOfferPercent(lowWhite)).toBe(
      contractOfferPercent(highBlack),
    );
    expect(probeAttemptPercent(lowWhite)).toBe(
      probeAttemptPercent(highBlack),
    );
  });

  it("does not create rival interest from nothing", () => {
    const veteran = withCompletedHistory(20);

    expect(deriveLongRunPressure(veteran).band).toBe("veteran");
    expect(probeCandidates(veteran)).toEqual([]);
  });

  it("makes an existing physical route more dangerous without bypassing its prerequisites", () => {
    const baseline = createSliceWorldState();
    baseline.worldMinute = LONG_RUN_PRESSURE_START_MINUTES;
    setRelationship(baseline, "kestrel", { grudge: 40 });

    const veteran = withCompletedHistory(20);
    setRelationship(veteran, "kestrel", { grudge: 40 });

    const baselineActor = baseline.underground.actors.find(
      (actor) => actor.id === "kestrel",
    );
    const veteranActor = veteran.underground.actors.find(
      (actor) => actor.id === "kestrel",
    );

    if (!baselineActor || !veteranActor) {
      throw new Error("slice world lost kestrel");
    }

    expect(
      physicalThreatPercent(
        veteran,
        veteranActor,
        LONG_RUN_PRESSURE_START_MINUTES,
      ) -
        physicalThreatPercent(
          baseline,
          baselineActor,
          LONG_RUN_PRESSURE_START_MINUTES,
        ),
    ).toBe(12);
  });

  it("materially raises contract traffic only after veteran history exists", () => {
    const tickIndex =
      LONG_RUN_PRESSURE_START_MINUTES / TICK_MINUTES;
    const seed = seedWithRollBetween(
      "offer",
      tickIndex,
      "vesper",
      10,
      22,
    );

    const baseline = createSliceWorldState();
    baseline.worldMinute = LONG_RUN_PRESSURE_START_MINUTES;
    baseline.underground.lastTickMinute =
      LONG_RUN_PRESSURE_START_MINUTES - TICK_MINUTES;
    baseline.underground.seed = seed;
    quietActors(baseline);
    baseline.underground.relationships = [];
    setRelationship(baseline, "vesper", { trust: 20 });

    const veteran = withCompletedHistory(20);
    veteran.underground.lastTickMinute =
      LONG_RUN_PRESSURE_START_MINUTES - TICK_MINUTES;
    veteran.underground.seed = seed;
    quietActors(veteran);
    veteran.underground.relationships = [];
    setRelationship(veteran, "vesper", { trust: 20 });

    advanceUnderground(baseline, LONG_RUN_PRESSURE_START_MINUTES);
    advanceUnderground(veteran, LONG_RUN_PRESSURE_START_MINUTES);

    expect(
      baseline.underground.contracts.filter(
        (contract) => contract.status === "offered",
      ),
    ).toHaveLength(0);
    expect(
      veteran.underground.contracts.filter(
        (contract) => contract.status === "offered",
      ),
    ).toHaveLength(1);
  });

  it("materially raises probe attempts only for rivals that already hold grudge", () => {
    const tickIndex =
      LONG_RUN_PRESSURE_START_MINUTES / TICK_MINUTES;
    const seed = seedWithRollBetween(
      "probe-try",
      tickIndex,
      "kestrel",
      14,
      26,
    );

    const baseline = createSliceWorldState();
    baseline.worldMinute = LONG_RUN_PRESSURE_START_MINUTES;
    baseline.underground.lastTickMinute =
      LONG_RUN_PRESSURE_START_MINUTES - TICK_MINUTES;
    baseline.underground.seed = seed;
    quietActors(baseline);
    setRelationship(baseline, "kestrel", { grudge: 5 });

    const veteran = withCompletedHistory(20);
    veteran.underground.lastTickMinute =
      LONG_RUN_PRESSURE_START_MINUTES - TICK_MINUTES;
    veteran.underground.seed = seed;
    quietActors(veteran);
    setRelationship(veteran, "kestrel", { grudge: 5 });

    advanceUnderground(baseline, LONG_RUN_PRESSURE_START_MINUTES);
    advanceUnderground(veteran, LONG_RUN_PRESSURE_START_MINUTES);

    expect(baseline.probes).toHaveLength(0);
    expect(veteran.probes).toHaveLength(1);
    expect(veteran.probes[0]?.actorId).toBe("kestrel");
  });

  it("keeps one long wait and split waits identical across the activation boundary", () => {
    const start = LONG_RUN_PRESSURE_START_MINUTES - 24 * 60;
    const end = LONG_RUN_PRESSURE_START_MINUTES + 24 * 60;
    const whole = withCompletedHistory(20);
    whole.worldMinute = start;
    whole.underground.lastTickMinute = start;
    quietActors(whole);
    setRelationship(whole, "vesper", { trust: 20 });

    const split = structuredClone(whole);

    advanceUnderground(whole, end);
    advanceUnderground(split, LONG_RUN_PRESSURE_START_MINUTES);
    advanceUnderground(split, end);

    expect(split.underground).toEqual(whole.underground);
    expect(split.probes).toEqual(whole.probes);
    expect(split.physicalThreats).toEqual(whole.physicalThreats);
  });

  it("projects only the pressure band and visible history reasons", () => {
    const world = withCompletedHistory(20);
    world.traces.push({
      id: "trace:p5:1",
      targetId: "nightshade",
      cause: "operation-escalation",
      stage: "intrusive",
      severity: "high",
      weight: 3,
      worldMinute: 200,
    });

    const projection = projectWorld(world);

    expect(projection.longRunPressure).toEqual({
      band: "veteran",
      reasons: ["completed-work", "intrusive-history"],
    });

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);
    expect(store.getRow("longRunPressure", "current")).toEqual({
      band: "veteran",
      reasons: "completed-work,intrusive-history",
    });

    const visible = JSON.stringify(projection.longRunPressure);
    expect(visible).not.toContain("Percent");
    expect(visible).not.toContain("score");
    expect(visible).not.toContain("rank");
  });

  it("survives save/restore as a pure derived read with no new authoritative field", () => {
    const world = withCompletedHistory(20);
    expect("longRunPressure" in world).toBe(false);

    const restored = parsePortableRunSave(serializePortableRunSave(world));

    expect(deriveLongRunPressure(restored)).toEqual(
      deriveLongRunPressure(world),
    );
    expect("longRunPressure" in restored).toBe(false);
  });
});
