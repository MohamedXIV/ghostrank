import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { contractPayout } from "@/game/simulation/systems/economy";
import { contractDueMinute } from "@/game/simulation/systems/underground";
import type {
  ContractObjectiveKind,
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

function contract(
  objective: ContractObjectiveKind,
  overrides: Partial<UndergroundContract> = {},
): UndergroundContract {
  return {
    id: "contract:p3",
    issuerId: "vesper",
    targetId: "nightshade",
    objective,
    status: "offered",
    offeredWorldMinute: 0,
    expiresWorldMinute: DAY,
    ...overrides,
  };
}

function worldWith(entry: UndergroundContract): WorldState {
  const world = createSliceWorldState();
  world.underground.contracts = [entry];
  return world;
}

function accept(bus: CommandBus) {
  return bus.execute({ type: "acceptContract", contractId: "contract:p3" });
}

function deliver(bus: CommandBus) {
  return bus.execute({ type: "deliverContract", contractId: "contract:p3" });
}

function observeAndOpen(bus: CommandBus) {
  expect(
    bus.execute({ type: "observeTarget", targetId: "nightshade" }).ok,
  ).toBe(true);
  expect(
    bus.execute({ type: "openOperation", targetId: "nightshade" }).ok,
  ).toBe(true);
}

describe("Phase 8 P3 — contract breadth", () => {
  it("gives every objective a deterministic deadline and payout with no rank input", () => {
    const fixtures = [
      {
        entry: contract("recon-report", { requiredServices: 2 }),
        due: 2 * DAY,
        payout: 160,
      },
      {
        entry: contract("infrastructure-map", { requiredMachines: 2 }),
        due: 3 * DAY,
        payout: 180,
      },
      {
        entry: contract("quiet-recon"),
        due: 2 * DAY,
        payout: 180,
      },
      {
        entry: contract("intrusion"),
        due: 4 * DAY,
        payout: 260,
      },
    ] as const;

    for (const fixture of fixtures) {
      expect(contractDueMinute(fixture.entry, 0)).toBe(fixture.due);
      expect(contractPayout(fixture.entry)).toBe(fixture.payout);

      const low = worldWith(structuredClone(fixture.entry));
      low.player.rank = 1;
      const high = worldWith(structuredClone(fixture.entry));
      high.player.rank = 999_999;

      const lowBus = new CommandBus(low);
      const highBus = new CommandBus(high);
      expect(accept(lowBus)).toEqual(accept(highBus));
    }
  });

  it("verifies infrastructure-map only from machine evidence", () => {
    const bus = new CommandBus(
      worldWith(contract("infrastructure-map", { requiredMachines: 2 })),
    );
    accept(bus);

    expect(deliver(bus).error).toBe("OBJECTIVE_NOT_MET");

    observeAndOpen(bus);
    expect(
      bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(deliver(bus).error).toBe("OBJECTIVE_NOT_MET");

    expect(
      bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(deliver(bus).ok).toBe(true);
  });

  it("requires quiet-recon to leave at recon stage after acceptance", () => {
    const bus = new CommandBus(worldWith(contract("quiet-recon")));
    accept(bus);

    observeAndOpen(bus);
    expect(
      bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(bus.execute({ type: "escalateOperation" }).ok).toBe(true);
    expect(bus.execute({ type: "disengageOperation" }).ok).toBe(true);
    expect(deliver(bus).error).toBe("OBJECTIVE_NOT_MET");

    expect(
      bus.execute({ type: "openOperation", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(bus.execute({ type: "disengageOperation" }).ok).toBe(true);
    expect(deliver(bus).ok).toBe(true);
  });

  it("does not let a quiet exit from before acceptance satisfy a new contract", () => {
    const bus = new CommandBus(worldWith(contract("quiet-recon")));

    observeAndOpen(bus);
    expect(
      bus.execute({ type: "surveyTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(bus.execute({ type: "disengageOperation" }).ok).toBe(true);

    accept(bus);
    expect(deliver(bus).error).toBe("OBJECTIVE_NOT_MET");

    expect(
      bus.execute({ type: "openOperation", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(bus.execute({ type: "disengageOperation" }).ok).toBe(true);
    expect(deliver(bus).ok).toBe(true);
  });

  it("offers the broader objective vocabulary through ordinary trusted contacts", () => {
    const bus = new CommandBus(createSliceWorldState());

    for (let tick = 0; tick < 120; tick += 1) {
      bus.execute({ type: "advanceTime", minutes: 360 });

      for (const offered of bus
        .snapshot()
        .underground.contracts.filter((entry) => entry.status === "offered")) {
        bus.execute({ type: "declineContract", contractId: offered.id });
      }
    }

    const contracts = bus.snapshot().underground.contracts;
    const objectives = new Set(contracts.map((entry) => entry.objective));

    expect(objectives).toEqual(
      new Set([
        "recon-report",
        "infrastructure-map",
        "quiet-recon",
        "intrusion",
      ]),
    );

    for (const entry of contracts) {
      if (entry.objective === "recon-report") {
        expect(entry.requiredServices).toBeGreaterThanOrEqual(1);
        expect(entry.requiredMachines).toBeUndefined();
      } else if (entry.objective === "infrastructure-map") {
        expect(entry.requiredMachines).toBeGreaterThanOrEqual(1);
        expect(entry.requiredServices).toBeUndefined();
      } else {
        expect(entry.requiredMachines).toBeUndefined();
        expect(entry.requiredServices).toBeUndefined();
      }
    }
  });
});
