import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import {
  captureInstitutionalCases, advanceInstitutionalCases,
  institutionalDefenseBonus, witnessCase,
} from "@/game/content/institutional-cases";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { InstitutionalCase, WorldState } from "@/game/simulation/state/world-state";

function fixture(seed = 7): WorldState {
  const world = createSliceWorldState({ scenario: "fresh-scene", seed, handle: "Witness" });
  const owner = world.underground.actors.find(a => a.targetId && a.organizationId);
  const org = world.underground.organizations?.find(o => o.id === owner?.organizationId);
  const attacker = world.underground.actors.find(a => a.id !== owner?.id);
  if (!owner?.targetId || !org || !attacker) throw Error("no generated owner, org or attacker");
  const target = world.targets.find(t => t.id === owner.targetId)!;
  // An authentic fictional records service in the fixture, not a guessed
  // archive on an unrelated target.
  target.machines[0]!.services[0]!.kind = "archive";
  world.underground.incidents.push({
    id: "incident:civic-fixture", actorId: attacker.id, counterpartId: owner.id,
    kind: "npc-intrusion", public: true, outcome: "succeeded", worldMinute: 360,
  });
  return world;
}
function pub(world: WorldState, minute = 360) {
  const i = world.underground.incidents[world.underground.incidents.length - 1]!;
  return [{ type: "UndergroundActivity" as const, incidentId: i.id, actorId: i.actorId,
    counterpartId: i.counterpartId, outcome: i.outcome, public: true, worldMinute: minute }];
}
function make(scope: InstitutionalCase["scope"]): WorldState {
  const world = fixture(7);
  const source = world.underground.incidents.at(-1)!;
  for (let seed = 1; seed < 500; seed++) {
    world.underground.seed = seed;
    world.institutionalCases = undefined;
    captureInstitutionalCases(world, pub(world), 360);
    if (world.institutionalCases?.[0]?.scope === scope) return world;
  }
  throw Error("no deterministic " + scope + " case within bounded seeded search");
}
function stateCase(world: WorldState): InstitutionalCase {
  const c = world.institutionalCases?.[0];
  if (!c) throw Error("no civic case");
  return c;
}
function evidence(world: WorldState) {
  const caseRecord = stateCase(world);
  const host = world.targets.find(t => t.id === caseRecord.targetId)!.machines[0]!;
  world.evidence.push({
    id: "civic:observed", kind: "machine-presence",
    subjectId: host.id, source: "direct-observation", confidence: "observed",
    worldMinute: world.worldMinute,
  });
}

