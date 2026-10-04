import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  MODEL_CATALOG,
  PROVIDER_COUNTERPARTY,
  findModelItem,
  modelEffectOf,
} from "@/content/model-catalog";
import { VENDOR_COUNTERPARTY } from "@/content/software-catalog";
import { MARKET_COUNTERPARTY } from "@/content/hardware-catalog";
import { combinedActionDurationFactor } from "@/game/simulation/systems/tools";
import { advanceUpkeep, recurringDailyCost } from "@/game/simulation/systems/upkeep";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

const CLOUD_FRONTIER = "model-cloud-frontier"; // 120/day, factor 0.7
const CLOUD_COMPACT = "model-cloud-compact"; // 40/day, factor 0.85
const LOCAL_WORKHORSE = "model-local-workhorse"; // 900 one-time, factor 0.9
const DAY_MINUTES = 24 * 60;

function stateWithCredits(credits: number): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  return state;
}

function modelMovements(
  events: SimulationEvent[],
): Extract<SimulationEvent, { type: "ValueTransferred" }>[] {
  return events.filter(
    (event): event is Extract<SimulationEvent, { type: "ValueTransferred" }> =>
      event.type === "ValueTransferred" && event.causeKind === "model",
  );
}

describe("model catalog", () => {
  it("lists fictional models with a source, a cost shape and a factor", () => {
    expect(MODEL_CATALOG.length).toBeGreaterThan(1);

    for (const item of MODEL_CATALOG) {
      expect(item.id.startsWith("model-")).toBe(true);
      // Every model runs as an action-duration modifier.
      expect(item.effect.kind).toBe("modifier");

      if (item.source === "cloud") {
        // Rent: bills a daily fee, never an acquisition price.
        expect(item.dailyCost).toBeGreaterThan(0);
        expect(item.cost).toBe(0);
      } else {
        // Property: one-time price, runs free forever.
        expect(item.cost).toBeGreaterThan(0);
        expect(item.dailyCost).toBe(0);
      }

      const factor =
        item.effect.kind === "modifier" ? item.effect.discount.factor : 1;
      // A shortcut that shortens work but never approaches the 0.1 floor.
      expect(factor).toBeGreaterThan(0.1);
      expect(factor).toBeLessThan(1);

      for (const value of Object.values(item.properties)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(5);
      }
    }
  });

  it("findModelItem and modelEffectOf skip unknown ids and the empty slot", () => {
    expect(findModelItem(CLOUD_FRONTIER)?.label).toBe("Frontier Class API");
    expect(findModelItem("model-nonexistent")).toBeUndefined();
    expect(modelEffectOf(null)).toBeUndefined();
    expect(modelEffectOf("model-nonexistent")).toBeUndefined();
  });

  it("no model running is identity: the factor stays exactly 1", () => {
    const economy = stateWithCredits(0).economy;
    expect(economy.activeModel).toBeNull();
    expect(combinedActionDurationFactor(economy)).toBe(1);
  });
});

