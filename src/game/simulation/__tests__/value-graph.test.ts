import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { FENCE_COUNTERPARTY } from "@/content/player-tool-catalog";
import { LANDLORD_COUNTERPARTY } from "@/content/housing-catalog";
import { VENDOR_COUNTERPARTY } from "@/content/software-catalog";
import { deriveValueGraph } from "@/game/simulation/systems/value-graph";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type {
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;
const LOADER = "tool-ghost-loader";

const movement = (
  counterparty: string,
  direction: "credit" | "debit",
  amount: number,
  causeKind: "contract" | "hardware" | "housing" | "upkeep" | "license" | "tool",
  worldMinute: number,
) => ({ counterparty, direction, amount, causeKind, worldMinute });

function stateWithCredits(credits: number): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  return state;
}

function contract(): UndergroundContract {
  return {
    id: "contract:1",
    issuerId: "vesper",
    targetId: "nightshade",
    objective: "recon-report",
    requiredServices: 1,
    status: "offered",
    offeredWorldMinute: 0,
    expiresWorldMinute: DAY,
  };
}

function learnService(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
}

describe("deriveValueGraph", () => {
  it("an empty ledger is an empty graph with zero totals", () => {
    const graph = deriveValueGraph([]);
    expect(graph).toEqual({
      counterparties: 0,
      totalInflow: 0,
      totalOutflow: 0,
      net: 0,
      nodes: [],
    });
  });

  it("aggregates a counterparty's movements with net and interaction count", () => {
    const graph = deriveValueGraph([
      movement("vesper", "credit", 120, "contract", 10),
      movement("vesper", "debit", 30, "tool", 40),
      movement("vesper", "debit", 20, "tool", 5),
    ]);

    expect(graph.counterparties).toBe(1);
    const [node] = graph.nodes;
    expect(node).toMatchObject({
      id: "vesper",
      kind: "peer",
      received: 120,
      paid: 50,
      net: 70,
      interactions: 3,
      firstWorldMinute: 5,
      lastWorldMinute: 40,
    });
    expect(graph.totalInflow).toBe(120);
    expect(graph.totalOutflow).toBe(50);
    expect(graph.net).toBe(70);
  });

  it("classifies the four roles as institutions and handles as peers", () => {
    const graph = deriveValueGraph([
      movement("market", "debit", 400, "hardware", 0),
      movement(LANDLORD_COUNTERPARTY, "debit", 30, "upkeep", 60),
      movement(VENDOR_COUNTERPARTY, "debit", 40, "license", 120),
      movement(FENCE_COUNTERPARTY, "credit", 600, "tool", 180),
      movement("hexwidow", "debit", 1_200, "tool", 240),
    ]);

    const kinds = new Map(graph.nodes.map((node) => [node.id, node.kind]));
    expect(kinds.get("market")).toBe("institution");
    expect(kinds.get(LANDLORD_COUNTERPARTY)).toBe("institution");
    expect(kinds.get(VENDOR_COUNTERPARTY)).toBe("institution");
    expect(kinds.get(FENCE_COUNTERPARTY)).toBe("institution");
    expect(kinds.get("hexwidow")).toBe("peer");
  });

  it("de-duplicates and sorts the cause kinds on a node", () => {
    const graph = deriveValueGraph([
      movement("vesper", "debit", 10, "tool", 1),
      movement("vesper", "debit", 10, "contract", 2),
      movement("vesper", "credit", 10, "tool", 3),
    ]);

    expect(graph.nodes[0].causeKinds).toEqual(["contract", "tool"]);
  });

  it("orders nodes by total volume then id, independent of ledger order", () => {
    const movements = [
      movement("alpha", "debit", 50, "tool", 0),
      movement("zeta", "credit", 80, "contract", 0),
      movement("mid", "debit", 100, "hardware", 0),
      movement("beta", "debit", 50, "tool", 0),
    ];

    const forward = deriveValueGraph(movements);
    const backward = deriveValueGraph([...movements].reverse());

    expect(forward.nodes.map((node) => node.id)).toEqual([
      "mid",
      "zeta",
      "alpha",
      "beta",
    ]);
    // Equal volume (50) breaks by id ascending, and reversing the input does
    // not change the output — the graph is a stable read, not a replay.
    expect(backward.nodes).toEqual(forward.nodes);
  });
});

