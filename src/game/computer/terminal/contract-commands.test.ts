import { describe, expect, it } from "vitest";

import { contractActionFromGui } from "@/game/computer/apps/contract-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { worldStateSchema } from "@/persistence/world-state-schema";

describe("contract commands", () => {
  it.each([
    ["accept", "acceptContract"],
    ["decline", "declineContract"],
    ["deliver", "deliverContract"],
  ] as const)("shares contract %s between Terminal and GUI", (verb, type) => {
    const terminal = parseTerminalCommand(`contract ${verb} contract:4`);

    expect(terminal).toEqual({
      ok: true,
      command: { type, contractId: "contract:4" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(contractActionFromGui(verb, "contract:4")).toEqual(
      terminal.command,
    );
  });

  it("rejects malformed contract arguments", () => {
    for (const input of [
      "contract",
      "contract accept",
      "contract accept a b",
      "contract steal contract:1",
    ]) {
      expect(parseTerminalCommand(input)).toEqual({
        ok: false,
        error: "INVALID_ARGUMENT",
      });
    }
  });
});

describe("contract persistence schema", () => {
  const base = {
    worldMinute: 0,
    player: { handle: "CobaltXZ", rank: 100256 },
    targets: [],
  };

  const undergroundWith = (contracts?: unknown[]) => ({
    seed: 1,
    lastTickMinute: 0,
    playerNetwork: null,
    actors: [],
    relationships: [],
    incidents: [],
    rumors: [],
    messages: [],
    ...(contracts ? { contracts } : {}),
  });

  it("loads P1 ecosystems without contracts", () => {
    const parsed = worldStateSchema.parse({
      ...base,
      underground: undergroundWith(),
    });

    expect(parsed.underground.contracts).toEqual([]);
  });

  it("round-trips contracts in every status shape", () => {
    const contracts = [
      {
        id: "contract:1",
        issuerId: "vesper",
        targetId: "nightshade",
        objective: "recon-report" as const,
        requiredServices: 2,
        status: "offered" as const,
        offeredWorldMinute: 360,
        expiresWorldMinute: 1800,
      },
      {
        id: "contract:2",
        issuerId: "halfmoon",
        targetId: "nightshade",
        objective: "infrastructure-map" as const,
        requiredMachines: 2,
        status: "accepted" as const,
        offeredWorldMinute: 360,
        expiresWorldMinute: 1800,
        acceptedWorldMinute: 400,
        dueWorldMinute: 4720,
      },
      {
        id: "contract:3",
        issuerId: "daystar",
        targetId: "rookery",
        objective: "quiet-recon" as const,
        status: "completed" as const,
        offeredWorldMinute: 720,
        expiresWorldMinute: 2160,
        acceptedWorldMinute: 800,
        dueWorldMinute: 3680,
        resolvedWorldMinute: 1200,
      },
      {
        id: "contract:4",
        issuerId: "halfmoon",
        targetId: "nightshade",
        objective: "intrusion" as const,
        status: "completed" as const,
        offeredWorldMinute: 360,
        expiresWorldMinute: 1800,
        acceptedWorldMinute: 400,
        dueWorldMinute: 6160,
        resolvedWorldMinute: 900,
      },
    ];

    const parsed = worldStateSchema.parse({
      ...base,
      underground: undergroundWith(contracts),
    });

    expect(parsed.underground.contracts).toEqual(contracts);
  });

  it("rejects an unknown status or objective", () => {
    const valid = {
      id: "contract:1",
      issuerId: "vesper",
      targetId: "nightshade",
      objective: "intrusion",
      status: "offered",
      offeredWorldMinute: 0,
      expiresWorldMinute: 10,
    };

    for (const patch of [{ status: "stolen" }, { objective: "pillage" }]) {
      expect(
        worldStateSchema.safeParse({
          ...base,
          underground: undergroundWith([{ ...valid, ...patch }]),
        }).success,
      ).toBe(false);
    }
  });
});