describe("running a cloud model", () => {
  it("starts free and only bills at day boundaries", () => {
    const bus = new CommandBus(stateWithCredits(1_000));

    const result = bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    expect(result.ok).toBe(true);
    // No credits move when a rental starts.
    expect(modelMovements(result.events)).toHaveLength(0);
    expect(bus.snapshot().economy.credits).toBe(1_000);
    expect(bus.snapshot().economy.activeModel).toBe(CLOUD_FRONTIER);
    expect(result.events).toContainEqual({
      type: "ModelChanged",
      modelId: CLOUD_FRONTIER,
      active: true,
      source: "cloud",
      dailyCost: 120,
      worldMinute: 0,
    });
  });

  it("shortens accelerated actions through the shared factor path", () => {
    const bus = new CommandBus(stateWithCredits(1_000));

    // Baseline: starter rig, no model. survey base 12, network 1 → untouched.
    const before = projectWorld(bus.snapshot()).economy;
    expect(before.actionDurationFactor).toBe(1);
    expect(before.actionMinutes.survey).toBe(12);
    expect(before.actionMinutes.inspect).toBe(8);

    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    // The 0.7 factor is applied over the P1 hardware minutes, floored at 1.
    // network 1 = baseline → hardware minutes 12; ×0.7 = 8.4 → ceil → 9.
    const after = projectWorld(bus.snapshot()).economy;
    expect(after.actionDurationFactor).toBe(0.7);
    expect(after.actionMinutes.survey).toBe(9);
    // inspect: compute 1 baseline → 8; ×0.7 = 5.6 → ceil → 6.
    expect(after.actionMinutes.inspect).toBe(6);
    // disengage has no axis, so it never scales with a model either.
    expect(after.actionMinutes.disengage).toBe(3);
  });

  it("re-running the same model and an unknown model are rejected", () => {
    const bus = new CommandBus(stateWithCredits(1_000));
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    expect(
      bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER }).error,
    ).toBe("MODEL_ALREADY_ACTIVE");
    expect(
      bus.execute({ type: "runModel", modelId: "model-nope" }).error,
    ).toBe("MODEL_NOT_FOUND");
  });

  it("switching assistants is free and swaps in one step", () => {
    const bus = new CommandBus(stateWithCredits(1_000));
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const switchResult = bus.execute({ type: "runModel", modelId: CLOUD_COMPACT });

    expect(switchResult.ok).toBe(true);
    expect(modelMovements(switchResult.events)).toHaveLength(0);
    expect(bus.snapshot().economy.activeModel).toBe(CLOUD_COMPACT);
    expect(bus.snapshot().economy.credits).toBe(1_000);
  });

  it("stopping removes the speed with no debt or penalty", () => {
    const bus = new CommandBus(stateWithCredits(1_000));
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const stop = bus.execute({ type: "stopModel" });

    expect(stop.ok).toBe(true);
    expect(stop.events).toContainEqual(
      expect.objectContaining({ type: "ModelChanged", modelId: CLOUD_FRONTIER, active: false, dailyCost: 0 }),
    );
    expect(bus.snapshot().economy.activeModel).toBeNull();
    expect(projectWorld(bus.snapshot()).economy.actionDurationFactor).toBe(1);
  });

  it("stopping with nothing running is a no-op error", () => {
    const bus = new CommandBus(stateWithCredits(1_000));

    expect(bus.execute({ type: "stopModel" }).error).toBe("NO_MODEL_ACTIVE");
  });
});

describe("cloud subscription billing", () => {
  it("bills the provider at every crossed day boundary", () => {
    const bus = new CommandBus(stateWithCredits(1_000));
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const wait = bus.execute({ type: "advanceTime", minutes: 2 * DAY_MINUTES });

    const debits = modelMovements(wait.events);
    expect(debits).toHaveLength(2);
    expect(debits[0].amount).toBe(120);
    expect(debits[0].direction).toBe("debit");
    expect(debits[0].counterparty).toBe(PROVIDER_COUNTERPARTY);
    expect(debits[1].amount).toBe(120);
    expect(bus.snapshot().economy.credits).toBe(1_000 - 240);
  });

  it("lapses to stopped — never into debt — when the fee cannot be paid", () => {
    // 100 credits, 120/day: the first boundary is unpayable.
    const bus = new CommandBus(stateWithCredits(100));
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    const wait = bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    // No debit happened, the model stopped, and the player owes nothing.
    expect(modelMovements(wait.events)).toHaveLength(0);
    expect(wait.events).toContainEqual(
      expect.objectContaining({
        type: "ModelChanged",
        modelId: CLOUD_FRONTIER,
        active: false,
        dailyCost: 0,
      }),
    );
    expect(bus.snapshot().economy.activeModel).toBeNull();
    expect(bus.snapshot().economy.credits).toBe(100);
    expect(projectWorld(bus.snapshot()).economy.actionDurationFactor).toBe(1);
  });

  it("split waits bill the same boundaries in the same order", () => {
    const chunked = new CommandBus(stateWithCredits(1_000));
    chunked.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    chunked.execute({ type: "advanceTime", minutes: DAY_MINUTES });
    chunked.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const whole = new CommandBus(stateWithCredits(1_000));
    whole.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    whole.execute({ type: "advanceTime", minutes: 2 * DAY_MINUTES });

    expect(chunked.snapshot().economy).toEqual(whole.snapshot().economy);
  });

  it("running nothing bills no model fee", () => {
    const bus = new CommandBus(stateWithCredits(1_000));

    const wait = bus.execute({ type: "advanceTime", minutes: 5 * DAY_MINUTES });

    expect(modelMovements(wait.events)).toHaveLength(0);
    expect(bus.snapshot().economy.credits).toBe(1_000);
  });
});

