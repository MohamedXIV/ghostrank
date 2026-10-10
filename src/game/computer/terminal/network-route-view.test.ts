import { describe, expect, it } from "vitest";
import { renderNetworkRouteQuery } from "@/game/computer/terminal/network-route-view";
import type { VisibleNetworkRouteChallenge } from "@/game/simulation/projection/project-world";

const visible: VisibleNetworkRouteChallenge[] = [{
  id: "challenge", targetId: "corp",
  candidates: [
    { id: "amber", label: "Amber", carrier: "public", echo: "triangle", status: "candidate" },
    { id: "ivory", label: "Ivory", carrier: "sealed", echo: "triangle", status: "refuted" },
  ],
  known: { carrier: "sealed" },
  preview: null,
}];

describe("player-safe read-only terminal route view", () => {
  it("maps a discovered challenge using only player-known facts", () => {
    const shown = renderNetworkRouteQuery("path map corp", visible);
    expect(shown).toContain("Amber");
    expect(shown).toContain("UNRESOLVED");
    expect(shown).toContain("challenge");
    expect(shown).not.toContain("objectiveMachineId");
    expect(shown).not.toContain("correctRouteId");
  });
  it("describes one candidate and the current cost without hidden truth", () => {
    expect(renderNetworkRouteQuery("path inspect corp challenge ivory", visible))
      .toContain("REFUTED");
    expect(renderNetworkRouteQuery("path preview corp challenge amber", visible))
      .toContain("not ready");
    const known = [{ ...visible[0]!, known: { carrier: "sealed" as const, echo: "triangle" as const },
      preview: { minutes: 4, traceWeight: 1 } }];
    expect(renderNetworkRouteQuery("path preview corp challenge amber", known))
      .toContain("4 world minutes");
  });
  it("only intercepts read-only verbs, never terminal mutations", () => {
    expect(renderNetworkRouteQuery("path test corp challenge amber", visible)).toBeNull();
    expect(renderNetworkRouteQuery("path map missing", visible)).toContain("No observed route");
  });
});
