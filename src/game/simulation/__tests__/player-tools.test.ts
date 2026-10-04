import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  FENCE_COUNTERPARTY,
  PLAYER_TOOL_CATALOG,
  TOOL_RESALE_RATE,
  findPlayerToolItem,
  playerToolEffects,
  resaleValue,
} from "@/content/player-tool-catalog";
import {
  combinedActionDurationFactor,
  derivePlayerToolCapability,
} from "@/game/simulation/systems/tools";
import { effectiveCapability } from "@/game/simulation/systems/housing";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

const SCRAPER = "tool-paranoid-scraper";
const LOADER = "tool-ghost-loader";
const DEDUP = "tool-silent-dedup";
const DAY_MINUTES = 24 * 60;

function stateWithCredits(credits: number): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  return state;
}

function toolDebits(
  events: SimulationEvent[],
): Extract<SimulationEvent, { type: "ValueTransferred" }>[] {
  return events.filter(
    (event): event is Extract<SimulationEvent, { type: "ValueTransferred" }> =>
      event.type === "ValueTransferred" && event.causeKind === "tool",
  );
}

function openOp(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
}

describe("player-tool catalog", () => {
  it("lists authored artifacts with provenance and one-time costs", () => {
    expect(PLAYER_TOOL_CATALOG.length).toBeGreaterThan(0);

    for (const item of PLAYER_TOOL_CATALOG) {
      expect(item.id.startsWith("tool-")).toBe(true);
      expect(item.author.trim().length).toBeGreaterThan(0);
      expect(item.cost).toBeGreaterThan(0);
      expect(item.effect.kind === "capability" || item.effect.kind === "modifier").toBe(
        true,
      );
    }
  });

  it("findPlayerToolItem resolves listings and skips unknown ids", () => {
    expect(findPlayerToolItem(LOADER)?.author).toBe("hexwidow");
    expect(findPlayerToolItem("tool-nonexistent")).toBeUndefined();
    expect(playerToolEffects(["tool-nonexistent"])).toEqual([]);
  });

  it("resale is a fraction of the actually-paid price", () => {
    expect(TOOL_RESALE_RATE).toBeGreaterThan(0);
    expect(TOOL_RESALE_RATE).toBeLessThanOrEqual(1);
    expect(resaleValue(1000)).toBe(Math.floor(1000 * TOOL_RESALE_RATE));
    // Odd prices floor to a whole credit, so a resale never produces a
    // fractional balance.
    expect(resaleValue(101)).toBe(Math.floor(101 * TOOL_RESALE_RATE));
  });

  it("empty ownership is identity: zero lift and factor 1", () => {
    const state = stateWithCredits(0);
    expect(derivePlayerToolCapability(state.economy)).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(combinedActionDurationFactor(state.economy)).toBe(1);
  });
});

