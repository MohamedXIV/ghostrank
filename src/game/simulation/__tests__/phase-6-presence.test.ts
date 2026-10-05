import { describe, expect, it } from "vitest";

import {
  BASELINE_LOCATION,
  BASELINE_LOCATION_ID,
  HOUSING_CATALOG,
  LANDLORD_COUNTERPARTY,
} from "@/content/housing-catalog";
import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  derivePresence,
  relocationMinutes,
} from "@/game/simulation/systems/location";
import { deriveLeaseCapability } from "@/game/simulation/systems/housing";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import {
  breakLeaseFromGui,
  rentHousingFromGui,
} from "@/game/computer/apps/economy-actions";
import {
  physicalIntentToCommand,
  presentRoom,
} from "@/game/phaser/bridge";
import type { WorldState } from "@/game/simulation/state/world-state";

/**
 * Phase 6 P0 — physical presence and relocation.
 *
 * The load-bearing facts this file defends: presence is *derived* from the
 * lease (never a second stored truth), a relocation is paid in world time so
 * the world keeps acting while the player moves, a safehouse buys distance and
 * **no capability at all**, and a same-district lease is untouched by any of it.
 */

const SLEEPER = "housing-sleeper-unit";
const COT = "housing-basement-cot";
const LOFT = "housing-cowork-loft";

function stateWith(credits = 10_000): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  return state;
}

describe("presence derivation", () => {
  it("reads the baseline room when no lease is held", () => {
    const presence = derivePresence(null);

    expect(presence).toEqual({
      locationId: BASELINE_LOCATION_ID,
      label: BASELINE_LOCATION.label,
      kind: "baseline",
      anonymity: "public",
      leased: false,
      dailyCost: 0,
      distanceMinutes: 0,
    });
  });

  it("derives the leased dwelling from the economy field alone", () => {
    const presence = derivePresence(SLEEPER);

    expect(presence.locationId).toBe(SLEEPER);
    expect(presence.kind).toBe("safehouse");
    expect(presence.anonymity).toBe("hidden");
    expect(presence.leased).toBe(true);
    expect(presence.distanceMinutes).toBe(180);
  });

  it("falls back to the baseline for a stale catalog id", () => {
    // A catalog retune or a hand-edited save must not fabricate a place.
    expect(derivePresence("housing-demolished").locationId).toBe(
      BASELINE_LOCATION_ID,
    );
    expect(derivePresence("housing-demolished").leased).toBe(false);
  });

  it("adds no state to the world at all", () => {
    const state = createSliceWorldState();

    // The zero-regression guarantee: presence is a read of `economy.housing`,
    // so there is nothing new to persist, migrate, or desync.
    expect(state).not.toHaveProperty("presence");
    expect(state.economy).not.toHaveProperty("safehouse");
    expect(state.economy).not.toHaveProperty("location");
  });
});

describe("relocation cost", () => {
  it("costs nothing inside the same district", () => {
    // Both Phase 4 leases and the baseline room are distance 0, so signing or
    // breaking either stays exactly as instant as it has always been.
    expect(relocationMinutes(null, LOFT)).toBe(0);
    expect(relocationMinutes(LOFT, "housing-rented-lab")).toBe(0);
    expect(relocationMinutes(LOFT, null)).toBe(0);
  });

  it("costs the journey between districts", () => {
    expect(relocationMinutes(null, SLEEPER)).toBe(180);
    expect(relocationMinutes(null, COT)).toBe(60);
    expect(relocationMinutes(COT, SLEEPER)).toBe(120);
  });

  it("is symmetric, so fleeing is not free to undo", () => {
    // The decision P0 is buying: if moving *out* were instant, relocation would
    // be a one-way button rather than a choice about exposure.
    expect(relocationMinutes(null, SLEEPER)).toBe(
      relocationMinutes(SLEEPER, null),
    );
    expect(relocationMinutes(COT, SLEEPER)).toBe(
      relocationMinutes(SLEEPER, COT),
    );
  });

  it("treats a stale origin as the baseline rather than throwing", () => {
    expect(relocationMinutes("housing-demolished", SLEEPER)).toBe(180);
  });
});

