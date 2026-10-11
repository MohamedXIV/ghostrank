import { formatWorldTime } from "@/game/computer/format-world-time";

/**
 * G6 Operation Pressure Desk: pure view model.
 *
 * Every value here is either player-visible projection or the outcome of a
 * command the CommandBus already ran. Nothing in this module decides whether an
 * action is legal. The CommandBus does that; a blocker shown on a button is the
 * same code the command would refuse with, and this module only words it.
 */

export type OperationStageKey = "recon" | "intrusive";

export interface OperationSummary {
  targetId: string;
  stage: string;
  openedWorldMinute: number;
  escalatedWorldMinute?: number;
}

/** The subset of player-visible state the desk watches for "what changed". */
export interface OperationSnapshot {
  targetId: string;
  stage: string;
  worldMinute: number;
  traceCount: number;
  footprintLevel: string;
  evidenceCount: number;
  machineCount: number;
}

export interface OperationDeskInput {
  operation: OperationSummary | null;
  worldMinute: number;
  /** Services observed on the active target. Zero means escalation is locked. */
  evidenceCount: number;
  /** Machines observed on the active target, as a survey reveals them. */
  machineCount: number;
  footprintLevel: string;
  traceCount: number;
  /** The command code escalation would be refused with now, or null if it goes ahead. */
  escalateBlocker: string | null;
  /** True when escalation pauses for an explicit trace-cost confirmation first. */
  escalateNeedsConfirmation: boolean;
}

export interface OperationDeskAction {
  id: "escalate" | "disengage";
  label: string;
  enabled: boolean;
  /** Why the action is blocked, in player words. Null when enabled. */
  reason: string | null;
}

export interface OperationDeskView {
  active: boolean;
  targetId: string;
  stageKey: OperationStageKey | null;
  clockText: string;
  elapsedText: string;
  footprintLabel: string;
  traceCount: number;
  evidenceText: string;
  guidance: string;
  actions: OperationDeskAction[];
  snapshot: OperationSnapshot;
}

export const IDLE_OPERATION_TEXT =
  "No active operation. Open one from an observed target profile.";

/** Player-facing wording for a refused command code. Unknown codes keep their identifier. */
export function operationBlockerCopy(code: string): string {
  switch (code) {
    case "SERVICE_EVIDENCE_REQUIRED":
      return "Locked: no service evidence yet. SURVEY the target first.";
    case "OPERATION_ALREADY_ESCALATED":
      return "The operation is already intrusive.";
    case "NO_ACTIVE_OPERATION":
      return "No operation is open. Open one from a target profile first.";
    case "ESCALATION_UNCONFIRMED":
      return "Escalation needs its trace cost confirmed first.";
    default:
      return `Blocked: ${code.toLowerCase().replace(/_/g, " ")}.`;
  }
}

export function operationStageLabel(stage: string): string {
  return stage === "intrusive" ? "INTRUSIVE" : "RECON";
}

function footprintText(level: string): string {
  return level.trim() ? level.trim().toUpperCase() : "NONE";
}

function evidenceSentence(count: number): string {
  if (count === 0) return "No service evidence yet";
  return `${count} service${count === 1 ? "" : "s"} observed`;
}