describe("the projected value graph", () => {
  it("is empty on the untouched slice baseline", () => {
    const economy = projectWorld(createSliceWorldState()).economy;
    expect(economy.valueGraph.counterparties).toBe(0);
    expect(economy.valueGraph.nodes).toEqual([]);
  });

  it("a contract payout seeds a peer node with the issuer's public handle", () => {
    const state = createSliceWorldState();
    state.underground.contracts.push(contract());
    const bus = new CommandBus(state);
    bus.execute({ type: "acceptContract", contractId: "contract:1" });
    learnService(bus);
    bus.execute({ type: "deliverContract", contractId: "contract:1" });

    const graph = projectWorld(bus.snapshot()).economy.valueGraph;
    const vesper = graph.nodes.find((node) => node.id === "VESPER");

    expect(vesper).toMatchObject({
      kind: "peer",
      received: 120,
      paid: 0,
      net: 120,
      interactions: 1,
      causeKinds: ["contract"],
    });
  });

  it("buying and reselling a tool traces the author and the fence", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    bus.execute({ type: "sellPlayerTool", toolId: "tool:1" });

    const graph = projectWorld(bus.snapshot()).economy.valueGraph;
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    expect(byId.get("hexwidow")).toMatchObject({
      kind: "peer",
      received: 0,
      paid: 1_200,
      net: -1_200,
      causeKinds: ["tool"],
    });
    expect(byId.get(FENCE_COUNTERPARTY)).toMatchObject({
      kind: "institution",
      received: 600,
      paid: 0,
      net: 600,
      causeKinds: ["tool"],
    });
    // The two edges are the highest-volume counterparties; the graph totals
    // mirror the player's lifetime inflow and outflow.
    expect(graph.totalInflow).toBe(600);
    expect(graph.totalOutflow).toBe(1_200);
    expect(graph.net).toBe(-600);
  });

  it("one counterparty merges repeat bills across a day of upkeep", () => {
    const state = stateWithCredits(1_000);
    state.economy.housing = "housing-cowork-loft";
    const bus = new CommandBus(state);
    // Upkeep bills at each crossed world-day boundary: two here, one node.
    bus.execute({ type: "advanceTime", minutes: 2 * DAY });

    const graph = projectWorld(bus.snapshot()).economy.valueGraph;
    const landlord = graph.nodes.find(
      (node) => node.id === LANDLORD_COUNTERPARTY,
    );

    expect(landlord).toMatchObject({
      kind: "institution",
      received: 0,
      paid: 60,
      interactions: 2,
      causeKinds: ["upkeep"],
      firstWorldMinute: DAY,
      lastWorldMinute: 2 * DAY,
    });
  });

  it("summarises the whole lifetime ledger, beyond the capped ledger view", () => {
    const state = createSliceWorldState();
    state.economy.credits = 5_000;
    state.economy.housing = "housing-cowork-loft";
    state.economy.software = ["software-net-monitor"];
    const bus = new CommandBus(state);

    // One long wait is safe here: the graph is a read-time fold, so the test
    // pins its scope, not the upkeep cadence P3 already covers.
    bus.execute({ type: "advanceTime", minutes: 20 * DAY });

    const economy = projectWorld(bus.snapshot()).economy;
    const vendor = economy.valueGraph.nodes.find(
      (node) => node.id === VENDOR_COUNTERPARTY,
    );

    // 20 boundaries × 2 bills = 40 entries, more than the ledger table view
    // shows — yet the graph counted every license bill (20 × 40 cr).
    expect(bus.snapshot().economy.ledger.length).toBe(40);
    expect(economy.ledger.length).toBeLessThanOrEqual(30);
    expect(vendor?.causeKinds).toEqual(["license"]);
    expect(vendor?.paid).toBe(20 * 40);
  });

  it("is deterministic: two identical runs agree node-for-node", () => {
    const build = () => {
      const bus = new CommandBus(stateWithCredits(2_000));
      bus.execute({ type: "buyPlayerTool", toolId: LOADER });
      bus.execute({ type: "advanceTime", minutes: DAY });
      return projectWorld(bus.snapshot()).economy.valueGraph;
    };

    expect(build()).toEqual(build());
  });
});

describe("the value graph through the runtime", () => {
  it("syncs valueNodes rows and wallet totals into TinyBase", () => {
    const runtime = createGameRuntime(stateWithCredits(2_000));

    expect(runtime.projection.getTable("valueNodes")).toEqual({});
    expect(runtime.projection.getCell("meta", "wallet", "valueInflow")).toBe(0);
    expect(
      runtime.projection.getCell("meta", "wallet", "valueCounterparties"),
    ).toBe(0);

    runtime.execute({ type: "buyPlayerTool", toolId: LOADER });

    expect(runtime.projection.getCell("valueNodes", "hexwidow", "kind")).toBe(
      "peer",
    );
    expect(
      runtime.projection.getCell("valueNodes", "hexwidow", "causeKinds"),
    ).toBe("tool");
    expect(runtime.projection.getCell("meta", "wallet", "valueOutflow")).toBe(
      1_200,
    );
    expect(
      runtime.projection.getCell("meta", "wallet", "valueCounterparties"),
    ).toBe(1);
  });
});
