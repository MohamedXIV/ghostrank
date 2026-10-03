import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  createInitialWorldState,
  type UndergroundActor,
  type WorldState,
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
    activity: 60,
    ...overrides,
  };
}

function rumorWorld(seed = 3): WorldState {
  return createInitialWorldState({
    player: { handle: "CobaltXZ", rank: 100_000 },
    underground: {
      seed,
      playerNetwork: "white",
      actors: [
        actor({ id: "a", network: "black", activity: 100 }),
        actor({ id: "b", network: "black", activity: 100 }),
        actor({ id: "c", network: "white", activity: 0 }),
        actor({ id: "d", network: "white", activity: 0 }),
      ],
    },
  });
}

function summary(state: WorldState) {
  return {
    rumors: state.underground.rumors,
    messages: state.underground.messages,
  };
}

function severeExit(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });
  return bus.execute({ type: "disengageOperation" });
}

describe("rumor leaks", () => {
  it("delivers messages from trusted contacts about private incidents", () => {
    const bus = new CommandBus(rumorWorld());

    const result = wait(bus, 14 * DAY);
    const state = bus.snapshot();

    expect(state.underground.messages.length).toBeGreaterThan(0);
    expect(
      result.events.some((event) => event.type === "MessageDelivered"),
    ).toBe(true);
    expect(
      result.events.some((event) => event.type === "RumorSpread"),
    ).toBe(true);
    for (const message of state.underground.messages) {
      expect(["c", "d"]).toContain(message.fromId);
      expect(message.read).toBe(false);
    }
  });

  it("never leaks public incidents", () => {
    const world = rumorWorld();
    for (const entry of world.underground.actors) {
      entry.discretion = 50;
    }
    const bus = new CommandBus(world);

    wait(bus, 14 * DAY);
    const state = bus.snapshot();

    expect(state.underground.incidents.some((i) => i.public)).toBe(true);
    expect(state.underground.rumors.length).toBeGreaterThan(0);
    const publicIds = new Set(
      state.underground.incidents
        .filter((incident) => incident.public)
        .map((incident) => incident.id),
    );
    for (const rumor of state.underground.rumors) {
      expect(publicIds.has(rumor.sourceId)).toBe(false);
    }
  });

  it("does not let a party relay its own incident", () => {
    const world = createInitialWorldState({
      underground: {
        seed: 5,
        playerNetwork: "white",
        actors: [
          actor({ id: "a", network: "white", activity: 100 }),
          actor({ id: "b", network: "white", activity: 0 }),
          actor({ id: "c", network: "white", activity: 0 }),
        ],
      },
    });
    const bus = new CommandBus(world);

    wait(bus, 20 * DAY);
    const state = bus.snapshot();

    for (const rumor of state.underground.rumors) {
      const incident = state.underground.incidents.find(
        (candidate) => candidate.id === rumor.sourceId,
      );
      expect(incident).toBeDefined();
      expect(rumor.relayId).not.toBe(incident?.actorId);
      expect(rumor.relayId).not.toBe(incident?.counterpartId);
    }
  });

  it("only relays through contacts who trust the player", () => {
    const world = rumorWorld();
    world.underground.relationships = world.underground.relationships.filter(
      (relationship) => relationship.fromId !== "d",
    );
    const bus = new CommandBus(world);

    wait(bus, 14 * DAY);

    for (const message of bus.snapshot().underground.messages) {
      expect(message.fromId).toBe("c");
    }
  });

  it("mixes accurate and distorted rumors", () => {
    const bus = new CommandBus(rumorWorld(9));

    wait(bus, 28 * DAY);
    const rumors = bus.snapshot().underground.rumors;

    expect(rumors.some((rumor) => rumor.accurate)).toBe(true);
    expect(rumors.some((rumor) => !rumor.accurate)).toBe(true);
  });

  it("distorts by flipping the claimed outcome", () => {
    const bus = new CommandBus(rumorWorld(9));

    wait(bus, 28 * DAY);
    const state = bus.snapshot();

    for (const rumor of state.underground.rumors) {
      const incident = state.underground.incidents.find(
        (candidate) => candidate.id === rumor.sourceId,
      );
      if (!rumor.claim || !incident) {
        continue;
      }

      expect(rumor.claim.actorId).toBe(incident.actorId);
      expect(rumor.claim.counterpartId).toBe(incident.counterpartId);
      expect(rumor.claim.outcome === incident.outcome).toBe(rumor.accurate);
    }
  });

  it("is deterministic and rank-independent", () => {
    const one = new CommandBus(rumorWorld(21));
    const two = rumorWorld(21);
    two.player.rank = 1;
    two.underground.actors.forEach((entry, index) => {
      entry.rank = 90_000 - index * 7_000;
    });
    const other = new CommandBus(two);

    wait(one, 14 * DAY);
    wait(other, 14 * DAY);

    expect(summary(one.snapshot()).messages.length).toBeGreaterThan(0);
    expect(summary(one.snapshot())).toEqual(summary(other.snapshot()));
  });

  it("is invariant to how a wait is split", () => {
    const whole = new CommandBus(createSliceWorldState());
    const split = new CommandBus(createSliceWorldState());

    wait(whole, 8 * DAY);
    for (let i = 0; i < 16; i += 1) {
      wait(split, DAY / 2);
    }

    expect(summary(whole.snapshot())).toEqual(summary(split.snapshot()));
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = new CommandBus(createSliceWorldState());
    wait(straight, 10 * DAY);

    const first = new CommandBus(createSliceWorldState());
    wait(first, 4 * DAY + 33);
    const resumed = new CommandBus(first.snapshot());
    wait(resumed, 10 * DAY - (4 * DAY + 33));

    expect(resumed.snapshot()).toEqual(straight.snapshot());
  });
});