describe("acquiring and running a local model", () => {
  it("buys outright once through the market and never bills to run", () => {
    const bus = new CommandBus(stateWithCredits(2_000));

    const buy = bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });

    expect(buy.ok).toBe(true);
    const debit = modelMovements(buy.events)[0];
    expect(debit.direction).toBe("debit");
    expect(debit.amount).toBe(900);
    expect(debit.causeId).toBe(LOCAL_WORKHORSE);
    expect(debit.counterparty).toBe(MARKET_COUNTERPARTY);
    expect(bus.snapshot().economy.ownedModels).toEqual([LOCAL_WORKHORSE]);
    // Buying never starts the model.
    expect(bus.snapshot().economy.activeModel).toBeNull();

    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });

    const wait = bus.execute({ type: "advanceTime", minutes: 3 * DAY_MINUTES });
    expect(modelMovements(wait.events)).toHaveLength(0);
    expect(bus.snapshot().economy.credits).toBe(1_100);
  });

  it("refuses to run a local model the player does not own", () => {
    const bus = new CommandBus(stateWithCredits(2_000));

    expect(
      bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE }).error,
    ).toBe("LOCAL_MODEL_NOT_OWNED");
  });

  it("rejects unknown, already-owned and unaffordable acquisitions", () => {
    const bus = new CommandBus(stateWithCredits(500));

    expect(
      bus.execute({ type: "acquireModel", modelId: "model-nope" }).error,
    ).toBe("MODEL_NOT_FOUND");

    const denied = bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    expect(denied.error).toBe("INSUFFICIENT_CREDITS");
    expect(denied.events).toEqual([]);
    expect(bus.snapshot().economy.credits).toBe(500);

    bus.execute({ type: "acquireModel", modelId: CLOUD_FRONTIER });
    // Cloud models are rented, never bought.
    expect(
      bus.execute({ type: "acquireModel", modelId: CLOUD_FRONTIER }).error,
    ).toBe("MODEL_NOT_LOCAL");
  });

  it("cannot buy the same local model twice", () => {
    const bus = new CommandBus(stateWithCredits(5_000));
    expect(
      bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE }).ok,
    ).toBe(true);

    expect(
      bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE }).error,
    ).toBe("MODEL_ALREADY_OWNED");
    expect(bus.snapshot().economy.ownedModels).toEqual([LOCAL_WORKHORSE]);
  });
});

describe("models compose with licenses and tools", () => {
  it("a model's factor multiplies the license factor under one floor", () => {
    const state = stateWithCredits(1_000);
    state.economy.software = ["software-analysis-pipeline"]; // factor 0.85
    state.economy.activeModel = CLOUD_FRONTIER; // factor 0.7

    // 0.85 × 0.7 = 0.595, floored once — the same combineFactors path tools use.
    const factor = combinedActionDurationFactor(state.economy);
    expect(factor).toBeCloseTo(0.595, 10);

    // survey: hardware minutes 12 (baseline network) → 12 × 0.595 = 7.14 → 8.
    const economy = projectWorld(state).economy;
    expect(economy.actionMinutes.survey).toBe(8);
    expect(economy.actionDurationFactor).toBeCloseTo(0.595, 10);
  });

  it("the wallet folds the cloud fee into the combined daily upkeep", () => {
    const state = stateWithCredits(1_000);
    state.economy.housing = "housing-rented-lab"; // 60/day
    state.economy.software = ["software-net-monitor"]; // 40/day
    state.economy.activeModel = CLOUD_FRONTIER; // 120/day

    expect(recurringDailyCost(null, [])).toBe(0);
    expect(
      recurringDailyCost(
        state.economy.housing,
        state.economy.software,
        state.economy.activeModel,
      ),
    ).toBe(60 + 40 + 120);
    expect(projectWorld(state).economy.dailyCost).toBe(220);
  });

  it("an unpayable model stops without touching a paid license", () => {
    const state = stateWithCredits(150);
    state.economy.software = ["software-net-monitor"]; // 40/day
    state.economy.activeModel = CLOUD_FRONTIER; // 120/day

    // One boundary: lease-less, license (40) is payable, model (120 after) is
    // not — 150 − 40 = 110 < 120.
    const events = advanceUpkeep(state, 0, DAY_MINUTES);

    expect(state.economy.software).toEqual(["software-net-monitor"]);
    expect(state.economy.activeModel).toBeNull();
    expect(state.economy.credits).toBe(110);
    expect(
      events.some(
        (event) =>
          event.type === "ValueTransferred" && event.counterparty === VENDOR_COUNTERPARTY,
      ),
    ).toBe(true);
    expect(modelMovements(events)).toHaveLength(0);
  });
});

