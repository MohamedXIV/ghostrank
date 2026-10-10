import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { peerWarningDefenseBonus } from "@/game/simulation/systems/organizations";
import { defenseBonusOf } from "@/game/simulation/systems/organizations";
import { hashUnit } from "@/game/simulation/rng/stateless-hash";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { WorldState } from "@/game/simulation/state/world-state";

const DAY = 24 * 60;

function scene(seed = 17, scenario: "fresh-scene" | "high-pressure" = "fresh-scene") {
  const world = createSliceWorldState({ seed, scenario });
  const defender = world.underground.actors.find(a => a.targetId && a.organizationId &&
    world.underground.organizations?.some(o => o.id === a.organizationId && o.rivalIds.length))!;
  const organization = world.underground.organizations!.find(o => o.id === defender.organizationId)!;
  const attacker = world.underground.actors.find(a => a.id !== defender.id &&
    a.organizationId && organization.rivalIds.includes(a.organizationId))!;
  const peer = world.underground.actors.find(a => a.id !== attacker.id && a.id !== defender.id)!;
  peer.organizationId = defender.organizationId;
  peer.network = defender.network;
  peer.defense = 80;
  defender.defense = 50;
  organization.agenda = "expand";
  delete organization.organizationResponse;
  // Only the real trusted direction toward the owner grants cooperation.
  world.underground.relationships = world.underground.relationships.filter(r =>
    !(r.fromId === peer.id && r.toId === defender.id));
  world.underground.relationships.push({
    id: `rel:${peer.id}>${defender.id}`,
    fromId: peer.id, toId: defender.id,
    trust: 40, fear: 0, grudge: 0, updatedWorldMinute: 0,
  });
  // Credible warning: an actual previously public rival intrusion, followed
  // by a forum comment on the attacked owner's own network.
  world.underground.incidents.push({
    id: "incident:public-warning", kind: "npc-intrusion",
    actorId: attacker.id, counterpartId: defender.id,
    outcome: "repelled", public: true, worldMinute: 0,
  });
  world.underground.forumPosts.push({
    id: "forum:public-warning", board: defender.network,
    authorId: peer.id, subject: { kind: "incident", id: "incident:public-warning" },
    worldMinute: 0,
  });
  return { world, defender, attacker, peer, organization };
}

