import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  factionCounterCommissionTargets,
  offerTargetWeight,
  ownerOfTarget,
  pickWeighted,
} from "@/game/simulation/systems/living-ties";
import { rewardContract } from "@/game/simulation/systems/underground";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { WorldState, UndergroundContract } from "@/game/simulation/state/world-state";

const HOUR = 60;
const WINDOW = 72 * HOUR;

function scene(seed = 13, scenario: "fresh-scene" | "high-pressure" = "fresh-scene") {
  const world = createSliceWorldState({ scenario, seed });
  const victim = world.underground.actors.find(a =>
    a.targetId && a.organizationId &&
    world.underground.organizations?.find(o => o.id === a.organizationId)?.rivalIds.length)!;
  const victimOrg = world.underground.organizations!.find(o => o.id === victim.organizationId)!;
  const offender = world.underground.actors.find(a =>
    a.targetId && victimOrg.rivalIds.includes(a.organizationId ?? ""))!;
  const ally = world.underground.actors.find(a =>
    a.id !== victim.id && a.id !== offender.id && !a.targetId)!;
  const victimTarget = world.targets.find(t => t.id === victim.targetId)!;
  const offenderTarget = world.targets.find(t => t.id === offender.targetId)!;
  // Real same-board publication plus an allied, trusted contract broker.
  // No hidden communication or extra broker slot is created.
  victim.network = offender.network;
  ally.network = offender.network;
  ally.organizationId = victimOrg.id;
  victimOrg.agenda = "expand";
  const job: UndergroundContract = {
    id: "contract:public-op", issuerId: offender.id,
    targetId: victimTarget.id, objective: "recon-report",
    requiredServices: 1, status: "completed",
    offeredWorldMinute: 0, expiresWorldMinute: 1440,
    acceptedWorldMinute: 0, resolvedWorldMinute: 0,
  };
  world.underground.contracts = [job];
  for (const actor of world.underground.actors) {
    actor.activity = 0;
    delete actor.temperament;
  }
  // The generated starting trust to the player can vary by seed. Only this
  // broker is allowed to create the follow-up offer for causal comparison.
  for (const rel of world.underground.relationships) {
    if (rel.toId === "player") rel.trust = rel.fromId === ally.id ? 100 : -100;
  }
  const acquaintance = world.underground.relationships.find(x =>
    x.fromId === ally.id && x.toId === "player");
  if (!acquaintance) throw new Error("Missing generated ally player relation");
  rewardContract(world, job, 0);
  return { world, victim, offender, ally, job, offenderTarget, victimOrg };
}

