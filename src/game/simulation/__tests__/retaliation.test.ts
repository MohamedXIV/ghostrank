import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  createInitialWorldState,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

/** Waits in <= 7 day steps so each command stays small (D054). */
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

function actor(
  overrides: Partial<UndergroundActor> & Pick<UndergroundActor, "id">,
): UndergroundActor {
  return {
    handle: overrides.id.toUpperCase(),
    rank: 1_000,
    network: "white",
    skill: 60,
    defense: 50,
    discretion: 100,
    activity: 0,
    ...overrides,
  };
}

function grudgeWorld(grudge: number, seed = 7): WorldState {
  const world = createInitialWorldState({
    player: { handle: "CobaltXZ", rank: 100_000 },
    underground: {
      seed,
      playerNetwork: "white",
      actors: [
        actor({ id: "foe", network: "black", rank: 2_000 }),
        actor({ id: "a", network: "white" }),
        actor({ id: "b", network: "white" }),
        actor({ id: "c", network: "black" }),
      ],
    },
  });
  world.underground.relationships.push({
    id: "rel:foe>player",
    fromId: "foe",
    toId: "player",
    trust: -20,
    fear: 0,
    grudge,
    updatedWorldMinute: 0,
  });
  return world;
}

function relation(state: WorldState, fromId: string, toId: string) {
  return state.underground.relationships.find(
    (entry) => entry.fromId === fromId && entry.toId === toId,
  );
}

function severeRun(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });
}

describe("provocation", () => {
  it("raises grudge when escalating against a target that is already watching", () => {
    const bus = new CommandBus(createSliceWorldState());

    severeRun(bus);
    bus.execute({ type: "disengageOperation" });
    expect(relation(bus.snapshot(), "nightshade", "player")?.grudge).toBe(15);

    bus.execute({ type: "openOperation", targetId: "nightshade" });
    const result = bus.execute({ type: "escalateOperation" });

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RelationshipChanged",
        fromId: "nightshade",
        toId: "player",
        grudge: 40,
        causeKind: "intrusion",
      }),
    );
    expect(relation(bus.snapshot(), "nightshade", "player")?.grudge).toBe(40);
  });

  it("does not provoke on the first escalation", () => {
    const bus = new CommandBus(createSliceWorldState());

    severeRun(bus);

    expect(
      bus
        .snapshot()
        .underground.relationships.some((entry) => entry.grudge >= 25),
    ).toBe(false);
  });
});

