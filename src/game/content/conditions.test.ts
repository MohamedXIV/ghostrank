import { describe, expect, it } from "vitest";
import {
  compileContentCondition,
  type CompiledContentCondition,
  type KnowledgeLens,
} from "@/game/content/definitions";
import { evaluateContentCondition } from "@/game/content/conditions";
import {
  createInitialWorldState,
  type WorldState,
  type UndergroundActor,
} from "@/game/simulation/state/world-state";

const AUTHORITY: KnowledgeLens = { kind: "authority" };
const PLAYER: KnowledgeLens = { kind: "player-known" };

function compiled(input: unknown): CompiledContentCondition {
  const result = compileContentCondition(input);
  if (!result.ok) throw new Error(result.error);
  return result.compiled;
}

function mapCondition(targetId = "alpha", min = 2): CompiledContentCondition {
  return compiled({
    op: "fact",
    fact: {
      kind: "player.known-active-target-machines",
      target: { kind: "target", id: targetId },
      min,
    },
  });
}

function world(): WorldState {
  return createInitialWorldState({
    worldMinute: 12,
    knownTargetIds: ["alpha"],
    targets: [
      {
        id: "alpha",
        handle: "ALPHA",
        rank: 50,
        machines: [
          { id: "a-1", label: "Gateway", role: "gateway", services: [] },
          { id: "a-2", label: "Vault", role: "vault", services: [] },
        ],
      },
      {
        id: "beta",
        handle: "BETA",
        rank: 1,
        machines: [
          { id: "b-1", label: "Relay", role: "relay", services: [] },
        ],
      },
    ],
  });
}

function observe(
  state: WorldState,
  id: string,
  minute = 2,
  retiredWorldMinute?: number,
): void {
  state.evidence.push({
    id: `machine-presence:${id}:${state.evidence.length}`,
    kind: "machine-presence",
    subjectId: id,
    confidence: "observed",
    source: "direct-observation",
    worldMinute: minute,
    ...(retiredWorldMinute === undefined ? {} : { retiredWorldMinute }),
  });
}

function actor(id: string): UndergroundActor {
  return {
    id,
    handle: id.toUpperCase(),
    rank: 1000,
    network: "white",
    skill: 30,
    defense: 30,
    discretion: 30,
    activity: 0,
  };
}

describe("G9 P1 bounded semantic definitions", () => {
  it("accepts a real infrastructure-map predicate and finite composition", () => {
    expect(compileContentCondition({
      op: "all",
      terms: [
        mapCondition().definition,
        { op: "not", term: {
          op: "fact",
          fact: {
            kind: "incident.actual-outcome",
            source: { kind: "source", id: "incident:1" },
            equals: "repelled",
          },
        } },
      ],
    }).ok).toBe(true);
  });

  it("rejects arbitrary JS, unknown facts, wrong scopes, values and extra fields", () => {
    expect(compileContentCondition({
      op: "fact",
      fact: {
        kind: "player.known-active-target-machines",
        target: { kind: "actor", id: "alpha" },
        min: 1,
      },
    })).toEqual({ ok: false, error: "INVALID_CONTENT" });
    expect(compileContentCondition({
      op: "fact",
      fact: {
        kind: "player.known-active-target-machines",
        target: { kind: "target", id: "alpha" },
        min: 0,
      },
    }).ok).toBe(false);
    expect(compileContentCondition({
      op: "fact", fact: { kind: "unregistered.world.write", key: "credits" },
    }).ok).toBe(false);
    expect(compileContentCondition({ op: "all", terms: [] }).ok).toBe(false);
    expect(compileContentCondition({
      op: "fact",
      fact: {
        kind: "incident.actual-outcome",
        source: { kind: "source", id: "incident:1", secret: "yes" },
        equals: "succeeded",
      },
    }).ok).toBe(false);
    expect(compileContentCondition({
      op: "fact",
      fact: {
        kind: "player.known-active-target-machines",
        target: { kind: "target", id: "alpha" },
        min: 1,
        execute: () => "danger",
      },
    }).ok).toBe(false);
  });

  it("rejects deep/cyclic/oversized expressions deterministically", () => {
    let deep: unknown = mapCondition().definition;
    for (let i = 0; i < 12; i++) deep = { op: "not", term: deep };
    expect(compileContentCondition(deep)).toEqual({
      ok: false, error: "CONTENT_TOO_COMPLEX",
    });
    const cyclic: { op: string; term?: unknown } = { op: "not" };
    cyclic.term = cyclic;
    expect(compileContentCondition(cyclic)).toEqual({
      ok: false, error: "CONTENT_TOO_COMPLEX",
    });
    expect(compileContentCondition({
      op: "all", terms: Array.from({ length: 17 }, () => mapCondition().definition),
    }).ok).toBe(false);
  });
});

