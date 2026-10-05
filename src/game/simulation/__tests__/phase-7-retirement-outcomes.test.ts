import { describe, expect, it } from "vitest";

import { createSliceWorldState } from "@/game/runtime/slice-world";
import { CommandBus } from "@/game/simulation/command-bus";
import { projectWorld } from "@/game/simulation/projection/project-world";
import {
  deriveRetirementOutcome,
  type RetirementVariant,
} from "@/game/simulation/systems/retirement";
import type {
  UndergroundContract,
  WorldState,
} from "@/game/simulation/state/world-state";
import {
  parsePortableRunSave,
  serializePortableRunSave,
} from "@/persistence/portable-run-save";
import {
  createWorldProjectionStore,
  syncWorldProjection,
} from "@/stores/projection/world-projection";

function completedContract(
  id: string,
  issuerId: string,
  objective: UndergroundContract["objective"] = "recon-report",
): UndergroundContract {
  return {
    id,
    issuerId,
    targetId: "nightshade",
    objective,
    requiredServices: objective === "recon-report" ? 1 : undefined,
    status: "completed",
    offeredWorldMinute: 0,
    expiresWorldMinute: 1_440,
    acceptedWorldMinute: 10,
    dueWorldMinute: 2_880,
    resolvedWorldMinute: 120,
  };
}

function readyWorld(): WorldState {
  const state = createSliceWorldState();
  state.worldMinute = 3_000;
  state.retirement = {
    stage: "cooling",
    startedWorldMinute: 0,
    committedWorldMinute: 60,
    coolingUntilWorldMinute: 2_940,
  };
  return state;
}

function withWhiteHistory(count: number): WorldState {
  const state = readyWorld();
  for (let index = 0; index < count; index += 1) {
    state.underground.contracts.push(
      completedContract(`contract:white:${index + 1}`, "vesper"),
    );
  }
  return state;
}

function withBlackHistory(
  credits: number,
  count = 2,
): WorldState {
  const state = readyWorld();
  state.economy.credits = credits;
  for (let index = 0; index < count; index += 1) {
    state.underground.contracts.push(
      completedContract(`contract:black:${index + 1}`, "lattice"),
    );
  }
  return state;
}

function expectVariant(state: WorldState, variant: RetirementVariant) {
  expect(deriveRetirementOutcome(state)).toEqual(
    expect.objectContaining({ variant }),
  );
}

