import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  npcSolidarityPlans, SOLIDARITY_GRUDGE, SOLIDARITY_TRUST_LOSS,
} from "@/game/simulation/systems/npc-solidarity";
import { resolveNpcSolidarity } from "@/game/simulation/systems/underground";
import { counterpartWeight, offerTargetWeight } from "@/game/simulation/systems/living-ties";
import { worldStateSchema } from "@/persistence/world-state-schema";

const TICK = 360;

function fixture(seed=17, scenario: "fresh-scene" | "high-pressure" = "fresh-scene") {
  const world = createSliceWorldState({ seed, scenario });
  const defender = world.underground.actors.find(actor =>
    actor.targetId && actor.organizationId && world.underground.organizations?.some(o =>
      o.id === actor.organizationId && o.rivalIds.length));
  const org = world.underground.organizations?.find(o => o.id === defender?.organizationId);
  const attacker = world.underground.actors.find(actor =>
    actor.targetId && actor.organizationId && org?.rivalIds.includes(actor.organizationId));
  const witness = world.underground.actors.find(actor =>
    actor.id !== defender?.id && actor.id !== attacker?.id && !actor.targetId);
  if (!defender?.targetId || !org || !attacker?.targetId || !witness) {
    throw new Error("missing generated source/peer/rival");
  }
  witness.organizationId = org.id;
  witness.network = defender.network;
  org.agenda = "expand";
  for (const actor of world.underground.actors) {
    actor.activity = 0;
    delete actor.modelId;
    delete actor.temperament;
  }
  // Isolate the one trusted colleague from other seeded relationships.
  for (const rel of world.underground.relationships) {
    if (rel.toId === defender.id &&
        rel.fromId !== defender.id) rel.trust = 0;
  }
  const existing = world.underground.relationships.find(r =>
    r.fromId === witness.id && r.toId === defender.id);
  if (existing) existing.trust = 50;
  else world.underground.relationships.push({
    id: `rel:${witness.id}>${defender.id}`, fromId: witness.id,
    toId: defender.id, trust: 50, fear: 0, grudge: 0, updatedWorldMinute: 0,
  });
  // The witness's prior standing toward this attacker is controlled,
  // so the observed delta is the causal effect of the public incident.
  world.underground.relationships = world.underground.relationships.filter(r =>
    !(r.fromId === witness.id && r.toId === attacker.id));
  const incident = {
    id: "incident:public-ally", kind: "npc-intrusion" as const,
    actorId: attacker.id, counterpartId: defender.id,
    outcome: "succeeded" as const, public: true, worldMinute: TICK,
  };
  world.underground.incidents.push(incident);
  world.underground.forumPosts.push({
    id: "forum:public-ally", board: defender.network,
    authorId: witness.id, subject: { kind: "incident", id: incident.id },
    worldMinute: TICK,
  });
  world.worldMinute = TICK;
  world.underground.lastTickMinute = TICK;
  return { world, defender, attacker, witness, org, incident };
}

