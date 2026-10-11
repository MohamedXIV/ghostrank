import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { captureWorldOpportunities } from "@/game/content/opportunities";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import type { WorldState, OpportunityLead } from "@/game/simulation/state/world-state";

function generated(seed = 7): WorldState {
  return createSliceWorldState({ seed, scenario: "fresh-scene", handle: "PilotLab" });
}
function publicFixture(seed = 7): WorldState {
  const world = generated(seed);
  const owner = world.underground.actors.find((a) => a.targetId);
  const peer = world.underground.actors.find((a) => a.id !== owner?.id);
  if (!owner?.targetId || !peer) throw Error("missing generated owner/peer");
  world.underground.incidents.push({
    id: "incident:p4", kind: "npc-intrusion", actorId: peer.id,
    counterpartId: owner.id, outcome: "succeeded", public: true, worldMinute: 0,
  });
  return world;
}
function seedPublic(world: WorldState) {
  const incident = world.underground.incidents[0];
  return captureWorldOpportunities(world, [{
    type: "UndergroundActivity", incidentId: incident.id,
    actorId: incident.actorId, counterpartId: incident.counterpartId,
    outcome: incident.outcome, public: true, worldMinute: incident.worldMinute,
  }]);
}
function leadOf(world: WorldState): OpportunityLead {
  const result = world.opportunities?.[0];
  if (!result) throw Error("no opportunity");
  return result;
}
function evidence(world: WorldState): void {
  const target = world.targets.find((t) => t.id === leadOf(world).targetId);
  if (!target?.machines[0]) throw Error("no owned target host");
  world.evidence.push({
    id: "g9:p4:observed", kind: "machine-presence",
    subjectId: target.machines[0].id, confidence: "observed",
    source: "direct-observation", worldMinute: world.worldMinute,
  });
}
function run(bus: CommandBus, command: Parameters<CommandBus["execute"]>[0]) {
  return bus.execute(command);
}

