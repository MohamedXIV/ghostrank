import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { createSliceWorldState } from "@/game/runtime/slice-world";

function earlyExit(playerRank = 100_256) {
  const state = createSliceWorldState();
  state.player.rank = playerRank;
  const bus = new CommandBus(state);

  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  const result = bus.execute({ type: "disengageOperation" });

  return { bus, result };
}

function severeExit(playerRank = 100_256) {
  const state = createSliceWorldState();
  state.player.rank = playerRank;
  const bus = new CommandBus(state);

  bus.execute({ type: "observeTarget", targetId: "nightshade" });
  bus.execute({ type: "openOperation", targetId: "nightshade" });
  bus.execute({ type: "surveyTarget", targetId: "nightshade" });
  bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
  bus.execute({ type: "escalateOperation" });
  const result = bus.execute({ type: "disengageOperation" });

  return { bus, result };
}

describe("deterministic opponent reaction", () => {
  it("leaves a low-footprint early exit without an active reaction", () => {
    const { bus, result } = earlyExit();

    expect(bus.snapshot().traces).toHaveLength(1);
    expect(bus.snapshot().reactions).toEqual([]);
    expect(
      result.events.some((event) => event.type === "OpponentReactionTriggered"),
    ).toBe(false);
    expect(projectWorld(bus.snapshot()).reactions).toEqual([]);
  });

  it("triggers one defensive watch from the severe causal footprint", () => {
    const { bus, result } = severeExit();

    expect(result.events).toContainEqual({
      type: "OpponentReactionTriggered",
      reactionId: "reaction:1",
      targetId: "nightshade",
      kind: "defensive-watch",
      sourceTraceIds: ["trace:1", "trace:2"],
      footprintScore: 5,
      worldMinute: 28,
    });

    expect(bus.snapshot().reactions).toEqual([
      {
        id: "reaction:1",
        targetId: "nightshade",
        kind: "defensive-watch",
        status: "active",
        sourceTraceIds: ["trace:1", "trace:2"],
        footprintScore: 5,
        triggeredWorldMinute: 28,
        playerVisible: true,
      },
    ]);

    expect(projectWorld(bus.snapshot()).reactions).toEqual([
      {
        id: "reaction:1",
        targetId: "nightshade",
        kind: "defensive-watch",
        status: "active",
        sourceTraceIds: ["trace:1", "trace:2"],
        footprintScore: 5,
        triggeredWorldMinute: 28,
      },
    ]);
  });

  it("does not make reaction depend on player rank", () => {
    const lowRank = severeExit(100_256).bus.snapshot().reactions;
    const topRank = severeExit(1).bus.snapshot().reactions;

    expect(lowRank).toEqual(topRank);
  });

  it("does not duplicate an already-active target reaction", () => {
    const { bus } = severeExit();

    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-vault" });
    bus.execute({ type: "escalateOperation" });
    bus.execute({ type: "disengageOperation" });

    expect(bus.snapshot().reactions).toHaveLength(1);
  });
});
