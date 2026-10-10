import { describe, expect, it } from "vitest";
import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { counterpartWeight } from "@/game/simulation/systems/living-ties";
import { rewardContract } from "@/game/simulation/systems/underground";
import { worldStateSchema } from "@/persistence/world-state-schema";
import type {
  UndergroundContract, WorldState,
} from "@/game/simulation/state/world-state";

const DAY = 1440;
const DELIVERED = "contract:public-rival-job";

function setup(seed = 13, scenario: "fresh-scene" | "high-pressure" = "fresh-scene") {
  const world = createSliceWorldState({ seed, scenario });
  const issuer = world.underground.actors.find(actor =>
    actor.organizationId && actor.targetId &&
    world.underground.organizations?.find(o => o.id === actor.organizationId)?.rivalIds.length)!;
  const issuerOrg = world.underground.organizations!.find(o => o.id === issuer.organizationId)!;
  const owner = world.underground.actors.find(actor =>
    actor.targetId && issuerOrg.rivalIds.includes(actor.organizationId ?? ""))!;
  const target = world.targets.find(t => t.id === owner.targetId)!;
  // The actual board is partitioned by white/black network. Model access
  // explicitly, never infer that the victim read an unrelated/private board.
  owner.network = issuer.network;
  world.underground.playerNetwork = issuer.network;
  world.underground.contracts = [];
  const relationship = world.underground.relationships.find(r =>
    r.fromId === owner.id && r.toId === issuer.id);
  if (relationship) { relationship.grudge = 0; relationship.trust = 0; }
  const contract: UndergroundContract = {
    id: DELIVERED,
    issuerId: issuer.id,
    targetId: target.id,
    objective: "recon-report",
    requiredServices: 1,
    status: "completed",
    offeredWorldMinute: 0,
    expiresWorldMinute: DAY,
    acceptedWorldMinute: 0,
    resolvedWorldMinute: 0,
  };
  return { world, owner, issuer, contract, target, issuerOrg };
}

function relation(world: WorldState, fromId: string, toId: string) {
  return world.underground.relationships.find(r => r.fromId === fromId && r.toId === toId);
}

function falloutEvents(events: ReturnType<typeof rewardContract>, ownerId: string, issuerId: string) {
  return events.filter(e => e.type === "RelationshipChanged" &&
    e.fromId === ownerId && e.toId === issuerId);
}

