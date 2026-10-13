import { describe, expect, it } from "vitest";
import { createGameSession } from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { executeTerminalCommand, type TerminalItem } from "./terminal-command-runner";

describe("terminal command adapter", () => {
  it("keeps help and errors player-visible without mutating the simulation", async () => {
    const runtime = await createGameSession({ initialState: createSliceWorldState() });
    const before = JSON.stringify(runtime.snapshot());
    const items: TerminalItem[] = [];
    let seq = 0;
    const context = {
      runtime, clock: null,
      emit: (batch: TerminalItem[]) => items.push(...batch),
      createId: (prefix: string) => prefix + "-" + ++seq,
    };
    executeTerminalCommand("help", context);
    expect(items.map(item => item.type)).toEqual(["prompt", "table"]);
    expect(items[1].text).toContain("RECONNAISSANCE");
    executeTerminalCommand("unknown-command", context);
    expect(items.at(-1)?.type).toBe("error");
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    expect(JSON.stringify(runtime.snapshot())).toBe(before);
  });
});
