import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VisibleNetworkRouteChallenge } from "@/game/simulation/projection/project-world";
import { buildNetworkRouteWorkbench } from "@/components/game/recon/network-route-workbench-model";
import { NetworkRouteWorkbench } from "@/components/game/recon/network-route-workbench";

const challenge: VisibleNetworkRouteChallenge = {
  id: "challenge", targetId: "corp",
  candidates: [
    { id: "amber", label: "Amber", carrier: "public", echo: "triangle", status: "candidate" },
    { id: "ivory", label: "Ivory", carrier: "sealed", echo: "circle", status: "refuted" },
  ],
  known: { carrier: "sealed" },
  preview: { minutes: 4, traceWeight: 1 },
};

function render(selected: string | null, props: { confirming?: boolean; notice?: string } = {}) {
  return renderToStaticMarkup(createElement(NetworkRouteWorkbench, {
    model: buildNetworkRouteWorkbench(challenge, selected),
    confirming: props.confirming ?? false,
    notice: props.notice ?? "",
    onSelect: () => undefined,
    onRequestTest: () => undefined,
    onConfirm: () => undefined,
    onCancel: () => undefined,
  }));
}

describe("network route workbench presentation", () => {
  it("renders one signal lane per hypothesis with state and encoding data attributes", () => {
    const html = render(null);
    expect(html).toContain('data-lane-state="candidate"');
    expect(html).toContain('data-lane-state="refuted"');
    expect(html).toContain('data-carrier="public"');
    expect(html).toContain('data-carrier="sealed"');
    expect(html).toContain('data-echo="triangle"');
  });

  it("keeps the textual hypothesis card for parity with the terminal and assistive tech", () => {
    const html = render(null);
    expect(html).toContain("Carrier: public · Echo: triangle");
    expect(html).toContain("Status: CANDIDATE");
    expect(html).toContain("Status: REFUTED");
  });

  it("hides decorative lane graphics from assistive technology", () => {
    const html = render("amber");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*class="network-route-lane"/);
  });

  it("shows an unknown echo as unknown, not as a known circular echo", () => {
    const html = render(null);
    expect(html).toContain("Candidate links are hypotheses, not observed destination machines.");
    expect(html).toContain("Echo clue");
    expect(html).toContain("UNRESOLVED");
    // The text was already correct, but the original glyph falsely drew the
    // same circle as an observed 'circle' clue. Do not teach a false clue.
    expect(html).toContain('data-echo-shape="unknown"');
    expect(html).not.toContain('data-echo-shape="unknown" cx=');
    expect(html).toMatch(/data-echo-shape="unknown"[^>]*>\?<\/text>/);
    expect(html).not.toContain('data-echo-shape="circle"');
  });

  it("does not label an untested hypothesis as a verified or discovered link", () => {
    const html = render("amber");
    expect(html).not.toContain("VERIFIED LINK");
    expect(html).toContain("UNVERIFIED");
  });

  it("states the time and trace cost next to the selected route before any commit", () => {
    const html = render("amber");
    expect(html).toContain("Testing costs 4 world minutes and +1 trace");
    expect(html).toContain("TEST SELECTED ROUTE");
    expect(html).not.toContain('role="group" aria-label="Confirm route verification"');
  });

  it("swaps the action row for an explicit confirmation that repeats the real cost", () => {
    const html = render("amber", { confirming: true });
    expect(html).toContain('aria-label="Confirm route verification"');
    expect(html).toContain("clock and trace cost are real even if this link is wrong");
    expect(html).toContain("CONFIRM ROUTE TEST");
  });

  it("announces the outcome of the last test through the status region", () => {
    const html = render("ivory", { notice: "Route refuted. The attempt cost time and left trace." });
    expect(html).toMatch(/role="status"[^>]*>.*Route refuted/);
  });
});
