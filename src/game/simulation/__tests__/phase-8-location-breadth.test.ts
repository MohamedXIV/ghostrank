import { describe, expect, it } from "vitest";

import { HOUSING_CATALOG } from "@/content/housing-catalog";
import { rentHousingFromGui } from "@/game/computer/apps/economy-actions";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { deriveLeaseCapability } from "@/game/simulation/systems/housing";
import {
  derivePresence,
  relocationMinutes,
} from "@/game/simulation/systems/location";

const NEW_LOCATION_IDS = [
  "housing-night-shift-office",
  "housing-sublet-studio",
  "housing-archive-lockup",
  "housing-cellar-studio",
] as const;

const byId = Object.fromEntries(HOUSING_CATALOG.map((entry) => [entry.id, entry]));

describe("Phase 8 P4 — location + physical-life breadth", () => {
  it("expands the catalog to eight locations through the existing three kinds and anonymity bands", () => {
    expect(HOUSING_CATALOG).toHaveLength(8);
    expect(new Set(HOUSING_CATALOG.map((entry) => entry.id)).size).toBe(8);

    expect(
      new Set(HOUSING_CATALOG.map((entry) => entry.kind ?? "residential")),
    ).toEqual(new Set(["workspace", "residential", "safehouse"]));
    expect(
      new Set(HOUSING_CATALOG.map((entry) => entry.anonymity ?? "public")),
    ).toEqual(new Set(["public", "quiet", "hidden"]));
  });

  it("keeps the four P4 listings as distinct trade-offs rather than location classes", () => {
    expect(byId["housing-night-shift-office"]).toMatchObject({
      dailyCost: 45,
      travelMinutes: 30,
      anonymity: "quiet",
      kind: "workspace",
      capability: { compute: 0, memory: 0, vram: 0, storage: 1, network: 1 },
    });
    expect(byId["housing-sublet-studio"]).toMatchObject({
      dailyCost: 35,
      travelMinutes: 45,
      anonymity: "quiet",
      kind: "residential",
      capability: { compute: 1, memory: 1, vram: 0, storage: 0, network: 0 },
    });
    expect(byId["housing-archive-lockup"]).toMatchObject({
      dailyCost: 80,
      travelMinutes: 120,
      anonymity: "hidden",
      kind: "workspace",
      capability: { compute: 1, memory: 1, vram: 0, storage: 3, network: 0 },
    });
    expect(byId["housing-cellar-studio"]).toMatchObject({
      dailyCost: 55,
      travelMinutes: 150,
      anonymity: "hidden",
      kind: "residential",
      capability: { compute: 0, memory: 1, vram: 0, storage: 0, network: 1 },
    });
  });

  it("derives every new location from the lease and keeps relocation symmetric", () => {
    for (const id of NEW_LOCATION_IDS) {
      const item = byId[id];
      const presence = derivePresence(id);

      expect(presence.locationId).toBe(id);
      expect(presence.kind).toBe(item.kind);
      expect(presence.anonymity).toBe(item.anonymity);
      expect(presence.dailyCost).toBe(item.dailyCost);
      expect(presence.distanceMinutes).toBe(item.travelMinutes);

      expect(relocationMinutes(null, id)).toBe(item.travelMinutes);
      expect(relocationMinutes(null, id)).toBe(relocationMinutes(id, null));
    }
  });

  it("routes all new locations through the ordinary lease capability fold", () => {
    const state = createSliceWorldState();

    for (const id of NEW_LOCATION_IDS) {
      const item = byId[id];
      const economy = { ...state.economy, housing: id };

      expect(deriveLeaseCapability(economy)).toEqual(item.capability);
    }
  });

  it("never gates a P4 location on player rank", () => {
    for (const id of NEW_LOCATION_IDS) {
      const low = createSliceWorldState();
      low.player.rank = 1;
      low.economy.credits = 10_000;

      const high = createSliceWorldState();
      high.player.rank = 999_999;
      high.economy.credits = 10_000;

      const lowBus = new CommandBus(low);
      const highBus = new CommandBus(high);

      const lowResult = lowBus.execute(rentHousingFromGui(id));
      const highResult = highBus.execute(rentHousingFromGui(id));

      expect(lowResult.ok).toBe(true);
      expect(highResult.ok).toBe(true);
      expect(lowBus.snapshot().worldMinute).toBe(
        highBus.snapshot().worldMinute,
      );
      expect(lowBus.snapshot().economy.housing).toBe(id);
      expect(highBus.snapshot().economy.housing).toBe(id);
    }
  });

  it("projects the broader catalog without adding authoritative location state", () => {
    const state = createSliceWorldState();
    const projection = projectWorld(state);
    const projected = Object.fromEntries(
      projection.economy.housing.map((entry) => [entry.id, entry]),
    );

    expect(projection.economy.housing).toHaveLength(8);
    for (const id of NEW_LOCATION_IDS) {
      expect(projected[id]).toMatchObject({
        kind: byId[id].kind,
        anonymity: byId[id].anonymity,
        travelMinutes: byId[id].travelMinutes,
        dailyCost: byId[id].dailyCost,
      });
    }

    expect(state).not.toHaveProperty("presence");
    expect(state.economy).not.toHaveProperty("location");
  });

  it("preserves the safehouse rule: concealment-only listings add zero capability", () => {
    for (const id of ["housing-sleeper-unit", "housing-basement-cot"]) {
      expect(byId[id].kind).toBe("safehouse");
      expect(byId[id].capability).toEqual({
        compute: 0,
        memory: 0,
        vram: 0,
        storage: 0,
        network: 0,
      });
    }
  });
});