describe("buying a player tool", () => {
  it("charges once to the author's handle and emits provenance", () => {
    const bus = new CommandBus(stateWithCredits(2_000));

    const result = bus.execute({ type: "buyPlayerTool", toolId: LOADER });

    expect(result.ok).toBe(true);
    const debits = toolDebits(result.events);
    expect(debits).toHaveLength(1);
    expect(debits[0].direction).toBe("debit");
    expect(debits[0].amount).toBe(1_200);
    expect(debits[0].causeId).toBe(LOADER);
    expect(debits[0].counterparty).toBe("hexwidow");
    expect(result.events).toContainEqual({
      type: "PlayerToolAcquired",
      toolId: "tool:1",
      catalogId: LOADER,
      author: "hexwidow",
      cost: 1_200,
      worldMinute: 0,
    });

    const world = bus.snapshot();
    expect(world.economy.credits).toBe(800);
    expect(world.economy.playerTools).toEqual([
      {
        id: "tool:1",
        catalogId: LOADER,
        author: "hexwidow",
        paidCost: 1_200,
        acquiredWorldMinute: 0,
      },
    ]);
  });

  it("rejects unknown tools and unaffordable buys without moving money", () => {
    const bus = new CommandBus(stateWithCredits(400));

    expect(
      bus.execute({ type: "buyPlayerTool", toolId: "tool-nope" }).error,
    ).toBe("TOOL_NOT_FOUND");

    const denied = bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    expect(denied.ok).toBe(false);
    expect(denied.error).toBe("INSUFFICIENT_CREDITS");
    expect(denied.events).toEqual([]);
    expect(bus.snapshot().economy.credits).toBe(400);
    expect(bus.snapshot().economy.playerTools).toEqual([]);
  });

  it("buying two copies of the same tool stacks the effect", () => {
    const bus = new CommandBus(stateWithCredits(2_400));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });

    const world = bus.snapshot();
    expect(world.economy.playerTools).toHaveLength(2);
    // ghost-loader is compute +2, memory +1 — twice as loud.
    expect(derivePlayerToolCapability(world.economy)).toMatchObject({
      compute: 4,
      memory: 2,
    });
  });

  it("ids stay unique across a buy/sell/rebuy cycle", () => {
    const bus = new CommandBus(stateWithCredits(4_800));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER }); // tool:1
    const second = bus.execute({ type: "buyPlayerTool", toolId: SCRAPER }); // tool:2
    expect(second.ok).toBe(true);
    bus.execute({ type: "sellPlayerTool", toolId: "tool:1" });

    const third = bus.execute({ type: "buyPlayerTool", toolId: DEDUP });
    expect(third.ok).toBe(true);
    const owned = bus.snapshot().economy.playerTools.map((t) => t.id);
    expect(owned).toEqual(["tool:2", "tool:3"]);
  });
});

describe("selling a player tool", () => {
  it("removes the copy, credits the fence, and drops its lift", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    const before = derivePlayerToolCapability(bus.snapshot().economy);

    const result = bus.execute({ type: "sellPlayerTool", toolId: "tool:1" });

    expect(result.ok).toBe(true);
    const proceeds = toolDebits(result.events);
    expect(proceeds).toHaveLength(1);
    expect(proceeds[0].direction).toBe("credit");
    expect(proceeds[0].amount).toBe(resaleValue(1_200));
    expect(proceeds[0].causeId).toBe(LOADER);
    expect(proceeds[0].counterparty).toBe(FENCE_COUNTERPARTY);
    expect(result.events).toContainEqual({
      type: "PlayerToolSold",
      toolId: "tool:1",
      catalogId: LOADER,
      author: "hexwidow",
      proceeds: resaleValue(1_200),
      worldMinute: 0,
    });

    const world = bus.snapshot();
    expect(world.economy.playerTools).toEqual([]);
    expect(world.economy.credits).toBe(800 + resaleValue(1_200));
    expect(derivePlayerToolCapability(world.economy)).not.toEqual(before);
  });

  it("resale values the paid price, not the current catalog price", () => {
    // Simulate a save whose paidCost differs from the catalog's current cost.
    const state = stateWithCredits(2_000);
    state.economy.playerTools = [
      {
        id: "tool:1",
        catalogId: SCRAPER,
        author: "nullbyte",
        paidCost: 400, // historic price
        acquiredWorldMinute: 0,
      },
    ];
    const bus = new CommandBus(state);

    const sold = bus.execute({ type: "sellPlayerTool", toolId: "tool:1" });
    const credit = toolDebits(sold.events)[0];

    expect(credit.amount).toBe(resaleValue(400));
    expect(credit.amount).not.toBe(resaleValue(findPlayerToolItem(SCRAPER)!.cost));
  });

  it("refuses to sell a tool the player does not own", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: SCRAPER });

    expect(
      bus.execute({ type: "sellPlayerTool", toolId: "tool:99" }).error,
    ).toBe("TOOL_NOT_OWNED");
  });
});

describe("player tools have no upkeep", () => {
  it("a whole day of waiting bills nothing for owned tools", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });

    const wait = bus.execute({ type: "advanceTime", minutes: 3 * DAY_MINUTES });

    expect(toolDebits(wait.events)).toHaveLength(0);
    expect(
      wait.events.some(
        (event) => event.type === "ValueTransferred" && event.direction === "debit",
      ),
    ).toBe(false);
    expect(bus.snapshot().economy.credits).toBe(800);
  });

  it("the projection reports zero daily cost when only tools are held", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    bus.execute({ type: "buyPlayerTool", toolId: DEDUP });

    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.dailyCost).toBe(0);
  });
});

