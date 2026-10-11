import { describe, expect, it } from "vitest";
import { deriveOpeningReconCue } from "@/game/onboarding/opening-recon-cue";
import { createSliceWorldState, createNewRunWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";

describe("G6 P0 player-sourced opening Recon targets", () => {
  it("never invents Nightshade or leaks hidden targets without a public offer", () => {
    const world = createSliceWorldState({ scenario: "fresh-scene", seed: 29 });
    const hidden = world.targets.map(x => x.id);
    const cue = deriveOpeningReconCue({
      contracts: {}, observedTargetIds: [], worldMinute: 0,
    });
    expect(cue).toBeNull();
    expect(hidden.length).toBeGreaterThan(0);
    expect(JSON.stringify(cue)).not.toContain(hidden[0]);
  });
  it("uses the actual Nightshade v2 teaching offer only in that authored scenario", () => {
    const scene = createNewRunWorldState({
      scenario: "nightshade-slice", seed: 73, handle: "TestPilot",
    });
    const visible = projectWorld(scene);
    const contracts = Object.fromEntries(visible.underground.contracts.map(c => [c.id,c]));
    expect(deriveOpeningReconCue({
      contracts, observedTargetIds: [], worldMinute: 0,
    })).toMatchObject({ source: "contract", targetId: "nightshade" });
  });
  it("selects solely real player-visible offered targets for 120 generated seeds", () => {
    let offeredStarts = 0;
    for (const scenario of ["fresh-scene", "high-pressure"] as const) {
      for (let seed = 1; seed <= 60; seed++) {
        const world = createSliceWorldState({ scenario, seed });
        const visible = projectWorld(world);
        const contracts = Object.fromEntries(visible.underground.contracts.map(c => [c.id,c]));
        const cue = deriveOpeningReconCue({
          contracts, observedTargetIds: visible.targets.map(t => t.id),
          worldMinute: visible.worldMinute,
        });
        if (!cue) {
          expect(visible.underground.contracts.some(c => c.status === "offered")).toBe(false);
          continue;
        }
        expect(cue.source).toBe("contract");
        expect(cue.targetId).not.toBe("nightshade");
        expect(visible.underground.contracts.some(c =>
          c.id === cue.contractId && c.targetId === cue.targetId &&
          c.status === "offered")).toBe(true);
        offeredStarts++;
      }
    }
    expect(offeredStarts).toBeGreaterThan(20);
  });
  it("ignores expired, completed and malformed offers; uses known target fallback", () => {
    const contracts = {
      old: { targetId: "ancient", status: "offered", expiresWorldMinute: 20 },
      settled: { targetId: "closed", status: "completed", expiresWorldMinute: 900 },
      missing: { status: "offered", expiresWorldMinute: 900 },
    };
    expect(deriveOpeningReconCue({ contracts, observedTargetIds: [], worldMinute: 30 }))
      .toBeNull();
    expect(deriveOpeningReconCue({ contracts, observedTargetIds: ["known-b","known-a"], worldMinute: 30 }))
      .toEqual({ targetId: "known-a", label: "known-a", source: "observed" });
  });
  it("prefers an accepted contract, then earliest valid deadline, then stable ID", () => {
    const contracts = {
      z: { targetId: "last", targetHandle: "Last", status: "offered", expiresWorldMinute: 1000 },
      b: { targetId: "second", status: "offered", expiresWorldMinute: 500 },
      a: { targetId: "first", status: "offered", expiresWorldMinute: 500 },
    };
    expect(deriveOpeningReconCue({ contracts, observedTargetIds: [], worldMinute: 20 }))
      .toMatchObject({ targetId: "first", contractId: "a" });
    expect(deriveOpeningReconCue({ contracts: {
      ...contracts, accepted: { targetId: "active", status: "accepted" },
    }, observedTargetIds: [], worldMinute: 700 }))
      .toMatchObject({ targetId: "active", contractId: "accepted" });
    expect(deriveOpeningReconCue({ contracts, observedTargetIds: [], worldMinute: 1001 }))
      .toBeNull();
  });
});