describe("G9 P6 — civic archive, real institutions and reactions", () => {
  it("has two grounded authored scales, with genuinely different participating memberships", () => {
    const district = make("district");
    const national = make("national-network");
    expect(stateCase(district).participatingOrganizationIds).toHaveLength(1);
    expect(stateCase(national).participatingOrganizationIds).toHaveLength(2);
    expect(new Set(stateCase(national).participatingOrganizationIds).size).toBe(2);
    expect(witnessCase(district, stateCase(district))).toBe(true);
    expect(witnessCase(national, stateCase(national))).toBe(true);
    const a = projectWorld(district).underground.civicCases![0];
    const b = projectWorld(national).underground.civicCases![0];
    expect(a.publicBody).toBe("District Records Office");
    expect(b.publicBody).toBe("Federated Public Records Commission");
    expect(a.affectedOfficeCount).toBe(1);
    expect(b.affectedOfficeCount).toBe(2);
  });

  it("continues as an autonomous NPC/institution world process across ticks", () => {
    const world = make("national-network");
    const c = stateCase(world);
    const owner = world.underground.actors.find(a => a.id === c.ownerId)!;
    const partner = world.underground.actors.find(a =>
      a.targetId && a.organizationId === c.participatingOrganizationIds[1])!;
    expect(institutionalDefenseBonus(world, owner)).toBe(0);
    expect(advanceInstitutionalCases(world, 360)).toEqual([]);
    const first = advanceInstitutionalCases(world, 720);
    expect(first).toContainEqual(expect.objectContaining({
      type: "InstitutionalResponse", caseId: c.id, responseIndex: 1, worldMinute: 720,
    }));
    expect(institutionalDefenseBonus(world, owner)).toBe(5);
    expect(institutionalDefenseBonus(world, partner)).toBe(0);
    const second = advanceInstitutionalCases(world, 1080);
    expect(second).toContainEqual(expect.objectContaining({
      type: "InstitutionalResponse", responseIndex: 2,
    }));
    expect(institutionalDefenseBonus(world, partner)).toBe(5);
    expect(c.containment).toBe(12);
    advanceInstitutionalCases(world, 1440);
    advanceInstitutionalCases(world, 1800);
    expect(c.responses).toHaveLength(4);
    expect(c.containment).toBe(24);
    expect(advanceInstitutionalCases(world, 2160)).toEqual([]);
  });

  it("only a real authoritative public incident can create the institutional case", () => {
    const world = fixture();
    const events = pub(world);
    const fake = { ...events[0], incidentId: "incident:fictional" };
    expect(captureInstitutionalCases(world, [fake], 360)).toEqual([]);
    const wrong = { ...events[0], outcome: "repelled" as const };
    expect(captureInstitutionalCases(world, [wrong], 360)).toEqual([]);
    const forgedActor = { ...events[0], actorId: "spoofed" };
    expect(captureInstitutionalCases(world, [forgedActor], 360)).toEqual([]);
  });

  it("cannot map or monetize a case without earned target evidence", () => {
    const world = make("district");
    const id = stateCase(world).id;
    const bus = new CommandBus(world);
    const map = { type: "mapInstitutionalCase" as const, caseId: id };
    const sell = { type: "resolveInstitutionalCase" as const, caseId: id,
      choice: "sell" as const };
    expect(bus.execute(map).error).toBe("CIVIC_NEEDS_EVIDENCE");
    expect(bus.execute(sell).error).toBe("CIVIC_NEEDS_MAPPING");
    expect(bus.snapshot().economy.credits).toBe(0);
    const earned = bus.snapshot();
    evidence(earned);
    const earnedBus = new CommandBus(earned);
    expect(earnedBus.execute(map).ok).toBe(true);
    const got = earnedBus.execute(sell);
    expect(got.ok).toBe(true);
    expect(got.events).toContainEqual(expect.objectContaining({
      type: "ValueTransferred", causeKind: "institutional-case", causeId: id,
    }));
    expect(got.events).toContainEqual(expect.objectContaining({
      type: "RelationshipChanged", causeKind: "institution", causeId: id,
    }));
    expect(earnedBus.snapshot().economy.credits).toBeGreaterThan(0);
    expect(earnedBus.execute(sell).error).toBe("CIVIC_CLOSED");
  });

  it("distinguishes five paths: public disclosure, private handoff, sale, paid suppression and retreat", () => {
    const world = make("national-network");
    evidence(world);
    const id = stateCase(world).id;
    for (const choice of ["disclose", "handoff", "sell", "suppress", "walk-away"] as const) {
      const base = structuredClone(world);
      if (choice === "suppress") base.economy.credits = 40;
      const bus = new CommandBus(base);
      if (choice !== "walk-away") expect(bus.execute({ type: "mapInstitutionalCase", caseId: id }).ok).toBe(true);
      const event = bus.execute({ type: "resolveInstitutionalCase", caseId: id, choice });
      expect(event.ok).toBe(true);
      expect(event.events).toContainEqual(expect.objectContaining({
        type: "InstitutionalCaseResolved", choice, caseId: id,
      }));
      const c = stateCase(bus.snapshot());
      expect(c.status).toBe(choice === "walk-away" ? "withdrawn" : "resolved");
      expect(c.disclosure).toBe(choice === "disclose" ? "public" :
        choice === "handoff" || choice === "suppress" ? "sealed" : "unverified");
      if (choice === "sell") expect(bus.snapshot().economy.credits).toBeGreaterThan(0);
      if (choice === "suppress") expect(bus.snapshot().economy.credits).toBe(5);
      if (choice === "walk-away") {
        const withdrawn = bus.snapshot();
        expect(advanceInstitutionalCases(withdrawn, 720).length).toBe(1);
      }
    }
  });

  it("can choose to suppress only when capable of paying its actual debit", () => {
    const world = make("district");
    evidence(world);
    const bus = new CommandBus(world);
    const id = stateCase(world).id;
    bus.execute({ type: "mapInstitutionalCase", caseId: id });
    const before = bus.snapshot();
    expect(bus.execute({
      type: "resolveInstitutionalCase", caseId: id, choice: "suppress",
    }).error).toBe("CIVIC_INSUFFICIENT_FUNDS");
    expect(bus.snapshot()).toEqual(before);
  });

  it("preserves public visibility but withholds hidden organization/owner IDs and services", () => {
    const world = make("national-network");
    const c = stateCase(world);
    const v = projectWorld(world).underground.civicCases?.[0];
    expect(v).toBeDefined();
    const json = JSON.stringify(v);
    expect(json).not.toContain(c.ownerId);
    expect(json).not.toContain(c.targetId);
    for (const orgId of c.participatingOrganizationIds) expect(json).not.toContain(orgId);
    expect(v).not.toHaveProperty("knownTargetHandle");
    evidence(world);
    world.knownTargetIds.push(c.targetId);
    expect(projectWorld(world).underground.civicCases?.[0]).toHaveProperty("knownTargetHandle");
  });

  it("persistence and split/bulk wait yield the same multi-office chronicle", () => {
    const world = make("national-network");
    // The fixture's source incident is public and committed to truth, while the
    // responses must be tied to actual elapsed world minutes (from 0 onward).
    const one = new CommandBus(world);
    const two = new CommandBus(worldStateSchema.parse(JSON.parse(JSON.stringify(world))));
    expect(one.execute({ type: "advanceTime", minutes: 1800 }).ok).toBe(true);
    for (let i = 0; i < 5; i++) {
      expect(two.execute({ type: "advanceTime", minutes: 360 }).ok).toBe(true);
    }
    expect(one.snapshot()).toEqual(two.snapshot());
    const saved = worldStateSchema.parse(JSON.parse(JSON.stringify(one.snapshot())));
    expect(saved.institutionalCases).toEqual(one.snapshot().institutionalCases);
  });

  it("terminal and GUI actions are identical; rank cannot change the institutional result", () => {
    const world = make("district");
    evidence(world);
    const id = stateCase(world).id;
    const a = new CommandBus(world);
    const b = new CommandBus(world);
    const mapped = parseTerminalCommand("civic map " + id);
    expect(mapped).toEqual({ ok: true,
      command: { type: "mapInstitutionalCase", caseId: id } });
    const guiMap = { type: "mapInstitutionalCase" as const, caseId: id };
    expect(a.execute(guiMap)).toEqual(b.execute(mapped.ok ? mapped.command : guiMap));
    const sold = parseTerminalCommand("civic sell " + id);
    expect(sold).toEqual({ ok: true,
      command: { type: "resolveInstitutionalCase", caseId: id, choice: "sell" } });
    const guiSell = { type: "resolveInstitutionalCase" as const, caseId: id, choice: "sell" as const };
    expect(a.execute(guiSell)).toEqual(b.execute(sold.ok ? sold.command : guiSell));
    expect(a.snapshot()).toEqual(b.snapshot());
    const ranked = structuredClone(world);
    ranked.player.rank = 1;
    const low = new CommandBus(ranked);
    low.execute(guiMap);
    expect(low.execute(guiSell).events.filter(e => e.type === "ValueTransferred"))
      .toEqual(a.snapshot().economy.ledger.length > 0
        ? [{ type: "ValueTransferred", ...{
          entryId: a.snapshot().economy.ledger.at(-1)!.id,
          direction: "credit", amount: a.snapshot().economy.ledger.at(-1)!.amount,
          balanceAfter: a.snapshot().economy.ledger.at(-1)!.balanceAfter,
          causeKind: "institutional-case", causeId: id,
          counterparty: "fictional-records-service", worldMinute: 0,
        }}] : []);
  });

  it("keeps canonical and terminal worlds unchanged", () => {
    const world = createSliceWorldState({ scenario: "canonical", seed: 7 });
    const bus = new CommandBus(world);
    expect(bus.snapshot().institutionalCases).toBeUndefined();
    expect(bus.execute({ type: "advanceTime", minutes: 5 * 1440 }).ok).toBe(true);
    expect(bus.snapshot().institutionalCases).toBeUndefined();
    expect(bus.execute({ type: "mapInstitutionalCase", caseId: "civic:forged" }).error)
      .toBe("CIVIC_UNAVAILABLE");
  });
});