describe("player tools flow through rig speed and scale", () => {
  it("a capability tool widens discovery like a license does", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER }); // memory +1
    openOp(bus);

    // starter memory 1 + ghost-loader 1 = 2, so a survey covers two machines
    // in one pass.
    const result = bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    expect(
      result.events.filter((event) => event.type === "MachineObserved"),
    ).toHaveLength(2);
  });

  it("a modifier tool shortens baseline hardware minutes", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: DEDUP }); // factor 0.9
    openOp(bus);
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    // starter network 1, so survey hardware minutes stay 12; ×0.9 = 11.
    expect(bus.snapshot().worldMinute).toBe(11);
  });

  it("license and tool factors compose multiplicatively", () => {
    const state = stateWithCredits(2_000);
    state.economy.software = ["software-analysis-pipeline"]; // 0.85
    state.economy.playerTools = [
      {
        id: "tool:1",
        catalogId: DEDUP,
        author: "cipher-priest",
        paidCost: 900,
        acquiredWorldMinute: 0,
      },
    ];

    // 0.85 × 0.9 = 0.765, floored once by combineFactors.
    expect(combinedActionDurationFactor(state.economy)).toBeCloseTo(0.765, 6);

    const economy = projectWorld(state).economy;
    // survey hardware minutes stay 12 (baseline network); ×0.765 ⇒ 10.
    expect(economy.actionMinutes.survey).toBe(10);
  });

  it("one-minute floor survives even with a stacked factor", () => {
    const state = stateWithCredits(2_000);
    state.economy.software = ["software-analysis-pipeline"]; // 0.85
    state.economy.playerTools = [
      {
        id: "tool:1",
        catalogId: DEDUP,
        author: "cipher-priest",
        paidCost: 900,
        acquiredWorldMinute: 0,
      },
      {
        id: "tool:2",
        catalogId: DEDUP,
        author: "cipher-priest",
        paidCost: 900,
        acquiredWorldMinute: 0,
      },
      {
        id: "tool:3",
        catalogId: DEDUP,
        author: "cipher-priest",
        paidCost: 900,
        acquiredWorldMinute: 0,
      },
    ];
    // 0.85 × 0.9³ ≈ 0.619, still floored at 0.1 by combineFactors.
    const factor = combinedActionDurationFactor(state.economy);
    expect(factor).toBeGreaterThan(0.1);

    const economy = projectWorld(state).economy;
    expect(economy.actionMinutes.disengage).toBe(3); // disengage is fixed
  });

  it("effectiveCapability folds tools on top of hardware, lease and licenses", () => {
    const state = stateWithCredits(2_000);
    state.economy.housing = "housing-cowork-loft"; // network +2
    state.economy.software = ["software-net-monitor"]; // network +2
    state.economy.playerTools = [
      {
        id: "tool:1",
        catalogId: SCRAPER,
        author: "nullbyte",
        paidCost: 500,
        acquiredWorldMinute: 0,
      }, // network +1, memory +1
    ];

    // starter network 1 + lease 2 + monitor 2 + scraper 1 = 6.
    expect(effectiveCapability(state.economy).network).toBe(6);
    // starter memory 1 + scraper 1 = 2.
    expect(effectiveCapability(state.economy).memory).toBe(2);
  });

  it("selling a tool returns durations and scope to the license baseline", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    expect(projectWorld(bus.snapshot()).economy.discoveryScope).toBe(2);

    bus.execute({ type: "sellPlayerTool", toolId: "tool:1" });

    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.discoveryScope).toBe(1);
    expect(economy.playerTools).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });
});

