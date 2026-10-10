import { describe, expect, it } from "vitest";

import {
  NIGHTSHADE_TARGET_ID,
  RELAY_MACHINE_ID,
  SLICE_CONTRACT_ID,
  SLICE_FAILURE_CLUES,
  SLICE_WINDOW_END_MINUTE,
  VAULT_MACHINE_ID,
} from "@/content/nightshade-slice";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { CommandBus } from "@/game/simulation/command-bus";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { SimulationEvent } from "@/game/simulation/events/types";
import {
  nextBoundaryAfter,
  previewSliceActions,
  sliceFailureClue,
} from "@/game/simulation/systems/nightshade-slice";
import { SLICE_RUN_SCENARIO } from "@/game/simulation/state/run-scenario";
import type { WorldState } from "@/game/simulation/state/world-state";

/** A fresh Nightshade briefing on the authored roster. */
function briefing(seed?: number): CommandBus {
  return new CommandBus(
    createSliceWorldState({ scenario: SLICE_RUN_SCENARIO, seed }),
  );
}

function run(bus: CommandBus, command: SimulationCommand) {
  const result = bus.execute(command);
  if (!result.ok) {
    throw new Error(`${command.type} refused: ${result.error}`);
  }
  return result;
}

function advanceTo(bus: CommandBus, minute: number) {
  const now = bus.snapshot().worldMinute;
  if (minute > now) {
    run(bus, { type: "advanceTime", minutes: minute - now });
  }
}

function open(bus: CommandBus) {
  run(bus, { type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID });
  run(bus, { type: "acceptContract", contractId: SLICE_CONTRACT_ID });
  run(bus, { type: "openOperation", targetId: NIGHTSHADE_TARGET_ID });
}

/** Survey the relay, then read its broker: the only way to unlock escalation. */
function mapRelayAndBroker(bus: CommandBus) {
  run(bus, { type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID });
  run(bus, { type: "inspectMachine", machineId: RELAY_MACHINE_ID });
}

function escalate(bus: CommandBus) {
  run(bus, { type: "escalateOperation", confirmed: true });
}

function slice(bus: CommandBus) {
  const state = bus.snapshot().slice;
  if (!state) throw new Error("no briefing on this world");
  return state;
}

function footprint(bus: CommandBus): number {
  return bus
    .snapshot()
    .traces.filter((trace) => trace.targetId === NIGHTSHADE_TARGET_ID)
    .reduce((sum, trace) => sum + trace.weight, 0);
}

function outcomeEvents(events: readonly SimulationEvent[]) {
  return events.filter((event) => event.type === "SliceEnded");
}

describe("Nightshade briefing: the quiet route (D071)", () => {
  it("delivers the map on the quiet route with footprint 3 and no owner watch", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);

    // The broker answers at the next boundary, not at once.
    expect(slice(bus).pendingClues).toEqual([
      { clueId: "broker-routing", dueWorldMinute: nextBoundaryAfter(bus.snapshot().worldMinute) },
    ]);

    advanceTo(bus, 360);
    expect(slice(bus).clues).toContain("broker-routing");

    // The vault is only on the map after the broker's routing is known.
    run(bus, { type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID });
    const result = run(bus, { type: "deliverContract", contractId: SLICE_CONTRACT_ID });

    expect(outcomeEvents(result.events)).toEqual([
      { type: "SliceEnded", targetId: NIGHTSHADE_TARGET_ID, outcome: "delivered", worldMinute: bus.snapshot().worldMinute },
    ]);
    expect(slice(bus).outcome).toBe("delivered");
    expect(footprint(bus)).toBe(3);
    expect(bus.snapshot().reactions).toEqual([]);
    expect(bus.snapshot().operation).toBeNull();
  });

  it("refuses to survey the vault before the broker's routing is known", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);

    expect(
      bus.execute({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID }),
    ).toMatchObject({ ok: false, error: "NO_NEW_MACHINE_EVIDENCE" });
    expect(
      briefingFailure(bus, "NO_NEW_MACHINE_EVIDENCE"),
    ).toBe(SLICE_FAILURE_CLUES["NO_NEW_MACHINE_EVIDENCE.pending"]);
  });
});

