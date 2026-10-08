import { describe, expect, it } from "vitest";

import {
  CommandBus,
  MAX_ADVANCE_MINUTES,
} from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { TICK_MINUTES } from "@/game/simulation/systems/underground";
import {
  createInitialWorldState,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

function wait(bus: CommandBus, minutes: number) {
  return bus.execute({ type: "advanceTime", minutes });
}

function outcomes(state: WorldState) {
  return state.underground.incidents.map((incident) => ({
    actorId: incident.actorId,
    counterpartId: incident.counterpartId,
    outcome: incident.outcome,
    worldMinute: incident.worldMinute,
  }));
}

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

function customWorld(
  actors: UndergroundActor[],
  seed = 7,
  playerRank = 100_000,
): WorldState {
  return createInitialWorldState({
    player: { handle: "CobaltXZ", rank: playerRank },
    underground: { seed, actors },
  });
}

function severeExit(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });
  return bus.execute({ type: "disengageOperation" });
}

describe("underground NPC activity", () => {
  it("creates incidents without any player action", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = wait(bus, 7 * DAY);

    expect(result.ok).toBe(true);
    expect(bus.snapshot().underground.incidents.length).toBeGreaterThan(0);
    expect(
      result.events.some((event) => event.type === "UndergroundActivity"),
    ).toBe(true);
    expect(bus.snapshot().operation).toBeNull();
    expect(bus.snapshot().evidence).toEqual([]);
  });

  it("is deterministic for the same seed and commands", () => {
    const a = new CommandBus(createSliceWorldState());
    const b = new CommandBus(createSliceWorldState());

    const eventsA = wait(a, 5 * DAY).events;
    const eventsB = wait(b, 5 * DAY).events;

    expect(eventsA).toEqual(eventsB);
    expect(a.snapshot()).toEqual(b.snapshot());
  });

  it("changes the story when the world seed changes", () => {
    const actors = [
      actor({ id: "a" }),
      actor({ id: "b" }),
      actor({ id: "c" }),
    ];
    const one = new CommandBus(customWorld(actors, 1));
    const two = new CommandBus(customWorld(actors, 2));

    wait(one, 7 * DAY);
    wait(two, 7 * DAY);

    expect(outcomes(one.snapshot())).not.toEqual(outcomes(two.snapshot()));
  });

  it("never lets rank influence who acts or who wins", () => {
    const base = [
      actor({ id: "a", rank: 5 }),
      actor({ id: "b", rank: 90_000 }),
      actor({ id: "c", rank: 400 }),
    ];
    const swapped = [
      actor({ id: "a", rank: 80_000 }),
      actor({ id: "b", rank: 3 }),
      actor({ id: "c", rank: 12_000 }),
    ];

    const one = new CommandBus(customWorld(base, 11, 1));
    const two = new CommandBus(customWorld(swapped, 11, 999_999));

    wait(one, 10 * DAY);
    wait(two, 10 * DAY);

    expect(outcomes(one.snapshot()).length).toBeGreaterThan(0);
    expect(outcomes(one.snapshot())).toEqual(outcomes(two.snapshot()));
  });

  it("moves rank as an output while keeping ranks positive", () => {
    const bus = new CommandBus(
      customWorld([
        actor({ id: "a", rank: 2, skill: 95, defense: 5, activity: 100 }),
        actor({ id: "b", rank: 2, skill: 10, defense: 10, activity: 0 }),
      ]),
    );

    const result = wait(bus, 4 * DAY);
    const rankEvents = result.events.filter(
      (event) => event.type === "ActorRankChanged",
    );

    expect(rankEvents.length).toBeGreaterThan(0);
    for (const actorState of bus.snapshot().underground.actors) {
      expect(Number.isInteger(actorState.rank)).toBe(true);
      expect(actorState.rank).toBeGreaterThanOrEqual(1);
    }
    const [a, b] = bus.snapshot().underground.actors;
    expect(a.rank).toBeLessThan(b.rank);
  });

  it("keeps a linked operation target's rank in sync with its actor", () => {
    const bus = new CommandBus(createSliceWorldState());

    wait(bus, 14 * DAY);

    const state = bus.snapshot();
    for (const linked of state.underground.actors.filter(
      (candidate) => candidate.targetId,
    )) {
      const target = state.targets.find(
        (candidate) => candidate.id === linked.targetId,
      );

      expect(target?.rank).toBe(linked.rank);
    }
  });

  it("is invariant to how a wait is split", () => {
    const whole = new CommandBus(createSliceWorldState());
    const chunks = new CommandBus(createSliceWorldState());
    const ticks = new CommandBus(createSliceWorldState());

    wait(whole, 3 * DAY);
    for (let i = 0; i < 6; i += 1) {
      wait(chunks, DAY / 2);
    }
    for (let i = 0; i < 3 * DAY; i += 15) {
      wait(ticks, 15);
    }

    expect(outcomes(whole.snapshot())).toEqual(outcomes(chunks.snapshot()));
    expect(outcomes(whole.snapshot())).toEqual(outcomes(ticks.snapshot()));
    expect(whole.snapshot().underground).toEqual(
      chunks.snapshot().underground,
    );
  });

  it("queues a huge wait as a clock job instead of truncating or refusing it (D055)", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = wait(bus, 5_000_000);
    const state = bus.snapshot();
    // System jobs (upkeep, builds, releases) share the queue but hold no clock,
    // so this asserts only the player's time job.
    const running = state.jobQueue.jobs.filter(
      (job) => job.status === "running" && job.resource === "clock",
    );

    expect(result.ok).toBe(true);
    expect(state.worldMinute).toBe(MAX_ADVANCE_MINUTES);
    expect(running).toEqual([
      expect.objectContaining({
        kind: "wait",
        resource: "clock",
        dueWorldMinute: 5_000_000,
      }),
    ]);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "TimeJobStarted",
        kind: "wait",
        targetWorldMinute: 5_000_000,
      }),
    );
  });

  it("processes every boundary of a wait at the horizon limit (D054)", () => {
    const whole = new CommandBus(createSliceWorldState());
    expect(wait(whole, MAX_ADVANCE_MINUTES).ok).toBe(true);

    const daily = new CommandBus(createSliceWorldState());
    for (let elapsed = 0; elapsed < MAX_ADVANCE_MINUTES; elapsed += DAY) {
      wait(daily, DAY);
    }

    expect(whole.snapshot().underground).toEqual(daily.snapshot().underground);
    expect(
      whole
        .snapshot()
        .underground.incidents.every(
          (incident) => incident.worldMinute % TICK_MINUTES === 0,
        ),
    ).toBe(true);
  });

  it("emits chronologically ordered activity", () => {
    const bus = new CommandBus(createSliceWorldState());

    const minutes = wait(bus, 6 * DAY)
      .events.filter((event) => event.type === "UndergroundActivity")
      .map((event) => event.worldMinute);

    expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
  });

  it("does nothing for a world without an ecosystem", () => {
    const bus = new CommandBus(createInitialWorldState());

    const result = wait(bus, 3 * DAY);

    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.type).toBe("WorldTimeAdvanced");
    expect(bus.snapshot().underground.incidents).toEqual([]);
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = new CommandBus(createSliceWorldState());
    wait(straight, 6 * DAY);

    const first = new CommandBus(createSliceWorldState());
    wait(first, 2 * DAY + 77);
    const resumed = new CommandBus(first.snapshot());
    wait(resumed, 6 * DAY - (2 * DAY + 77));

    expect(resumed.snapshot()).toEqual(straight.snapshot());
  });
});

