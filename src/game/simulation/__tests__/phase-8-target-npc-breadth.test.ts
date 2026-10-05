import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { runBalanceTelemetry } from "@/game/telemetry/balance-telemetry";

const NEW_TARGET_IDS = [
  "velvetwire",
  "ironveil",
  "tallyman",
  "daystar",
  "rookery",
] as const;

describe("Phase 8 P2 — target and NPC breadth", () => {
  it("routes every new target through the same operation command surface", () => {
    for (const targetId of NEW_TARGET_IDS) {
      const bus = new CommandBus(createSliceWorldState());

      expect(bus.execute({ type: "observeTarget", targetId }).ok).toBe(true);
      expect(bus.execute({ type: "openOperation", targetId }).ok).toBe(true);
      expect(bus.execute({ type: "surveyTarget", targetId }).ok).toBe(true);
      expect(bus.execute({ type: "disengageOperation" }).ok).toBe(true);

      const world = bus.snapshot();
      expect(world.knownTargetIds).toContain(targetId);
      expect(
        world.evidence.some(
          (entry) =>
            entry.kind === "target-profile" && entry.subjectId === targetId,
        ),
      ).toBe(true);
      expect(
        world.evidence.some((entry) => entry.kind === "machine-presence"),
      ).toBe(true);
    }
  });

  it("does not turn target breadth into a player-rank access gate", () => {
    for (const targetId of NEW_TARGET_IDS) {
      const lowWorld = createSliceWorldState();
      lowWorld.player.rank = 1;
      const highWorld = createSliceWorldState();
      highWorld.player.rank = 999_999;

      const low = new CommandBus(lowWorld);
      const high = new CommandBus(highWorld);

      for (const command of [
        { type: "observeTarget", targetId } as const,
        { type: "openOperation", targetId } as const,
        { type: "surveyTarget", targetId } as const,
        { type: "disengageOperation" } as const,
      ]) {
        expect(low.execute(command)).toEqual(high.execute(command));
      }

      const lowState = low.snapshot();
      const highState = high.snapshot();
      expect(lowState.worldMinute).toBe(highState.worldMinute);
      expect(lowState.knownTargetIds).toEqual(highState.knownTargetIds);
      expect(lowState.evidence).toEqual(highState.evidence);
      expect(lowState.traces).toEqual(highState.traces);
    }
  });

  it("makes the expanded roster reachable in deterministic multi-seed play", () => {
    const report = runBalanceTelemetry({
      seeds: [1, 2, 3, 4, 5, 6, 7, 8],
      horizonDays: 12,
      scenarios: ["contractor"],
    });
    const exposure = report.scenarios.contractor.exposure;

    expect(exposure.targetIds.length).toBeGreaterThan(1);
    expect(
      exposure.targetIds.some((id) => id !== "nightshade"),
    ).toBe(true);
    expect(exposure.contractIssuerIds.length).toBeGreaterThan(2);
  });
});
