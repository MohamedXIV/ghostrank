import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  peerPickWeight,
  pickCounterpart,
  pickOfferTarget,
} from "@/game/simulation/systems/underground";
import {
  PLAYER_ACTOR_ID,
  type UndergroundActor,
  type WorldState,
} from "@/game/simulation/state/world-state";

/**
 * NPC-to-NPC ties drive real decisions in generated scenes (Game-First G2 P2,
 * D067). Each test reads a pure pick across many tick indices, so the weights
 * are measured directly rather than through a whole simulated week.
 */

const TICKS = 2000;

function generated(seed: number, scenario: "fresh-scene" | "high-pressure" = "fresh-scene"): WorldState {
  return createSliceWorldState({ seed, handle: "Night_Wren", scenario });
}

/** Sets the one tie `from -> to`, creating it if the scene did not draw one. */
function setTie(
  world: WorldState,
  fromId: string,
  toId: string,
  standing: { trust: number; grudge: number },
): void {
  const existing = world.underground.relationships.find(
    (entry) => entry.fromId === fromId && entry.toId === toId,
  );

  if (existing) {
    existing.trust = standing.trust;
    existing.grudge = standing.grudge;
    return;
  }

  world.underground.relationships.push({
    id: `rel:${fromId}>${toId}`,
    fromId,
    toId,
    trust: standing.trust,
    fear: 0,
    grudge: standing.grudge,
    updatedWorldMinute: 0,
  });
}

/** Removes every peer tie `from` holds, so only the ties a test sets are read. */
function clearPeerTies(world: WorldState, fromId: string): void {
  world.underground.relationships = world.underground.relationships.filter(
    (entry) => !(entry.fromId === fromId && entry.toId !== PLAYER_ACTOR_ID),
  );
}