export function deriveOperationDesk(input: OperationDeskInput): OperationDeskView {
  const op = input.operation;
  const clockText = formatWorldTime(input.worldMinute);
  const snapshot: OperationSnapshot = {
    targetId: op?.targetId ?? "",
    stage: op?.stage ?? "",
    worldMinute: input.worldMinute,
    traceCount: input.traceCount,
    footprintLevel: input.footprintLevel,
    evidenceCount: op ? input.evidenceCount : 0,
    machineCount: op ? input.machineCount : 0,
  };

  if (!op) {
    return {
      active: false,
      targetId: "",
      stageKey: null,
      clockText,
      elapsedText: "",
      footprintLabel: footprintText(input.footprintLevel),
      traceCount: input.traceCount,
      evidenceText: "",
      guidance: IDLE_OPERATION_TEXT,
      actions: [],
      snapshot,
    };
  }

  const stageKey: OperationStageKey = op.stage === "intrusive" ? "intrusive" : "recon";
  const elapsed = Math.max(0, input.worldMinute - op.openedWorldMinute);
  const elapsedText = elapsed === 0 ? "just opened" : `${elapsed} min on target`;
  const evidence = input.evidenceCount;

  const actions: OperationDeskAction[] = [];
  if (stageKey === "recon") {
    const blocked = input.escalateBlocker !== null;
    actions.push({
      id: "escalate",
      label: "ESCALATE",
      enabled: !blocked,
      reason: blocked ? operationBlockerCopy(input.escalateBlocker ?? "") : null,
    });
  }
  actions.push({ id: "disengage", label: "DISENGAGE", enabled: true, reason: null });

  return {
    active: true,
    targetId: op.targetId,
    stageKey,
    clockText,
    elapsedText,
    footprintLabel: footprintText(input.footprintLevel),
    traceCount: input.traceCount,
    evidenceText: evidenceSentence(evidence),
    guidance: operationGuidance(stageKey, evidence, input),
    actions,
    snapshot,
  };
}

function operationGuidance(
  stageKey: OperationStageKey,
  evidence: number,
  input: OperationDeskInput,
): string {
  if (stageKey === "intrusive") {
    return "Intrusive. DISENGAGE also leaves a trace; its exact time cost is reported when it runs.";
  }
  if (evidence === 0) {
    return "Next: SURVEY the target card to find service evidence. ESCALATE stays locked until then.";
  }
  if (input.escalateBlocker !== null) {
    return `Next: ${operationBlockerCopy(input.escalateBlocker)}`;
  }
  return input.escalateNeedsConfirmation
    ? "Next: ESCALATE is open. It makes the operation intrusive and leaves a high-severity trace; the confirmation names the cost first."
    : "Next: ESCALATE is open. It makes the operation intrusive and always leaves a high-severity trace. Its exact time cost is reported when it runs.";
}

/**
 * What the player-visible state changed by. Time alone is not reported: the
 * clock can run without any action, so a time line only appears alongside a
 * real change (open, close, stage, evidence, trace or footprint).
 */
export function describeOperationChanges(
  prev: OperationSnapshot,
  next: OperationSnapshot,
): string[] {
  const lines: string[] = [];

  if (prev.targetId !== next.targetId) {
    if (!prev.targetId && next.targetId) {
      lines.push(`Operation opened on ${next.targetId}`);
    } else if (prev.targetId && !next.targetId) {
      lines.push(`Operation closed on ${prev.targetId}`);
    } else if (next.targetId) {
      lines.push(`Operation moved to ${next.targetId}`);
    }
  }

  if (prev.targetId && next.targetId && prev.stage !== next.stage) {
    lines.push(
      `Stage ${operationStageLabel(prev.stage)} → ${operationStageLabel(next.stage)}`,
    );
  }

  const newEvidence = next.evidenceCount - prev.evidenceCount;
  if (newEvidence > 0) {
    lines.push(
      `Evidence +${newEvidence} (${evidenceSentence(next.evidenceCount).toLowerCase()})`,
    );
  }

  const newMachines = next.machineCount - prev.machineCount;
  if (newMachines > 0) {
    lines.push(`Machines +${newMachines} (${next.machineCount} known)`);
  }

  const newTraces = next.traceCount - prev.traceCount;
  if (newTraces > 0) {
    lines.push(`Traces +${newTraces} (${next.traceCount} total)`);
  }

  if (next.footprintLevel !== prev.footprintLevel) {
    lines.push(
      `Footprint ${footprintText(prev.footprintLevel)} → ${footprintText(next.footprintLevel)}`,
    );
  }

  const elapsedMinutes = next.worldMinute - prev.worldMinute;
  if (lines.length > 0 && elapsedMinutes > 0) {
    lines.unshift(
      `Time +${elapsedMinutes} min (${formatWorldTime(prev.worldMinute)} → ${formatWorldTime(next.worldMinute)})`,
    );
  }

  return lines;
}
