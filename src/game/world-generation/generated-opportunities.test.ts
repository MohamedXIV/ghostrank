import { describe, expect, it } from "vitest";

import {
  GENERATED_SCENARIO_SPECS,
  OBJECTIVE_WEIGHTS,
  type GeneratedRunScenario,
} from "@/content/world-scenarios";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import type {
  ContractObjectiveKind,
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";
import { objectiveWeightsFor, offerWindowMinutesFor } from "@/game/simulation/systems/opportunities";
import { worldStateSchema } from "@/persistence/world-state-schema";

/**
 * Opportunities and starting situations in generated scenes (Game-First G2, #78;
 * D069). A generated run opens with work already on offer, the work it offers
 * depends on the scene, and a greedy issuer leans toward the best-paying job.
 */

const DAY = 24 * 60;
const SCENES: readonly GeneratedRunScenario[] = ["fresh-scene", "high-pressure"];
const SEEDS = Array.from({ length: 120 }, (_, index) => index + 1);
const OBJECTIVES: readonly ContractObjectiveKind[] = [
  "recon-report",
  "infrastructure-map",
  "quiet-recon",
  "intrusion",
];

function start(seed: number, scenario: GeneratedRunScenario): WorldState {
  return createSliceWorldState({ seed, handle: "Night_Wren", scenario });
}

/** Plays one opening offer the way a player would with the starting kit (D069). */
function playOpeningOffer(seed: number, scenario: GeneratedRunScenario, contract: UndergroundContract) {
  const bus = new CommandBus(start(seed, scenario));
  const target = bus.snapshot().targets.find((entry) => entry.id === contract.targetId)!;

  const accepted = bus.execute({ type: "acceptContract", contractId: contract.id });
  bus.execute({ type: "observeTarget", targetId: target.id });
  bus.execute({ type: "openOperation", targetId: target.id });
  bus.execute({ type: "surveyTarget", targetId: target.id });
  for (const machine of target.machines) {
    bus.execute({ type: "inspectMachine", machineId: machine.id });
  }
  const delivered = bus.execute({ type: "deliverContract", contractId: contract.id });

  return { accepted, delivered, state: bus.snapshot() };
}

/** Counts the offers a run makes over `days`, tagged by the issuer's greed. */
function offersOverTime(scenario: GeneratedRunScenario, seeds: readonly number[], days: number) {
  const mix = new Map<ContractObjectiveKind, number>(OBJECTIVES.map((name) => [name, 0]));
  let total = 0;
  const byGreed = {
    greedy: { offers: 0, intrusion: 0 },
    frugal: { offers: 0, intrusion: 0 },
  };

  for (const seed of seeds) {
    const bus = new CommandBus(start(seed, scenario));
    const offered: Array<{ issuerId: string; objective: ContractObjectiveKind }> = [];
    let remaining = days * DAY;

    while (remaining > 0) {
      const step = Math.min(remaining, 7 * DAY);
      for (const event of bus.execute({ type: "advanceTime", minutes: step }).events) {
        if (event.type === "ContractOffered") {
          offered.push({ issuerId: event.issuerId, objective: event.objective });
        }
      }
      remaining -= step;
    }

    const world = bus.snapshot();

    for (const entry of offered) {
      const issuer = world.underground.actors.find((actor) => actor.id === entry.issuerId)!;
      const greed = issuer.temperament?.greed;
      total += 1;
      mix.set(entry.objective, (mix.get(entry.objective) ?? 0) + 1);

      const bucket = greed === undefined ? undefined : greed >= 70 ? byGreed.greedy : greed <= 30 ? byGreed.frugal : undefined;
      if (bucket) {
        bucket.offers += 1;
        if (entry.objective === "intrusion") bucket.intrusion += 1;
      }
    }
  }

  return {
    total,
    intrusionShare: (mix.get("intrusion") ?? 0) / total,
    greedyIntrusionShare: byGreed.greedy.intrusion / byGreed.greedy.offers,
    frugalIntrusionShare: byGreed.frugal.intrusion / byGreed.frugal.offers,
  };
}

describe("a generated run opens with its scene's offers (D069)", () => {
  it("offers each scene's opening count, from white brokers, at minute zero", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        const world = start(seed, scenario);
        const contracts = world.underground.contracts;
        const issuers = new Set<string>();

        expect(contracts, `${scenario} seed ${seed}`).toHaveLength(
          GENERATED_SCENARIO_SPECS[scenario].openingContracts,
        );

        for (const contract of contracts) {
          const issuer = world.underground.actors.find((actor) => actor.id === contract.issuerId)!;
          const target = world.targets.find((entry) => entry.id === contract.targetId)!;

          expect(contract.status).toBe("offered");
          expect(contract.offeredWorldMinute).toBe(0);
          expect(contract.expiresWorldMinute).toBe(offerWindowMinutesFor(scenario));
          expect(contract.objective).toBe("recon-report");
          expect(contract.requiredServices).toBe(1);
          expect(issuer.network).toBe("white");
          expect(issuer.targetId).toBeUndefined();
          expect(target.organizationId).not.toBe(issuer.organizationId);
          issuers.add(issuer.id);
        }

        expect(issuers.size).toBe(contracts.length);
      }
    }
  });

  it("makes every opening offer solvable and reachable with the starting kit, for 120 seeds", () => {
    for (const scenario of SCENES) {
      for (const seed of SEEDS) {
        for (const contract of start(seed, scenario).underground.contracts) {
          const { accepted, delivered, state } = playOpeningOffer(seed, scenario, contract);
          const label = `${scenario} seed ${seed} ${contract.id}`;

          expect(accepted.ok, label).toBe(true);
          expect(delivered.ok, label).toBe(true);
          expect(
            state.underground.contracts.find((entry) => entry.id === contract.id)?.status,
            label,
          ).toBe("completed");
        }
      }
    }
  });

  it("starts a canonical run with no offers waiting, as before G2", () => {
    expect(createSliceWorldState({ seed: 42, scenario: "canonical" }).underground.contracts).toEqual([]);
  });

  it("round-trips the opening offers through a save", () => {
    for (const scenario of SCENES) {
      const world = start(9, scenario);
      const parsed = worldStateSchema.parse(JSON.parse(JSON.stringify(world)));

      expect(parsed.underground.contracts).toEqual(world.underground.contracts);
    }
  });
});

