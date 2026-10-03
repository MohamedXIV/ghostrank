import { describe, expect, it } from "vitest";

import { readMessageFromGui } from "@/game/computer/apps/message-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { worldStateSchema } from "@/persistence/world-state-schema";

describe("message commands", () => {
  it("shares message reading between Terminal and GUI", () => {
    const terminal = parseTerminalCommand("read message:3");

    expect(terminal).toEqual({
      ok: true,
      command: { type: "readMessage", messageId: "message:3" },
    });
    if (!terminal.ok) {
      throw new Error("expected terminal command");
    }
    expect(readMessageFromGui("message:3")).toEqual(terminal.command);
  });

  it("rejects malformed read arguments", () => {
    expect(parseTerminalCommand("read")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
    expect(parseTerminalCommand("read a b")).toEqual({
      ok: false,
      error: "INVALID_ARGUMENT",
    });
  });
});

describe("rumor and message persistence schema", () => {
  const base = {
    worldMinute: 0,
    player: { handle: "CobaltXZ", rank: 100256 },
    targets: [],
  };

  it("loads P0 ecosystems without rumors or messages", () => {
    const parsed = worldStateSchema.parse({
      ...base,
      underground: {
        seed: 1,
        lastTickMinute: 0,
        playerNetwork: null,
        actors: [],
        relationships: [],
        incidents: [],
      },
    });

    expect(parsed.underground.rumors).toEqual([]);
    expect(parsed.underground.messages).toEqual([]);
  });

  it("round-trips rumors and messages", () => {
    const underground = {
      seed: 1,
      lastTickMinute: 720,
      playerNetwork: "white" as const,
      actors: [],
      relationships: [],
      incidents: [],
      rumors: [
        {
          id: "rumor:1",
          kind: "incident-leak" as const,
          sourceId: "incident:1",
          relayId: "c",
          accurate: false,
          claim: {
            actorId: "a",
            counterpartId: "b",
            outcome: "repelled" as const,
          },
          worldMinute: 360,
        },
        {
          id: "rumor:2",
          kind: "player-footprint" as const,
          sourceId: "reaction:1",
          relayId: "lattice",
          accurate: true,
          claim: null,
          worldMinute: 400,
        },
      ],
      messages: [
        {
          id: "message:1",
          fromId: "c",
          rumorId: "rumor:1",
          worldMinute: 360,
          read: true,
        },
      ],
    };

    const parsed = worldStateSchema.parse({ ...base, underground });

    expect(parsed.underground.rumors).toEqual(underground.rumors);
    expect(parsed.underground.messages).toEqual(underground.messages);
  });

  it("rejects a rumor with an unknown kind", () => {
    const result = worldStateSchema.safeParse({
      ...base,
      underground: {
        seed: 1,
        lastTickMinute: 0,
        playerNetwork: null,
        actors: [],
        relationships: [],
        incidents: [],
        rumors: [
          {
            id: "rumor:1",
            kind: "gossip",
            sourceId: "x",
            relayId: "y",
            accurate: true,
            claim: null,
            worldMinute: 0,
          },
        ],
        messages: [],
      },
    });

    expect(result.success).toBe(false);
  });
});