describe("G5 P3 public contract commission creates third-party consequences (#127)", () => {
  it("public rival contract delivery turns a posted broker claim into target-owner grudge and future NPC targeting", () => {
    const { world, owner, issuer, contract, target } = setup();
    const priorWeight = counterpartWeight(world, owner, issuer);
    const events = rewardContract(world, contract, 0);

    const forumPost = events.find(e => e.type === "ForumPosted" && e.subjectId === contract.id);
    expect(forumPost).toEqual(expect.objectContaining({
      type: "ForumPosted", board: issuer.network, authorId: issuer.id,
      subjectKind: "contract", subjectId: DELIVERED,
    }));
    expect(falloutEvents(events, owner.id, issuer.id)).toEqual([
      expect.objectContaining({
        type: "RelationshipChanged", fromId: owner.id, toId: issuer.id,
        grudge: 20, trust: -10, causeKind: "contract",
        causeId: DELIVERED, worldMinute: 0,
      }),
    ]);
    expect(counterpartWeight(world, owner, issuer)).toBe(priorWeight + 20);
    expect(relation(world, owner.id, "player")).toBeUndefined();

    // Only the real board's author + target are projected: not an invented
    // claim that the owner knows the *anonymous player* or a hidden agenda.
    const visible = projectWorld(world);
    const publicPost = visible.underground.forum.find(post =>
      post.subject.kind === "contract" && post.subject.targetHandle === target.handle);
    expect(publicPost).toEqual(expect.objectContaining({
      authorHandle: issuer.handle, board: issuer.network,
      subject: { kind: "contract", targetHandle: target.handle },
    }));
    expect(JSON.stringify(visible)).not.toContain('"organizationResponse"');
    expect(JSON.stringify(visible)).not.toContain('"grudge"');
  });

  it("does not create omniscient cross-network, non-rival, independent, or absent-owner grudges", () => {
    for (const caseName of ["cross-network", "not-rivals", "independent-broker", "no-owner"] as const) {
      const { world, owner, issuer, contract, issuerOrg } = setup();
      if (caseName === "cross-network") owner.network = owner.network === "white" ? "black" : "white";
      else if (caseName === "not-rivals") issuerOrg.rivalIds = [];
      else if (caseName === "independent-broker") delete issuer.organizationId;
      else world.underground.actors.splice(world.underground.actors.findIndex(a => a.id === owner.id), 1);

      const before = structuredClone(world.underground.relationships);
      const events = rewardContract(world, contract, 0);
      expect(falloutEvents(events, owner.id, issuer.id), caseName).toEqual([]);
      expect(world.underground.relationships.filter(r =>
        r.fromId === owner.id && r.toId === issuer.id),
      caseName).toEqual(before.filter(r => r.fromId === owner.id && r.toId === issuer.id));
      expect(events.some(e => e.type === "ForumPosted"), caseName).toBe(true);
    }
    const canonical = createSliceWorldState({ scenario: "canonical" });
    const contract: UndergroundContract = {
      id: "contract:fixture", issuerId: "vesper", targetId: "nightshade",
      objective: "intrusion", status: "completed",
      offeredWorldMinute: 0, expiresWorldMinute: DAY,
    };
    const events = rewardContract(canonical, contract, 0);
    expect(events.some(e => e.type === "RelationshipChanged" && e.fromId !== "vesper")).toBe(false);
  });

  it("follows a real verified player delivery and never applies when the contract is just accepted", () => {
    const { world, owner, issuer, contract, target } = setup();
    world.underground.contracts = [{ ...contract, status: "offered", resolvedWorldMinute: undefined, acceptedWorldMinute: undefined }];
    const bus = new CommandBus(world);
    expect(bus.execute({ type: "acceptContract", contractId: DELIVERED }).ok).toBe(true);
    expect(relation(bus.snapshot(), owner.id, issuer.id)?.grudge ?? 0).toBe(0);
    expect(bus.execute({ type: "deliverContract", contractId: DELIVERED }).error).toBe("OBJECTIVE_NOT_MET");

    expect(bus.execute({ type: "observeTarget", targetId: target.id }).ok).toBe(true);
    expect(bus.execute({ type: "openOperation", targetId: target.id }).ok).toBe(true);
    expect(bus.execute({ type: "surveyTarget", targetId: target.id }).ok).toBe(true);
    expect(bus.execute({ type: "inspectMachine", machineId: target.machines[0]!.id }).ok).toBe(true);
    const delivered = bus.execute({ type: "deliverContract", contractId: DELIVERED });
    expect(delivered.ok).toBe(true);
    expect(delivered.events).toContainEqual(expect.objectContaining({
      type: "ContractDelivered", contractId: DELIVERED,
    }));
    expect(falloutEvents(delivered.events, owner.id, issuer.id)).toHaveLength(1);
    expect(bus.snapshot().underground.contracts[0]).toMatchObject({ status: "completed" });
    expect(bus.execute({ type: "deliverContract", contractId: DELIVERED }).ok).toBe(false);
    expect(relation(bus.snapshot(), owner.id, issuer.id)?.grudge).toBe(20);
  });

  it("survives current-run save/restoration and stays rank-independent across two procedural scenarios", () => {
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      for (const seed of [1, 2, 3, 17, 41, 87, 120]) {
        const { world, owner, issuer, contract } = setup(seed, scenario);
        const initial = worldStateSchema.parse(world);
        const direct = structuredClone(initial);
        const restored = worldStateSchema.parse(JSON.parse(JSON.stringify(initial)));
        restored.player.rank = 1;
        for (const a of restored.underground.actors) a.rank = 987_000;
        const a = rewardContract(direct, contract, 360);
        const b = rewardContract(restored, contract, 360);
        expect(falloutEvents(a, owner.id, issuer.id), scenario + " seed " + seed)
          .toEqual(falloutEvents(b, owner.id, issuer.id));
        expect(direct.underground.relationships).toEqual(restored.underground.relationships);
        expect(worldStateSchema.safeParse(direct).success).toBe(true);
      }
    }
  });
});
