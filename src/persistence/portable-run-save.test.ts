import { describe, expect, it } from "vitest";

import { CommandBus } from "@/game/simulation/command-bus";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";

describe("portable run save", () => {
  it("round-trips the complete current Phase 2 state", () => {
    const bus = new CommandBus(createSliceWorldState());

    bus.execute({ type: "observeTarget", targetId: "nightshade" });
    bus.execute({ type: "openOperation", targetId: "nightshade" });
    bus.execute({ type: "surveyTarget", targetId: "nightshade" });
    bus.execute({ type: "inspectMachine", machineId: "ns-relay" });
    bus.execute({ type: "escalateOperation" });
    bus.execute({ type: "disengageOperation" });

    const state = bus.snapshot();
    const restored = parsePortableRunSave(
      serializePortableRunSave(state),
    );

    expect(restored).toEqual(state);
    expect(restored.worldMinute).toBe(28);
    expect(restored.traces).toHaveLength(2);
    expect(restored.reactions).toHaveLength(1);
  });

  it("rejects an invalid or corrupt save envelope", () => {
    expect(() => parsePortableRunSave("{not-json")).toThrow();

    expect(() =>
      parsePortableRunSave(
        JSON.stringify({
          format: "ghostrank-run",
          version: 99,
          state: {},
        }),
      ),
    ).toThrow();
  });
});
