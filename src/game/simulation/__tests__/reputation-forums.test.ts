import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  createInitialWorldState,
  type UndergroundActor,
  type UndergroundContract,
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
    discretion: 50,
    activity: 100,
    ...overrides,
  };
}

function chatterWorld(seed = 5): WorldState {
  return createInitialWorldState({
    player: { handle: "CobaltXZ", rank: 100_000 },
    underground: {
      seed,
      playerNetwork: "white",
      actors: [
        actor({ id: "a", network: "black" }),
        actor({ id: "b", network: "black" }),
        actor({ id: "c", network: "black" }),
        actor({ id: "d", network: "white" }),
        actor({ id: "e", network: "white" }),
        actor({ id: "f", network: "white" }),
      ],
    },
  });
}

function grudgeWorld(grudge: number, seed = 7): WorldState {
  const world = createInitialWorldState({
    player: { handle: "CobaltXZ", rank: 100_000 },
    underground: {
      seed,
      playerNetwork: "white",
      actors: [
        actor({ id: "foe", network: "black", activity: 0 }),
        actor({ id: "a", network: "white", activity: 0 }),
        actor({ id: "b", network: "white", activity: 0 }),
        actor({ id: "c", network: "black", activity: 0 }),
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

function contract(
  overrides: Partial<UndergroundContract> = {},
): UndergroundContract {
  return {
    id: "contract:1",
    issuerId: "vesper",
    targetId: "nightshade",
    objective: "recon-report",
    requiredServices: 1,
    status: "completed",
    offeredWorldMinute: 0,
    expiresWorldMinute: DAY,
    acceptedWorldMinute: 0,
    dueWorldMinute: 2 * DAY,
    resolvedWorldMinute: DAY,
    ...overrides,
  };
}

function withContracts(...contracts: UndergroundContract[]): WorldState {
  const state = createSliceWorldState();
  state.underground.contracts.push(...contracts);
  return state;
}

function descriptorIds(state: WorldState): string[] {
  return projectWorld(state)
    .descriptors.map((entry) => entry.id)
    .sort();
}

describe("reputation descriptors", () => {
  it("starts with none", () => {
    expect(projectWorld(createSliceWorldState()).descriptors).toEqual([]);
  });

  it("calls a reliable deliverer a Professional, with context and basis", () => {
    const state = withContracts(
      contract(),
      contract({ id: "contract:2" }),
    );

    expect(projectWorld(state).descriptors).toEqual([
      {
        id: "professional",
        label: "Professional",
        context: "contracts",
        basis: 2,
      },
    ]);
  });

  it("needs two deliveries before Professional", () => {
    expect(descriptorIds(withContracts(contract()))).toEqual([]);
  });

  it("calls someone who misses accepted contracts an Opportunist, never a Professional", () => {
    const state = withContracts(
      contract(),
      contract({ id: "contract:2" }),
      contract({ id: "contract:3", status: "expired" }),
    );

    expect(descriptorIds(state)).toEqual(["opportunist"]);
    expect(
      projectWorld(state).descriptors.find((entry) => entry.id === "opportunist")
        ?.basis,
    ).toBe(1);
  });

  it("does not punish an offer that was simply ignored", () => {
    const state = withContracts(
      contract({
        status: "expired",
        acceptedWorldMinute: undefined,
        dueWorldMinute: undefined,
      }),
    );

    expect(descriptorIds(state)).toEqual([]);
  });

  it("calls whoever delivers an intrusion a Hunter", () => {
    const state = withContracts(contract({ objective: "intrusion" }));

    expect(projectWorld(state).descriptors).toEqual([
      { id: "hunter", label: "Hunter", context: "intrusions", basis: 1 },
    ]);
  });

  it("calls repeated escalations a Predator", () => {
    const state = createSliceWorldState();
    for (let index = 0; index < 3; index += 1) {
      state.traces.push({
        id: `trace:${index + 1}`,
        targetId: "nightshade",
        cause: "operation-escalation",
        stage: "intrusive",
        severity: "high",
        weight: 3,
        worldMinute: index,
      });
    }

    expect(projectWorld(state).descriptors).toEqual([
      { id: "predator", label: "Predator", context: "intrusions", basis: 3 },
    ]);
  });

  it("does not depend on rank", () => {
    const low = withContracts(contract(), contract({ id: "contract:2" }));
    const high = withContracts(contract(), contract({ id: "contract:2" }));
    low.player.rank = 1;
    high.player.rank = 999_999;

    expect(projectWorld(low).descriptors).toEqual(
      projectWorld(high).descriptors,
    );
  });

  it("syncs into TinyBase", () => {
    const runtime = createGameRuntime(
      withContracts(contract(), contract({ id: "contract:2" })),
    );

    expect(runtime.projection.getCell("descriptors", "professional", "label")).toBe(
      "Professional",
    );
    expect(runtime.projection.getCell("descriptors", "professional", "basis")).toBe(
      2,
    );
  });
});

describe("forum posts", () => {
  it("lets each network comment on public incidents from its own board", () => {
    const bus = new CommandBus(chatterWorld());

    const result = wait(bus, 7 * DAY);
    const state = bus.snapshot();
    const posts = state.underground.forumPosts;
    const networks = new Map(
      state.underground.actors.map((entry) => [entry.id, entry.network]),
    );

    expect(posts.length).toBeGreaterThan(0);
    expect(result.events.some((event) => event.type === "ForumPosted")).toBe(
      true,
    );
    const seen = new Set<string>();
    for (const post of posts) {
      expect(post.subject.kind).toBe("incident");
      expect(post.board).toBe(networks.get(post.authorId));
      const incident = state.underground.incidents.find(
        (entry) => entry.id === post.subject.id,
      );
      expect(incident?.public).toBe(true);
      expect(post.authorId).not.toBe(incident?.actorId);
      expect(post.authorId).not.toBe(incident?.counterpartId);
      const key = `${post.board}:${post.subject.id}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("is deterministic, rank-independent and split-invariant", () => {
    const one = new CommandBus(chatterWorld(9));
    const harsh = chatterWorld(9);
    harsh.player.rank = 1;
    const other = new CommandBus(harsh);
    const chunked = new CommandBus(chatterWorld(9));

    wait(one, 5 * DAY);
    wait(other, 5 * DAY);
    for (let i = 0; i < 10; i += 1) {
      wait(chunked, DAY / 2);
    }

    const base = one.snapshot().underground.forumPosts;
    expect(base.length).toBeGreaterThan(0);
    expect(other.snapshot().underground.forumPosts).toEqual(base);
    expect(chunked.snapshot().underground.forumPosts).toEqual(base);
  });

  it("resumes identically after a snapshot restore", () => {
    const straight = new CommandBus(chatterWorld(11));
    wait(straight, 6 * DAY);

    const first = new CommandBus(chatterWorld(11));
    wait(first, 2 * DAY + 41);
    const resumed = new CommandBus(first.snapshot());
    wait(resumed, 6 * DAY - (2 * DAY + 41));

    expect(resumed.snapshot()).toEqual(straight.snapshot());
  });

  it("condemns unmasking on both boards", () => {
    const bus = new CommandBus(grudgeWorld(100));

    wait(bus, 28 * DAY);
    const state = bus.snapshot();
    const unmasking = state.underground.retaliations.find(
      (entry) => entry.kind === "unmasking",
    );

    expect(unmasking).toBeDefined();
    if (!unmasking) {
      return;
    }
    const condemnations = state.underground.forumPosts.filter(
      (post) =>
        post.subject.kind === "unmasking" && post.subject.id === unmasking.id,
    );

    expect(condemnations.map((post) => post.board).sort()).toEqual([
      "black",
      "white",
    ]);
    for (const post of condemnations) {
      expect(post.authorId).not.toBe("foe");
      expect(post.worldMinute).toBe(unmasking.worldMinute);
    }
  });

  it("vouches publicly when the player delivers a contract", () => {
    const bus = new CommandBus(
      withContracts(
        contract({
          status: "offered",
          acceptedWorldMinute: undefined,
          dueWorldMinute: undefined,
          resolvedWorldMinute: undefined,
        }),
      ),
    );
    bus.execute({ type: "acceptContract", contractId: "contract:1" });
    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });

    const result = bus.execute({ type: "deliverContract", contractId: "contract:1" });

    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "ForumPosted",
        board: "white",
        authorId: "vesper",
        subjectKind: "contract",
        subjectId: "contract:1",
      }),
    );
  });
});

describe("forum projection", () => {
  it("shows only the player's own network board, structured and newest first", () => {
    const bus = new CommandBus(chatterWorld());
    wait(bus, 7 * DAY);
    const state = bus.snapshot();

    const forum = projectWorld(state).underground.forum;
    const minutes = forum.map((post) => post.worldMinute);

    expect(forum.length).toBeGreaterThan(0);
    expect(minutes).toEqual([...minutes].sort((a, b) => b - a));
    for (const post of forum) {
      expect(post.board).toBe("white");
      expect(["d", "e", "f"]).toContain(post.authorHandle.toLowerCase());
      expect(post.subject.kind).toBe("incident");
    }
    expect(
      state.underground.forumPosts.some((post) => post.board === "black"),
    ).toBe(true);
    expect(JSON.stringify(forum)).not.toContain("authorId");
  });

  it("shows nothing without a network", () => {
    const state = chatterWorld();
    state.underground.playerNetwork = null;
    const bus = new CommandBus(state);
    wait(bus, 3 * DAY);

    expect(projectWorld(bus.snapshot()).underground.forum).toEqual([]);
  });

  it("syncs into TinyBase", () => {
    const runtime = createGameRuntime(chatterWorld());
    runtime.execute({ type: "advanceTime", minutes: 3 * DAY });

    const ids = Object.keys(runtime.projection.getTable("forum"));
    expect(ids.length).toBeGreaterThan(0);
    expect(runtime.projection.getCell("forum", ids[0], "board")).toBe("white");
  });
});

describe("forum persistence schema", () => {
  const base = {
    worldMinute: 0,
    player: { handle: "CobaltXZ", rank: 100256 },
    targets: [],
  };
  const underground = (forumPosts?: unknown[]) => ({
    seed: 1,
    lastTickMinute: 0,
    playerNetwork: null,
    ...(forumPosts ? { forumPosts } : {}),
  });

  it("loads older ecosystems without posts", () => {
    expect(
      worldStateSchema.parse({ ...base, underground: underground() })
        .underground.forumPosts,
    ).toEqual([]);
  });

  it("round-trips and rejects unknown shapes", () => {
    const post = {
      id: "forum:1",
      board: "white",
      authorId: "vesper",
      subject: { kind: "incident", id: "incident:1" },
      worldMinute: 360,
    };

    expect(
      worldStateSchema.parse({ ...base, underground: underground([post]) })
        .underground.forumPosts,
    ).toEqual([post]);
    for (const patch of [
      { board: "grey" },
      { subject: { kind: "gossip", id: "x" } },
    ]) {
      expect(
        worldStateSchema.safeParse({
          ...base,
          underground: underground([{ ...post, ...patch }]),
        }).success,
      ).toBe(false);
    }
  });
});