describe("player-tool persistence", () => {
  it("round-trips owned copies with their provenance intact", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 30,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
      economy: {
        credits: 100,
        ledger: [
          {
            id: "value:1",
            worldMinute: 30,
            direction: "debit",
            amount: 1_200,
            balanceAfter: 100,
            cause: { kind: "tool", id: LOADER },
            counterparty: "hexwidow",
          },
        ],
        hardware: [],
        housing: null,
        software: [],
        playerTools: [
          {
            id: "tool:1",
            catalogId: LOADER,
            author: "hexwidow",
            paidCost: 1_200,
            acquiredWorldMinute: 30,
          },
        ],
      },
    });

    expect(parsed.economy.playerTools).toHaveLength(1);
    expect(parsed.economy.playerTools[0]).toMatchObject({
      author: "hexwidow",
      paidCost: 1_200,
    });
    expect(parsed.economy.ledger[0].cause).toEqual({ kind: "tool", id: LOADER });
  });

  it("a legacy economy without playerTools loads as an empty inventory", () => {
    const parsed = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
      economy: {
        credits: 0,
        ledger: [],
        hardware: [],
        housing: null,
        software: [],
      },
    });

    expect(parsed.economy.playerTools).toEqual([]);
  });

  it("rejects a non-array playerTools list and a malformed tool", () => {
    const base = {
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
    };

    expect(
      worldStateSchema.safeParse({
        ...base,
        economy: {
          credits: 0,
          ledger: [],
          hardware: [],
          housing: null,
          software: [],
          playerTools: LOADER,
        },
      }).success,
    ).toBe(false);

    expect(
      worldStateSchema.safeParse({
        ...base,
        economy: {
          credits: 0,
          ledger: [],
          hardware: [],
          housing: null,
          software: [],
          playerTools: [{ id: "tool:1", catalogId: LOADER }],
        },
      }).success,
    ).toBe(false);
  });

  it("a save→load round-trip preserves a buy/sell/rebuy history byte-for-byte", () => {
    const bus = new CommandBus(stateWithCredits(4_800));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });
    bus.execute({ type: "buyPlayerTool", toolId: SCRAPER });
    bus.execute({ type: "sellPlayerTool", toolId: "tool:1" });
    bus.execute({ type: "buyPlayerTool", toolId: DEDUP });

    const snapshot = bus.snapshot();
    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(snapshot)),
    ) as WorldState;

    expect(restored.economy.playerTools).toEqual(snapshot.economy.playerTools);
    expect(restored.economy.credits).toBe(snapshot.economy.credits);
    expect(restored.economy.ledger).toEqual(snapshot.economy.ledger);
  });
});

describe("player-tool projection", () => {
  it("surfaces an empty inventory and full listings by default", () => {
    const economy = projectWorld(createSliceWorldState()).economy;
    expect(economy.ownedTools).toEqual([]);
    expect(economy.toolListings).toHaveLength(PLAYER_TOOL_CATALOG.length);
    expect(economy.playerTools).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });

  it("marks owned copies with author + resale and counts listings", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "buyPlayerTool", toolId: LOADER });

    const economy = projectWorld(bus.snapshot()).economy;
    const loader = economy.toolListings.find((item) => item.id === LOADER);
    expect(loader?.ownedCount).toBe(1);
    expect(loader?.author).toBe("hexwidow");

    const owned = economy.ownedTools.find((entry) => entry.id === "tool:1");
    expect(owned?.author).toBe("hexwidow");
    expect(owned?.resaleValue).toBe(resaleValue(1_200));
    expect(owned?.discountFactor).toBeNull();
    expect(owned?.capability?.compute).toBe(2);
  });
});

describe("player tools through the runtime", () => {
  it("syncs ownedTools + listings + lift through TinyBase", () => {
    const runtime = createGameRuntime(stateWithCredits(2_000));

    expect(runtime.projection.getRow("rig", "playerToolLift")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });

    runtime.execute({ type: "buyPlayerTool", toolId: LOADER });

    expect(
      runtime.projection.getCell("ownedTools", "tool:1", "author"),
    ).toBe("hexwidow");
    expect(
      runtime.projection.getRow("rig", "playerToolLift"),
    ).toMatchObject({ compute: 2, memory: 1 });
    expect(
      runtime.projection.getCell("toolListings", LOADER, "ownedCount"),
    ).toBe(1);

    runtime.execute({ type: "sellPlayerTool", toolId: "tool:1" });

    expect(runtime.projection.getRow("rig", "playerToolLift")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(runtime.projection.getCell("toolListings", LOADER, "ownedCount")).toBe(
      0,
    );
  });
});
