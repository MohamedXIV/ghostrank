import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IDLE_OPERATION_TEXT } from "@/components/game/operation/operation-pressure-model";
import {
  OperationPressureDesk,
  type OperationPressureDeskProps,
} from "@/components/game/operation/operation-pressure-desk";

const props: OperationPressureDeskProps = {
  operation: { targetId: "halo-wick", stage: "recon", openedWorldMinute: 480 },
  worldMinute: 492,
  evidenceCount: 0,
  machineCount: 0,
  footprintLevel: "low",
  traceCount: 0,
  escalateBlocker: "SERVICE_EVIDENCE_REQUIRED",
  escalateNeedsConfirmation: false,
  onAct: () => null,
};

function render(overrides: Partial<OperationPressureDeskProps> = {}) {
  return renderToStaticMarkup(
    React.createElement(OperationPressureDesk, { ...props, ...overrides }),
  );
}

describe("OperationPressureDesk markup", () => {
  it("keeps the operation-panel hook and the idle line when nothing is open", () => {
    const html = render({ operation: null });
    expect(html).toContain("operation-panel");
    expect(html).toContain(IDLE_OPERATION_TEXT);
    expect(html).not.toContain("ESCALATE");
  });

  it("shows the stage, clock and an escalate button locked with its reason", () => {
    const html = render();
    expect(html).toContain("RECON");
    expect(html).not.toContain("INTRUSIVE");
    expect(html).toContain("DAY 1 // 08:12");
    expect(html).toContain("12 min on target");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>ESCALATE<\/button>/);
    expect(html).toMatch(/<button[^>]*>DISENGAGE<\/button>/);
  });

  it("enables escalation once evidence is observed", () => {
    const html = render({ evidenceCount: 1, escalateBlocker: null });
    expect(html).toMatch(/<button(?![^>]*disabled)[^>]*>ESCALATE<\/button>/);
    expect(html).toContain("1 service observed");
  });

  it("announces its receipts politely without taking the status role", () => {
    const html = render();
    expect(html).toContain('role="log"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('role="status"');
  });
});