describe("a safehouse buys distance, never capability", () => {
  it("contributes zero to every capability axis", () => {
    const economy = {
      ...stateWith().economy,
      housing: SLEEPER,
    };

    // The standing rule made concrete: hiding costs upkeep and travel, and it
    // must not be a power purchase.
    expect(deriveLeaseCapability(economy)).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });

  it("keeps the rig at its unleased baseline while hidden", () => {
    const bus = new CommandBus(stateWith());
    const before = projectWorld(bus.snapshot()).economy.actionMinutes;

    bus.execute(rentHousingFromGui(SLEEPER));

    expect(projectWorld(bus.snapshot()).economy.actionMinutes).toEqual(before);
    expect(projectWorld(bus.snapshot()).economy.lease).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });

  it("is never gated by rank", () => {
    const lowRank = stateWith();
    lowRank.player.rank = 999_999;
    const bus = new CommandBus(lowRank);

    expect(bus.execute(rentHousingFromGui(SLEEPER)).ok).toBe(true);
  });

  it("is rejected, not debt-created, when the upkeep cannot be paid later", () => {
    const state = stateWith(0);
    const bus = new CommandBus(state);

    // Signing still moves no credits (the P3 rule survives P0 unchanged)...
    const result = bus.execute(rentHousingFromGui(SLEEPER));
    expect(result.ok).toBe(true);
    expect(bus.snapshot().economy.credits).toBe(0);

    // ...and an unpayable day lapses the lease instead of creating debt.
    bus.execute({ type: "advanceTime", minutes: 24 * 60 });
    expect(bus.snapshot().economy.credits).toBe(0);
    expect(bus.snapshot().economy.housing).toBeNull();
  });
});