describe("Nightshade briefing: the intrusive route (D071)", () => {
  it("escalation waits for explicit confirmation and shows the trace it will cost", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);

    expect(
      bus.execute({ type: "escalateOperation" }),
    ).toEqual({ ok: false, events: [], error: "ESCALATION_UNCONFIRMED" });
    expect(bus.snapshot().operation?.stage).toBe("recon");
    expect(footprint(bus)).toBe(2);
  });

  it("the preview names the same cost the confirmed escalation records", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);

    const preview = previewSliceActions(bus.snapshot());
    expect(preview).not.toBeNull();
    expect(preview!.escalate.blockedBy).toBeNull();
    expect(preview!.escalate.traceWeight).toBe(3);
    expect(preview!.escalate.footprintAfter).toBe(5);
    expect(preview!.escalate.startsWatch).toBe(true);

    escalate(bus);

    expect(footprint(bus)).toBe(preview!.escalate.footprintAfter);
    expect(bus.snapshot().reactions.some((reaction) => reaction.status === "active")).toBe(true);
  });

  it("reveals the vault on escalation and schedules the owner's review at the next boundary", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);

    expect(bus.snapshot().evidence.some(
      (record) => record.id === `machine-presence:${VAULT_MACHINE_ID}` && record.retiredWorldMinute === undefined,
    )).toBe(true);
    expect(slice(bus).review).toEqual({
      dueWorldMinute: 360,
      reactionId: "reaction:1",
      status: "scheduled",
    });
  });

  it("delivers under watch at footprint 5 when the owner has not yet reviewed", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);

    run(bus, { type: "deliverContract", contractId: SLICE_CONTRACT_ID });

    expect(slice(bus).outcome).toBe("delivered");
    expect(footprint(bus)).toBe(5);
    expect(slice(bus).review?.status).toBe("scheduled");
  });
});

describe("Nightshade briefing: how a briefing ends badly", () => {
  it("burns when leaving pushes the footprint to the line", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);
    // Reading the vault's archive is one more probe: footprint 6.
    run(bus, { type: "inspectMachine", machineId: VAULT_MACHINE_ID });
    expect(footprint(bus)).toBe(6);

    const preview = previewSliceActions(bus.snapshot());
    expect(preview!.disengage.footprintAfter).toBe(8);
    expect(preview!.disengage.endsWith).toBe("burned");

    const result = run(bus, { type: "disengageOperation" });

    expect(slice(bus).outcome).toBe("burned");
    expect(outcomeEvents(result.events)).toHaveLength(1);
    expect(bus.snapshot().operation).toBeNull();
  });

  it("retreats while watched and below the burn line", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);

    const preview = previewSliceActions(bus.snapshot());
    expect(preview!.disengage.endsWith).toBe("retreated");

    run(bus, { type: "disengageOperation" });

    expect(slice(bus).outcome).toBe("retreated");
    expect(footprint(bus)).toBe(7);
  });

  it("locks the player out when leaving after the owner's review", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);

    advanceTo(bus, 359);
    expect(slice(bus).review?.status).toBe("scheduled");
    advanceTo(bus, 360);
    expect(slice(bus).review?.status).toBe("ran");

    run(bus, { type: "disengageOperation" });

    expect(slice(bus).outcome).toBe("locked-out");
    expect(footprint(bus)).toBe(7);
  });

  it("ends as expired when the window closes with the operation still open", () => {
    const bus = briefing();
    open(bus);
    advanceTo(bus, SLICE_WINDOW_END_MINUTE);

    expect(slice(bus).outcome).toBe("expired");
    expect(slice(bus).endedWorldMinute).toBe(SLICE_WINDOW_END_MINUTE);
    expect(bus.snapshot().operation).toBeNull();
  });

  it("declining the contract closes the briefing before anything is touched", () => {
    const bus = briefing();
    const result = run(bus, { type: "declineContract", contractId: SLICE_CONTRACT_ID });

    expect(outcomeEvents(result.events)).toEqual([
      expect.objectContaining({ outcome: "declined" }),
    ]);
    expect(slice(bus).outcome).toBe("declined");
    expect(bus.execute({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID })).toEqual({
      ok: false,
      events: [],
      error: "SLICE_ENDED",
    });
  });
});