describe("G9 P1 player-earned evidence and tri-state query", () => {
  it("counts current matching target machines and never foreign, duplicate or retired records", () => {
    const state = world();
    const rule = mapCondition();
    observe(state, "a-1");
    observe(state, "b-1");
    observe(state, "a-1");
    observe(state, "a-2", 5, 6);
    expect(evaluateContentCondition(state, rule, PLAYER)).toEqual({
      value: false, reason: "not-met",
    });
    observe(state, "a-2", 7);
    expect(evaluateContentCondition(state, rule, PLAYER)).toEqual({
      value: true, reason: "matched",
    });
  });

  it("rejects future observations, with no false certainty on undiscovered targets", () => {
    const state = world();
    observe(state, "a-1", 13);
    expect(evaluateContentCondition(state, mapCondition("alpha", 1), PLAYER).value).toBe(false);
    expect(evaluateContentCondition(state, mapCondition("beta", 1), PLAYER)).toEqual({
      value: "unknown", reason: "not-observed",
    });
    expect(evaluateContentCondition(state, mapCondition("forged", 1), PLAYER)).toEqual({
      value: "unknown", reason: "not-observed",
    });
    expect(evaluateContentCondition(state, mapCondition("forged", 1), AUTHORITY)).toEqual({
      value: "unknown", reason: "invalid-reference",
    });
    expect(evaluateContentCondition(state, mapCondition("alpha", 1), {
      kind: "observer-report", observer: { kind: "actor", id: "c" },
    }).value).toBe("unknown");
  });

  it("keeps unknown distinct from false, even under negation and combined clauses", () => {
    const state = world();
    const falseRule = mapCondition("alpha", 1).definition;
    const unknownRule = mapCondition("beta", 1).definition;
    expect(evaluateContentCondition(state, compiled({
      op: "not", term: unknownRule,
    }), PLAYER).value).toBe("unknown");
    expect(evaluateContentCondition(state, compiled({
      op: "all", terms: [unknownRule, falseRule],
    }), PLAYER).value).toBe(false);
    expect(evaluateContentCondition(state, compiled({
      op: "any", terms: [falseRule, unknownRule],
    }), PLAYER).value).toBe("unknown");
    observe(state, "a-1");
    expect(evaluateContentCondition(state, compiled({
      op: "any", terms: [unknownRule, falseRule],
    }), PLAYER).value).toBe(true);
  });

  it("is pure, deterministic and independent of actor/player/target rank", () => {
    const state = world();
    observe(state, "a-1");
    const before = JSON.stringify(state);
    const rule = mapCondition("alpha", 1);
    const one = evaluateContentCondition(state, rule, PLAYER);
    expect(evaluateContentCondition(state, rule, PLAYER)).toEqual(one);
    expect(JSON.stringify(state)).toBe(before);
    state.player.rank = 1;
    state.targets[0].rank = 999999;
    expect(evaluateContentCondition(state, rule, PLAYER)).toEqual(one);
  });
});

