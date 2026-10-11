import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { compileContentCondition } from "@/game/content/definitions";
import { diagnoseContentCondition, diagnoseOpportunity, diagnoseInstitutionalCase,
  diagnoseContentReaction } from "@/game/content/dev/diagnostics";
import { captureWorldOpportunities } from "@/game/content/opportunities";
import type { WorldState } from "@/game/simulation/state/world-state";

const world = () => createSliceWorldState({ scenario: "fresh-scene", seed: 7, handle: "Inspect" });
const condition = (kind: "incident.actual-outcome" | "incident.reported-outcome", id: string,
  outcome: "succeeded" | "repelled") => ({
  op: "fact", fact: { kind, source: { kind: "source", id }, equals: outcome },
});
function addPrivateClaim(state: WorldState) {
  const [actor, other] = state.underground.actors;
  if (!actor || !other) throw Error("insufficient generated actors");
  state.underground.incidents.push({
    id: "incident:diag", kind: "npc-intrusion", actorId: actor.id,
    counterpartId: other.id, outcome: "repelled", public: false, worldMinute: 0,
  });
  state.underground.rumors.push({
    id: "rumor:diag", kind: "incident-leak", sourceId: "incident:diag",
    relayId: actor.id, accurate: false,
    claim: { actorId: actor.id, counterpartId: other.id, outcome: "succeeded" },
    worldMinute: 0,
  });
  state.underground.messages.push({
    id: "message:diag", fromId: actor.id, rumorId: "rumor:diag",
    read: false, worldMinute: 0,
  });
  return actor.id;
}