describe("player footprint rumor", () => {
  it("lets the owner's network peers lose trust with citable provenance", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = severeExit(bus);
    const state = bus.snapshot();

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RumorSpread",
        kind: "player-footprint",
        sourceId: "reaction:1",
      }),
    );
    for (const peer of ["lattice", "kestrel"]) {
      const relation = state.underground.relationships.find(
        (entry) => entry.fromId === peer && entry.toId === "player",
      );
      expect(relation?.trust).toBe(-5);
    }
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "RelationshipChanged",
        fromId: "lattice",
        toId: "player",
        causeKind: "rumor",
      }),
    );
    expect(
      state.underground.messages.some(
        (message) =>
          state.underground.rumors.find(
            (rumor) => rumor.id === message.rumorId,
          )?.kind === "player-footprint",
      ),
    ).toBe(false);
  });

  it("spreads nothing after a quiet exit", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "disengageOperation" });

    expect(
      bus
        .snapshot()
        .underground.rumors.filter(
          (rumor) => rumor.kind === "player-footprint",
        ),
    ).toEqual([]);
  });
});

describe("readMessage command", () => {
  function withMessage() {
    const bus = new CommandBus(rumorWorld());
    wait(bus, 14 * DAY);
    const first = bus.snapshot().underground.messages[0];
    return { bus, first };
  }

  it("marks a message read without costing world time", () => {
    const { bus, first } = withMessage();
    const minute = bus.snapshot().worldMinute;

    const result = bus.execute({ type: "readMessage", messageId: first.id });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "MessageRead",
        messageId: first.id,
        worldMinute: minute,
      },
    ]);
    expect(bus.snapshot().worldMinute).toBe(minute);
    expect(
      bus
        .snapshot()
        .underground.messages.find((message) => message.id === first.id)?.read,
    ).toBe(true);
  });

  it("fails clearly for unknown and already-read messages", () => {
    const { bus, first } = withMessage();

    expect(
      bus.execute({ type: "readMessage", messageId: "message:9999" }),
    ).toEqual({ ok: false, events: [], error: "MESSAGE_NOT_FOUND" });

    bus.execute({ type: "readMessage", messageId: first.id });

    expect(
      bus.execute({ type: "readMessage", messageId: first.id }),
    ).toEqual({ ok: false, events: [], error: "MESSAGE_ALREADY_READ" });
  });
});

describe("inbox projection", () => {
  it("shows claims and sender but never truth or provenance", () => {
    const bus = new CommandBus(rumorWorld());
    wait(bus, 3 * DAY);

    const inbox = projectWorld(bus.snapshot()).underground.inbox;

    expect(inbox.messages.length).toBeGreaterThan(0);
    expect(inbox.unread).toBe(inbox.messages.length);
    for (const message of inbox.messages) {
      expect(Object.keys(message).sort()).toEqual(
        [
          "claimActorHandle",
          "claimCounterpartHandle",
          "claimOutcome",
          "fromHandle",
          "id",
          "read",
          "worldMinute",
        ].sort(),
      );
    }
    const serialized = JSON.stringify(inbox);
    for (const secret of ["accurate", "incidentId", "rumorId", "sourceId"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("orders newest first and caps the list", () => {
    const bus = new CommandBus(rumorWorld(31));
    wait(bus, 60 * DAY);
    const state = bus.snapshot();

    const inbox = projectWorld(state).underground.inbox;
    const minutes = inbox.messages.map((message) => message.worldMinute);

    expect(state.underground.messages.length).toBeGreaterThan(30);
    expect(inbox.messages).toHaveLength(30);
    expect(minutes).toEqual([...minutes].sort((a, b) => b - a));
    expect(inbox.unread).toBe(
      state.underground.messages.filter((message) => !message.read).length,
    );
  });

  it("syncs into TinyBase and drops unread count after reading", () => {
    const runtime = createGameRuntime(rumorWorld());
    runtime.execute({ type: "advanceTime", minutes: 3 * DAY });

    const ids = Object.keys(runtime.projection.getTable("inbox"));
    expect(ids.length).toBeGreaterThan(0);
    const before = Number(
      runtime.projection.getCell("meta", "inbox", "unread"),
    );
    expect(before).toBe(ids.length);

    runtime.execute({ type: "readMessage", messageId: ids[0] });

    expect(
      Number(runtime.projection.getCell("meta", "inbox", "unread")),
    ).toBe(before - 1);
    expect(runtime.projection.getCell("inbox", ids[0], "read")).toBe(true);
  });
});