describe("G5 P5 trusted same-board peers reinforce a rival target owner (#131)", () => {
  it("provides an actual bounded defense bonus sourced to public incident + trusted peer", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      const { world, defender, attacker, peer } = scene(17, scenario);
      expect(peerWarningDefenseBonus(world, defender, 360)).toBe(8);
      expect(peerWarningDefenseBonus(world, defender, DAY)).toBe(8);
      expect(peerWarningDefenseBonus(world, defender, DAY + 1)).toBe(0);
      const before = peerWarningDefenseBonus(world, defender, 360);
      peer.rank = 1; attacker.rank = 999_999; defender.rank = 12; world.player.rank = 1;
      expect(peerWarningDefenseBonus(world, defender, 360)).toBe(before);
      peer.defense = 20;
      expect(peerWarningDefenseBonus(world, defender, 360)).toBe(2);
      peer.defense = 0;
      expect(peerWarningDefenseBonus(world, defender, 360)).toBe(0);
    }
  });

  it("never invents knowledge across private incident, wrong board, rival, time or trust", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      for (const forbidden of [
        "incident-private", "no-post", "wrong-incident", "board-inaccessible",
        "peer-other-network", "peer-other-org", "peer-distrusts", "attacker-not-rival",
        "no-owner", "same-tick", "future", "stale",
      ] as const) {
        const { world, defender, attacker, peer, organization } = scene(23, scenario);
        let minute = 360;
        if (forbidden === "incident-private") world.underground.incidents[0]!.public = false;
        if (forbidden === "no-post") world.underground.forumPosts = [];
        if (forbidden === "wrong-incident") world.underground.forumPosts[0]!.subject.id = "incident:wrong";
        if (forbidden === "board-inaccessible")
          world.underground.forumPosts[0]!.board = defender.network === "black" ? "white" : "black";
        if (forbidden === "peer-other-network") peer.network = peer.network === "black" ? "white" : "black";
        if (forbidden === "peer-other-org") peer.organizationId = attacker.organizationId;
        if (forbidden === "peer-distrusts")
          world.underground.relationships.find(r => r.fromId === peer.id && r.toId === defender.id)!.trust = 0;
        if (forbidden === "attacker-not-rival") organization.rivalIds = [];
        if (forbidden === "no-owner") delete defender.targetId;
        if (forbidden === "same-tick") minute = 0;
        if (forbidden === "future") minute = -1;
        if (forbidden === "stale") minute = DAY + 1;
        expect(peerWarningDefenseBonus(world, defender, minute),
          `${scenario}: ${forbidden}`).toBe(0);
      }
    }
    const canonical = createSliceWorldState({ scenario: "canonical" });
    expect(peerWarningDefenseBonus(canonical, canonical.underground.actors[0]!, 360)).toBe(0);
  });

  it("changes real seeded NPC intrusion outcomes and G5 emergency agendas, not only a helper", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      let savedRaidVictims = 0;
      let deflectedEmergencyAgendas = 0;
      for (let seed = 1; seed <= 90; seed++) {
        const { world, attacker, defender, peer, organization } = scene(seed, scenario);
        // One source-backed defender + one trusted reinforcement + rival
        // attacker, with controlled skill so the same roll is a narrow breach
        // without team support but a repelled raid WITH it.
        world.underground.actors = [attacker, defender, peer];
        for (const a of world.underground.actors) {
          a.activity = 0;
          delete a.temperament;
          delete a.modelId;
        }
        attacker.activity = 100;
        world.underground.relationships.push({
          id: `rel:${attacker.id}>${defender.id}`,
          fromId: attacker.id, toId: defender.id,
          trust: -10, fear: 0, grudge: 100, updatedWorldMinute: 0,
        });
        const noise = hashUnit(world.underground.seed, "roll", 1, attacker.id) * 40 - 20;
        attacker.skill = Math.round(defender.defense + defenseBonusOf(world, defender) - noise + 3);
        const unwarned = structuredClone(world);
        unwarned.underground.forumPosts = [];
        const active = new CommandBus(world);
        const quiet = new CommandBus(unwarned);
        const withWarning = active.execute({ type: "advanceTime", minutes: 360 });
        const noWarning = quiet.execute({ type: "advanceTime", minutes: 360 });
        expect(withWarning.ok).toBe(true);
        expect(noWarning.ok).toBe(true);
        const updated = active.snapshot(), baseline = quiet.snapshot();
        const a = updated.underground.incidents.find(i => i.actorId === attacker.id && i.worldMinute === 360);
        const b = baseline.underground.incidents.find(i => i.actorId === attacker.id && i.worldMinute === 360);
        expect(a?.counterpartId).toBe(b?.counterpartId);
        if (a?.counterpartId !== defender.id) continue;
        expect(b?.outcome).toBe("succeeded");
        expect(a.outcome).toBe("repelled");
        savedRaidVictims++;
        if (updated.underground.organizations!.find(o => o.id === organization.id)!.agenda === "expand" &&
          baseline.underground.organizations!.find(o => o.id === organization.id)!.agenda === "defend") {
          deflectedEmergencyAgendas++;
        }
      }
      expect(savedRaidVictims, scenario).toBeGreaterThan(10);
      expect(deflectedEmergencyAgendas, scenario).toBeGreaterThan(10);
    }
  });

  it("is repeatable after current-run save and preserves player-safe projection", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      const { world, defender } = scene(43, scenario);
      const saved = worldStateSchema.parse(JSON.parse(JSON.stringify(world))) as WorldState;
      expect(peerWarningDefenseBonus(saved, saved.underground.actors.find(a => a.id === defender.id)!, 360))
        .toBe(peerWarningDefenseBonus(world, defender, 360));
      const original = new CommandBus(world);
      const replay = new CommandBus(saved);
      const command = { type: "advanceTime", minutes: 360 * 3 } as const;
      expect(replay.execute(command)).toEqual(original.execute(command));
      expect(replay.snapshot()).toEqual(original.snapshot());
      const projection = JSON.stringify(projectWorld(original.snapshot()));
      expect(projection).not.toContain("peerWarningDefenseBonus");
      expect(projection).not.toContain('"trust"');
      expect(projection).not.toContain('"rivalIds"');
    }
  });
});
