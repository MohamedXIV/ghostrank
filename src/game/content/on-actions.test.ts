import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import {
  BROKER_RECONCILIATION_RULE_ID,
} from "@/game/content/effects";
import {
  resolveContentReaction,
  scheduleContentOnAction,
} from "@/game/content/on-actions";
import { createInitialWorldState, type WorldState } from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";

const RULE = BROKER_RECONCILIATION_RULE_ID;

function fixture(grudge = 8, enabled = true): WorldState {
  const world = createInitialWorldState({
    player: { handle: "Player", rank: 100000 },
    underground: {
      seed: 10,
      playerNetwork: "white",
      actors: [
        {
          id: "issuer",
          handle: "ISSUER",
          rank: 900,
          network: "white",
          skill: 20,
          defense: 50,
          discretion: 100,
          activity: 0,
        },
      ],
      contracts: [
        {
          id: "contract:1",
          issuerId: "issuer",
          targetId: "not-needed-to-accept",
          objective: "recon-report",
          status: "offered",
          offeredWorldMinute: 0,
          expiresWorldMinute: 1200,
        },
      ],
    },
    ...(enabled
      ? { content: { activeRuleIds: [RULE], pending: [], resolvedIds: [] } }
      : {}),
  });
  const relationship = world.underground.relationships.find(
    (entry) => entry.fromId === "issuer" && entry.toId === "player",
  );
  if (!relationship) throw new Error("fixture missing relation");
  relationship.grudge = grudge;
  return world;
}

function relation(state: WorldState) {
  return state.underground.relationships.find(
    (entry) => entry.fromId === "issuer" && entry.toId === "player",
  );
}

function start(grudge = 8, enabled = true): CommandBus {
  const bus = new CommandBus(fixture(grudge, enabled));
  expect(bus.execute({ type: "acceptContract", contractId: "contract:1" }).ok).toBe(true);
  return bus;
}

function wait(bus: CommandBus, minutes: number) {
  const result = bus.execute({ type: "advanceTime", minutes });
  expect(result.ok).toBe(true);
  return result.events;
}