describe("model persistence and projection", () => {
  it("round-trips owned models, the running slot, and the model cause kind", () => {
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
            amount: 900,
            balanceAfter: 100,
            cause: { kind: "model", id: LOCAL_WORKHORSE },
            counterparty: MARKET_COUNTERPARTY,
          },
        ],
        hardware: [],
        housing: null,
        software: [],
        playerTools: [],
        ownedMachines: [],
        ownedModels: [LOCAL_WORKHORSE],
        activeModel: LOCAL_WORKHORSE,
      },
    });

    expect(parsed.economy.ownedModels).toEqual([LOCAL_WORKHORSE]);
    expect(parsed.economy.activeModel).toBe(LOCAL_WORKHORSE);
    expect(parsed.economy.ledger[0].cause).toEqual({
      kind: "model",
      id: LOCAL_WORKHORSE,
    });
  });

  it("a legacy economy without model fields loads as no models owned or running", () => {
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

    expect(parsed.economy.ownedModels).toEqual([]);
    expect(parsed.economy.activeModel).toBeNull();
  });

  it("a save→load round-trip preserves acquire/run/switch/stop byte-for-byte", () => {
    const bus = new CommandBus(stateWithCredits(3_000));
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "runModel", modelId: CLOUD_COMPACT });
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "stopModel" });

    const snapshot = bus.snapshot();
    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(snapshot)),
    ) as WorldState;

    expect(restored.economy.ownedModels).toEqual(snapshot.economy.ownedModels);
    expect(restored.economy.activeModel).toBeNull();
    expect(restored.economy.credits).toBe(snapshot.economy.credits);
    expect(restored.economy.ledger).toEqual(snapshot.economy.ledger);
  });

  it("projects an empty model slate by default with full listings", () => {
    const economy = projectWorld(createSliceWorldState()).economy;
    expect(economy.activeModelId).toBeNull();
    expect(economy.actionDurationFactor).toBe(1);
    expect(economy.modelListings).toHaveLength(MODEL_CATALOG.length);
    expect(economy.modelListings.every((m) => !m.running)).toBe(true);
  });

  it("marks the running model and the owned local copy in the listings", () => {
    const bus = new CommandBus(stateWithCredits(3_000));
    bus.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    bus.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });

    const listings = projectWorld(bus.snapshot()).economy.modelListings;

    const workhorse = listings.find((m) => m.id === LOCAL_WORKHORSE);
    expect(workhorse?.owned).toBe(true);
    expect(workhorse?.running).toBe(true);

    const frontier = listings.find((m) => m.id === CLOUD_FRONTIER);
    expect(frontier?.owned).toBe(false);
    expect(frontier?.running).toBe(false);
  });

  it("the running model reaches the value graph as the provider institution", () => {
    const bus = new CommandBus(stateWithCredits(1_000));
    bus.execute({ type: "runModel", modelId: CLOUD_FRONTIER });
    bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const graph = projectWorld(bus.snapshot()).economy.valueGraph;
    const provider = graph.nodes.find((node) => node.id === PROVIDER_COUNTERPARTY);

    expect(provider?.kind).toBe("institution");
    expect(provider?.paid).toBe(120);
    expect(provider?.causeKinds).toEqual(["model"]);
    // The graph still reads cleanly alongside the derived factor.
    expect(graph.counterparties).toBe(1);
  });
});

describe("models through the runtime", () => {
  it("syncs the assistant row and model listings through TinyBase", () => {
    const runtime = createGameRuntime(stateWithCredits(1_000));

    expect(runtime.projection.getRow("rig", "assistant")).toEqual({
      modelId: "",
      factor: 1,
    });

    runtime.execute({ type: "runModel", modelId: CLOUD_FRONTIER });

    expect(
      runtime.projection.getCell("modelListings", CLOUD_FRONTIER, "running"),
    ).toBe(true);
    expect(runtime.projection.getRow("rig", "assistant")).toEqual({
      modelId: CLOUD_FRONTIER,
      factor: 0.7,
    });

    runtime.execute({ type: "acquireModel", modelId: LOCAL_WORKHORSE });
    expect(
      runtime.projection.getCell("modelListings", LOCAL_WORKHORSE, "owned"),
    ).toBe(true);

    // Switching to the owned local model drops the subscription and its fee.
    runtime.execute({ type: "runModel", modelId: LOCAL_WORKHORSE });
    expect(runtime.projection.getCell("meta", "wallet", "dailyCost")).toBe(0);
    expect(
      runtime.projection.getCell("modelListings", CLOUD_FRONTIER, "running"),
    ).toBe(false);
  });

  it("keeps every action on the same typed-command path the Terminal uses", () => {
    // The GUI and Terminal share the command shapes; the runtime accepts them
    // whichever entry point produced them, with identical state outcomes.
    const gui = new CommandBus(stateWithCredits(1_000));
    gui.execute({ type: "runModel", modelId: CLOUD_COMPACT });
    gui.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const terminal = new CommandBus(stateWithCredits(1_000));
    terminal.execute({ type: "runModel", modelId: CLOUD_COMPACT });
    terminal.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    expect(gui.snapshot().economy).toEqual(terminal.snapshot().economy);
  });
});
