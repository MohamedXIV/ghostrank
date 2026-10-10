import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  defenseBonusOf,
  offerRateBonus,
} from "@/game/simulation/systems/organizations";
import { advanceUnderground } from "@/game/simulation/systems/underground";
import type { UndergroundIncident, WorldState } from "@/game/simulation/state/world-state";
import { worldStateSchema } from "@/persistence/world-state-schema";

const TICK = 360;
const TWO_DAYS = 48 * 60;

function attackedWorld(seed = 17) {
  const world = createSliceWorldState({ scenario: "fresh-scene", seed });
  // Control independently seeded actor activity: this tests the *specific*
  // cause, not whichever unrelated peer would have happened to act.
  for (const actor of world.underground.actors) {
    actor.activity = 0;
    delete actor.temperament;
  }
  const org = world.underground.organizations!.find(o =>
    o.rivalIds.some(id => world.underground.actors.some(a => a.organizationId === id && a.targetId)));
  if (!org) throw new Error("Expected generated rival organizations");
  org.agenda = "expand";
  const defender = world.underground.actors.find(a => a.organizationId === org.id && a.targetId)!;
  const attacker = world.underground.actors.find(a =>
    a.targetId && a.organizationId && org.rivalIds.includes(a.organizationId))!;
  const breach: UndergroundIncident = {
    id: "incident:fixture-rival-breach",
    kind: "npc-intrusion",
    actorId: attacker.id,
    counterpartId: defender.id,
    outcome: "succeeded",
    public: false,
    worldMinute: TICK,
  };
  world.underground.incidents.push(breach);
  return { world, orgId: org.id, defenderId: defender.id, attackerId: attacker.id, breach };
}

function stance(world: WorldState, id: string) {
  return world.underground.organizations!.find(o => o.id === id)!;
}

describe("G5 organization reacts to rival intrusion at authoritative boundaries (#121)", () => {
  it("responds to a private successful rival breach, actually changes defense/offers, and records provenance", () => {
    const { world, orgId, defenderId, breach } = attackedWorld();
    const org = stance(world, orgId);
    const defender = world.underground.actors.find(a => a.id === defenderId)!;
    expect(defenseBonusOf(world, defender)).toBe(0);
    expect(offerRateBonus(world, defender)).toBe(15);
    const events = advanceUnderground(world, TICK);
    expect(org.agenda).toBe("defend");
    expect(defenseBonusOf(world, defender)).toBe(10);
    expect(offerRateBonus(world, defender)).toBe(0);
    expect(events).toContainEqual(expect.objectContaining({
      type: "OrganizationAgendaShifted", organizationId: orgId,
      from: "expand", to: "defend", causeIncidentId: breach.id,
      reason: "rival-breach", worldMinute: TICK,
    }));
    // Hidden response is authoritative, NEVER projected as player knowledge.
    const visible = JSON.stringify(projectWorld(world));
    expect(visible).not.toContain("organizationResponse");
    expect(visible).not.toContain("OrganizationAgendaShifted");
    expect(visible).not.toContain(breach.id);
  });

  it("stays defended under continuing breaches, then restores expansion after 48 quiet world hours", () => {
    const { world, orgId, attackerId, defenderId } = attackedWorld();
    const first = advanceUnderground(world, TICK);
    expect(first.filter(e => e.type === "OrganizationAgendaShifted")).toHaveLength(1);
    world.underground.incidents.push({
      id: "incident:fixture-repeat",
      kind: "npc-intrusion", actorId: attackerId, counterpartId: defenderId,
      outcome: "succeeded", public: false, worldMinute: TICK * 2,
    });
    const again = advanceUnderground(world, TICK * 2);
    expect(stance(world, orgId).agenda).toBe("defend");
    expect(again.some(e => e.type === "OrganizationAgendaShifted")).toBe(false);
    advanceUnderground(world, TICK * 2 + TWO_DAYS - TICK);
    expect(stance(world, orgId).agenda).toBe("defend");
    const restored = advanceUnderground(world, TICK * 2 + TWO_DAYS);
    expect(stance(world, orgId).agenda).toBe("expand");
    expect(restored).toContainEqual(expect.objectContaining({
      type: "OrganizationAgendaShifted", organizationId: orgId,
      from: "defend", to: "expand", reason: "quiet-recovery",
      worldMinute: TICK * 2 + TWO_DAYS,
    }));
    const defender = world.underground.actors.find(a => a.id === defenderId)!;
    expect(offerRateBonus(world, defender)).toBe(15);
    expect(defenseBonusOf(world, defender)).toBe(0);
  });

  it("does not react to repelled intrusions or friendly incidents, and leaves canonical alone", () => {
    for (const kind of ["repelled", "same-org"] as const) {
      const { world, orgId, defenderId, breach } = attackedWorld();
      if (kind === "repelled") breach.outcome = "repelled";
      else breach.actorId = defenderId;
      const events = advanceUnderground(world, TICK);
      expect(stance(world, orgId).agenda).toBe("expand");
      expect(events.some(e => e.type === "OrganizationAgendaShifted")).toBe(false);
    }
    const canonical = createSliceWorldState({ scenario: "canonical", seed: 17 });
    expect(canonical.underground.organizations).toBeUndefined();
    expect(advanceUnderground(canonical, TICK).some(e => e.type === "OrganizationAgendaShifted")).toBe(false);
  });

  it("is identical for one long wait versus saved-and-resumed bounded waits, independent of public rank", () => {
    const initial = worldStateSchema.parse(attackedWorld().world);
    const bulk = structuredClone(initial);
    const split = structuredClone(initial);
    const bulkEvents = advanceUnderground(bulk, TICK + TWO_DAYS);
    const first = advanceUnderground(split, TICK);
    const resumed = worldStateSchema.parse(JSON.parse(JSON.stringify(split)));
    for (const actor of resumed.underground.actors) actor.rank += 2000;
    const later = advanceUnderground(resumed, TICK + TWO_DAYS);
    const shifts = (events: typeof bulkEvents) =>
      events.filter(e => e.type === "OrganizationAgendaShifted");
    expect(shifts(bulkEvents)).toEqual(shifts([...first, ...later]));
    expect(bulk.underground.organizations).toEqual(resumed.underground.organizations);
    expect(stance(bulk, initial.underground.organizations![0]!.id)).toEqual(
      stance(resumed, initial.underground.organizations![0]!.id));
  });
});