describe("G9 P7 privileged diagnostics", () => {
  it("contrasts actual truth, mistaken relay and player-known unknown without leaking to projection", () => {
    const state = world();
    const actor = addPrivateClaim(state);
    const before = JSON.stringify(state);
    const projectedBefore = projectWorld(state);
    const truth = diagnoseContentCondition(state,
      condition("incident.actual-outcome", "incident:diag", "repelled"),
      { kind: "authority" });
    const hidden = diagnoseContentCondition(state,
      condition("incident.actual-outcome", "incident:diag", "repelled"),
      { kind: "player-known" });
    const wrong = diagnoseContentCondition(state,
      condition("incident.reported-outcome", "incident:diag", "succeeded"),
      { kind: "observer-report", observer: { kind: "actor", id: actor } });
    expect(truth.ok && truth.result).toMatchObject({ value: true, reason: "matched" });
    expect(hidden.ok && hidden.result).toMatchObject({ value: "unknown", reason: "not-observed" });
    expect(wrong.ok && wrong.result).toMatchObject({ value: true, reason: "reported-match" });
    // Mistaken claim is NOT elevated into truth and cannot expose "repelled".
    expect(diagnoseContentCondition(state,
      condition("incident.actual-outcome", "incident:diag", "succeeded"),
      { kind: "player-known" })).toMatchObject({
        ok: true, result: { value: "unknown", reason: "not-observed" },
      });
    expect(projectWorld(state)).toEqual(projectedBefore);
    expect(JSON.stringify(state)).toBe(before);
    const bus = new CommandBus(state);
    bus.execute({ type: "readMessage", messageId: "message:diag" });
    const visible = JSON.stringify(projectWorld(bus.snapshot()));
    expect(visible).not.toContain("accurate");
    expect(visible).not.toContain("repelled");
  });

  it("explains unknown vs earned fact and exact guard refusals from cloned command authority", () => {
    const state = world();
    const owner = state.underground.actors.find(a => a.targetId);
    const counterpart = state.underground.actors.find(a => a.id !== owner?.id);
    if (!owner?.targetId || !counterpart) throw Error("missing owner");
    state.underground.incidents.push({
      id: "incident:visible", kind: "npc-intrusion", actorId: counterpart.id,
      counterpartId: owner.id, outcome: "succeeded", public: true, worldMinute: 0,
    });
    const created = captureWorldOpportunities(state, [{
      type: "UndergroundActivity", incidentId: "incident:visible",
      actorId: counterpart.id, counterpartId: owner.id,
      outcome: "succeeded", public: true, worldMinute: 0,
    }]);
    expect(created).toHaveLength(1);
    const lead = state.opportunities![0]!;
    const before = JSON.stringify(state);
    expect(diagnoseOpportunity(state, lead.id, created)).toMatchObject({
      sourceVerified: true, status: "open", blockedBy: "LEAD_NEEDS_OBSERVED_HOST",
      chronology: [{ kind: "OpportunityDiscovered", sourceId: lead.id }],
    });
    const fact = {
      op: "fact", fact: {
        kind: "player.known-active-target-machines",
        target: { kind: "target", id: lead.targetId }, min: 1,
      },
    };
    expect(diagnoseContentCondition(state, fact, { kind: "player-known" }))
      .toMatchObject({ ok: true, result: { value: "unknown" } });
    expect(JSON.stringify(state)).toBe(before);
    const target = state.targets.find(t => t.id === lead.targetId)!;
    state.evidence.push({
      id: "observed:diag", kind: "machine-presence",
      subjectId: target.machines[0]!.id, source: "direct-observation",
      confidence: "observed", worldMinute: state.worldMinute,
    });
    expect(diagnoseContentCondition(state, fact, { kind: "player-known" }))
      .toMatchObject({ ok: true, result: { value: true } });
    expect(diagnoseOpportunity(state, lead.id)).toMatchObject({ blockedBy: null });
    state.evidence[0]!.retiredWorldMinute = state.worldMinute;
    expect(diagnoseOpportunity(state, lead.id)).toMatchObject({
      blockedBy: "LEAD_NEEDS_OBSERVED_HOST",
    });
  });

  it("validates truly finite packs and bounded nested node traces, not arbitrary script fields", () => {
    const input = { op: "all", terms: [
      { op: "fact", fact: { kind: "player.known-active-target-machines",
        target: { kind: "target", id: "missing" }, min: 1 } },
      { op: "not", term: condition("incident.actual-outcome", "no-such-incident", "repelled") },
    ] };
    const trace = diagnoseContentCondition(world(), input, { kind: "player-known" });
    expect(trace).toMatchObject({ ok: true, inspectedNodes: 4,
      result: { value: "unknown" } });
    expect(trace.ok && trace.steps.map(step => step.path))
      .toEqual(["$", "$.terms[0]", "$.terms[1]", "$.terms[1].term"]);
    expect(compileContentCondition({ op: "fact", fact: { kind: "player.credits",
      path: "__proto__", min: 1 } }).ok).toBe(false);
    expect(diagnoseContentCondition(world(), {
      op: "fact", fact: { kind: "incident.actual-outcome", script: "return world.economy.credits",
        source: { kind: "source", id: "incident:diag" }, equals: "succeeded" },
    }, { kind: "authority" })).toMatchObject({ ok: false, error: "INVALID_CONTENT" });
    let tooDeep: unknown = condition("incident.actual-outcome", "incident:diag", "repelled");
    for (let i = 0; i < 20; i++) tooDeep = { op: "not", term: tooDeep };
    expect(diagnoseContentCondition(world(), tooDeep, { kind: "authority" }))
      .toMatchObject({ ok: false, error: "CONTENT_TOO_COMPLEX" });
    const cyclic: {op:string, term?:unknown} = {op:"not"};
    cyclic.term = cyclic;
    expect(diagnoseContentCondition(world(), cyclic, { kind: "authority" }))
      .toMatchObject({ ok: false, error: "CONTENT_TOO_COMPLEX" });
  });

  it("rejects forged civic source and finds no phantom content-reaction", () => {
    const state = world();
    expect(diagnoseInstitutionalCase(state, "civic:missing")).toBeNull();
    expect(diagnoseContentReaction(state, "content:missing")).toBeNull();
    const result = new CommandBus(state).execute({
      type: "mapInstitutionalCase", caseId: "civic:missing",
    });
    expect(result.error).toBe("CIVIC_SOURCE_INVALID");
  });
});
