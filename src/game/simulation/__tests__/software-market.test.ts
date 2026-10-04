import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  SOFTWARE_CATALOG,
  VENDOR_COUNTERPARTY,
  actionDurationFactor,
  softwareCapability,
} from "@/content/software-catalog";
import {
  deriveSoftwareCapability,
  effectiveCapability,
} from "@/game/simulation/systems/housing";
import { advanceUpkeep, recurringDailyCost } from "@/game/simulation/systems/upkeep";
import { projectWorld } from "@/game/simulation/projection/project-world";
import type { SimulationEvent } from "@/game/simulation/events/types";
import type { WorldState } from "@/game/simulation/state/world-state";

const DAY_MINUTES = 24 * 60;

function stateWithSoftware(
  softwareIds: string[],
  credits = 1_000,
  housing: string | null = null,
): WorldState {
  const state = createSliceWorldState();
  state.economy.credits = credits;
  state.economy.housing = housing;
  state.economy.software = [...softwareIds];
  return state;
}

function licenseCharges(
  events: SimulationEvent[],
): Extract<SimulationEvent, { type: "ValueTransferred" }>[] {
  return events.filter(
    (event): event is Extract<SimulationEvent, { type: "ValueTransferred" }> =>
      event.type === "ValueTransferred" && event.causeKind === "license",
  );
}

function openOp(bus: CommandBus) {
  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
}

describe("software catalog helpers", () => {
  it("sums capability-bearing licenses and ignores modifiers", () => {
    expect(softwareCapability([])).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(softwareCapability(["software-net-monitor"]).network).toBe(2);
    expect(softwareCapability(["software-analysis-pipeline"])).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(softwareCapability(["ghost-package"])).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });

  it("combines modifier factors and floors the shortcut", () => {
    expect(actionDurationFactor([])).toBe(1);
    expect(actionDurationFactor(["software-analysis-pipeline"])).toBe(0.85);
    expect(
      actionDurationFactor([
        "software-analysis-pipeline",
        "software-analysis-pipeline",
      ]),
    ).toBeCloseTo(0.7225, 6);
    expect(
      actionDurationFactor(
        Array.from({ length: 40 }, () => "software-analysis-pipeline"),
      ),
    ).toBe(0.1);
  });

  it("total daily cost adds lease and licenses", () => {
    expect(recurringDailyCost(null, [])).toBe(0);
    expect(recurringDailyCost("housing-cowork-loft", [])).toBe(30);
    expect(
      recurringDailyCost("housing-cowork-loft", [
        "software-net-monitor",
        "software-analysis-pipeline",
      ]),
    ).toBe(30 + 40 + 100);
    expect(recurringDailyCost(null, ["ghost-package"])).toBe(0);
  });
});