describe("G5 P6 — trusted NPC solidarity has real seeded consequences (#155)", () => {
  it("turns real public same-board rival harm into exactly one sourced witness action at next tick", () => {
    for(const scenario of ["fresh-scene","high-pressure"] as const) {
      const {world, defender, attacker, witness, incident}=fixture(17,scenario);
      const beforeAttack = counterpartWeight(world,witness,attacker);
      const offenderTarget=world.targets.find(t=>t.id===attacker.targetId)!;
      const beforeOffer=offerTargetWeight(world,witness,offenderTarget,attacker);
      expect(npcSolidarityPlans(world,TICK)).toEqual([]);
      const expected=[{incidentId:incident.id,witnessId:witness.id,
        attackerId:attacker.id,defenderId:defender.id}];
      expect(npcSolidarityPlans(world,2*TICK)).toEqual(expected);
      const response=resolveNpcSolidarity(world,2*TICK);
      expect(response).toEqual([expect.objectContaining({
        type:"RelationshipChanged",fromId:witness.id,toId:attacker.id,
        causeKind:"incident",causeId:incident.id,grudge:SOLIDARITY_GRUDGE,
        trust: expect.any(Number),worldMinute:2*TICK,
      })]);
      expect(counterpartWeight(world,witness,attacker)).toBe(beforeAttack+SOLIDARITY_GRUDGE);
      expect(offerTargetWeight(world,witness,offenderTarget,attacker))
        .toBe(beforeOffer+SOLIDARITY_GRUDGE);
      const rel=world.underground.relationships.find(r=>
        r.fromId===witness.id&&r.toId===attacker.id)!;
      const currentTrust=rel.trust, currentGrudge=rel.grudge;
      expect(currentTrust).toBeLessThanOrEqual(0);
      expect(currentGrudge).toBe(SOLIDARITY_GRUDGE);
      const altered = fixture(17,scenario);
      altered.witness.rank=1;
      altered.defender.rank=999999;
      altered.attacker.rank=123;
      altered.world.player.rank=1;
      expect(npcSolidarityPlans(altered.world,2*TICK)).toEqual(expected);
      expect(SOLIDARITY_TRUST_LOSS).toBe(-4);
    }
  });

  it("fails closed against hidden incident, wrong board, arbitrary rumor, future and stale posts", () => {
    for(const scenario of ["fresh-scene","high-pressure"] as const) {
      for(const kind of [
        "private","repelled","no-post","wrong-post","wrong-board","author-other-board",
        "not-rivals","witness-untrusted","witness-other-board","witness-other-org",
        "no-owner","attacker-no-target","future","stale","canonical",
      ] as const) {
        const {world,defender,attacker,witness,org}=fixture(21,scenario);
        const incident=world.underground.incidents.at(-1)!;
        const post=world.underground.forumPosts.at(-1)!;
        let at=2*TICK;
        if(kind==="private")incident.public=false;
        if(kind==="repelled")incident.outcome="repelled";
        if(kind==="no-post")world.underground.forumPosts=[];
        if(kind==="wrong-post")post.subject.id="incident:unknown";
        if(kind==="wrong-board")post.board=defender.network==="white"?"black":"white";
        if(kind==="author-other-board")witness.network=witness.network==="white"?"black":"white";
        if(kind==="not-rivals")org.rivalIds=[];
        if(kind==="witness-untrusted"){
          world.underground.relationships.find(r=>
            r.fromId===witness.id&&r.toId===defender.id)!.trust=19;
        }
        if(kind==="witness-other-board")witness.network=witness.network==="white"?"black":"white";
        if(kind==="witness-other-org")witness.organizationId=attacker.organizationId;
        if(kind==="no-owner")delete defender.targetId;
        if(kind==="attacker-no-target")delete attacker.targetId;
        if(kind==="future")at=TICK;
        if(kind==="stale")at=3*TICK;
        if(kind==="canonical")world.scenario="canonical";
        expect(npcSolidarityPlans(world,at),scenario+" "+kind).toEqual([]);
      }
    }
  });

  it("does not double-count repeated posts or let a second-board post hide the valid source", () => {
    const {world,incident,defender,witness}=fixture();
    const post=world.underground.forumPosts[0]!;
    world.underground.forumPosts.push({...post,id:"forum:duplicate"});
    expect(npcSolidarityPlans(world,720)).toHaveLength(1);
    // A published other-board item must not shadow the actual witnessed post.
    const author=world.underground.actors.find(a=>a.id!==witness.id &&
      a.network!==defender.network && a.id!==incident.actorId &&
      a.id!==incident.counterpartId);
    if(author)world.underground.forumPosts.push({
      ...post,id:"forum:other-board",authorId:author.id,board:author.network,
    });
    expect(npcSolidarityPlans(world,720)).toHaveLength(1);
  });

  it("actually executes at 720, not 360; split waits + save/resume reproduce all causal effects", () => {
    for(const scenario of ["fresh-scene","high-pressure"] as const) {
      const {world,witness,attacker,incident}=fixture(43,scenario);
      const baseline=structuredClone(world);
      baseline.underground.forumPosts=[];
      const actual=new CommandBus(world);
      const quiet=new CommandBus(baseline);
      const first=actual.execute({type:"advanceTime",minutes:360});
      const other=quiet.execute({type:"advanceTime",minutes:360});
      const social=first.events.filter(event=>event.type==="RelationshipChanged" &&
        event.causeId===incident.id && event.fromId===witness.id &&
        event.toId===attacker.id);
      expect(first.ok).toBe(true);
      expect(social).toHaveLength(1);
      expect(other.events.some(event=>event.type==="RelationshipChanged" &&
        event.causeId===incident.id && event.fromId===witness.id)).toBe(false);
      const relation=actual.snapshot().underground.relationships.find(rel=>
        rel.fromId===witness.id&&rel.toId===attacker.id)!;
      expect(relation.grudge).toBeGreaterThan(
        quiet.snapshot().underground.relationships.find(rel=>
          rel.fromId===witness.id&&rel.toId===attacker.id)?.grudge??0);
      const original=new CommandBus(world);
      const copy=new CommandBus(worldStateSchema.parse(JSON.parse(JSON.stringify(world))));
      const bulk=original.execute({type:"advanceTime",minutes:1080});
      const chunk1=copy.execute({type:"advanceTime",minutes:360});
      const halfway=worldStateSchema.parse(JSON.parse(JSON.stringify(copy.snapshot())));
      const resumed=new CommandBus(halfway);
      const chunk2=resumed.execute({type:"advanceTime",minutes:720});
      expect(original.snapshot()).toEqual(resumed.snapshot());
      const domain=(events:typeof bulk.events)=>
        events.filter(e=>e.type!=="WorldTimeAdvanced");
      expect(domain(bulk.events)).toEqual(domain([...chunk1.events,...chunk2.events]));
      expect(domain(bulk.events).filter(e=>e.type==="RelationshipChanged" &&
        e.causeId===incident.id&&e.fromId===witness.id)).toHaveLength(1);
      expect(JSON.stringify(projectWorld(original.snapshot()))).not.toContain(
        "npcSolidarityPlans");
    }
  });

  it("no NPC solidarity occurs after run terminality", () => {
    const {world}=fixture();
    const end=structuredClone(world);
    end.ending={
      status:"compromised",causeKind:"investigation",
      causeId:"test:terminal",worldMinute:360,
    };
    expect(npcSolidarityPlans(end,720)).toEqual([]);
  });
});
