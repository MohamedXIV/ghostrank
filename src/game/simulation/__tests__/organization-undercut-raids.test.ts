import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { counterpartWeight } from "@/game/simulation/systems/living-ties";
import { advanceOrganizationAgendas } from "@/game/simulation/systems/organization-agenda-dynamics";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type { WorldState } from "@/game/simulation/state/world-state";

function members(seed: number, scenario: "fresh-scene" | "high-pressure" = "fresh-scene") {
  const world = createSliceWorldState({ scenario, seed });
  const hacker = world.underground.actors.find(a =>
    a.targetId !== undefined && a.organizationId !== undefined &&
    world.underground.organizations?.some(o =>
      o.id === a.organizationId && o.rivalIds.some(rid =>
        world.underground.actors.some(x => x.organizationId === rid && x.targetId))))!;
  const org = world.underground.organizations!.find(o => o.id === hacker.organizationId)!;
  const rival = world.underground.actors.find(a =>
    a.targetId !== undefined && org.rivalIds.includes(a.organizationId ?? ""))!;
  const colleague = world.underground.actors.find(a =>
    a.id !== hacker.id && a.organizationId === hacker.organizationId)!;
  return { world, hacker, org, rival, colleague };
}

function oneTick(seed: number, agenda: "expand" | "undercut", scenario: "fresh-scene" | "high-pressure") {
  const { world, hacker, org } = members(seed, scenario);
  org.agenda = agenda;
  // Exactly ONE hacker chooses one peer; no other incidental AI activity,
  // preserving the same seed, candidate ordering and RNG draw for the contrast.
  for (const actor of world.underground.actors) {
    actor.activity = 0;
    delete actor.temperament;
  }
  hacker.activity = 100;
  const bus = new CommandBus(world);
  const result = bus.execute({ type: "advanceTime", minutes: 360 });
  expect(result.ok).toBe(true);
  const incident = bus.snapshot().underground.incidents.find(i =>
    i.actorId === hacker.id && i.worldMinute === 360);
  expect(incident, `${scenario} seed ${seed}: no actor incident`).toBeDefined();
  const counterpart = bus.snapshot().underground.actors.find(a => a.id === incident!.counterpartId)!;
  return { rival: org.rivalIds.includes(counterpart.organizationId ?? ""), world: bus.snapshot(), events: result.events };
}

describe("G5 P1: an undercut agenda changes actual NPC-versus-NPC target choices (#123)", () => {
  it("adds 60 weight only against a rival when an organization is actively undercutting", () => {
    const { world, hacker, org, rival, colleague } = members(3);
    org.agenda = "expand";
    const rivalBefore = counterpartWeight(world, hacker, rival);
    const colleagueBefore = counterpartWeight(world, hacker, colleague);

    org.agenda = "undercut";
    expect(counterpartWeight(world, hacker, rival) - rivalBefore).toBe(60);
    expect(counterpartWeight(world, hacker, colleague)).toBe(colleagueBefore);

    org.agenda = "defend";
    expect(counterpartWeight(world, hacker, rival)).toBe(rivalBefore);
    hacker.rank = 1;
    rival.rank = 900_000;
    expect(counterpartWeight(world, hacker, rival)).toBe(rivalBefore);

    const canonical = createSliceWorldState({ scenario: "canonical", seed: 3 });
    const [a, b] = canonical.underground.actors;
    expect(counterpartWeight(canonical, a!, b!)).toBeGreaterThan(0);
    expect(canonical.underground.organizations).toBeUndefined();
  });

  it("changes real generated NPC intrusion targets over 120 seeds in both scenarios", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      let neutralHits = 0;
      let undercutHits = 0;
      let changedChoices = 0;
      for (let seed = 1; seed <= 120; seed++) {
        const neutral = oneTick(seed, "expand", scenario);
        const focused = oneTick(seed, "undercut", scenario);
        neutralHits += Number(neutral.rival);
        undercutHits += Number(focused.rival);
        changedChoices += Number(neutral.rival !== focused.rival);
      }
      expect(undercutHits, scenario).toBeGreaterThan(neutralHits + 10);
      expect(changedChoices, scenario).toBeGreaterThan(10);
    }
  });

  it("switches the offensive bias off during emergency defense, and restores it after quiet", () => {
    const { world, hacker, org, rival } = members(17);
    org.agenda = "undercut";
    const raidWeight = counterpartWeight(world, hacker, rival);
    world.underground.incidents.push({
      id: "incident:under-cut-response", kind: "npc-intrusion",
      actorId: rival.id, counterpartId: hacker.id, outcome: "succeeded",
      public: false, worldMinute: 360,
    });
    const response = advanceOrganizationAgendas(world, 360);
    expect(response).toContainEqual(expect.objectContaining({
      type: "OrganizationAgendaShifted", to: "defend",
      causeIncidentId: "incident:under-cut-response",
    }));
    expect(counterpartWeight(world, hacker, rival)).toBe(raidWeight - 60);
    expect(JSON.stringify(projectWorld(world))).not.toContain('"organizationResponse"');
    expect(JSON.stringify(projectWorld(world))).not.toContain('"agenda"');
    const recovered = advanceOrganizationAgendas(world, 360 + 48 * 60);
    expect(recovered).toContainEqual(expect.objectContaining({
      type: "OrganizationAgendaShifted", to: "undercut", reason: "quiet-recovery",
    }));
    expect(counterpartWeight(world, hacker, rival)).toBe(raidWeight);
  });

  it("keeps the authoritative incident/event sequence identical after a current-save roundtrip", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      const original = members(41, scenario).world;
      const actor = original.underground.actors.find(a => a.targetId)!;
      const org = original.underground.organizations!.find(o => o.id === actor.organizationId)!;
      org.agenda = "undercut";
      const replay = worldStateSchema.parse(JSON.parse(JSON.stringify(original))) as WorldState;
      const left = new CommandBus(original);
      const right = new CommandBus(replay);
      const command = { type: "advanceTime", minutes: 3 * 360 } as const;
      expect(right.execute(command)).toEqual(left.execute(command));
      expect(right.snapshot()).toEqual(left.snapshot());
    }
  });
});