describe("retaliation", () => {
  it("does nothing below the grudge threshold", () => {
    const bus = new CommandBus(grudgeWorld(25));

    wait(bus, 28 * DAY);

    expect(bus.snapshot().underground.retaliations).toEqual([]);
    expect(bus.snapshot().player.rank).toBe(100_000);
  });

  it("smears the player, spending grudge, with provenance", () => {
    const bus = new CommandBus(grudgeWorld(45));

    const result = wait(bus, 28 * DAY);
    const state = bus.snapshot();
    const smears = state.underground.retaliations;

    expect(smears.length).toBeGreaterThan(0);
    for (const entry of smears) {
      expect(entry).toMatchObject({ actorId: "foe", kind: "smear" });
    }
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "PlayerRankChanged",
        causeKind: "retaliation",
        causeId: smears[0].id,
      }),
    );
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RelationshipChanged",
        fromId: "foe",
        toId: "player",
        causeKind: "retaliation",
        causeId: smears[0].id,
      }),
    );
    expect(state.player.rank).toBeGreaterThan(100_000);
    expect(relation(state, "foe", "player")?.grudge).toBe(
      45 - 10 * smears.length,
    );
  });

  it("makes unmasking a taboo the community punishes", () => {
    const bus = new CommandBus(grudgeWorld(100));

    const result = wait(bus, 28 * DAY);
    const state = bus.snapshot();
    const unmasking = state.underground.retaliations.find(
      (entry) => entry.kind === "unmasking",
    );

    expect(unmasking).toBeDefined();
    if (!unmasking) {
      return;
    }

    for (const other of ["a", "b", "c"]) {
      expect(result.events).toContainEqual(
        expect.objectContaining({
          type: "RelationshipChanged",
          fromId: other,
          toId: "foe",
          causeKind: "unmasking",
          causeId: unmasking.id,
        }),
      );
      expect(result.events).toContainEqual(
        expect.objectContaining({
          type: "RelationshipChanged",
          fromId: other,
          toId: "player",
          causeKind: "unmasking",
          causeId: unmasking.id,
        }),
      );
    }
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "PlayerRankChanged",
        causeKind: "retaliation",
        causeId: unmasking.id,
      }),
    );
    const unmaskerPenalty = result.events.find(
      (event) =>
        event.type === "ActorRankChanged" &&
        event.actorId === "foe" &&
        event.incidentId === unmasking.id,
    );
    expect(unmaskerPenalty).toBeDefined();
    if (unmaskerPenalty?.type === "ActorRankChanged") {
      expect(unmaskerPenalty.toRank - unmaskerPenalty.fromRank).toBe(
        Math.max(1, Math.floor(unmaskerPenalty.fromRank * 0.05)),
      );
    }
  });

  it("is deterministic, rank-independent and split-invariant", () => {
    const one = new CommandBus(grudgeWorld(100, 11));
    const harsh = grudgeWorld(100, 11);
    harsh.player.rank = 1;
    for (const entry of harsh.underground.actors) {
      entry.rank = entry.rank * 5 + 3;
    }
    const other = new CommandBus(harsh);
    const chunked = new CommandBus(grudgeWorld(100, 11));

    wait(one, 14 * DAY);
    wait(other, 14 * DAY);
    for (let i = 0; i < 28; i += 1) {
      wait(chunked, DAY / 2);
    }

    const base = one.snapshot().underground.retaliations;
    expect(base.length).toBeGreaterThan(0);
    expect(other.snapshot().underground.retaliations).toEqual(base);
    expect(chunked.snapshot().underground.retaliations).toEqual(base);
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = new CommandBus(grudgeWorld(100, 13));
    wait(straight, 14 * DAY);

    const first = new CommandBus(grudgeWorld(100, 13));
    wait(first, 5 * DAY + 41);
    const resumed = new CommandBus(first.snapshot());
    wait(resumed, 14 * DAY - (5 * DAY + 41));

    expect(resumed.snapshot()).toEqual(straight.snapshot());
  });

  it("never blocks acting on a target", () => {
    const state = createSliceWorldState();
    state.underground.relationships.push({
      id: "rel:nightshade>player",
      fromId: "nightshade",
      toId: "player",
      trust: -100,
      fear: 0,
      grudge: 100,
      updatedWorldMinute: 0,
    });
    const bus = new CommandBus(state);
    wait(bus, 7 * DAY);

    expect(
      bus.execute({ type: "observeTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
    expect(
      bus.execute({ type: "openOperation", targetId: "nightshade" }).ok,
    ).toBe(true);
  });
});

describe("retaliation projection", () => {
  it("shows who struck and when, never raw grudge", () => {
    const bus = new CommandBus(grudgeWorld(45));
    wait(bus, 28 * DAY);

    const heat = projectWorld(bus.snapshot()).underground.retaliations;
    const minutes = heat.map((entry) => entry.worldMinute);

    expect(heat.length).toBeGreaterThan(0);
    expect(minutes).toEqual([...minutes].sort((a, b) => b - a));
    for (const entry of heat) {
      expect(Object.keys(entry).sort()).toEqual(
        ["actorHandle", "id", "kind", "worldMinute"].sort(),
      );
      expect(entry.actorHandle).toBe("FOE");
    }
    expect(JSON.stringify(heat)).not.toContain("grudge");
  });

  it("syncs into TinyBase", () => {
    const runtime = createGameRuntime(grudgeWorld(45));
    for (let i = 0; i < 4; i += 1) {
      runtime.execute({ type: "advanceTime", minutes: 7 * DAY });
    }

    const ids = Object.keys(runtime.projection.getTable("retaliations"));
    expect(ids.length).toBeGreaterThan(0);
    expect(runtime.projection.getCell("retaliations", ids[0], "kind")).toBe(
      "smear",
    );
  });
});

describe("retaliation persistence schema", () => {
  const base = {
    worldMinute: 0,
    player: { handle: "CobaltXZ", rank: 100256 },
    targets: [],
  };
  const underground = (retaliations?: unknown[]) => ({
    seed: 1,
    lastTickMinute: 0,
    playerNetwork: null,
    ...(retaliations ? { retaliations } : {}),
  });

  it("loads older ecosystems without retaliations", () => {
    expect(
      worldStateSchema.parse({ ...base, underground: underground() })
        .underground.retaliations,
    ).toEqual([]);
  });

  it("round-trips and rejects unknown kinds", () => {
    const entries = [
      { id: "retaliation:1", actorId: "foe", kind: "smear", worldMinute: 360 },
      {
        id: "retaliation:2",
        actorId: "foe",
        kind: "unmasking",
        worldMinute: 720,
      },
    ];

    expect(
      worldStateSchema.parse({ ...base, underground: underground(entries) })
        .underground.retaliations,
    ).toEqual(entries);
    expect(
      worldStateSchema.safeParse({
        ...base,
        underground: underground([{ ...entries[0], kind: "doxx" }]),
      }).success,
    ).toBe(false);
  });
});