describe("G5 P4: faction counter-commissions after PUBLIC contract fallout (#129)", () => {
  it("lends trusted faction brokers a bounded rival-asset preference grounded in their owner's published grievance", () => {
    const { world, ally, offender, offenderTarget, victimOrg } = scene();
    const before = offerTargetWeight(world, ally, offenderTarget, ownerOfTarget(world, offenderTarget));
    const pressure = factionCounterCommissionTargets(world, ally, 360);
    expect([...pressure]).toContain(offender.organizationId);
    expect(offerTargetWeight(world, ally, offenderTarget, ownerOfTarget(world, offenderTarget), pressure))
      .toBe(before + 40);
    const unrelated = world.targets.find(t =>
      t.organizationId !== victimOrg.id && t.organizationId !== offender.organizationId);
    if (unrelated) {
      expect(offerTargetWeight(world, ally, unrelated, ownerOfTarget(world, unrelated), pressure))
        .toBe(offerTargetWeight(world, ally, unrelated, ownerOfTarget(world, unrelated)));
    }
    // This is a weighted opportunity, not a hard target restriction or kill.
    const others = world.targets.filter(t => t.organizationId !== victimOrg.id);
    expect(others.every(t => offerTargetWeight(world, ally, t, ownerOfTarget(world, t), pressure) > 0)).toBe(true);
    expect(pickWeighted(others, others.map(t =>
      offerTargetWeight(world, ally, t, ownerOfTarget(world, t), pressure)), 0).id).toBe(others[0]!.id);
    const prior = [...pressure];
    ally.rank = 999_999;
    offender.rank = 1;
    world.player.rank = 1;
    expect([...factionCounterCommissionTargets(world, ally, 360)]).toEqual(prior);
  });

  it("never spreads an inaccessible, independent, neutral, uncompleted, unverified or stale commission", () => {
    for (const condition of [
      "hidden-board", "independent", "neutral", "not-delivered",
      "missing-publication", "no-grudge", "stale", "future",
    ] as const) {
      const { world, ally, victim, offender, job, victimOrg } = scene();
      let minute = 360;
      if (condition === "hidden-board") ally.network = ally.network === "white" ? "black" : "white";
      if (condition === "independent") delete offender.organizationId;
      if (condition === "neutral") victimOrg.rivalIds = [];
      if (condition === "not-delivered") job.status = "accepted";
      if (condition === "missing-publication") world.underground.forumPosts = [];
      if (condition === "no-grudge") {
        const rel = world.underground.relationships.find(x => x.fromId === victim.id && x.toId === offender.id);
        if (!rel) throw new Error("Expected actual published grievance");
        rel.grudge = 0;
      }
      if (condition === "stale") minute = WINDOW + 1;
      if (condition === "future") minute = -1;
      expect([...factionCounterCommissionTargets(world, ally, minute)], condition).toEqual([]);
    }
    const canonical = createSliceWorldState({ scenario: "canonical" });
    expect([...factionCounterCommissionTargets(canonical, canonical.underground.actors[0]!, 360)]).toEqual([]);
  });

  it("is valid current-save replay authority without leaking secret faction motives", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      const { world, ally, offender } = scene(41, scenario);
      const copy = worldStateSchema.parse(JSON.parse(JSON.stringify(world))) as WorldState;
      expect([...factionCounterCommissionTargets(copy, copy.underground.actors.find(x=>x.id === ally.id)!, 360)])
        .toEqual([...factionCounterCommissionTargets(world, ally, 360)]);
      const projection = JSON.stringify(projectWorld(copy));
      expect(projection).not.toContain("factionCounterCommissionTargets");
      expect(projection).not.toContain("organizationResponse");
      expect(projection).not.toContain('"rivalIds"');
      expect(projection).not.toContain('"agenda"');
      // Player may see the published broker/target contract, but never a
      // privileged disclosure of which faction now wants to retaliate.
      expect(offender.id).toBeTruthy();
    }
  });

  it("causes actual generated world offers to change, not just a dead helper value", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      let extraOffers = 0;
      for (let seed = 1; seed <= 80; seed++) {
        const { world, ally, offender } = scene(seed, scenario);
        const quiet = structuredClone(world);
        // Without the actual publication, keep identical seeded clock,
        // eligibility, issueer's network, and activities.
        quiet.underground.forumPosts = [];
        const a = new CommandBus(world);
        const b = new CommandBus(quiet);
        const live = a.execute({ type: "advanceTime", minutes: 360 });
        const neutral = b.execute({ type: "advanceTime", minutes: 360 });
        expect(live.ok).toBe(true);
        expect(neutral.ok).toBe(true);
        const offered = (result: typeof live) => result.events.filter(
          e => e.type === "ContractOffered" && e.issuerId === ally.id
        );
        if (offered(live).length > offered(neutral).length) {
          const fresh = a.snapshot().underground.contracts.find(c =>
            c.issuerId === ally.id && c.offeredWorldMinute === 360);
          expect(fresh).toBeDefined();
          const target = a.snapshot().targets.find(t => t.id === fresh!.targetId)!;
          expect(target.organizationId).toBe(offender.organizationId);
          extraOffers++;
        }
      }
      expect(extraOffers, scenario).toBeGreaterThan(0);
    }
  });
});
