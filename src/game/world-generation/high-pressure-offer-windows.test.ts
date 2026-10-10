import { describe, expect, it } from "vitest";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { worldStateSchema } from "@/persistence/world-state-schema";
import { OFFER_WINDOW_MINUTES } from "@/game/simulation/systems/underground";
import {
  HIGH_PRESSURE_OFFER_WINDOW_MINUTES,
  offerWindowMinutesFor,
} from "@/game/simulation/systems/opportunities";

const DAY = 24 * 60;

describe("G2 High Pressure time-limited intelligence (Game-First #114)", () => {
  it("has a 12h High Pressure decision window, leaving other scenes at 24h", () => {
    expect(HIGH_PRESSURE_OFFER_WINDOW_MINUTES).toBe(12 * 60);
    expect(offerWindowMinutesFor("high-pressure")).toBe(12 * 60);
    for (const scene of ["fresh-scene", "canonical", "nightshade-slice"] as const) {
      expect(offerWindowMinutesFor(scene)).toBe(OFFER_WINDOW_MINUTES);
    }
  });

  it("opens with shorter time-limited High Pressure leads for 120 reproducible seeds", () => {
    for (let seed = 1; seed <= 120; seed += 1) {
      for (const scenario of ["high-pressure", "fresh-scene"] as const) {
        const world = createSliceWorldState({ seed, handle: "Night_Wren", scenario });
        const duration = offerWindowMinutesFor(scenario);
        expect(world.underground.contracts.length).toBeGreaterThan(0);
        for (const offer of world.underground.contracts) {
          expect(offer.expiresWorldMinute - offer.offeredWorldMinute,
            `${scenario} seed ${seed}`).toBe(duration);
        }
      }
    }
  });

  it("applies the same scene window to new in-world offers, not just the starting handout", () => {
    for (const scenario of ["high-pressure", "fresh-scene"] as const) {
      let observed = 0;
      for (let seed = 1; seed <= 20; seed += 1) {
        const world = createSliceWorldState({ seed, handle: "Night_Wren", scenario });
        const bus = new CommandBus(world);
        for (const offer of world.underground.contracts) {
          expect(bus.execute({ type: "declineContract", contractId: offer.id }).ok).toBe(true);
        }
        bus.execute({ type: "advanceTime", minutes: 3 * DAY });
        const later = bus.snapshot().underground.contracts.filter(c => c.offeredWorldMinute > 0);
        for (const offer of later) {
          expect(offer.expiresWorldMinute - offer.offeredWorldMinute,
            `${scenario} seed ${seed} ${offer.id}`).toBe(offerWindowMinutesFor(scenario));
        }
        observed += later.length;
      }
      expect(observed, `no new ${scenario} offers were exercised`).toBeGreaterThan(0);
    }
  });

  it("does not shorten an accepted contract's work deadline, or rewrite persisted existing offers", () => {
    const start = createSliceWorldState({ seed: 19, handle: "Night_Wren", scenario: "high-pressure" });
    const first = start.underground.contracts[0]!;
    const bus = new CommandBus(start);
    expect(bus.execute({ type: "acceptContract", contractId: first.id }).ok).toBe(true);
    const accepted = bus.snapshot().underground.contracts.find(c => c.id === first.id)!;
    expect(accepted.dueWorldMinute).toBeGreaterThan(accepted.expiresWorldMinute);
    const saved = worldStateSchema.parse(JSON.parse(JSON.stringify(bus.snapshot())));
    expect(saved.underground.contracts.find(c => c.id === first.id)).toEqual(accepted);

    // A current run that already has an offer keeps its stored expiry unchanged.
    const existing = createSliceWorldState({ seed: 19, handle: "Night_Wren", scenario: "high-pressure" });
    const persistedExpiry = existing.underground.contracts[0]!.expiresWorldMinute;
    existing.underground.contracts[0]!.expiresWorldMinute = persistedExpiry + 55;
    const restored = worldStateSchema.parse(JSON.parse(JSON.stringify(existing)));
    expect(restored.underground.contracts[0]!.expiresWorldMinute).toBe(persistedExpiry + 55);
  });
});
