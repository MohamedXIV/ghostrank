import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type {
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

/** Waits in <= 7 day steps so the ecosystem's bounded catch-up never applies. */
function wait(bus: CommandBus, minutes: number) {
  const events: ReturnType<CommandBus["execute"]>["events"] = [];
  let remaining = minutes;

  while (remaining > 0) {
    const step = Math.min(remaining, 7 * DAY);
    events.push(...bus.execute({ type: "advanceTime", minutes: step }).events);
    remaining -= step;
  }

  return { ok: true, events };
}

function contract(
  overrides: Partial<UndergroundContract> = {},
): UndergroundContract {
  return {
    id: "contract:1",
    issuerId: "vesper",
    targetId: "nightshade",
    objective: "recon-report",
    requiredServices: 1,
    status: "offered",
    offeredWorldMinute: 0,
    expiresWorldMinute: DAY,
    ...overrides,
  };
}

function worldWith(...contracts: UndergroundContract[]): WorldState {
  const state = createSliceWorldState();
  state.underground.contracts.push(...contracts);
  return state;
}

function relation(state: WorldState, fromId: string, toId: string) {
  return state.underground.relationships.find(
    (entry) => entry.fromId === fromId && entry.toId === toId,
  );
}

function learnService(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
}

describe("contract offers", () => {
  it("offers contracts from trusted contacts over time", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = wait(bus, 14 * DAY);
    const contracts = bus.snapshot().underground.contracts;

    expect(contracts.length).toBeGreaterThan(0);
    expect(
      result.events.some((event) => event.type === "ContractOffered"),
    ).toBe(true);
    const state = bus.snapshot();
    const trustedContactIds = state.underground.relationships
      .filter(
        (entry) =>
          entry.toId === "player" &&
          entry.trust >= 10,
      )
      .map((entry) => entry.fromId);

    for (const offered of contracts) {
      const issuer = state.underground.actors.find(
        (actor) => actor.id === offered.issuerId,
      );

      expect(trustedContactIds).toContain(offered.issuerId);
      expect(state.targets.some((target) => target.id === offered.targetId)).toBe(
        true,
      );
      expect(offered.targetId).not.toBe(issuer?.targetId);
      expect(offered.expiresWorldMinute).toBe(
        offered.offeredWorldMinute + DAY,
      );
    }
  });

  it("never offers against the issuer's own target", () => {
    const state = createSliceWorldState();
    const vesper = state.underground.actors.find(
      (entry) => entry.id === "vesper",
    );
    if (vesper) {
      vesper.targetId = "nightshade";
    }
    const bus = new CommandBus(state);

    wait(bus, 30 * DAY);

    const snapshot = bus.snapshot();
    for (const offered of snapshot.underground.contracts) {
      const issuer = snapshot.underground.actors.find(
        (actor) => actor.id === offered.issuerId,
      );
      expect(offered.targetId).not.toBe(issuer?.targetId);
    }
  });

  it("keeps at most three contracts open at once", () => {
    const bus = new CommandBus(createSliceWorldState());

    for (let step = 0; step < 4 * 60; step += 1) {
      bus.execute({ type: "advanceTime", minutes: 360 });
      const open = bus
        .snapshot()
        .underground.contracts.filter(
          (entry) => entry.status === "offered" || entry.status === "accepted",
        );
      expect(open.length).toBeLessThanOrEqual(3);
    }
  });

  it("is deterministic, rank-independent and split-invariant", () => {
    const one = new CommandBus(createSliceWorldState());
    const two = createSliceWorldState();
    two.player.rank = 1;
    for (const entry of two.underground.actors) {
      entry.rank = entry.rank * 3 + 11;
    }
    const other = new CommandBus(two);
    const chunked = new CommandBus(createSliceWorldState());

    wait(one, 12 * DAY);
    wait(other, 12 * DAY);
    for (let i = 0; i < 24; i += 1) {
      wait(chunked, DAY / 2);
    }

    expect(one.snapshot().underground.contracts.length).toBeGreaterThan(0);
    expect(one.snapshot().underground.contracts).toEqual(
      other.snapshot().underground.contracts,
    );
    expect(one.snapshot().underground.contracts).toEqual(
      chunked.snapshot().underground.contracts,
    );
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = new CommandBus(createSliceWorldState());
    wait(straight, 12 * DAY);

    const first = new CommandBus(createSliceWorldState());
    wait(first, 5 * DAY + 41);
    const resumed = new CommandBus(first.snapshot());
    wait(resumed, 12 * DAY - (5 * DAY + 41));

    expect(resumed.snapshot()).toEqual(straight.snapshot());
  });
});

