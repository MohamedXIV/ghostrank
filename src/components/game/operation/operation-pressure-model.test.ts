import { describe, expect, it } from "vitest";

import {
  describeOperationChanges,
  deriveOperationDesk,
  IDLE_OPERATION_TEXT,
  operationBlockerCopy,
  type OperationDeskInput,
  type OperationSnapshot,
} from "@/components/game/operation/operation-pressure-model";

const base: OperationDeskInput = {
  operation: { targetId: "halo-wick", stage: "recon", openedWorldMinute: 480 },
  worldMinute: 480,
  evidenceCount: 0,
  machineCount: 0,
  footprintLevel: "low",
  traceCount: 0,
  escalateBlocker: "SERVICE_EVIDENCE_REQUIRED",
  escalateNeedsConfirmation: false,
};

const snapshot = (overrides: Partial<OperationSnapshot> = {}): OperationSnapshot => ({
  targetId: "halo-wick",
  stage: "recon",
  worldMinute: 480,
  traceCount: 0,
  footprintLevel: "low",
  evidenceCount: 0,
  machineCount: 0,
  ...overrides,
});

describe("deriveOperationDesk", () => {
  it("shows the idle line and no actions when no operation is open", () => {
    const view = deriveOperationDesk({ ...base, operation: null });
    expect(view.active).toBe(false);
    expect(view.guidance).toBe(IDLE_OPERATION_TEXT);
    expect(view.actions).toEqual([]);
    expect(view.snapshot.targetId).toBe("");
  });

  it("locks escalation with the evidence reason until a service is observed", () => {
    const view = deriveOperationDesk(base);
    const escalate = view.actions.find((action) => action.id === "escalate");
    expect(escalate?.enabled).toBe(false);
    expect(escalate?.reason).toMatch(/SURVEY/);
    expect(view.guidance).toMatch(/SURVEY the target card/);
    expect(view.evidenceText).toBe("No service evidence yet");
  });

  it("opens escalation and states its real trace weight once evidence exists", () => {
    const view = deriveOperationDesk({ ...base, evidenceCount: 2, escalateBlocker: null });
    const escalate = view.actions.find((action) => action.id === "escalate");
    expect(escalate).toMatchObject({ enabled: true, reason: null });
    expect(view.guidance).toMatch(/always leaves a high-severity trace/);
    expect(view.evidenceText).toBe("2 services observed");
  });

  it("names the confirmation before escalation when the briefing requires it", () => {
    const view = deriveOperationDesk({
      ...base,
      evidenceCount: 1,
      escalateBlocker: null,
      escalateNeedsConfirmation: true,
    });
    expect(view.guidance).toMatch(/confirmation names the cost first/);
  });

  it("removes escalation once intrusive and keeps disengage with its trace note", () => {
    const view = deriveOperationDesk({
      ...base,
      operation: { targetId: "halo-wick", stage: "intrusive", openedWorldMinute: 480, escalatedWorldMinute: 490 },
      evidenceCount: 1,
      escalateBlocker: null,
      worldMinute: 490,
    });
    expect(view.stageKey).toBe("intrusive");
    expect(view.actions.map((action) => action.id)).toEqual(["disengage"]);
    expect(view.guidance).toMatch(/DISENGAGE also leaves a trace/);
  });

  it("reports elapsed time on target and says just opened at zero", () => {
    expect(deriveOperationDesk(base).elapsedText).toBe("just opened");
    expect(deriveOperationDesk({ ...base, worldMinute: 492 }).elapsedText).toBe("12 min on target");
  });

  it("uppercases footprint and falls back to NONE when unknown", () => {
    expect(deriveOperationDesk(base).footprintLabel).toBe("LOW");
    expect(deriveOperationDesk({ ...base, footprintLevel: "  " }).footprintLabel).toBe("NONE");
  });

  it("carries the blocker copy the command code maps to", () => {
    expect(operationBlockerCopy("ESCALATION_UNCONFIRMED")).toMatch(/confirmed first/);
    expect(operationBlockerCopy("SOME_NEW_CODE")).toBe("Blocked: some new code.");
  });
});

describe("describeOperationChanges", () => {
  it("reports nothing when only the clock has run", () => {
    expect(describeOperationChanges(snapshot(), snapshot({ worldMinute: 500 }))).toEqual([]);
  });

  it("reports an opened operation", () => {
    const idle = snapshot({ targetId: "", stage: "", evidenceCount: 0 });
    expect(describeOperationChanges(idle, snapshot())).toEqual(["Operation opened on halo-wick"]);
  });

  it("reports the time a survey spent alongside the evidence it revealed", () => {
    expect(
      describeOperationChanges(snapshot(), snapshot({ worldMinute: 492, evidenceCount: 2 })),
    ).toEqual([
      "Time +12 min (DAY 1 // 08:00 → DAY 1 // 08:12)",
      "Evidence +2 (2 services observed)",
    ]);
  });

  it("reports machines a survey reveals even when no evidence changed", () => {
    expect(
      describeOperationChanges(snapshot(), snapshot({ worldMinute: 492, machineCount: 3 })),
    ).toEqual([
      "Time +12 min (DAY 1 // 08:00 → DAY 1 // 08:12)",
      "Machines +3 (3 known)",
    ]);
  });

  it("reports an escalation's stage, trace and footprint change in order", () => {
    const after = snapshot({
      worldMinute: 485,
      stage: "intrusive",
      traceCount: 1,
      footprintLevel: "medium",
      evidenceCount: 1,
    });
    expect(describeOperationChanges(snapshot({ evidenceCount: 1 }), after)).toEqual([
      "Time +5 min (DAY 1 // 08:00 → DAY 1 // 08:05)",
      "Stage RECON → INTRUSIVE",
      "Traces +1 (1 total)",
      "Footprint LOW → MEDIUM",
    ]);
  });

  it("reports a closed operation when disengaged", () => {
    const closed = snapshot({ targetId: "", stage: "", worldMinute: 483, traceCount: 1, evidenceCount: 0 });
    expect(describeOperationChanges(snapshot(), closed)).toEqual([
      "Time +3 min (DAY 1 // 08:00 → DAY 1 // 08:03)",
      "Operation closed on halo-wick",
      "Traces +1 (1 total)",
    ]);
  });
});
