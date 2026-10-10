import { describe, expect, it } from "vitest";
import { formatNetworkRouteFeedback } from "./network-route-feedback";
import type { CommandResult } from "@/game/simulation/command-bus";

const tested = (outcome: "confirmed" | "refuted" | "stale"): CommandResult => ({
  ok: true,
  events: [
    { type: "NetworkRouteTested", targetId: "target-1",
      challengeId: "challenge-1", routeId: "route-a", epoch: 0,
      result: outcome, worldMinute: 364 },
  ],
});

describe("G3 route tests communicate actual outcomes rather than generic success", () => {
  it("distinguishes confirmation and tells the player what evidence to review", () => {
    const message = formatNetworkRouteFeedback(tested("confirmed"), "challenge-1", "route-a");
    expect(message).toMatch(/confirmed/i);
    expect(message).toMatch(/evidence/i);
    expect(message).not.toMatch(/route test recorded/i);
  });

  it("explains a refuted path is a recoverable paid decision, not a victory", () => {
    const message = formatNetworkRouteFeedback(tested("refuted"), "challenge-1", "route-a");
    expect(message).toMatch(/refuted|rejected/i);
    expect(message).toMatch(/different|other|reconsider/i);
    expect(message).not.toMatch(/confirmed|objective found/i);
  });

  it("explains defender rotation and the need to gather current clues", () => {
    const message = formatNetworkRouteFeedback(tested("stale"), "challenge-1", "route-a");
    expect(message).toMatch(/changed|rotated|stale/i);
    expect(message).toMatch(/clue|recheck|refresh/i);
    expect(message).not.toMatch(/confirmed/i);
  });

  it("uses only the matching challenge/route event, never another route's verdict", () => {
    const other = tested("confirmed");
    other.events.push({
      type: "NetworkRouteTested", targetId: "other", challengeId: "other-challenge",
      routeId: "route-b", result: "refuted", epoch: 0, worldMinute: 364,
    });
    expect(formatNetworkRouteFeedback(other, "challenge-1", "route-a")).toMatch(/confirmed/i);
    expect(formatNetworkRouteFeedback(other, "unknown", "unknown")).toMatch(/interrupted|no (route )?verdict|could not/i);
  });

  it("does not claim verification when the run ends during the action", () => {
    const result: CommandResult = { ok: true, events: [{
      type: "RunEnded", status: "arrested", causeKind: "investigation",
      causeId: "investigation-1", worldMinute: 364,
    }] };
    const text = formatNetworkRouteFeedback(result, "challenge-1", "route-a");
    expect(text).toMatch(/ended|interrupted/i);
    expect(text).not.toMatch(/confirmed|refuted/i);
  });

  it("keeps ordinary command failures legible without inventing world consequences", () => {
    const text = formatNetworkRouteFeedback({
      ok: false, error: "ROUTE_ALREADY_TESTED", events: [],
    }, "challenge-1", "route-a");
    expect(text).toMatch(/already tested/i);
    expect(text).not.toMatch(/world minutes spent|trace added|confirmed/i);
  });
});