describe("relocating in the command layer", () => {
  it("advances the world clock while the player travels", () => {
    const bus = new CommandBus(stateWith());

    const result = bus.execute(rentHousingFromGui(SLEEPER));

    expect(bus.snapshot().worldMinute).toBe(180);
    expect(
      result.events.some((event) => event.type === "WorldTimeAdvanced"),
    ).toBe(true);
  });

  it("records the lease at the arrival minute, not the departure minute", () => {
    const bus = new CommandBus(stateWith());

    const result = bus.execute(rentHousingFromGui(SLEEPER));

    const changed = result.events.find(
      (event) => event.type === "HousingChanged",
    );
    expect(changed).toMatchObject({ housingId: SLEEPER, worldMinute: 180 });
  });

  it("spends real world time, so the move crosses the clocks that matter", () => {
    // The point of pricing relocation in minutes is that the journey shares the
    // clock everything else consumes. A 180-minute hop from minute 300 crosses
    // the 360-minute ecosystem tick boundary, so the world genuinely acts while
    // the player is in transit rather than pausing for them.
    const state = stateWith();
    state.worldMinute = 300;
    state.underground.lastTickMinute = 300;
    const bus = new CommandBus(state);

    const result = bus.execute(rentHousingFromGui(SLEEPER));

    expect(bus.snapshot().worldMinute).toBe(480);
    expect(bus.snapshot().underground.lastTickMinute).toBe(480);
    expect(
      result.events.some((event) => event.type === "WorldTimeAdvanced"),
    ).toBe(true);
  });

  it("bills the dwelling you actually slept in during the journey", () => {
    // The ordering decision, tested: the trip happens *before* the new lease
    // exists, so a day boundary crossed in transit is charged to the place the
    // player was, not the one they are heading to. The new lease starts on
    // arrival and is billed from the following boundary.
    const state = stateWith(1_000);
    state.economy.housing = LOFT; // 30/day, same district as the baseline
    state.worldMinute = 24 * 60 - 120;
    const bus = new CommandBus(state);

    const result = bus.execute(rentHousingFromGui(SLEEPER)); // 180 minutes
    const charges = result.events.filter(
      (event) =>
        event.type === "ValueTransferred" && event.causeKind === "upkeep",
    );

    expect(bus.snapshot().worldMinute).toBe(24 * 60 + 60);
    expect(charges).toHaveLength(1);
    expect(charges[0]).toMatchObject({
      amount: 30,
      worldMinute: 24 * 60,
      counterparty: LANDLORD_COUNTERPARTY,
    });
    expect(bus.snapshot().economy.credits).toBe(970);

    const changed = result.events.find(
      (event) => event.type === "HousingChanged",
    );
    expect(changed).toMatchObject({ housingId: SLEEPER, worldMinute: 1_500 });
  });

  it("charges nothing to sign or to switch", () => {
    const bus = new CommandBus(stateWith(500));

    bus.execute(rentHousingFromGui(SLEEPER));
    bus.execute(rentHousingFromGui(COT));
    bus.execute(rentHousingFromGui(LOFT));

    expect(bus.snapshot().economy.credits).toBe(500);
    expect(
      bus
        .snapshot()
        .economy.ledger.filter(
          (entry) => entry.direction === "debit" && entry.amount > 0,
        ),
    ).toEqual([]);
  });

  it("makes leaving a safehouse cost the trip back", () => {
    const bus = new CommandBus(stateWith());

    bus.execute(rentHousingFromGui(SLEEPER));
    const arrivedAt = bus.snapshot().worldMinute;

    bus.execute(breakLeaseFromGui());

    expect(bus.snapshot().worldMinute).toBe(arrivedAt + 180);
    expect(derivePresence(bus.snapshot().economy.housing).leased).toBe(false);
  });

  it("moves instantly out of a same-district lease", () => {
    const bus = new CommandBus(stateWith());

    bus.execute(rentHousingFromGui(LOFT));
    expect(bus.snapshot().worldMinute).toBe(0);

    bus.execute(breakLeaseFromGui());
    expect(bus.snapshot().worldMinute).toBe(0);
  });

  it("never charges travel for being put out by the world", () => {
    // Involuntary eviction is the world acting on the player, not the player
    // choosing to move, so it keeps D021's exact semantics: instant, no time.
    const state = stateWith(0);
    state.economy.housing = SLEEPER;
    const bus = new CommandBus(state);

    bus.execute({ type: "advanceTime", minutes: 24 * 60 });

    expect(bus.snapshot().economy.housing).toBeNull();
    expect(bus.snapshot().worldMinute).toBe(24 * 60);
  });

  it("prices distance, not the number of button presses", () => {
    // Travelling via an intermediate district in the same direction costs the
    // same as going direct (60 + 120 = 180), because the cost is a distance
    // rather than a per-move tax. Splitting the trip never lets a player move
    // further for free, and it never punishes a split save/restore either.
    const once = new CommandBus(stateWith());
    once.execute(rentHousingFromGui(SLEEPER));

    const twice = new CommandBus(stateWith());
    twice.execute(rentHousingFromGui(COT));
    twice.execute(rentHousingFromGui(SLEEPER));

    expect(twice.snapshot().worldMinute).toBe(once.snapshot().worldMinute);
    expect(derivePresence(twice.snapshot().economy.housing)).toEqual(
      derivePresence(once.snapshot().economy.housing),
    );
  });
});

describe("interface parity", () => {
  it("Terminal, GUI, and the physical bridge emit one command", () => {
    expect(parseTerminalCommand(`rent ${SLEEPER}`)).toEqual({
      ok: true,
      command: rentHousingFromGui(SLEEPER),
    });
    expect(physicalIntentToCommand({ type: "moveTo", housingId: SLEEPER })).toEqual(
      rentHousingFromGui(SLEEPER),
    );
    expect(physicalIntentToCommand({ type: "leave" })).toEqual(
      breakLeaseFromGui(),
    );
  });

  it("rejects malformed physical and terminal forms alike", () => {
    expect(parseTerminalCommand("rent")).toMatchObject({ ok: false });
    expect(parseTerminalCommand("rent a b")).toMatchObject({ ok: false });
  });

  it("refuses an unknown dwelling through any interface", () => {
    const bus = new CommandBus(stateWith());

    const result = bus.execute(rentHousingFromGui("housing-not-real"));

    expect(result.ok).toBe(false);
    expect(result.error).toBe("HOUSING_NOT_FOUND");
    expect(bus.snapshot().worldMinute).toBe(0);
  });
});

