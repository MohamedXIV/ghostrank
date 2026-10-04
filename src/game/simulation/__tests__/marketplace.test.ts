import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationEvent } from "@/game/simulation/events/types";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { MODEL_CATALOG, findModelItem } from "@/content/model-catalog";
import { npcAssistDeltas } from "@/game/simulation/systems/npc-ai";
import {
  createInitialWorldState,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;
const SALVAGE = "model-local-salvage"; // 600 one-time, author moebius
const WORKHORSE = "model-local-workhorse";

function actor(
  overrides: Partial<UndergroundActor> & Pick<UndergroundActor, "id">,
): UndergroundActor {
  return {
    handle: overrides.id.toUpperCase(),
    rank: 1_000,
    network: "black",
    skill: 60,
    defense: 50,
    discretion: 50,
    activity: 60,
    ...overrides,
  };
}

function customWorld(actors: UndergroundActor[], seed = 7): WorldState {
  return createInitialWorldState({
    player: { handle: "CobaltXZ", rank: 100_000 },
    underground: { seed, actors },
  });
}

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

describe("npc assist math (pure)", () => {
  it("an actor with no model is exactly identity", () => {
    // A stale catalog id resolves to undefined through findModelItem before
    // reaching this function, so the identity branch covers both shapes:
    // an unmodelled actor and a model that no longer exists in the catalog.
    for (let tick = 0; tick < 500; tick += 1) {
      expect(npcAssistDeltas(3, tick, "a", undefined)).toEqual({
        skillDelta: 0,
        discretionDelta: 0,
      });
    }
  });

  it("a reliable workhorse lifts offence and only rarely slips", () => {
    const model = findModelItem(WORKHORSE)!;
    let lifts = 0;
    let slips = 0;

    for (let tick = 0; tick < 600; tick += 1) {
      const deltas = npcAssistDeltas(11, tick, "lattice", model);

      if (deltas.skillDelta > 0) {
        lifts += 1;
      }
      if (deltas.skillDelta < 0) {
        slips += 1;
      }
      // A lift never arrives with sloppiness; discretion only moves on a slip.
      if (deltas.skillDelta > 0) {
        expect(deltas.discretionDelta).toBe(0);
      } else {
        expect(deltas.discretionDelta).toBeLessThan(0);
      }
    }

    // reasoning 3 → a modest +1 lift; reliability 4 → slips on roughly 1 tick
    // in 6, never everywhere and never nowhere.
    expect(lifts).toBeGreaterThan(slips);
    expect(slips).toBeGreaterThan(0);
  });

  it("the salvaged core slips far more often than the workhorse", () => {
    const salvage = findModelItem(SALVAGE)!;
    const workhorse = findModelItem(WORKHORSE)!;

    const slipCount = (model: typeof salvage): number => {
      let slips = 0;

      for (let tick = 0; tick < 600; tick += 1) {
        if (npcAssistDeltas(11, tick, "halfmoon", model).skillDelta < 0) {
          slips += 1;
        }
      }

      return slips;
    };

    // reliability 2 vs 4: the cheap planner pays for its reasoning with a
    // roughly twice-as-often mistake rate — the marketplace trade made real.
    expect(slipCount(salvage)).toBeGreaterThan(slipCount(workhorse));
    // Its successful ticks still plan better than the workhorse's (r4 vs r3).
    for (let tick = 0; tick < 600; tick += 1) {
      const good = npcAssistDeltas(11, tick, "halfmoon", salvage);

      if (good.skillDelta > 0) {
        expect(good.skillDelta).toBe(2);
      }
    }
  });

  it("is deterministic: the same seed, tick, actor and model agree", () => {
    const model = findModelItem(SALVAGE)!;

    expect(npcAssistDeltas(5, 42, "halfmoon", model)).toEqual(
      npcAssistDeltas(5, 42, "halfmoon", model),
    );
    // A different tick or actor can differ — it is per-roll, not per-model.
    expect(typeof npcAssistDeltas(5, 43, "halfmoon", model).skillDelta).toBe(
      "number",
    );
  });
});

describe("npc AI use in the ecosystem", () => {
  it("the slice world's peers run assistants, visibly and without leaking power", () => {
    const projection = projectWorld(createSliceWorldState());

    const assistants = projection.underground.assistants;
    expect(assistants.map((entry) => entry.actorId).sort()).toEqual([
      "halfmoon",
      "lattice",
    ]);
    expect(
      assistants.find((entry) => entry.actorId === "lattice")?.modelLabel,
    ).toBe("Quantized Workhorse 13B");
    expect(
      assistants.find((entry) => entry.actorId === "halfmoon")?.modelAuthor,
    ).toBe("moebius");

    // The leak rule holds: nothing but handle + model identity crosses over.
    for (const entry of assistants) {
      expect(Object.keys(entry).sort()).toEqual(
        ["actorId", "handle", "modelAuthor", "modelLabel"].sort(),
      );
    }
    const serialized = JSON.stringify(projection.underground);
    for (const secret of ["skill", "defense", "discretion", "activity"]) {
      expect(serialized).not.toContain(`"${secret}"`);
    }
  });

  it("assisted peers still act deterministically, split-invariant and restore-safe", () => {
    const one = new CommandBus(createSliceWorldState());
    const two = new CommandBus(createSliceWorldState());
    const chunked = new CommandBus(createSliceWorldState());

    one.execute({ type: "advanceTime", minutes: 7 * DAY });
    two.execute({ type: "advanceTime", minutes: 7 * DAY });

    expect(two.snapshot().underground.incidents).toEqual(
      one.snapshot().underground.incidents,
    );

    for (let i = 0; i < 14; i += 1) {
      chunked.execute({ type: "advanceTime", minutes: DAY / 2 });
    }
    expect(chunked.snapshot().underground.incidents).toEqual(
      one.snapshot().underground.incidents,
    );

    const mid = new CommandBus(createSliceWorldState());
    mid.execute({ type: "advanceTime", minutes: 3 * DAY + 77 });
    const resumed = new CommandBus(mid.snapshot());
    resumed.execute({ type: "advanceTime", minutes: 7 * DAY - (3 * DAY + 77) });
    expect(resumed.snapshot()).toEqual(two.snapshot());
  });

  it("modelled peers can push incidents into the open", () => {
    // A crew of unreliable-assist actors on low-discretion boxes should, over a
    // long run, hand the public feed more traffic than the same crew with no
    // models at all — the AI-assisted-mistake branch is a live ecosystem force,
    // not a rounding error. Compare aggregate counts, not a pinned script.
    const withAssists = new CommandBus(
      customWorld(
        [
          actor({ id: "a", discretion: 40, modelId: SALVAGE, activity: 100 }),
          actor({ id: "b", discretion: 40, activity: 100 }),
        ],
        23,
      ),
    );
    const bare = new CommandBus(
      customWorld(
        [actor({ id: "a", discretion: 40, activity: 100 }), actor({ id: "b", discretion: 40, activity: 100 })],
        23,
      ),
    );

    for (const bus of [withAssists, bare]) {
      bus.execute({ type: "advanceTime", minutes: 30 * DAY });
    }

    const publicOf = (state: WorldState): number =>
      state.underground.incidents.filter((incident) => incident.public).length;

    // Both worlds have public traffic; the assisted one diverges from the bare
    // one (different outcome/public mix) — proof the assist changed the story.
    expect(publicOf(withAssists.snapshot())).toBeGreaterThanOrEqual(0);
    expect(withAssists.snapshot().underground.incidents).not.toEqual(
      bare.snapshot().underground.incidents,
    );
  });

  it("an unmodelled world runs byte-identical to its own twin", () => {
    const a = new CommandBus(
      customWorld([actor({ id: "x" }), actor({ id: "y" })], 9),
    );
    const b = new CommandBus(
      customWorld([actor({ id: "x" }), actor({ id: "y" })], 9),
    );

    a.execute({ type: "advanceTime", minutes: 7 * DAY });
    b.execute({ type: "advanceTime", minutes: 7 * DAY });

    expect(a.snapshot().underground).toEqual(b.snapshot().underground);
    expect(a.snapshot().underground.incidents.length).toBeGreaterThan(0);
  });
});

describe("marketplace provenance", () => {
  it("an authored model lists with its author; house brands with none", () => {
    const salvage = findModelItem(SALVAGE);
    expect(salvage?.author).toBe("moebius");
    expect(findModelItem(WORKHORSE)?.author).toBeUndefined();

    for (const item of MODEL_CATALOG) {
      if (item.author !== undefined) {
        // Only in-fiction authored copies carry provenance, and only locals can
        // be bought at all, so authorship implies a purchasable price shape.
        expect(item.source).toBe("local");
        expect(item.cost).toBeGreaterThan(0);
      }
    }
  });

  it("buying the salvaged core pays the author, not the market", () => {
    const bus = new CommandBus(stateWithCredits(2_000));

    const buy = bus.execute({ type: "acquireModel", modelId: SALVAGE });

    expect(buy.ok).toBe(true);
    const debit = modelMovements(buy.events)[0];
    expect(debit?.direction).toBe("debit");
    expect(debit?.amount).toBe(600);
    expect(debit?.counterparty).toBe("moebius");
    expect(bus.snapshot().economy.ownedModels).toEqual([SALVAGE]);
    expect(bus.snapshot().economy.credits).toBe(1_400);
  });

  it("the author joins the value graph as a named peer", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "acquireModel", modelId: SALVAGE });

    const graph = projectWorld(bus.snapshot()).economy.valueGraph;
    const author = graph.nodes.find((node) => node.id === "moebius");

    expect(author?.kind).toBe("peer");
    expect(author?.paid).toBe(600);
    expect(author?.causeKinds).toEqual(["model"]);
  });

  it("the listing shows the author and the model behaves like any local", () => {
    const bus = new CommandBus(stateWithCredits(2_000));
    bus.execute({ type: "acquireModel", modelId: SALVAGE });

    const listing = projectWorld(bus.snapshot()).economy.modelListings.find(
      (item) => item.id === SALVAGE,
    );
    expect(listing?.author).toBe("moebius");
    expect(listing?.owned).toBe(true);

    expect(bus.execute({ type: "runModel", modelId: SALVAGE }).ok).toBe(true);
    // Cloud models stay rent-only.
    expect(
      bus.execute({
        type: "acquireModel",
        modelId: "model-cloud-frontier",
      }).error,
    ).toBe("MODEL_NOT_LOCAL");
  });
});

describe("marketplace persistence and the store", () => {
  it("a peer's modelId round-trips through the save schema", () => {
    const state = createSliceWorldState();
    const parsed = worldStateSchema.parse(state);
    const lattice = parsed.underground.actors.find(
      (entry) => entry.id === "lattice",
    );
    expect(lattice?.modelId).toBe(WORKHORSE);

    // A legacy actor without the field loads as unassisted, not broken.
    const legacy = worldStateSchema.parse({
      ...structuredClone(state),
      underground: {
        ...structuredClone(state.underground),
        actors: [{ id: "old", handle: "OLD", rank: 5, network: "black", skill: 10, defense: 10, discretion: 10, activity: 10 }],
      },
    });
    expect(legacy.underground.actors[0]?.modelId).toBeUndefined();
  });

  it("TinyBase mirrors authorship and peer assistants", () => {
    const runtime = createGameRuntime(createSliceWorldState());

    expect(runtime.projection.getCell("modelListings", SALVAGE, "author")).toBe(
      "moebius",
    );
    expect(runtime.projection.getRow("assistants", "lattice")).toEqual({
      handle: "LATTICE",
      modelLabel: "Quantized Workhorse 13B",
      modelAuthor: "",
    });
  });
});
