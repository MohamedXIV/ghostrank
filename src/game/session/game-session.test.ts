import { describe, expect, it } from "vitest";

import { createObserveTargetCommand } from "@/game/interfaces/gui/commands";
import { parseTerminalCommand } from "@/game/interfaces/terminal/parser";
import { GameSession } from "@/game/session/game-session";
import { createInitialWorldState } from "@/game/simulation/state/world-state";

function createTestWorld() {
  return createInitialWorldState({
    player: {
      handle: "CobaltXZ",
      rank: 100_256,
    },
    targets: [
      {
        id: "ghost",
        handle: "ghost",
        rank: 73_122,
        hidden: {
          operationalSkill: 97,
        },
      },
    ],
  });
}

describe("GameSession", () => {
  it("routes terminal and GUI commands through the same simulation behavior", () => {
    const terminalSession = new GameSession(createTestWorld());
    const guiSession = new GameSession(createTestWorld());
    const parsed = parseTerminalCommand("observe ghost");

    if (!parsed.ok) {
      throw new Error("expected a valid terminal command");
    }

    const terminalResult = terminalSession.execute(parsed.command);
    const guiResult = guiSession.execute(createObserveTargetCommand("ghost"));

    expect(terminalResult).toEqual(guiResult);
    expect(terminalSession.projection()).toEqual(guiSession.projection());
    expect(terminalSession.projection().targets).toEqual([
      {
        id: "ghost",
        handle: "ghost",
        rank: 73_122,
        known: true,
      },
    ]);
  });

  it("keeps the TinyBase projection synchronized with simulation time", () => {
    const session = new GameSession(createTestWorld());

    session.execute({
      type: "advanceTime",
      minutes: 90,
    });

    expect(session.projection().worldMinute).toBe(90);
    expect(
      session.projectionStore.getCell("meta", "world", "worldMinute"),
    ).toBe(90);
  });
});