describe("software commands", () => {
  it("activates a license for free and records the change", () => {
    const bus = new CommandBus(stateWithSoftware([], 100));

    const result = bus.execute({
      type: "enableSoftware",
      softwareId: "software-net-monitor",
    });

    expect(result.ok).toBe(true);
    expect(result.events).toEqual([
      {
        type: "SoftwareChanged",
        softwareId: "software-net-monitor",
        active: true,
        dailyCost: 40,
        worldMinute: 0,
      },
    ]);
    const world = bus.snapshot();
    expect(world.economy.software).toEqual(["software-net-monitor"]);
    expect(world.economy.credits).toBe(100);
    expect(world.economy.ledger).toEqual([]);
  });

  it("stacks independent licenses in activation order", () => {
    const bus = new CommandBus(stateWithSoftware([]));
    bus.execute({ type: "enableSoftware", softwareId: "software-net-monitor" });

    const result = bus.execute({
      type: "enableSoftware",
      softwareId: "software-analysis-pipeline",
    });

    expect(result.ok).toBe(true);
    expect(bus.snapshot().economy.software).toEqual([
      "software-net-monitor",
      "software-analysis-pipeline",
    ]);
  });

  it("rejects unknown packages and redundant actions", () => {
    const bus = new CommandBus(stateWithSoftware([]));

    expect(
      bus.execute({ type: "enableSoftware", softwareId: "ghost-package" }).error,
    ).toBe("SOFTWARE_NOT_FOUND");
    expect(
      bus.execute({ type: "disableSoftware", softwareId: "ghost-package" })
        .error,
    ).toBe("SOFTWARE_NOT_FOUND");

    bus.execute({ type: "enableSoftware", softwareId: "software-net-monitor" });
    expect(
      bus.execute({ type: "enableSoftware", softwareId: "software-net-monitor" })
        .error,
    ).toBe("ALREADY_ACTIVE");
    expect(
      bus.execute({ type: "disableSoftware", softwareId: "software-auto-recon" })
        .error,
    ).toBe("NOT_RUNNING");
  });

  it("stopping a license removes it, refunds nothing, and stops its fee", () => {
    const bus = new CommandBus(
      stateWithSoftware(["software-net-monitor", "software-auto-recon"], 1_000),
    );

    const result = bus.execute({
      type: "disableSoftware",
      softwareId: "software-net-monitor",
    });

    expect(result.events).toEqual([
      {
        type: "SoftwareChanged",
        softwareId: "software-net-monitor",
        active: false,
        dailyCost: 0,
        worldMinute: 0,
      },
    ]);
    expect(bus.snapshot().economy.software).toEqual(["software-auto-recon"]);

    const wait = bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    // Only the surviving license was billed.
    const charges = licenseCharges(wait.events);
    expect(charges).toHaveLength(1);
    expect(charges[0].causeId).toBe("software-auto-recon");
    expect(bus.snapshot().economy.credits).toBe(1_000 - 70);
  });
});

describe("recurring license fees", () => {
  it("bills every active license at each crossed day boundary", () => {
    const bus = new CommandBus(
      stateWithSoftware(["software-net-monitor", "software-analysis-pipeline"], 1_000),
    );

    const result = bus.execute({ type: "advanceTime", minutes: 2 * DAY_MINUTES });

    const charges = licenseCharges(result.events);
    expect(charges).toHaveLength(4); // two licenses × two boundaries
    expect(charges.map((event) => event.amount)).toEqual([40, 100, 40, 100]);
    expect(charges.map((event) => event.worldMinute)).toEqual([
      DAY_MINUTES,
      DAY_MINUTES,
      2 * DAY_MINUTES,
      2 * DAY_MINUTES,
    ]);
    for (const charge of charges) {
      expect(charge.counterparty).toBe(VENDOR_COUNTERPARTY);
    }
    expect(bus.snapshot().economy.credits).toBe(1_000 - 280);
  });

  it("bills the lease before licenses at the same boundary", () => {
    const bus = new CommandBus(
      stateWithSoftware(
        ["software-net-monitor"],
        1_000,
        "housing-cowork-loft",
      ),
    );

    const result = bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const debits = result.events.filter(
      (event): event is Extract<SimulationEvent, { type: "ValueTransferred" }> =>
        event.type === "ValueTransferred" &&
        (event.causeKind === "upkeep" || event.causeKind === "license"),
    );
    expect(debits.map((event) => [event.causeKind, event.amount])).toEqual([
      ["upkeep", 30],
      ["license", 40],
    ]);
  });

  it("is split-invariant: chunked waits bill the same boundaries", () => {
    const ids = ["software-net-monitor", "software-analysis-pipeline"];
    const straight = new CommandBus(stateWithSoftware(ids, 1_000));
    straight.execute({ type: "advanceTime", minutes: 2 * DAY_MINUTES + 420 });

    const chunked = new CommandBus(stateWithSoftware(ids, 1_000));
    chunked.execute({ type: "advanceTime", minutes: 420 });
    chunked.execute({ type: "advanceTime", minutes: DAY_MINUTES });
    chunked.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const ledgerOf = (state: WorldState) =>
      state.economy.ledger.map((entry) => [
        entry.worldMinute,
        entry.amount,
        entry.balanceAfter,
      ]);

    expect(ledgerOf(chunked.snapshot())).toEqual(ledgerOf(straight.snapshot()));
  });

  it("lapses one unpaid license without debt and keeps the rest", () => {
    // 100 cr: monitor bills first (40), pipeline (100) cannot pay ⇒ lapses.
    const bus = new CommandBus(
      stateWithSoftware(
        ["software-net-monitor", "software-analysis-pipeline"],
        100,
      ),
    );

    const result = bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    const charges = licenseCharges(result.events);
    expect(charges).toHaveLength(1);
    expect(charges[0].causeId).toBe("software-net-monitor");
    expect(charges[0].balanceAfter).toBe(60);
    expect(
      result.events.filter(
        (event) =>
          event.type === "SoftwareChanged" &&
          event.softwareId === "software-analysis-pipeline" &&
          event.active === false &&
          event.dailyCost === 0,
      ),
    ).toHaveLength(1);

    const world = bus.snapshot();
    expect(world.economy.software).toEqual(["software-net-monitor"]);
    expect(world.economy.credits).toBe(60);
    expect(world.economy.credits).toBeGreaterThanOrEqual(0);
  });

  it("a lapsed license can be re-run later once funds return", () => {
    const bus = new CommandBus(stateWithSoftware(["software-net-monitor"], 39));

    bus.execute({ type: "advanceTime", minutes: DAY_MINUTES });

    // First bill fails at the boundary: the monitor lapses for want of 40 cr.
    expect(bus.snapshot().economy.software).toEqual([]);
    expect(bus.snapshot().economy.credits).toBe(39);

    const again = bus.execute({
      type: "enableSoftware",
      softwareId: "software-net-monitor",
    });
    expect(again.ok).toBe(true);
  });

  it("no licenses and no lease means no upkeep at all", () => {
    const events = advanceUpkeep(stateWithSoftware([], 1_000), 0, 10 * DAY_MINUTES);
    expect(events).toEqual([]);
  });
});