describe("contract lifecycle commands", () => {
  const accept = (contractId: string): SimulationCommand => ({
    type: "acceptContract",
    contractId,
  });
  const decline = (contractId: string): SimulationCommand => ({
    type: "declineContract",
    contractId,
  });
  const deliver = (contractId: string): SimulationCommand => ({
    type: "deliverContract",
    contractId,
  });

  it("accepts an offer and sets a due time without costing world time", () => {
    const bus = new CommandBus(worldWith(contract()));

    const result = bus.execute(accept("contract:1"));
    const state = bus.snapshot();

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "ContractAccepted",
        contractId: "contract:1",
        dueWorldMinute: 2 * DAY,
        worldMinute: 0,
      },
    ]);
    expect(state.worldMinute).toBe(0);
    expect(state.underground.contracts[0]).toMatchObject({
      status: "accepted",
      acceptedWorldMinute: 0,
      dueWorldMinute: 2 * DAY,
    });
  });

  it("gives intrusion contracts a longer window", () => {
    const bus = new CommandBus(worldWith(contract({ objective: "intrusion" })));

    bus.execute(accept("contract:1"));

    expect(bus.snapshot().underground.contracts[0].dueWorldMinute).toBe(
      4 * DAY,
    );
  });

  it("never gates acceptance on rank", () => {
    for (const rank of [1, 999_999]) {
      const state = worldWith(contract());
      state.player.rank = rank;
      const bus = new CommandBus(state);

      expect(bus.execute(accept("contract:1")).ok).toBe(true);
    }
  });

  it("fails clearly for unknown, stale and expired offers", () => {
    const bus = new CommandBus(
      worldWith(
        contract(),
        contract({ id: "contract:2", status: "completed" }),
      ),
    );

    expect(bus.execute(accept("contract:99"))).toEqual({
      ok: false,
      events: [],
      error: "CONTRACT_NOT_FOUND",
    });
    expect(bus.execute(accept("contract:2")).error).toBe(
      "CONTRACT_NOT_OFFERED",
    );

    bus.execute({ type: "advanceTime", minutes: DAY + 1 });

    expect(bus.execute(accept("contract:1")).error).toBe("CONTRACT_EXPIRED");
  });

  it("declines without changing any relationship", () => {
    const bus = new CommandBus(worldWith(contract()));
    const before = relation(bus.snapshot(), "vesper", "player");

    const result = bus.execute(decline("contract:1"));

    expect(result.events).toEqual([
      { type: "ContractDeclined", contractId: "contract:1", worldMinute: 0 },
    ]);
    expect(bus.snapshot().underground.contracts[0].status).toBe("declined");
    expect(relation(bus.snapshot(), "vesper", "player")).toEqual(before);
    expect(bus.execute(decline("contract:1")).error).toBe(
      "CONTRACT_NOT_OFFERED",
    );
  });

  it("only delivers accepted contracts", () => {
    const bus = new CommandBus(worldWith(contract()));

    expect(bus.execute(deliver("contract:1")).error).toBe(
      "CONTRACT_NOT_ACCEPTED",
    );
    expect(bus.execute(deliver("contract:99")).error).toBe(
      "CONTRACT_NOT_FOUND",
    );
  });

  it("verifies a recon report from the evidence the player holds", () => {
    const bus = new CommandBus(worldWith(contract()));
    bus.execute(accept("contract:1"));

    expect(bus.execute(deliver("contract:1")).error).toBe(
      "OBJECTIVE_NOT_MET",
    );

    learnService(bus);
    const trustBefore = relation(bus.snapshot(), "vesper", "player")?.trust ?? 0;
    const rankBefore = bus.snapshot().player.rank;
    const minute = bus.snapshot().worldMinute;

    const result = bus.execute(deliver("contract:1"));
    const state = bus.snapshot();

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({
      type: "ContractDelivered",
      contractId: "contract:1",
      worldMinute: minute,
    });
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RelationshipChanged",
        fromId: "vesper",
        toId: "player",
        causeKind: "contract",
        causeId: "contract:1",
      }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "PlayerRankChanged",
        fromRank: rankBefore,
        causeId: "contract:1",
      }),
    );
    expect(relation(state, "vesper", "player")?.trust).toBe(trustBefore + 15);
    expect(state.player.rank).toBe(rankBefore - Math.floor(rankBefore * 0.01));
    expect(state.underground.contracts[0].status).toBe("completed");
    expect(state.worldMinute).toBe(minute);
  });

  it("requires more evidence when more services are asked for", () => {
    const bus = new CommandBus(
      worldWith(contract({ requiredServices: 2 })),
    );
    bus.execute(accept("contract:1"));
    learnService(bus);

    expect(bus.execute(deliver("contract:1")).error).toBe(
      "OBJECTIVE_NOT_MET",
    );

    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-vault" });

    expect(bus.execute(deliver("contract:1")).ok).toBe(true);
  });

  it("only counts an escalation made after accepting an intrusion contract", () => {
    const bus = new CommandBus(worldWith(contract({ objective: "intrusion" })));

    learnService(bus);
    bus.execute({ type: "escalateOperation" });
    bus.execute({ type: "disengageOperation" });
    bus.execute(accept("contract:1"));

    expect(bus.execute(deliver("contract:1")).error).toBe(
      "OBJECTIVE_NOT_MET",
    );

    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "escalateOperation" });

    expect(bus.execute(deliver("contract:1")).ok).toBe(true);
  });

  it("refuses delivery after the due time", () => {
    const bus = new CommandBus(worldWith(contract()));
    bus.execute(accept("contract:1"));
    learnService(bus);
    bus.execute({ type: "advanceTime", minutes: 2 * DAY + 1 });

    expect(bus.execute(deliver("contract:1")).error).toBe("CONTRACT_EXPIRED");
  });
});