describe("Nightshade briefing: the owner's counterplay and the response path", () => {
  it("lets the player re-read the broker after the review and recover the vault", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);
    advanceTo(bus, 360);

    // The review rotated the vault off the map. Only the broker's rotated key brings it back.
    expect(bus.execute({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID })).toMatchObject({
      ok: false,
      error: "NO_NEW_MACHINE_EVIDENCE",
    });
    expect(briefingFailure(bus, "NO_NEW_MACHINE_EVIDENCE")).toBe(
      SLICE_FAILURE_CLUES["NO_NEW_MACHINE_EVIDENCE.locked"],
    );

    run(bus, { type: "inspectMachine", machineId: RELAY_MACHINE_ID });
    expect(slice(bus).pendingClues.map((pending) => pending.clueId)).toEqual(["rotated-routing"]);

    advanceTo(bus, nextBoundaryAfter(360));
    expect(slice(bus).clues).toContain("rotated-routing");

    run(bus, { type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID });
    run(bus, { type: "deliverContract", contractId: SLICE_CONTRACT_ID });

    expect(slice(bus).outcome).toBe("delivered");
    expect(footprint(bus)).toBe(7);
  });

  it("the relay re-read is offered once per review", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);
    advanceTo(bus, 360);

    run(bus, { type: "inspectMachine", machineId: RELAY_MACHINE_ID });
    expect(
      bus.execute({ type: "inspectMachine", machineId: RELAY_MACHINE_ID }),
    ).toMatchObject({ ok: false, error: "NO_NEW_SERVICE_EVIDENCE" });
  });
});

describe("Nightshade briefing: determinism, rank and the canonical roster", () => {
  it("the same seed and the same commands produce the same events", () => {
    const script: SimulationCommand[] = [
      { type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID },
      { type: "acceptContract", contractId: SLICE_CONTRACT_ID },
      { type: "openOperation", targetId: NIGHTSHADE_TARGET_ID },
      { type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID },
      { type: "inspectMachine", machineId: RELAY_MACHINE_ID },
      { type: "escalateOperation", confirmed: true },
      { type: "advanceTime", minutes: 400 },
      { type: "disengageOperation" },
    ];

    const play = () => {
      const bus = briefing(20_261_003);
      const events = script.map((command) => bus.execute(command));
      return { events, slice: bus.snapshot().slice, traces: bus.snapshot().traces };
    };

    expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
  });

  it("rank does not change the briefing's outcome or its trace", () => {
    const route = (rank: number) => {
      const base = createSliceWorldState({ scenario: SLICE_RUN_SCENARIO });
      const world: WorldState = { ...base, player: { ...base.player, rank } };
      const bus = new CommandBus(world);
      open(bus);
      mapRelayAndBroker(bus);
      escalate(bus);
      run(bus, { type: "deliverContract", contractId: SLICE_CONTRACT_ID });
      return { outcome: slice(bus).outcome, footprint: footprint(bus), log: slice(bus).log };
    };

    expect(route(1)).toEqual(route(100_256));
    expect(route(1).outcome).toBe("delivered");
  });

  it("canonical worlds never gain a briefing, a probe trace or a slice projection", () => {
    const bus = new CommandBus(createSliceWorldState());
    bus.execute({ type: "observeTarget", targetId: NIGHTSHADE_TARGET_ID });
    bus.execute({ type: "openOperation", targetId: NIGHTSHADE_TARGET_ID });
    bus.execute({ type: "surveyTarget", targetId: NIGHTSHADE_TARGET_ID });

    expect(bus.snapshot().slice).toBeUndefined();
    expect(bus.snapshot().traces.some((trace) => trace.cause === "operation-probe")).toBe(false);
    expect("slice" in projectWorld(bus.snapshot())).toBe(false);
  });
});

describe("Nightshade briefing: player-safe projection", () => {
  it("shows no vault before the broker has routed it", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);

    const view = projectWorld(bus.snapshot()).slice!;
    const text = JSON.stringify(view);

    expect(text).not.toContain(VAULT_MACHINE_ID);
    expect(text).not.toContain("Cold Vault");
    expect(view.map).toEqual({ known: 1, needed: 2, relayOnMap: true, vaultOnMap: false });
  });

  it("never exposes trace, reaction or evidence identifiers", () => {
    const bus = briefing();
    open(bus);
    mapRelayAndBroker(bus);
    escalate(bus);

    const text = JSON.stringify(projectWorld(bus.snapshot()).slice);

    expect(text).not.toContain("trace:");
    expect(text).not.toContain("reaction:");
    expect(text).not.toContain("sourceTraceIds");
    expect(text).not.toContain("evidence");
  });
});

/** The in-world failure text the player reads, for a code the bus just refused. */
function briefingFailure(bus: CommandBus, code: string): string | null {
  return sliceFailureClue(bus.snapshot(), code);
}