describe("G9 P1 truth versus transmitted reports", () => {
  function reportsWorld() {
    const state = world();
    state.underground.actors.push(actor("a"), actor("b"), actor("c"), actor("d"));
    state.underground.incidents.push({
      id: "incident:1",
      kind: "npc-intrusion",
      actorId: "a",
      counterpartId: "b",
      outcome: "repelled",
      public: false,
      worldMinute: 4,
    });
    state.underground.rumors.push({
      id: "rumor:1",
      kind: "incident-leak",
      sourceId: "incident:1",
      relayId: "c",
      accurate: false,
      claim: { actorId: "a", counterpartId: "b", outcome: "succeeded" },
      worldMinute: 5,
    });
    state.underground.messages.push({
      id: "message:1",
      fromId: "c",
      rumorId: "rumor:1",
      worldMinute: 6,
      read: false,
    });
    return state;
  }

  function outcome(kind: "incident.actual-outcome" | "incident.reported-outcome") {
    return compiled({
      op: "fact",
      fact: {
        kind,
        source: { kind: "source", id: "incident:1" },
        equals: "succeeded",
      },
    });
  }

  it("never upgrades an inaccurate private rumor into actual outcome", () => {
    const state = reportsWorld();
    expect(evaluateContentCondition(state, outcome("incident.actual-outcome"), AUTHORITY))
      .toEqual({ value: false, reason: "not-met" });
    expect(evaluateContentCondition(state, outcome("incident.actual-outcome"), PLAYER))
      .toEqual({ value: "unknown", reason: "not-observed" });
    expect(evaluateContentCondition(state, outcome("incident.reported-outcome"), PLAYER))
      .toEqual({ value: true, reason: "reported-match" });
    const before = evaluateContentCondition(state, outcome("incident.reported-outcome"), PLAYER);
    state.underground.rumors[0].accurate = true;
    expect(evaluateContentCondition(state, outcome("incident.reported-outcome"), PLAYER))
      .toEqual(before);
  });

  it("does not invent NPC knowledge, but can attribute a sender's real report", () => {
    const state = reportsWorld();
    const lens = (id: string): KnowledgeLens => ({
      kind: "observer-report", observer: { kind: "actor", id },
    });
    expect(evaluateContentCondition(state, outcome("incident.reported-outcome"), lens("c")))
      .toEqual({ value: true, reason: "reported-match" });
    expect(evaluateContentCondition(state, outcome("incident.reported-outcome"), lens("d")))
      .toEqual({ value: "unknown", reason: "not-observed" });
    expect(evaluateContentCondition(state, outcome("incident.actual-outcome"), lens("c")).value)
      .toBe("unknown");
    expect(evaluateContentCondition(state, outcome("incident.reported-outcome"), AUTHORITY))
      .toEqual({ value: "unknown", reason: "unsupported-lens" });
  });

  it("keeps future/private undelivered reports unknown and conflicting reports uncertain", () => {
    const state = reportsWorld();
    const claim = outcome("incident.reported-outcome");
    state.worldMinute = 5;
    expect(evaluateContentCondition(state, claim, PLAYER).value).toBe("unknown");
    state.worldMinute = 12;
    state.underground.rumors.push({
      id: "rumor:2",
      kind: "incident-leak",
      sourceId: "incident:1",
      relayId: "d",
      accurate: true,
      claim: { actorId: "a", counterpartId: "b", outcome: "repelled" },
      worldMinute: 7,
    });
    state.underground.messages.push({
      id: "message:2", fromId: "d", rumorId: "rumor:2", worldMinute: 8, read: false,
    });
    expect(evaluateContentCondition(state, claim, PLAYER))
      .toEqual({ value: "unknown", reason: "conflicting-reports" });
  });

  it("allows a publicly recorded incident to be known without rumor omniscience", () => {
    const state = reportsWorld();
    state.underground.incidents[0].public = true;
    expect(evaluateContentCondition(state, outcome("incident.actual-outcome"), PLAYER))
      .toEqual({ value: false, reason: "not-met" });
    expect(evaluateContentCondition(state, outcome("incident.reported-outcome"), PLAYER))
      .toEqual({ value: true, reason: "reported-match" });
  });
});