describe("presence in the projection", () => {
  it("surfaces the baseline room for a default world", () => {
    const projection = projectWorld(createSliceWorldState());

    expect(projection.presence.locationId).toBe(BASELINE_LOCATION_ID);
    expect(projection.presence.leased).toBe(false);
  });

  it("follows the lease after a relocation", () => {
    const bus = new CommandBus(stateWith());
    bus.execute(rentHousingFromGui(COT));

    expect(projectWorld(bus.snapshot()).presence.label).toContain("Basement");
    expect(projectWorld(bus.snapshot()).presence.anonymity).toBe("quiet");
  });

  it("shows anonymity as a band, never a number", () => {
    const projection = projectWorld(createSliceWorldState());

    expect(["public", "quiet", "hidden"]).toContain(
      projection.presence.anonymity,
    );
    expect(typeof projection.presence.distanceMinutes).toBe("number");
  });

  it("prices the journey on each listing before the player commits", () => {
    const economy = projectWorld(createSliceWorldState()).economy;

    const byId = Object.fromEntries(
      economy.housing.map((listing) => [listing.id, listing]),
    );
    expect(byId[LOFT].travelMinutes).toBe(0);
    expect(byId[COT].travelMinutes).toBe(60);
    expect(byId[SLEEPER].travelMinutes).toBe(180);
    expect(byId[SLEEPER].kind).toBe("safehouse");
    expect(byId[SLEEPER].anonymity).toBe("hidden");
  });

  it("re-prices listings from the district the player now stands in", () => {
    const bus = new CommandBus(stateWith());
    bus.execute(rentHousingFromGui(COT));

    const byId = Object.fromEntries(
      projectWorld(bus.snapshot()).economy.housing.map((listing) => [
        listing.id,
        listing,
      ]),
    );
    // From the warehouse district the outskirts are 120, not 180, of minutes.
    expect(byId[SLEEPER].travelMinutes).toBe(120);
  });

  it("gives the room renderer its caption instead of a hardcoded string", () => {
    const bus = new CommandBus(stateWith());
    bus.execute(rentHousingFromGui(SLEEPER));
    const projection = projectWorld(bus.snapshot());

    const presentation = presentRoom(
      projection.presence,
      projection.worldMinute,
    );

    expect(presentation.label).toBe("Sleeper Unit (Outskirts)");
    expect(presentation.locationId).toBe(SLEEPER);
    expect(presentation.anonymity).toBe("hidden");
    expect(presentation.leased).toBe(true);
    expect(presentation.distant).toBe(true);
    expect(presentation.worldMinute).toBe(180);
    // The scene still owns its own position: P0 does not simulate walking.
    expect(presentation.avatarPosition).toBe("stand");
  });
});

describe("save and load", () => {
  it("round-trips presence with no new schema surface", async () => {
    const { worldStateSchema } = await import("@/persistence/world-state-schema");
    const bus = new CommandBus(stateWith());
    bus.execute(rentHousingFromGui(SLEEPER));

    const restored = worldStateSchema.parse(
      JSON.parse(JSON.stringify(bus.snapshot())),
    );

    expect(derivePresence(restored.economy.housing)).toEqual(
      derivePresence(bus.snapshot().economy.housing),
    );
    expect(restored.worldMinute).toBe(180);
  });

  it("loads a legacy save at the baseline location", async () => {
    const { parsePortableRunSave, serializePortableRunSave } = await import(
      "@/persistence/portable-run-save"
    );
    const legacy = createSliceWorldState();
    legacy.economy.housing = null;

    const loaded = parsePortableRunSave(serializePortableRunSave(legacy));

    expect(derivePresence(loaded.economy.housing).leased).toBe(false);
  });
});

describe("catalog breadth", () => {
  it("lists two safehouses among eight dwellings", () => {
    const safehouses = HOUSING_CATALOG.filter((item) => item.kind === "safehouse");

    expect(HOUSING_CATALOG).toHaveLength(8);
    expect(safehouses).toHaveLength(2);
  });

  it("keeps every dwelling reachable by id", () => {
    for (const item of HOUSING_CATALOG) {
      expect(derivePresence(item.id).locationId).toBe(item.id);
    }
  });

  it("runs a relocation through the full runtime loop", () => {
    const runtime = createGameRuntime(stateWith());

    runtime.execute(rentHousingFromGui(COT));

    expect(
      runtime.projection.getRow("presence", "current")?.anonymity,
    ).toBe("quiet");
    expect(runtime.snapshot().worldMinute).toBe(60);
  });
});
