import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContractCard } from "@/components/game/contracts/contract-card";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { deriveContractSceneIntel } from "@/game/computer/apps/contract-scene-intel";

const base = {
  targetHandle: "Halo Wick",
  currentWorldMinute: 6000,
  incidents: [] as Array<{
    id: string; actorHandle: string; counterpartHandle: string;
    outcome: "succeeded" | "repelled"; worldMinute: number;
  }>,
  messages: [] as Array<{
    id: string; fromHandle: string; claimActorHandle: string;
    claimCounterpartHandle: string; claimOutcome: "succeeded" | "repelled";
    worldMinute: number; read: boolean;
  }>,
};

function publicIncident(overrides: Partial<(typeof base.incidents)[number]> = {}) {
  return {
    id: "incident:9", actorHandle: "Black Kite",
    counterpartHandle: "Halo Wick", outcome: "succeeded" as const,
    worldMinute: 1860, ...overrides,
  };
}

function privateClaim(overrides: Partial<(typeof base.messages)[number]> = {}) {
  return {
    id: "message:7", fromHandle: "Moth",
    claimActorHandle: "Black Kite", claimCounterpartHandle: "Halo Wick",
    claimOutcome: "repelled" as const, worldMinute: 1920, read: true,
    ...overrides,
  };
}

describe("G5 P2 contract Scene Intel: correlate ONLY what a player knows (#125)", () => {
  it("binds target attack reports and read conflicting claims to a contract with independent source labels", () => {
    const result = deriveContractSceneIntel({
      ...base,
      incidents: [publicIncident()],
      messages: [privateClaim()],
    });
    expect(result).toEqual([
      expect.objectContaining({
        id: "message:7", source: "contact-claim", worldMinute: 1920,
        actorHandle: "Black Kite", counterpartHandle: "Halo Wick",
        outcome: "repelled", fromHandle: "Moth",
      }),
      expect.objectContaining({
        id: "incident:9", source: "public-incident", worldMinute: 1860,
        actorHandle: "Black Kite", counterpartHandle: "Halo Wick",
        outcome: "succeeded",
      }),
    ]);
    // A contradictory contact claim is never graded against the authoritative
    // incident's hidden truth. Both statements remain visible and separate.
    expect(result.map(x => x.outcome)).toEqual(["repelled", "succeeded"]);
    expect(JSON.stringify(result)).not.toContain('"accurate"');
  });

  it("gates unread messages, unrelated actors, future records, and reports beyond 72 world hours", () => {
    const result = deriveContractSceneIntel({
      ...base,
      incidents: [
        publicIncident({ id: "incident:old", worldMinute: 6000 - 72 * 60 - 1 }),
        publicIncident({ id: "incident:future", worldMinute: 6001 }),
        publicIncident({ id: "incident:other", counterpartHandle: "Other" }),
      ],
      messages: [privateClaim({ read: false })],
    });
    expect(result).toEqual([]);
    expect(deriveContractSceneIntel({
      ...base, messages: [privateClaim({ read: true, worldMinute: 6000 - 72 * 60 })],
    })).toHaveLength(1);
  });

  it("preserves actor/victim direction, bounded newest-first source order and tie-breaks", () => {
    const result = deriveContractSceneIntel({
      ...base,
      incidents: [
        publicIncident({ id: "incident:5", actorHandle: "Halo Wick", counterpartHandle: "Quartz", worldMinute: 1900 }),
        publicIncident({ id: "incident:3", worldMinute: 1960 }),
        publicIncident({ id: "incident:2", worldMinute: 1960 }),
      ],
      messages: [privateClaim({ id: "message:1", worldMinute: 1980 })],
    });
    expect(result).toHaveLength(3);
    expect(result.map(x => x.id)).toEqual(["message:1", "incident:2", "incident:3"]);
    expect(result.every(x => x.actorHandle === "Halo Wick" || x.counterpartHandle === "Halo Wick")).toBe(true);
  });

  it("renders sourced, non-omniscient hints alongside the REAL accept/decline decision", () => {
    const sceneIntel = deriveContractSceneIntel({
      ...base, incidents: [publicIncident()], messages: [privateClaim()],
    });
    const html = renderToStaticMarkup(React.createElement(ContractCard, {
      contract: {
        id: "contract:13", issuerHandle: "Broker", targetHandle: base.targetHandle,
        objective: "recon-report", status: "offered",
        expiresWorldMinute: 8000, sceneIntel,
      },
      currentWorldMinute: 6000,
      onAction: () => undefined,
    }));
    expect(html).toContain("SCENE INTEL");
    expect(html).toContain("PUBLIC REPORT");
    expect(html).toContain("UNVERIFIED CONTACT CLAIM");
    expect(html).toContain("incident:9");
    expect(html).toContain("message:7");
    expect(html).toContain("ACCEPT");
    expect(html).toContain("DECLINE");
    expect(html).not.toContain("defend agenda");
    expect(html).not.toContain("OrganizationAgendaShifted");
  });

  it("never derives intelligence from a private authority incident without a player-known report", () => {
    const world = createSliceWorldState({ scenario: "fresh-scene", seed: 18 });
    const target = world.targets[0]!;
    const defender = world.underground.actors.find(a => a.targetId === target.id)!;
    const attacker = world.underground.actors.find(a =>
      a.id !== defender.id && a.targetId !== undefined)!;
    world.underground.incidents.push({
      id: "incident:private-authority", kind: "npc-intrusion", actorId: attacker.id,
      counterpartId: defender.id, outcome: "succeeded",
      public: false, worldMinute: 360,
    });
    world.worldMinute = 360;
    const visible = projectWorld(world);
    expect(deriveContractSceneIntel({
      targetHandle: defender.handle,
      currentWorldMinute: world.worldMinute,
      incidents: visible.underground.feed,
      messages: visible.underground.inbox.messages,
    })).toEqual([]);

    world.underground.incidents[0]!.public = true;
    const nowPublic = projectWorld(world);
    const intel = deriveContractSceneIntel({
      targetHandle: defender.handle,
      currentWorldMinute: world.worldMinute,
      incidents: nowPublic.underground.feed,
      messages: nowPublic.underground.inbox.messages,
    });
    expect(intel).toHaveLength(1);
    expect(intel[0]).toEqual(expect.objectContaining({
      id: "incident:private-authority", source: "public-incident", outcome: "succeeded",
    }));
  });
});
