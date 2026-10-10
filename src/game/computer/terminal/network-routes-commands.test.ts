import { describe, expect, it } from "vitest";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { testNetworkRouteFromGui } from "@/game/computer/apps/target-actions";

describe("G3 Network Mapping terminal/GUI command parity", () => {
  it("uses exactly the same authoritative test command", () => {
    const gui = testNetworkRouteFromGui("corp", "route:corp", "western");
    expect(parseTerminalCommand("path test corp route:corp western"))
      .toEqual({ ok: true, command: gui });
    expect(gui).toEqual({
      type: "testNetworkRoute", targetId: "corp",
      challengeId: "route:corp", routeId: "western",
    });
  });
  it("rejects incomplete or extra arguments without sending a game action", () => {
    for (const command of ["path", "path test", "path test corp r",
      "path test corp r x extra", "path delete corp r x"]) {
      expect(parseTerminalCommand(command)).toEqual({
        ok: false, error: "INVALID_ARGUMENT",
      });
    }
  });
  it("does not turn read-only map verbs into simulation mutations", () => {
    expect(parseTerminalCommand("path map corp")).toEqual({
      ok: false, error: "UNKNOWN_COMMAND",
    });
  });
});