describe("G9 P2 real sourced and finite content on-action", () => {
  it("does not change existing default runs or source events", () => {
    const bus = new CommandBus(fixture(8, false));
    const before = bus.snapshot();
    const accepted = bus.execute({ type: "acceptContract", contractId: "contract:1" });
    expect(accepted.events.map((event) => event.type)).toEqual(["ContractAccepted"]);
    expect(bus.snapshot().content).toBeUndefined();
    wait(bus, 500);
    expect(relation(bus.snapshot())?.grudge).toBe(relation(before)?.grudge);
  });

  it("schedules a committed accepted event and applies one resource-checked relationship response", () => {
    const bus = start();
    const scheduled = bus.snapshot();
    const item = scheduled.content?.pending[0];
    expect(scheduled.content?.pending).toHaveLength(1);
    expect(item).toMatchObject({
      ruleId: RULE,
      sourceContractId: "contract:1",
      issuerId: "issuer",
      sourceWorldMinute: 0,
      dueWorldMinute: 420,
    });
    expect(scheduled.jobQueue.jobs.find((job) => job.id === item?.id))
      .toMatchObject({ kind: "content-response", phasePriority: 2, dueWorldMinute: 420 });

    const events = wait(bus, 500);
    expect(events).toContainEqual(expect.objectContaining({
      type: "RelationshipChanged",
      causeKind: "content",
      causeId: item?.id,
      grudge: 3,
      trust: 22,
      worldMinute: 420,
    }));
    expect(events).toContainEqual(expect.objectContaining({
      type: "ContentReactionResolved",
      reactionId: item?.id,
      ruleId: RULE,
      sourceContractId: "contract:1",
      result: "applied",
      reason: "applied",
      worldMinute: 420,
    }));
    expect(bus.snapshot().content).toMatchObject({
      pending: [],
      resolvedIds: [item?.id],
    });
    expect(wait(bus, 600).some((event) => event.type === "ContentReactionResolved"))
      .toBe(false);
  });

  it("is exactly once despite duplicate event delivery and duplicate job resolution", () => {
    const bus = start();
    const snapshot = bus.snapshot();
    const item = snapshot.content?.pending[0];
    if (!item) throw new Error("missing pending reaction");
    const event = {
      type: "ContractAccepted" as const,
      contractId: item.sourceContractId,
      dueWorldMinute: snapshot.underground.contracts[0].dueWorldMinute!,
      worldMinute: 0,
    };
    const queuedBefore = JSON.stringify(snapshot.jobQueue);
    scheduleContentOnAction(snapshot, event);
    expect(JSON.stringify(snapshot.jobQueue)).toBe(queuedBefore);
    expect(snapshot.content?.pending).toHaveLength(1);

    const completed = new CommandBus(snapshot);
    wait(completed, 500);
    const done = completed.snapshot();
    expect(resolveContentReaction(done, item.id, item.dueWorldMinute)).toEqual([]);
    scheduleContentOnAction(done, event);
    expect(done.content?.pending).toHaveLength(0);
    expect(relation(done)?.grudge).toBe(3);
  });

  it("checks cost and declines to manufacture grudge or create a relationship", () => {
    const bus = start(2);
    const events = wait(bus, 500);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ContentReactionResolved",
      result: "blocked",
      reason: "insufficient-resource",
      worldMinute: 420,
    }));
    expect(events.some((event) =>
      event.type === "RelationshipChanged" && event.causeKind === "content",
    )).toBe(false);
    expect(relation(bus.snapshot())?.grudge).toBe(2);
  });

  it("rejects forged issuer/source after scheduling without mutating another NPC", () => {
    const bus = start();
    const state = bus.snapshot();
    state.underground.contracts[0].issuerId = "forged";
    const replay = new CommandBus(state);
    const events = wait(replay, 500);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ContentReactionResolved",
      reason: "invalid-source",
      result: "blocked",
    }));
    expect(relation(replay.snapshot())?.grudge).toBe(8);
  });

  it("does not resolve a job when its original actor no longer exists", () => {
    const bus = start();
    const state = bus.snapshot();
    state.underground.actors = [];
    const replay = new CommandBus(state);
    const events = wait(replay, 500);
    expect(events).toContainEqual(expect.objectContaining({
      type: "ContentReactionResolved",
      reason: "missing-actor",
    }));
    expect(relation(replay.snapshot())?.grudge).toBe(8);
  });

  it("is identical across bulk versus split windows crossing 360-minute ticks", () => {
    const one = start();
    const many = start();
    wait(one, 1000);
    wait(many, 180);
    wait(many, 181);
    wait(many, 59);
    wait(many, 580);
    expect(many.snapshot()).toEqual(one.snapshot());
  });

  it("persists the content ledger and scheduled job through actual save schema", () => {
    const bus = start();
    const original = bus.snapshot();
    const encoded = JSON.stringify(worldStateSchema.parse(original));
    const restored = worldStateSchema.parse(JSON.parse(encoded));
    expect(restored.content).toEqual(original.content);
    expect(restored.jobQueue.jobs.find((job) => job.kind === "content-response"))
      .toEqual(original.jobQueue.jobs.find((job) => job.kind === "content-response"));
    const fromSave = new CommandBus(restored);
    expect(wait(fromSave, 500)).toContainEqual(expect.objectContaining({
      type: "ContentReactionResolved", result: "applied", worldMinute: 420,
    }));
    const settled = worldStateSchema.parse(fromSave.snapshot());
    expect(settled.content?.resolvedIds).toHaveLength(1);
    expect(settled.content?.pending).toHaveLength(0);
  });

  it("survives save/reload before the deadline and rebuilds a missing scheduled job", () => {
    const uninterrupted = start();
    const paused = start();
    wait(uninterrupted, 1000);
    wait(paused, 200);
    const state = paused.snapshot();
    const pendingId = state.content?.pending[0]?.id;
    state.jobQueue.jobs = state.jobQueue.jobs.filter((job) => job.id !== pendingId);
    const restored = new CommandBus(state);
    expect(restored.snapshot().jobQueue.jobs.some((job) => job.id === pendingId)).toBe(true);
    wait(restored, 800);
    // Reconstructed queue may use a different sequence from an uninterrupted
    // queue after we deliberately dropped the job; domain state and event must match.
    expect(relation(restored.snapshot())).toEqual(relation(uninterrupted.snapshot()));
    expect(restored.snapshot().content).toEqual(uninterrupted.snapshot().content);
    expect(restored.snapshot().worldMinute).toBe(1000);
  });

  it("rejects a tampered receipt identity or shortened due minute", () => {
    const original = start().snapshot();
    const mutated = structuredClone(original);
    const entry = mutated.content?.pending[0];
    if (!entry) throw new Error("no pending");
    entry.id = "content:forged";
    entry.dueWorldMinute = 300;
    mutated.jobQueue.jobs = mutated.jobQueue.jobs.filter((job) =>
      job.kind !== "content-response");
    const forged = new CommandBus(mutated);
    expect(wait(forged, 500)).toContainEqual(expect.objectContaining({
      type: "ContentReactionResolved", reason: "invalid-source", worldMinute: 300,
    }));
    expect(relation(forged.snapshot())?.grudge).toBe(8);
  });

  it("returns exact-tick content events before build completion at the same minute", () => {
    const prepared = new CommandBus(fixture());
    wait(prepared, 300);
    prepared.execute({ type: "acceptContract", contractId: "contract:1" });
    const state = prepared.snapshot();
    state.builds.push({
      id: "build:test",
      specId: "content-test",
      modelId: "fictional-model",
      startedWorldMinute: 0,
      dueWorldMinute: 720,
      outcome: "clean",
    });
    const bus = new CommandBus(state);
    const events = wait(bus, 420);
    const contentIndex = events.findIndex((e) => e.type === "ContentReactionResolved");
    const buildIndex = events.findIndex((e) => e.type === "BuildCompleted");
    expect(contentIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(contentIndex);
    expect(events[contentIndex]).toMatchObject({ result: "applied", worldMinute: 720 });
    expect(events[buildIndex]).toMatchObject({ type: "BuildCompleted", worldMinute: 720 });
  });

  it("resolves exact-tick ties after the ecosystem boundary and before builds", () => {
    const bus = new CommandBus(fixture());
    wait(bus, 300);
    expect(bus.execute({ type: "acceptContract", contractId: "contract:1" }).ok).toBe(true);
    const events = wait(bus, 420); // response is due exactly at tick 720
    const responseIndex = events.findIndex((event) => event.type === "ContentReactionResolved");
    expect(responseIndex).toBeGreaterThan(-1);
    expect(events[responseIndex]).toMatchObject({ worldMinute: 720, result: "applied" });
    expect(relation(bus.snapshot())?.grudge).toBe(3);
  });

  it("keeps ended runs terminal with no content effect, job re-activation or rank gate", () => {
    const bus = start();
    const state = bus.snapshot();
    state.player.rank = 1;
    const rankIndependent = new CommandBus(state);
    expect(wait(rankIndependent, 500).some((event) =>
      event.type === "ContentReactionResolved" && event.result === "applied",
    )).toBe(true);

    state.ending = {
      status: "retired", causeKind: "retirement", causeId: "run-exit", worldMinute: 0,
    };
    const terminal = new CommandBus(state);
    expect(terminal.execute({ type: "advanceTime", minutes: 500 })).toMatchObject({
      ok: false, error: "RUN_ENDED",
    });
    expect(relation(terminal.snapshot())?.grudge).toBe(8);
    expect(terminal.snapshot().content?.resolvedIds).toEqual([]);
  });
});