describe("software flows through rig speed and scale", () => {
  it("a monitoring suite shortens survey like hardware does", () => {
    const bus = new CommandBus(stateWithSoftware(["software-net-monitor"], 1_000));
    openOp(bus);
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    // starter network 1 + monitor 2 = 3 ⇒ survey ceil(12 / 3) = 4m.
    expect(bus.snapshot().worldMinute).toBe(4);
  });

  it("an automation framework widens discovery", () => {
    const bus = new CommandBus(stateWithSoftware(["software-auto-recon"], 1_000));
    openOp(bus);

    const result = bus.execute({
      type: "surveyTarget",
      targetId: "nightshade",
    });

    // starter memory 1 + auto-recon 2 = 3 ⇒ scope 3 covers both machines.
    expect(
      result.events.filter((event) => event.type === "MachineObserved"),
    ).toHaveLength(2);
  });

  it("an analysis pipeline shortcuts even baseline hardware minutes", () => {
    const bus = new CommandBus(
      stateWithSoftware(["software-analysis-pipeline"], 1_000),
    );
    openOp(bus);
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });

    // network stays at starter baseline (1), so survey = ceil(12 × 0.85) = 11m;
    // inspect = ceil(8 × 0.85) = 7m. Automation makes even an un-upgraded rig
    // faster — that is what the license fee buys.
    expect(bus.snapshot().worldMinute).toBe(11);
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
    expect(bus.snapshot().worldMinute).toBe(18);
  });

  it("the shortcut respects the one-minute hardware floor", () => {
    const state = stateWithSoftware(["software-analysis-pipeline"], 1_000);
    state.economy.hardware = [
      { id: "hw:1", catalogId: "rig-starter", acquiredWorldMinute: 0 },
      { id: "hw:2", catalogId: "cpu-overclock", acquiredWorldMinute: 0 },
      { id: "hw:3", catalogId: "cpu-overclock", acquiredWorldMinute: 0 },
    ];
    const economy = projectWorld(state).economy;

    // two overclocks: compute 1 + 3 + 3 = 7 ⇒ escalate hardware minutes already
    // floor to 1, and the shortcut cannot cut the one-minute floor further.
    expect(economy.actionMinutes.escalate).toBe(1);
    expect(economy.actionMinutes.disengage).toBe(3);
  });

  it("stopping a tool returns durations and scope to the hardware baseline", () => {
    const bus = new CommandBus(
      stateWithSoftware(["software-net-monitor", "software-auto-recon"], 1_000),
    );
    expect(projectWorld(bus.snapshot()).economy.actionMinutes.survey).toBe(3);
    expect(projectWorld(bus.snapshot()).economy.discoveryScope).toBe(3);

    bus.execute({ type: "disableSoftware", softwareId: "software-net-monitor" });
    bus.execute({ type: "disableSoftware", softwareId: "software-auto-recon" });

    const economy = projectWorld(bus.snapshot()).economy;
    expect(economy.actionMinutes.survey).toBe(12);
    expect(economy.discoveryScope).toBe(1);
    expect(economy.software).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
  });
});

