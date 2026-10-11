import { describe, expect, it } from "vitest";
import type { VisibleNetworkRouteChallenge } from "@/game/simulation/projection/project-world";
import { buildNetworkRouteWorkbench } from "@/components/game/recon/network-route-workbench-model";

const challenge = (overrides: Partial<VisibleNetworkRouteChallenge> = {}): VisibleNetworkRouteChallenge => ({
  id: "challenge", targetId: "corp",
  candidates: [
    { id: "amber", label: "Amber", carrier: "public", echo: "triangle", status: "candidate" },
    { id: "ivory", label: "Ivory", carrier: "sealed", echo: "triangle", status: "refuted" },
    { id: "jade", label: "Jade", carrier: "sealed", echo: "circle", status: "stale" },
  ],
  known: { carrier: "sealed" },
  preview: { minutes: 4, traceWeight: 1 },
  ...overrides,
});

describe("network route workbench model", () => {
  it("draws every untested or refuted hypothesis as a hypothesis, never a verified link", () => {
    const model = buildNetworkRouteWorkbench(challenge(), null);
    const byId = Object.fromEntries(model.lanes.map(lane => [lane.id, lane]));
    expect(byId.amber?.linkKind).toBe("hypothesis");
    expect(byId.ivory?.linkKind).toBe("hypothesis");
    expect(byId.jade?.linkKind).toBe("hypothesis");
    expect(byId.amber?.endLabel).not.toBe("VERIFIED LINK");
    expect(byId.ivory?.endLabel).not.toBe("VERIFIED LINK");
    expect(byId.jade?.endLabel).not.toBe("VERIFIED LINK");
  });

  it("marks only a confirmed route as a verified link", () => {
    const model = buildNetworkRouteWorkbench(challenge({
      candidates: [{ id: "amber", label: "Amber", carrier: "public", echo: "triangle", status: "confirmed" }],
    }), "amber");
    expect(model.lanes[0]?.linkKind).toBe("verified");
    expect(model.lanes[0]?.endLabel).toBe("VERIFIED LINK");
  });

  it("keeps unresolved clues empty and resolved clues as observed values", () => {
    const open = buildNetworkRouteWorkbench(challenge({ known: {} }), null);
    expect(open.clues.carrier).toMatchObject({ resolved: false, value: null, label: "UNRESOLVED" });
    expect(open.clues.echo).toMatchObject({ resolved: false, value: null, label: "UNRESOLVED" });
    const seen = buildNetworkRouteWorkbench(challenge({ known: { carrier: "sealed", echo: "circle" } }), null);
    expect(seen.clues.carrier).toMatchObject({ resolved: true, value: "sealed", label: "sealed" });
    expect(seen.clues.echo).toMatchObject({ resolved: true, value: "circle", label: "circle" });
  });

  it("encodes carrier and echo with non-colour cues (line style and shape)", () => {
    const model = buildNetworkRouteWorkbench(challenge(), null);
    const byId = Object.fromEntries(model.lanes.map(lane => [lane.id, lane]));
    expect(byId.amber?.lineStyle).toBe("solid");
    expect(byId.ivory?.lineStyle).toBe("dashed");
    expect(byId.amber?.echo).toBe("triangle");
    expect(byId.jade?.echo).toBe("circle");
  });

  it("gives every state a distinct, non-colour text label", () => {
    const model = buildNetworkRouteWorkbench(challenge({
      candidates: [
        { id: "a", label: "A", carrier: "public", echo: "circle", status: "candidate" },
        { id: "b", label: "B", carrier: "public", echo: "circle", status: "refuted" },
        { id: "c", label: "C", carrier: "public", echo: "circle", status: "confirmed" },
        { id: "d", label: "D", carrier: "public", echo: "circle", status: "stale" },
      ],
    }), null);
    const statusLabels = model.lanes.map(lane => lane.statusLabel);
    expect(statusLabels).toEqual(["CANDIDATE", "REFUTED", "CONFIRMED", "STALE"]);
    expect(new Set(model.lanes.map(lane => lane.endLabel)).size).toBe(4);
  });

  it("makes selection explicit and inspectable, and handles unknown selections safely", () => {
    const none = buildNetworkRouteWorkbench(challenge(), null);
    expect(none.selected).toBeNull();
    expect(none.inspector.heading).toBe("No hypothesis selected");
    expect(none.inspector.canCommit).toBe(false);
    const picked = buildNetworkRouteWorkbench(challenge(), "amber");
    expect(picked.selected?.id).toBe("amber");
    expect(picked.lanes.find(lane => lane.id === "amber")?.selected).toBe(true);
    expect(picked.inspector.heading).toBe("Amber");
    const missing = buildNetworkRouteWorkbench(challenge(), "nope");
    expect(missing.selected).toBeNull();
  });

  it("shows the exact time and trace cost only for a selected, testable route", () => {
    const picked = buildNetworkRouteWorkbench(challenge(), "amber");
    expect(picked.inspector.costText).toContain("4 world minutes");
    expect(picked.inspector.costText).toContain("+1 trace");
    expect(picked.inspector.canCommit).toBe(true);
    const idle = buildNetworkRouteWorkbench(challenge(), null);
    expect(idle.inspector.costText).toBeNull();
  });

  it("withholds the cost and explains why when verification is unavailable", () => {
    const model = buildNetworkRouteWorkbench(challenge({ preview: null }), "amber");
    expect(model.inspector.costText).toBeNull();
    expect(model.inspector.unavailableText).toContain("gather the current sourced clues");
    expect(model.inspector.canCommit).toBe(false);
  });

  it("blocks commits for already-tested routes but allows a stale route to be retested", () => {
    const refuted = buildNetworkRouteWorkbench(challenge(), "ivory");
    expect(refuted.inspector.canCommit).toBe(false);
    expect(refuted.inspector.blockedReason).toContain("Already tested");
    const stale = buildNetworkRouteWorkbench(challenge(), "jade");
    expect(stale.inspector.canCommit).toBe(true);
  });

  it("never exposes hidden route truth, even if extra fields leak into the projection", () => {
    const leaked = { ...challenge(), correctRouteId: "SECRET-ROUTE-ID", objectiveMachineId: "SECRET-MACHINE" };
    const json = JSON.stringify(buildNetworkRouteWorkbench(leaked as VisibleNetworkRouteChallenge, "amber"));
    expect(json).not.toContain("SECRET-ROUTE-ID");
    expect(json).not.toContain("SECRET-MACHINE");
  });

  it("builds the same model shape for generated and authored scenario identifiers", () => {
    const generated = buildNetworkRouteWorkbench(
      challenge({ id: "route:gen-1:recon", targetId: "gen-1" }), "amber");
    expect(Object.keys(generated).sort()).toEqual(
      Object.keys(buildNetworkRouteWorkbench(challenge(), "amber")).sort());
    expect(generated.challengeId).toBe("route:gen-1:recon");
  });
});
