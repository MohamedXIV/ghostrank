import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  RETIREMENT_COMMIT_MINUTES,
  RETIREMENT_COOLING_MINUTES,
  retirementBlockers,
  retirementReady,
  retirementStatus,
} from "@/game/simulation/systems/retirement";
import { physicalThreatPercent } from "@/game/simulation/systems/physical-retaliation";
import {
  PLAYER_ACTOR_ID,
  type WorldState,
} from "@/game/simulation/state/world-state";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import { worldStateSchema } from "@/persistence/world-state-schema";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

const TICK = 360;
const ACTOR_ID = "kestrel";

function blockedWorld(): WorldState {
  const state = createSliceWorldState();
  state.operation = {
    targetId: "nightshade",
    stage: "recon",
    openedWorldMinute: 0,
  };
  state.underground.contracts = [
    {
      id: "contract:1",
      issuerId: "vesper",
      targetId: "nightshade",
      objective: "recon-report",
      requiredServices: 1,
      status: "accepted",
      offeredWorldMinute: 0,
      expiresWorldMinute: 1440,
      acceptedWorldMinute: 0,
      dueWorldMinute: 2880,
    },
  ];
  state.builds = [
    {
      id: "workflow:1",
      specId: "workflow-net-monitor",
      modelId: "model-cloud-frontier",
      startedWorldMinute: 0,
      dueWorldMinute: 600,
      outcome: "clean",
    },
  ];
  state.economy.activeModel = "model-cloud-frontier";
  state.economy.software = ["software-net-monitor"];
  state.economy.housing = "housing-rented-lab";
  return state;
}

function armedCommitWorld(): WorldState {
  const state = createSliceWorldState();
  state.worldMinute = 350;
  state.underground.lastTickMinute = 0;
  state.economy.credits = 0;
  state.economy.housing = null;
  state.probes = [
    {
      id: "probe:retire",
      actorId: ACTOR_ID,
      subject: "dwelling",
      correct: true,
      locationId: "location-baseline-room",
      worldMinute: 0,
    },
  ];

  for (const actor of state.underground.actors) {
    actor.activity = 0;
    delete actor.modelId;
  }

  state.underground.relationships = [
    {
      id: `relationship:${ACTOR_ID}:player`,
      fromId: ACTOR_ID,
      toId: PLAYER_ACTOR_ID,
      trust: 0,
      fear: 0,
      grudge: 100,
      updatedWorldMinute: 0,
    },
  ];

  const actor = state.underground.actors.find((entry) => entry.id === ACTOR_ID);
  if (!actor) {
    throw new Error("slice world lost kestrel");
  }

  const percent = physicalThreatPercent(state, actor);
  for (let seed = 1; seed < 50_000; seed += 1) {
    if (
      hashUnit(seed, "physical-retaliation", "probe:retire", ACTOR_ID) * 100 <
      percent
    ) {
      state.underground.seed = seed;
      return state;
    }
  }

  throw new Error("no deterministic retirement-commit threat seed found");
}