describe("each scene weights its objectives, and greed leans toward intrusion (D069)", () => {
  it("draws every scene's weights from its own table, with no greed term for an actor without temperament", () => {
    for (const scenario of SCENES) {
      const weights = objectiveWeightsFor(scenario, {});

      expect(weights).toEqual(OBJECTIVE_WEIGHTS[scenario]);
    }
  });

  it("adds greed to intrusion weight only, a fifth of a point per point of greed", () => {
    for (const scenario of SCENES) {
      const base = OBJECTIVE_WEIGHTS[scenario];
      const greedy = objectiveWeightsFor(scenario, {
        temperament: { aggression: 0, caution: 0, greed: 100 },
      });

      for (const [index, entry] of greedy.entries()) {
        const expected =
          entry.value === "intrusion" ? base[index]!.weight + 20 : base[index]!.weight;
        expect(entry.weight).toBe(expected);
      }
    }
  });

  it("makes the volatile scene offer more intrusions than the fresh scene", () => {
    const fresh = offersOverTime("fresh-scene", SEEDS.slice(0, 40), 30);
    const high = offersOverTime("high-pressure", SEEDS.slice(0, 40), 30);

    // Measured: 0.24 (Fresh Scene) and 0.45 (High Pressure) over 40 seeds and 30 days.
    expect(high.intrusionShare).toBeGreaterThan(fresh.intrusionShare + 0.1);
  });

  it("makes greedy issuers offer intrusions more often than frugal ones, in both scenes", () => {
    for (const scenario of SCENES) {
      const measured = offersOverTime(scenario, SEEDS.slice(0, 40), 30);

      // Measured at +4.8 (Fresh Scene) and +4.6 (High Pressure) points: a real
      // but modest lean, bounded by the open-contract cap. The test asserts a 2-point margin.
      expect(
        measured.greedyIntrusionShare - measured.frugalIntrusionShare,
        scenario,
      ).toBeGreaterThan(0.02);
    }
  });
});