function countPicks(
  world: WorldState,
  actor: UndergroundActor,
  others: readonly UndergroundActor[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (let tick = 1; tick <= TICKS; tick += 1) {
    const picked = pickCounterpart(world, actor, others, tick).id;
    counts.set(picked, (counts.get(picked) ?? 0) + 1);
  }

  return counts;
}

describe("peer weights read standing only (Game-First G2 P2, D067)", () => {
  it("gives a stranger the neutral weight and never drops a peer to zero", () => {
    expect(peerPickWeight(undefined)).toBe(100);
    expect(peerPickWeight({ trust: -100, grudge: 0 })).toBeGreaterThan(0);
    expect(peerPickWeight({ trust: 100, grudge: 0 })).toBeGreaterThan(0);
  });

  it("pulls harder toward a holder of more grudge, and pushes away from more warmth", () => {
    const low = peerPickWeight({ trust: 0, grudge: 10 });
    const high = peerPickWeight({ trust: 0, grudge: 40 });
    expect(high).toBeGreaterThan(low);

    const cold = peerPickWeight({ trust: 0, grudge: 0 });
    const warm = peerPickWeight({ trust: 40, grudge: 0 });
    expect(warm).toBeLessThan(cold);
  });
});

describe("rivals are picked more, and allies less, in generated scenes (Game-First G2 P2)", () => {
  it("picks a rival counterpart in proportion to its weight", () => {
    const world = generated(4);
    const [actor] = world.underground.actors;
    const others = world.underground.actors.filter((entry) => entry.id !== actor!.id);
    const rival = others[0]!;

    clearPeerTies(world, actor!.id);
    setTie(world, actor!.id, rival.id, { trust: -20, grudge: 40 });

    const counts = countPicks(world, actor!, others);
    const rivalShare = (counts.get(rival.id) ?? 0) / TICKS;
    const uniformShare = 1 / others.length;

    // Every other peer is a stranger with weight 100; the rival weighs 340.
    const expected = peerPickWeight({ trust: -20, grudge: 40 }) /
      (peerPickWeight({ trust: -20, grudge: 40 }) + (others.length - 1) * 100);

    expect(Math.abs(rivalShare - expected)).toBeLessThan(0.05);
    expect(rivalShare).toBeGreaterThan(uniformShare * 1.8);
  });

  it("picks an ally counterpart less than a stranger would be picked", () => {
    const world = generated(6);
    const [actor] = world.underground.actors;
    const others = world.underground.actors.filter((entry) => entry.id !== actor!.id);
    const ally = others[0]!;

    clearPeerTies(world, actor!.id);
    setTie(world, actor!.id, ally.id, { trust: 40, grudge: 0 });

    const counts = countPicks(world, actor!, others);
    const allyShare = (counts.get(ally.id) ?? 0) / TICKS;

    expect(allyShare).toBeLessThan((1 / others.length) * 0.85);
  });

  it("leans a generated issuer's contract toward its rival's target", () => {
    const world = generated(8);
    const issuer = world.underground.actors.find((entry) => entry.targetId !== undefined)!;
    const rivalOwner = world.underground.actors.find(
      (entry) => entry.targetId !== undefined && entry.id !== issuer.id,
    )!;

    clearPeerTies(world, issuer.id);
    setTie(world, issuer.id, rivalOwner.id, { trust: -20, grudge: 40 });

    const candidates = world.targets.filter((target) => target.id !== issuer.targetId);
    const counts = new Map<string, number>();

    for (let tick = 1; tick <= TICKS; tick += 1) {
      const picked = pickOfferTarget(world, issuer, candidates, tick).id;
      counts.set(picked, (counts.get(picked) ?? 0) + 1);
    }

    const rivalShare = (counts.get(rivalOwner.targetId!) ?? 0) / TICKS;
    expect(rivalShare).toBeGreaterThan((1 / candidates.length) * 1.8);
  });
});

describe("canonical keeps uniform picks (legacy compatibility, D067)", () => {
  it("ignores a peer grudge in the authored scene, so its picks never move", () => {
    const plain = createSliceWorldState({ seed: 42, handle: "BetaStress", scenario: "canonical" });
    const grudged = createSliceWorldState({ seed: 42, handle: "BetaStress", scenario: "canonical" });
    const [a, b] = grudged.underground.actors;

    // A hostile tie that the generated scenes would read is present, and ignored.
    setTie(grudged, a!.id, b!.id, { trust: -50, grudge: 90 });

    for (let tick = 1; tick <= 500; tick += 1) {
      const plainOthers = plain.underground.actors.filter((entry) => entry.id !== a!.id);
      const grudgedOthers = grudged.underground.actors.filter((entry) => entry.id !== a!.id);

      expect(pickCounterpart(grudged, a!, grudgedOthers, tick).id).toBe(
        pickCounterpart(plain, a!, plainOthers, tick).id,
      );
    }
  });

  it("treats a save with no scene as canonical, so it also ignores peer ties", () => {
    // A pre-G2 save has no scene. Read as canonical, a grudge changes no pick.
    const legacy = generated(5);
    delete (legacy as Partial<WorldState>).scenario;
    const [actor] = legacy.underground.actors;
    const others = legacy.underground.actors.filter((entry) => entry.id !== actor!.id);
    const before = Array.from({ length: 300 }, (_, index) =>
      pickCounterpart(legacy, actor!, others, index + 1).id,
    );

    setTie(legacy, actor!.id, others[0]!.id, { trust: -20, grudge: 60 });

    const after = Array.from({ length: 300 }, (_, index) =>
      pickCounterpart(legacy, actor!, others, index + 1).id,
    );
    expect(after).toEqual(before);
  });
});

describe("peer picks never read rank (Game-First G2 P2, D067)", () => {
  it("picks the same counterpart at rank 1 and rank 999999", () => {
    const low = generated(3);
    const high = generated(3);
    low.player.rank = 1;
    high.player.rank = 999_999;

    const [actor] = low.underground.actors;
    const others = low.underground.actors.filter((entry) => entry.id !== actor!.id);

    for (let tick = 1; tick <= 500; tick += 1) {
      expect(pickCounterpart(high, actor!, others, tick).id).toBe(
        pickCounterpart(low, actor!, others, tick).id,
      );
    }
  });
});

describe("peer standing stays out of the player's view (Game-First G2 P2, D067)", () => {
  it("does not project any actor-to-actor tie", () => {
    for (const seed of [2, 7, 13]) {
      const world = generated(seed, "high-pressure");
      const projection = JSON.stringify(projectWorld(world));
      const peerTies = world.underground.relationships.filter(
        (entry) => entry.toId !== PLAYER_ACTOR_ID,
      );

      expect(peerTies.length).toBeGreaterThan(0);
      for (const tie of peerTies) {
        expect(projection, tie.id).not.toContain(tie.id);
      }
    }
  });
});

describe("generated organizations seed their ties (Game-First G2 P2, D067)", () => {
  it("makes members of one organization allies and of rival organizations enemies", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const world = generated(seed, "high-pressure");
      const byId = new Map(world.underground.actors.map((entry) => [entry.id, entry]));
      const rivalOrgs = new Map(
        world.underground.organizations.map((org) => [org.id, new Set(org.rivalIds)]),
      );

      for (const tie of world.underground.relationships) {
        if (tie.toId === PLAYER_ACTOR_ID) {
          continue;
        }

        const from = byId.get(tie.fromId);
        const to = byId.get(tie.toId);

        if (!from?.organizationId || !to?.organizationId) {
          continue;
        }

        if (from.organizationId === to.organizationId) {
          expect(tie.trust, tie.id).toBeGreaterThanOrEqual(25);
          expect(tie.grudge, tie.id).toBe(0);
        } else if (rivalOrgs.get(from.organizationId)?.has(to.organizationId)) {
          expect(tie.trust, tie.id).toBeLessThanOrEqual(-15);
          expect(tie.grudge, tie.id).toBeGreaterThanOrEqual(25);
        }
      }
    }
  });
});