describe("Phase 7 P3 — retirement outcomes", () => {
  it("cannot finish before the frozen cooling deadline", () => {
    const state = readyWorld();
    state.worldMinute = state.retirement!.stage === "cooling"
      ? state.retirement.coolingUntilWorldMinute - 1
      : 0;
    const bus = new CommandBus(state);

    expect(bus.execute({ type: "finishRetirement" })).toEqual({
      ok: false,
      events: [],
      error: "RETIREMENT_NOT_READY",
    });
    expect(bus.snapshot().ending).toBeNull();
  });

  it("closes an ordinary READY run as RETIRED and makes the terminal boundary final", () => {
    const bus = new CommandBus(readyWorld());

    const result = bus.execute({ type: "finishRetirement" });
    const state = bus.snapshot();

    expect(result).toEqual({
      ok: true,
      events: [
        expect.objectContaining({
          type: "RunEnded",
          status: "retired",
          causeKind: "retirement",
          worldMinute: 3_000,
        }),
      ],
    });
    expect(state.ending).toEqual(
      expect.objectContaining({
        status: "retired",
        causeKind: "retirement",
        worldMinute: 3_000,
      }),
    );
    expect(deriveRetirementOutcome(state)).toEqual({
      status: "retired",
      variant: "mixed-exit",
      detail: "the handle closes without belonging cleanly to either side",
    });
    expect(bus.execute({ type: "advanceTime", minutes: 1 })).toEqual({
      ok: false,
      events: [],
      error: "RUN_ENDED",
    });
  });

  it("earns rare VANISHED from coherent White-scene history even if the starting package was Black", () => {
    const state = withWhiteHistory(3);
    state.underground.playerNetwork = "black";
    state.player.rank = 999_999;

    expect(deriveRetirementOutcome(state)).toEqual({
      status: "vanished",
      variant: "vanished",
      detail: "the old handle stays silent; nothing calls it back",
    });

    const bus = new CommandBus(state);
    expect(bus.execute({ type: "finishRetirement" }).events).toContainEqual(
      expect.objectContaining({
        type: "RunEnded",
        status: "vanished",
        causeKind: "retirement",
      }),
    );
  });

  it("does not award VANISHED when accepted obligations were missed", () => {
    const state = withWhiteHistory(3);
    state.underground.contracts.push({
      id: "contract:missed",
      issuerId: "vesper",
      targetId: "nightshade",
      objective: "recon-report",
      requiredServices: 1,
      status: "expired",
      offeredWorldMinute: 0,
      expiresWorldMinute: 1_440,
      acceptedWorldMinute: 20,
      dueWorldMinute: 100,
      resolvedWorldMinute: 200,
    });

    expectVariant(state, "white-quiet");
    expect(deriveRetirementOutcome(state)?.status).toBe("retired");
  });

  it("does not award VANISHED to a Predator history", () => {
    const state = withWhiteHistory(3);
    for (let index = 0; index < 3; index += 1) {
      state.traces.push({
        id: `trace:p3:${index + 1}`,
        targetId: "nightshade",
        cause: "operation-escalation",
        stage: "intrusive",
        severity: "high",
        weight: 3,
        worldMinute: 300 + index,
      });
    }

    expectVariant(state, "white-quiet");
    expect(deriveRetirementOutcome(state)?.status).toBe("retired");
  });

  it("lets actual Black-scene history override a White starting package", () => {
    const state = withBlackHistory(700);
    state.underground.playerNetwork = "white";

    expect(deriveRetirementOutcome(state)).toEqual({
      status: "retired",
      variant: "black-prosperous",
      detail: "the handle closes with money left after the last job",
    });
  });

  it("distinguishes prosperous, watchful, and quiet Black retirement tones", () => {
    const prosperous = withBlackHistory(700);
    const watchful = withBlackHistory(700);
    watchful.underground.retaliations.push({
      id: "retaliation:p3",
      actorId: "kestrel",
      kind: "smear",
      worldMinute: 720,
    });
    const quiet = withBlackHistory(100);

    expectVariant(prosperous, "black-prosperous");
    expectVariant(watchful, "black-watchful");
    expectVariant(quiet, "black-quiet");
  });

  it("uses a White-quiet retirement tone when the run leans White without meeting VANISHED", () => {
    expectVariant(withWhiteHistory(1), "white-quiet");
  });

  it("is rank-independent", () => {
    const low = withWhiteHistory(3);
    const high = structuredClone(low);
    low.player.rank = 1;
    high.player.rank = 999_999;

    expect(deriveRetirementOutcome(low)).toEqual(
      deriveRetirementOutcome(high),
    );
  });

  it("projects a structured player-safe retirement variant and detail into TinyBase", () => {
    const bus = new CommandBus(withBlackHistory(700));
    expect(bus.execute({ type: "finishRetirement" }).ok).toBe(true);

    const projection = projectWorld(bus.snapshot());
    expect(projection.ending).toEqual({
      status: "retired",
      label: "RETIRED",
      worldMinute: 3_000,
      variant: "black-prosperous",
      detail: "the handle closes with money left after the last job",
    });

    const store = createWorldProjectionStore();
    syncWorldProjection(store, projection);
    expect(store.getCell("meta", "run", "variant")).toBe("black-prosperous");
    expect(store.getCell("meta", "run", "detail")).toBe(
      "the handle closes with money left after the last job",
    );

    const visible = JSON.stringify(projection.ending);
    expect(visible).not.toContain("issuerId");
    expect(visible).not.toContain("playerNetwork");
    expect(visible).not.toContain("grudge");
  });

  it("restores a completed retirement with the same derived outcome presentation", () => {
    const bus = new CommandBus(withWhiteHistory(3));
    expect(bus.execute({ type: "finishRetirement" }).ok).toBe(true);
    const before = bus.snapshot();

    const restored = parsePortableRunSave(serializePortableRunSave(before));

    expect(restored.ending).toEqual(before.ending);
    expect(projectWorld(restored).ending).toEqual(projectWorld(before).ending);
  });
});