describe("underground relationships", () => {
  it("records provenance for NPC-to-NPC relationship changes", () => {
    const bus = new CommandBus(
      customWorld([
        actor({ id: "a", skill: 95, defense: 5, activity: 100 }),
        actor({ id: "b", skill: 5, defense: 5, activity: 0 }),
      ]),
    );

    const result = wait(bus, DAY);
    const changes = result.events.filter(
      (event) => event.type === "RelationshipChanged",
    );

    expect(changes.length).toBeGreaterThan(0);
    const first = changes[0];
    expect(first?.type === "RelationshipChanged" && first.causeKind).toBe(
      "incident",
    );
    const relation = bus
      .snapshot()
      .underground.relationships.find(
        (candidate) => candidate.fromId === "b" && candidate.toId === "a",
      );
    expect(relation?.grudge).toBeGreaterThan(0);
    expect(relation?.trust).toBeLessThan(0);
  });

  it("clamps relationship dimensions", () => {
    const bus = new CommandBus(
      customWorld([
        actor({ id: "a", skill: 100, defense: 0, activity: 100 }),
        actor({ id: "b", skill: 0, defense: 0, activity: 0 }),
      ]),
    );

    wait(bus, 30 * DAY);

    for (const relation of bus.snapshot().underground.relationships) {
      expect(relation.trust).toBeGreaterThanOrEqual(-100);
      expect(relation.trust).toBeLessThanOrEqual(100);
      expect(relation.fear).toBeGreaterThanOrEqual(-100);
      expect(relation.fear).toBeLessThanOrEqual(100);
      expect(relation.grudge).toBeGreaterThanOrEqual(0);
      expect(relation.grudge).toBeLessThanOrEqual(100);
    }
  });

  it("starts same-network actors with trust toward the player", () => {
    const state = createSliceWorldState();
    const network = state.underground.playerNetwork;

    expect(network).not.toBeNull();
    for (const candidate of state.underground.actors) {
      const relation = state.underground.relationships.find(
        (entry) =>
          entry.fromId === candidate.id && entry.toId === "player",
      );

      if (candidate.network === network) {
        expect(relation?.trust).toBe(20);
      } else {
        expect(relation).toBeUndefined();
      }
    }
  });

  it("turns an observed defensive reaction into a provenance-backed grudge", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = severeExit(bus);

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RelationshipChanged",
        fromId: "nightshade",
        toId: "player",
        causeKind: "reaction",
        causeId: "reaction:1",
      }),
    );
    const relation = bus
      .snapshot()
      .underground.relationships.find(
        (entry) =>
          entry.fromId === "nightshade" && entry.toId === "player",
      );
    expect(relation?.grudge).toBe(15);
  });

  it("leaves a quiet early exit without hostility", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    const result = bus.execute({ type: "disengageOperation" });

    expect(
      result.events.some((event) => event.type === "RelationshipChanged"),
    ).toBe(false);
    expect(
      bus
        .snapshot()
        .underground.relationships.find(
          (entry) =>
            entry.fromId === "nightshade" && entry.toId === "player",
        )?.grudge ?? 0,
    ).toBe(0);
  });

  it("never gates a target on rank", () => {
    const state = createSliceWorldState();
    state.player.rank = 1;
    const nightshade = state.underground.actors.find(
      (candidate) => candidate.id === "nightshade",
    );
    if (nightshade) {
      nightshade.rank = 1;
    }
    const target = state.targets.find((candidate) => candidate.id === "nightshade");
    if (target) {
      target.rank = 1;
    }
    const bus = new CommandBus(state);

    bus.execute({ type: "observeTarget", targetId: "nightshade" });

    expect(
      bus.execute({ type: "openOperation", targetId: "nightshade" }).ok,
    ).toBe(true);
  });
});