describe("contract expiry", () => {
  it("lets an ignored offer lapse without a penalty", () => {
    const bus = new CommandBus(worldWith(contract()));
    const before = relation(bus.snapshot(), "vesper", "player");

    const result = wait(bus, 2 * DAY);
    const state = bus.snapshot();

    expect(state.underground.contracts[0].status).toBe("expired");
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "ContractExpired",
        contractId: "contract:1",
        stage: "offer",
      }),
    );
    expect(relation(state, "vesper", "player")?.trust).toBe(before?.trust);
  });

  it("penalizes an accepted contract that was missed", () => {
    const bus = new CommandBus(worldWith(contract()));
    bus.execute({ type: "acceptContract", contractId: "contract:1" });
    const before = relation(bus.snapshot(), "vesper", "player")?.trust ?? 0;

    const result = wait(bus, 3 * DAY);
    const state = bus.snapshot();

    expect(state.underground.contracts[0].status).toBe("expired");
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "ContractExpired",
        contractId: "contract:1",
        stage: "accepted",
      }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RelationshipChanged",
        fromId: "vesper",
        toId: "player",
        causeKind: "contract",
        causeId: "contract:1",
      }),
    );
    expect(relation(state, "vesper", "player")?.trust).toBe(before - 15);
  });
});

describe("contract projection", () => {
  it("shows actionable contracts without hidden truth", () => {
    const bus = new CommandBus(
      worldWith(
        contract(),
        contract({ id: "contract:2", status: "declined" }),
      ),
    );

    const contracts = projectWorld(bus.snapshot()).underground.contracts;

    expect(contracts).toHaveLength(1);
    expect(contracts[0]).toEqual({
      id: "contract:1",
      issuerHandle: "VESPER",
      targetId: "nightshade",
      targetHandle: "NIGHTSHADE",
      objective: "recon-report",
      requiredServices: 1,
      status: "offered",
      expiresWorldMinute: DAY,
    });
  });

  it("projects infrastructure-map requirements without hidden topology", () => {
    const bus = new CommandBus(
      worldWith(
        contract({
          objective: "infrastructure-map",
          requiredServices: undefined,
          requiredMachines: 2,
        }),
      ),
    );

    const visible = projectWorld(bus.snapshot()).underground.contracts[0];

    expect(visible).toEqual({
      id: "contract:1",
      issuerHandle: "VESPER",
      targetId: "nightshade",
      targetHandle: "NIGHTSHADE",
      objective: "infrastructure-map",
      requiredServices: undefined,
      requiredMachines: 2,
      status: "offered",
      expiresWorldMinute: DAY,
    });
    expect(JSON.stringify(visible)).not.toContain("machines");
    expect(JSON.stringify(visible)).not.toContain("services");

    const runtime = createGameRuntime(
      worldWith(
        contract({
          objective: "infrastructure-map",
          requiredServices: undefined,
          requiredMachines: 2,
        }),
      ),
    );
    expect(
      runtime.projection.getCell(
        "contracts",
        "contract:1",
        "requiredMachines",
      ),
    ).toBe(2);
  });

  it("syncs to TinyBase and updates as the contract advances", () => {
    const runtime = createGameRuntime(worldWith(contract()));

    expect(runtime.projection.getCell("contracts", "contract:1", "status")).toBe(
      "offered",
    );

    runtime.execute({ type: "acceptContract", contractId: "contract:1" });

    expect(runtime.projection.getCell("contracts", "contract:1", "status")).toBe(
      "accepted",
    );
    expect(
      runtime.projection.getCell("contracts", "contract:1", "dueWorldMinute"),
    ).toBe(2 * DAY);
  });
});