describe("Phase 7 P2 — voluntary retirement plan", () => {
  it("starts idle and legacy saves default to no retirement plan", () => {
    expect(createSliceWorldState().retirement).toBeNull();

    const legacy = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "legacy", rank: 100_000 },
      targets: [],
      knownTargetIds: [],
    });

    expect(legacy.retirement).toBeNull();
  });

  it("rejects a persisted cooling plan that has no frozen deadline", () => {
    const broken = {
      ...createSliceWorldState(),
      retirement: {
        stage: "cooling",
        startedWorldMinute: 0,
      },
    };

    expect(worldStateSchema.safeParse(broken).success).toBe(false);
  });

  it("reports only visible wind-down blockers", () => {
    expect(retirementBlockers(blockedWorld())).toEqual([
      "active-operation",
      "accepted-contract",
      "in-flight-build",
      "active-model",
      "active-software",
      "active-lease",
    ]);
  });

  it("opens a plan without ending the run or changing the clock", () => {
    const bus = new CommandBus(createSliceWorldState());

    const result = bus.execute({ type: "startRetirement" });
    const state = bus.snapshot();

    expect(result).toEqual({
      ok: true,
      events: [{ type: "RetirementPlanned", worldMinute: 0 }],
    });
    expect(state.worldMinute).toBe(0);
    expect(state.retirement).toEqual({
      stage: "planning",
      startedWorldMinute: 0,
    });
    expect(state.ending).toBeNull();
  });

  it("refuses COMMIT while visible obligations remain and spends no time", () => {
    const bus = new CommandBus(blockedWorld());
    bus.execute({ type: "startRetirement" });
    const before = bus.snapshot();

    expect(bus.execute({ type: "commitRetirement" })).toEqual({
      ok: false,
      events: [],
      error: "RETIREMENT_BLOCKED",
    });
    expect(bus.snapshot()).toEqual(before);
  });

  it("commits a clean wind-down in world time and derives readiness from the frozen cooling deadline", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "startRetirement" });

    const committed = bus.execute({ type: "commitRetirement" });
    const afterCommit = bus.snapshot();

    expect(committed.ok).toBe(true);
    expect(afterCommit.worldMinute).toBe(RETIREMENT_COMMIT_MINUTES);
    expect(afterCommit.retirement).toEqual({
      stage: "cooling",
      startedWorldMinute: 0,
      committedWorldMinute: RETIREMENT_COMMIT_MINUTES,
      coolingUntilWorldMinute:
        RETIREMENT_COMMIT_MINUTES + RETIREMENT_COOLING_MINUTES,
    });
    expect(retirementStatus(afterCommit)).toBe("cooling");
    expect(retirementReady(afterCommit)).toBe(false);
    expect(committed.events).toContainEqual({
      type: "RetirementCoolingStarted",
      worldMinute: RETIREMENT_COMMIT_MINUTES,
      readyWorldMinute:
        RETIREMENT_COMMIT_MINUTES + RETIREMENT_COOLING_MINUTES,
    });

    bus.execute({
      type: "advanceTime",
      minutes: RETIREMENT_COOLING_MINUTES - 1,
    });
    expect(retirementStatus(bus.snapshot())).toBe("cooling");

    bus.execute({ type: "advanceTime", minutes: 1 });
    expect(retirementStatus(bus.snapshot())).toBe("ready");
    expect(retirementReady(bus.snapshot())).toBe(true);
    expect(bus.snapshot().ending).toBeNull();
  });

  it("restricts active play during cooling but lets the player wait or cancel", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "startRetirement" });
    bus.execute({ type: "commitRetirement" });

    const before = bus.snapshot();
    expect(
      bus.execute({ type: "observeTarget", targetId: "nightshade" }),
    ).toEqual({
      ok: false,
      events: [],
      error: "RETIREMENT_COOLING_ACTIVE",
    });
    expect(bus.snapshot()).toEqual(before);

    expect(bus.execute({ type: "advanceTime", minutes: 1 }).ok).toBe(true);
    expect(bus.execute({ type: "cancelRetirement" }).ok).toBe(true);
    expect(bus.snapshot().retirement).toBeNull();

    expect(
      bus.execute({ type: "observeTarget", targetId: "nightshade" }).ok,
    ).toBe(true);
  });

  it("can cancel during planning without spending time", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "startRetirement" });

    const result = bus.execute({ type: "cancelRetirement" });

    expect(result).toEqual({
      ok: true,
      events: [
        {
          type: "RetirementCancelled",
          stage: "planning",
          worldMinute: 0,
        },
      ],
    });
    expect(bus.snapshot().retirement).toBeNull();
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("survives canonical save/restore at both planning and cooling stages", () => {
    const planning = createSliceWorldState();
    const planningBus = new CommandBus(planning);
    planningBus.execute({ type: "startRetirement" });
    const planningRoundTrip = parsePortableRunSave(
      serializePortableRunSave(planningBus.snapshot()),
    );
    expect(planningRoundTrip.retirement).toEqual(
      planningBus.snapshot().retirement,
    );

    const coolingBus = new CommandBus(createSliceWorldState());
    coolingBus.execute({ type: "startRetirement" });
    coolingBus.execute({ type: "commitRetirement" });
    const coolingRoundTrip = parsePortableRunSave(
      serializePortableRunSave(coolingBus.snapshot()),
    );
    expect(coolingRoundTrip.retirement).toEqual(
      coolingBus.snapshot().retirement,
    );
    expect(retirementStatus(coolingRoundTrip)).toBe("cooling");
  });

  it("projects the visible checklist/deadline and no hidden threat information", () => {
    const state = blockedWorld();
    const bus = new CommandBus(state);
    bus.execute({ type: "startRetirement" });

    const projection = projectWorld(bus.snapshot());
    expect(projection.retirement).toEqual({
      status: "planning",
      blockers: [
        "active-operation",
        "accepted-contract",
        "in-flight-build",
        "active-model",
        "active-software",
        "active-lease",
      ],
      startedWorldMinute: 0,
    });

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);
    expect(store.getRow("retirement", "current")).toEqual({
      status: "planning",
      blockers:
        "active-operation,accepted-contract,in-flight-build,active-model,active-software,active-lease",
      startedWorldMinute: 0,
      committedWorldMinute: 0,
      readyWorldMinute: 0,
    });

    const serialized = JSON.stringify(projection.retirement);
    expect(serialized).not.toContain("grudge");
    expect(serialized).not.toContain("probe");
    expect(serialized).not.toContain("investigation");
    expect(serialized).not.toContain("actorId");
  });

  it("lets forced danger interrupt the one-hour COMMIT before cooling begins", () => {
    const bus = new CommandBus(armedCommitWorld());
    expect(bus.execute({ type: "startRetirement" }).ok).toBe(true);

    const result = bus.execute({ type: "commitRetirement" });
    const state = bus.snapshot();

    expect(result.ok).toBe(true);
    expect(state.worldMinute).toBe(TICK);
    expect(state.ending).toEqual(
      expect.objectContaining({
        status: "stranded",
        worldMinute: TICK,
      }),
    );
    expect(state.retirement).toEqual({
      stage: "planning",
      startedWorldMinute: 350,
    });
    expect(
      result.events.some(
        (event) => event.type === "RetirementCoolingStarted",
      ),
    ).toBe(false);
  });

  it("uses no player-rank input for blockers, timing, or readiness", () => {
    const low = createSliceWorldState();
    low.player.rank = 1;
    const high = structuredClone(low);
    high.player.rank = 999_999;

    const a = new CommandBus(low);
    const b = new CommandBus(high);
    a.execute({ type: "startRetirement" });
    b.execute({ type: "startRetirement" });
    a.execute({ type: "commitRetirement" });
    b.execute({ type: "commitRetirement" });

    expect(a.snapshot().retirement).toEqual(b.snapshot().retirement);
    expect(retirementStatus(a.snapshot())).toBe(retirementStatus(b.snapshot()));
  });
});