describe("underground projection", () => {
  it("publishes a public index with the player included", () => {
    const projection = projectWorld(createSliceWorldState());

    expect(projection.underground.board.length).toBeGreaterThan(2);
    expect(
      projection.underground.board.filter((entry) => entry.isPlayer),
    ).toHaveLength(1);
    const ranks = projection.underground.board.map((entry) => entry.rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("never exposes hidden actor truth", () => {
    const bus = new CommandBus(createSliceWorldState());
    wait(bus, 7 * DAY);

    const projection = projectWorld(bus.snapshot());

    for (const entry of projection.underground.board) {
      expect(Object.keys(entry).sort()).toEqual(
        ["handle", "id", "isPlayer", "rank"].sort(),
      );
    }
    for (const entry of projection.underground.feed) {
      expect(Object.keys(entry).sort()).toEqual(
        [
          "actorHandle",
          "counterpartHandle",
          "id",
          "outcome",
          "worldMinute",
        ].sort(),
      );
    }
    const serialized = JSON.stringify(projection.underground);
    for (const secret of ["skill", "defense", "discretion", "activity"]) {
      expect(serialized).not.toContain(`"${secret}"`);
    }
  });

  it("only publishes public incidents to the feed", () => {
    const bus = new CommandBus(createSliceWorldState());
    wait(bus, 14 * DAY);
    const state = bus.snapshot();

    const feed = projectWorld(state).underground.feed;
    const publicCount = state.underground.incidents.filter(
      (incident) => incident.public,
    ).length;

    expect(state.underground.incidents.length).toBeGreaterThan(publicCount);
    expect(feed).toHaveLength(Math.min(publicCount, 50));
  });

  it("shows a stance only for actors the player has evidence on", () => {
    const bus = new CommandBus(createSliceWorldState());
    expect(projectWorld(bus.snapshot()).underground.stances).toEqual([]);

    severeExit(bus);
    const stances = projectWorld(bus.snapshot()).underground.stances;

    expect(stances).toEqual([
      { actorId: "nightshade", handle: "NIGHTSHADE", stance: "wary" },
    ]);
  });

  it("syncs the projection into TinyBase tables", () => {
    const runtime = createGameRuntime(createSliceWorldState());
    runtime.execute({ type: "advanceTime", minutes: 7 * DAY });

    expect(
      Object.keys(runtime.projection.getTable("board")).length,
    ).toBeGreaterThan(2);
    expect(
      Object.keys(runtime.projection.getTable("feed")).length,
    ).toBeGreaterThan(0);
    expect(runtime.projection.getTable("stances")).toEqual({});

    for (const command of [
      { type: "observeTarget", targetId: "nightshade" },
      { type: "openOperation", targetId: "nightshade" },
      { type: "surveyTarget", targetId: "nightshade" },
      { type: "inspectMachine", machineId: "ns-relay" },
      { type: "escalateOperation" },
      { type: "disengageOperation" },
    ] as const) {
      runtime.execute(command);
    }

    expect(runtime.projection.getTable("stances")).toEqual({
      nightshade: { handle: "NIGHTSHADE", stance: "wary" },
    });
  });
});