describe("G9 P4 — autonomous leads, no broker contracts", () => {
  it("leaves Canonical/Nightshade state and golden semantics unchanged", () => {
    const world = createSliceWorldState({ seed: 7, scenario: "canonical" });
    const bus = new CommandBus(world);
    expect(bus.snapshot().opportunities).toBeUndefined();
    expect(run(bus, { type: "advanceTime", minutes: 7200 }).ok).toBe(true);
    expect(bus.snapshot().opportunities).toBeUndefined();
    expect(run(bus, { type: "investigateLead", leadId: "invented" }).error).toBe("LEAD_UNAVAILABLE");
  });

  it("opens leads from real NPC tick activity in seeded G2 worlds; not from contracts", () => {
    let discovered = false;
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      for (const seed of [2, 7, 11, 25]) {
        const bus = new CommandBus(
          createSliceWorldState({ seed, scenario, handle: "PilotLab" }),
        );
        const events = run(bus, { type: "advanceTime", minutes: 7 * 1440 }).events;
        const leads = bus.snapshot().opportunities ?? [];
        if (!leads.length) continue;
        discovered = true;
        expect(events.some((e) => e.type === "UndergroundActivity" && e.public)).toBe(true);
        expect(events.some((e) => e.type === "OpportunityDiscovered")).toBe(true);
        expect(leads.every((lead) => lead.id.startsWith("lead:public:"))).toBe(true);
        expect(leads.every((lead) => !bus.snapshot().underground.contracts.some((c) => c.id === lead.id))).toBe(true);
        expect(leads.length).toBeLessThanOrEqual(128);
      }
    }
    expect(discovered).toBe(true);
  });

  it("requires earned non-retired current-host evidence before any high-impact choice", () => {
    const state = publicFixture();
    const events = seedPublic(state);
    expect(events).toMatchObject([{ type: "OpportunityDiscovered", origin: "public-incident" }]);
    const id = leadOf(state).id;
    const bus = new CommandBus(state);
    expect(run(bus, { type: "resolveLead", leadId: id, approach: "exploit" }).error)
      .toBe("LEAD_NEEDS_INVESTIGATION");
    expect(run(bus, { type: "investigateLead", leadId: id }).error)
      .toBe("LEAD_NEEDS_OBSERVED_HOST");
    const snapshot = bus.snapshot();
    evidence(snapshot);
    const mapped = new CommandBus(snapshot);
    expect(run(mapped, { type: "investigateLead", leadId: id }).ok).toBe(true);
    expect(mapped.snapshot().opportunities?.[0].status).toBe("mapped");
    expect(run(mapped, { type: "resolveLead", leadId: id, approach: "exploit" }).ok).toBe(true);
    expect(run(mapped, { type: "resolveLead", leadId: id, approach: "trade" }).error)
      .toBe("LEAD_EXPIRED_OR_RESOLVED");
  });

  it("offers genuinely distinct economic, trust and grudge consequences, rank-independent", () => {
    const state = publicFixture(9);
    seedPublic(state);
    evidence(state);
    const by = (approach: "trade" | "disclose" | "exploit", rank: number) => {
      const clone = structuredClone(state);
      clone.player.rank = rank;
      const bus = new CommandBus(clone);
      const id = leadOf(state).id;
      run(bus, { type: "investigateLead", leadId: id });
      const result = run(bus, { type: "resolveLead", leadId: id, approach });
      expect(result.ok).toBe(true);
      return {
        credits: bus.snapshot().economy.credits,
        relation: bus.snapshot().underground.relationships.find((rel) =>
          rel.fromId === leadOf(state).subjectActorId && rel.toId === "player"),
        events: result.events.filter((e) => e.type === "ValueTransferred" || e.type === "RelationshipChanged"),
      };
    };
    const disclosed = by("disclose", 1);
    const traded = by("trade", 1);
    const exploited = by("exploit", 1);
    expect(disclosed.credits).toBe(0);
    expect(traded.credits).toBeGreaterThan(0);
    expect(exploited.credits).toBeGreaterThan(traded.credits);
    expect(disclosed.relation?.grudge).toBeLessThan(exploited.relation?.grudge ?? 0);
    expect(by("trade", 999999).credits).toBe(traded.credits);
    expect(by("trade", 999999).events).toEqual(traded.events);
    expect(traded.events).toContainEqual(expect.objectContaining({
      type: "ValueTransferred", causeKind: "opportunity", causeId: leadOf(state).id,
    }));
    expect(exploited.events).toContainEqual(expect.objectContaining({
      type: "RelationshipChanged", causeKind: "opportunity", causeId: leadOf(state).id,
    }));
  });

  it("shows only the report claim and redacts hidden actor ownership/accuracy", () => {
    const world = generated(13);
    const owner = world.underground.actors.find((a) => a.targetId)!;
    const peer = world.underground.actors.find((a) => a.id !== owner.id)!;
    world.underground.incidents.push({
      id: "incident:private", kind: "npc-intrusion", actorId: peer.id,
      counterpartId: owner.id, outcome: "repelled", public: false, worldMinute: 0,
    });
    world.underground.rumors.push({
      id: "rumor:private", sourceId: "incident:private",
      kind: "incident-leak", relayId: peer.id, accurate: false,
      claim: { actorId: peer.id, counterpartId: owner.id, outcome: "succeeded" },
      worldMinute: 0,
    });
    world.underground.messages.push({
      id: "message:private", rumorId: "rumor:private",
      fromId: peer.id, read: false, worldMinute: 0,
    });
    const bus = new CommandBus(world);
    expect(bus.snapshot().opportunities).toBeUndefined();
    expect(run(bus, { type: "readMessage", messageId: "message:private" }).events)
      .toContainEqual(expect.objectContaining({ type: "OpportunityDiscovered", origin: "relay-report" }));
    const visible = projectWorld(bus.snapshot()).underground.leads?.[0];
    expect(visible).toMatchObject({ origin: "relay-report", claimOutcome: "succeeded", status: "open" });
    expect(visible).not.toHaveProperty("targetId");
    expect(visible).not.toHaveProperty("targetHandle");
    expect(JSON.stringify(visible)).not.toContain("accurate");
    expect(JSON.stringify(visible)).not.toContain("repelled");
    // Investigation maps infrastructure, NOT a proof that the claim was true.
    const withProof = bus.snapshot();
    evidence(withProof);
    const proving = new CommandBus(withProof);
    expect(run(proving, { type: "investigateLead", leadId: leadOf(withProof).id }).ok).toBe(true);
    expect(projectWorld(proving.snapshot()).underground.leads?.[0].claimOutcome).toBe("succeeded");
    const tradeOrDisclose = run(proving, {
      type: "resolveLead", leadId: leadOf(withProof).id, approach: "disclose",
    });
    expect(tradeOrDisclose.ok).toBe(true);
    expect(tradeOrDisclose.events).toContainEqual(expect.objectContaining({
      type: "RelationshipChanged", causeKind: "opportunity",
    }));
  });

  it("persists single-source resolutions, ignores and expiry through save/reload", () => {
    const state = publicFixture();
    seedPublic(state);
    const bus = new CommandBus(worldStateSchema.parse(JSON.parse(JSON.stringify(state))));
    const id = leadOf(state).id;
    expect(run(bus, { type: "resolveLead", leadId: id, approach: "ignore" }).ok).toBe(true);
    const frozen = worldStateSchema.parse(JSON.parse(JSON.stringify(bus.snapshot())));
    expect(frozen.opportunities?.[0].status).toBe("ignored");
    expect(run(new CommandBus(frozen), { type: "investigateLead", leadId: id }).error)
      .toBe("LEAD_EXPIRED_OR_RESOLVED");
    const expiring = new CommandBus(state);
    run(expiring, { type: "advanceTime", minutes: 3 * 1440 });
    expect(expiring.snapshot().opportunities?.[0].status).toBe("expired");
    expect(run(expiring, { type: "resolveLead", leadId: id, approach: "ignore" }).error)
      .toBe("LEAD_EXPIRED_OR_RESOLVED");
  });

  it("preserves split/bulk clock equivalence, bounded repeats and terminality", () => {
    const state = publicFixture();
    seedPublic(state);
    const one = new CommandBus(state);
    const split = new CommandBus(state);
    expect(run(one, { type: "advanceTime", minutes: 1440 }).ok).toBe(true);
    for (let i = 0; i < 4; i++) {
      expect(run(split, { type: "advanceTime", minutes: 360 }).ok).toBe(true);
    }
    expect(one.snapshot()).toEqual(split.snapshot());
    const ended = new CommandBus({
      ...state,
      ending: { status: "retired", causeKind: "retirement", causeId: "done", worldMinute: 0 },
    });
    expect(run(ended, { type: "resolveLead", leadId: leadOf(state).id, approach: "trade" }).error)
      .toBe("RUN_ENDED");
  });

  it("rejects re-pointed lead identity even when an edited save names a valid incident", () => {
    const state = publicFixture();
    seedPublic(state);
    evidence(state);
    const lead = leadOf(state);
    lead.id = "lead:public:forged";
    const bus = new CommandBus(state);
    expect(run(bus, { type: "investigateLead", leadId: lead.id }).error)
      .toBe("LEAD_SOURCE_INVALID");
    expect(bus.snapshot().economy.credits).toBe(0);
  });

  it("limits repeat leads per actor, without resetting cooldown for second sources", () => {
    const state = publicFixture();
    const first = seedPublic(state);
    expect(first).toHaveLength(1);
    const repeated = captureWorldOpportunities(state, [{
      type: "UndergroundActivity", incidentId: "incident:p4",
      actorId: state.underground.incidents[0].actorId,
      counterpartId: state.underground.incidents[0].counterpartId,
      outcome: "succeeded", public: true, worldMinute: 0,
    }]);
    expect(repeated).toEqual([]);
    state.underground.incidents.push({
      ...state.underground.incidents[0], id: "incident:p4:second", worldMinute: 360,
    });
    const second = captureWorldOpportunities(state, [{
      type: "UndergroundActivity", incidentId: "incident:p4:second",
      actorId: state.underground.incidents[0].actorId,
      counterpartId: state.underground.incidents[0].counterpartId,
      outcome: "succeeded", public: true, worldMinute: 360,
    }]);
    expect(second).toEqual([]);
  });

  it("varies actual trade value across seeds without changing rank", () => {
    const values = [1, 7, 19, 36].map((seed) => {
      const state = publicFixture(seed);
      seedPublic(state);
      evidence(state);
      const bus = new CommandBus(state);
      const id = leadOf(state).id;
      run(bus, { type: "investigateLead", leadId: id });
      expect(run(bus, { type: "resolveLead", leadId: id, approach: "trade" }).ok).toBe(true);
      return bus.snapshot().economy.credits;
    });
    expect(new Set(values).size).toBeGreaterThan(1);
  });

  it("terminal and GUI produce exactly the same command and outcomes", () => {
    const state = publicFixture();
    seedPublic(state);
    evidence(state);
    const id = leadOf(state).id;
    const terminal = parseTerminalCommand(`lead investigate ${id}`);
    expect(terminal).toEqual({ ok: true, command: { type: "investigateLead", leadId: id } });
    const gui = new CommandBus(state);
    const text = new CommandBus(state);
    const cmd = { type: "investigateLead" as const, leadId: id };
    expect(run(gui, cmd)).toEqual(run(text, terminal.ok ? terminal.command : cmd));
    const chosen = parseTerminalCommand(`lead trade ${id}`);
    const trade = { type: "resolveLead" as const, leadId: id, approach: "trade" as const };
    expect(chosen).toEqual({ ok: true, command: trade });
    expect(run(gui, trade)).toEqual(run(text, chosen.ok ? chosen.command : trade));
    expect(gui.snapshot()).toEqual(text.snapshot());
  });
});
