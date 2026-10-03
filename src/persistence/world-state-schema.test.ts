import { describe, expect, it } from "vitest";

import { worldStateSchema } from "@/persistence/world-state-schema";

describe("worldStateSchema", () => {
  it("accepts a valid resumable world snapshot", () => {
    const state = worldStateSchema.parse({
      worldMinute: 15,
      player: {
        handle: "CobaltXZ",
        rank: 100256,
      },
      targets: [],
      knownTargetIds: [],
    });

    expect(state.worldMinute).toBe(15);
  });

  it("rejects negative time and malformed ranks", () => {
    expect(() =>
      worldStateSchema.parse({
        worldMinute: -1,
        player: {
          handle: "CobaltXZ",
          rank: 0,
        },
        targets: [],
        knownTargetIds: [],
      }),
    ).toThrow();
  });

  it("loads a legacy snapshot with no economy as an empty wallet", () => {
    const state = worldStateSchema.parse({
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
    });

    expect(state.economy).toEqual({ credits: 0, ledger: [], hardware: [] });
  });

  it("round-trips credits, ledger entries and owned hardware", () => {
    const state = worldStateSchema.parse({
      worldMinute: 30,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
      economy: {
        credits: 600,
        ledger: [
          {
            id: "value:1",
            worldMinute: 30,
            direction: "debit",
            amount: 400,
            balanceAfter: 600,
            cause: { kind: "hardware", id: "cpu-overclock" },
            counterparty: "market",
          },
        ],
        hardware: [
          { id: "hw:1", catalogId: "rig-starter", acquiredWorldMinute: 0 },
          { id: "hw:2", catalogId: "cpu-overclock", acquiredWorldMinute: 30 },
        ],
      },
    });

    expect(state.economy.credits).toBe(600);
    expect(state.economy.ledger[0]).toMatchObject({
      direction: "debit",
      cause: { kind: "hardware", id: "cpu-overclock" },
    });
    expect(state.economy.hardware).toHaveLength(2);
  });

  it("rejects a negative balance and an unknown ledger direction", () => {
    const base = {
      worldMinute: 0,
      player: { handle: "CobaltXZ", rank: 100256 },
      targets: [],
      knownTargetIds: [],
    };

    expect(
      worldStateSchema.safeParse({
        ...base,
        economy: { credits: -5, ledger: [], hardware: [] },
      }).success,
    ).toBe(false);

    expect(
      worldStateSchema.safeParse({
        ...base,
        economy: {
          credits: 0,
          ledger: [
            {
              id: "value:1",
              worldMinute: 0,
              direction: "sideways",
              amount: 1,
              balanceAfter: 0,
              cause: { kind: "contract", id: "contract:1" },
              counterparty: "vesper",
            },
          ],
          hardware: [],
        },
      }).success,
    ).toBe(false);
  });
});
