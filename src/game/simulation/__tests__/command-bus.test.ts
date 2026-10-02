import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

describe("CommandBus", () => {
  it("does not gate observing a top-ranked target by the player rank", () => {
    const state = createInitialWorldState({
      player: { handle: "CobaltXZ", rank: 100_256 },
      targets: [
        {
          id: "nightshade",
          handle: "NIGHTSHADE",
          rank: 10,
          hidden: { operationalSkill: 99 },
        },
      ],
    });
    const bus = new CommandBus(state);

    const result = bus.execute({
      type: "observeTarget",
      targetId: "nightshade",
    });

    expect(result.ok).toBe(true);
    expect(result.events).toContainEqual({
      type: "TargetObserved",
      targetId: "nightshade",
      worldMinute: 0,
    });
    expect(bus.snapshot().knownTargetIds).toContain("nightshade");
  });

  it("advances world time monotonically through a command", () => {
    const bus = new CommandBus(createInitialWorldState());

    bus.execute({ type: "advanceTime", minutes: 45 });
    bus.execute({ type: "advanceTime", minutes: 15 });

    expect(bus.snapshot().worldMinute).toBe(60);
  });

  it("does not expose mutable authoritative state to callers", () => {
    const initial = createInitialWorldState();
    const bus = new CommandBus(initial);

    initial.worldMinute = 500;
    const snapshot = bus.snapshot();
    snapshot.worldMinute = 900;

    expect(bus.snapshot().worldMinute).toBe(0);
  });
});