describe("software projection", () => {
  it("surfaces the baseline with no licenses", () => {
    const economy = projectWorld(createSliceWorldState()).economy;

    expect(economy.software).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });
    expect(economy.softwareListings).toHaveLength(SOFTWARE_CATALOG.length);
    expect(economy.softwareListings.every((listing) => !listing.active)).toBe(
      true,
    );
    expect(economy.dailyCost).toBe(0);
  });

  it("marks running licenses active with combined daily cost", () => {
    const economy = projectWorld(
      stateWithSoftware(["software-net-monitor"], 500, "housing-cowork-loft"),
    ).economy;

    expect(economy.dailyCost).toBe(30 + 40);
    // starter network 1 + lease 2 + monitor 2 = 5.
    expect(economy.capability.network).toBe(5);
    expect(economy.software.network).toBe(2);
    // survey is network-bound with no modifier running: ceil(12 / 5) = 3m.
    expect(economy.actionMinutes.survey).toBe(3);
    expect(economy.softwareListings.find((listing) => listing.active)?.id).toBe(
      "software-net-monitor",
    );
    const pipeline = economy.softwareListings.find(
      (listing) => listing.id === "software-analysis-pipeline",
    );
    expect(pipeline?.discountFactor).toBe(0.85);
    expect(pipeline?.capability).toBeNull();
  });

  it("derive and effective stay consistent with the catalog", () => {
    const state = stateWithSoftware(
      ["software-net-monitor", "software-analysis-pipeline"],
      1_000,
    );
    const withSoftware = deriveSoftwareCapability(state.economy);
    const rig = effectiveCapability(state.economy);

    expect(withSoftware.network).toBe(2);
    expect(rig.network).toBe(1 + 2);
  });
});

describe("software TinyBase sync", () => {
  it("tracks license rows, combined cost and rig lift through the runtime", () => {
    const runtime = createGameRuntime(stateWithSoftware([], 1_000));

    expect(runtime.projection.getCell("meta", "wallet", "dailyCost")).toBe(0);
    expect(runtime.projection.getRow("rig", "softwareLift")).toEqual({
      compute: 0,
      memory: 0,
      vram: 0,
      storage: 0,
      network: 0,
    });

    runtime.execute({
      type: "enableSoftware",
      softwareId: "software-net-monitor",
    });

    expect(
      runtime.projection.getCell("software", "software-net-monitor", "active"),
    ).toBe(true);
    expect(runtime.projection.getRow("rig", "softwareLift")).toMatchObject({
      network: 2,
    });
    expect(runtime.projection.getCell("meta", "wallet", "dailyCost")).toBe(40);
    expect(
      runtime.projection.getCell("rig", "actionMinutes", "survey"),
    ).toBe(4);

    runtime.execute({
      type: "disableSoftware",
      softwareId: "software-net-monitor",
    });

    expect(
      runtime.projection.getCell("software", "software-net-monitor", "active"),
    ).toBe(false);
    expect(runtime.projection.getCell("meta", "wallet", "dailyCost")).toBe(0);
  });
});
