"use client";

import { useEffect, useRef, useState } from "react";

import {
  describeOperationChanges,
  deriveOperationDesk,
  IDLE_OPERATION_TEXT,
  operationBlockerCopy,
  operationStageLabel,
  type OperationDeskInput,
  type OperationSnapshot,
} from "@/components/game/operation/operation-pressure-model";
import { useEffectiveReducedMotion } from "@/components/game/window-motion";
import { ContextualHint } from "@/components/ui/contextual-hint";
import type { CommandResult } from "@/game/simulation/command-bus";

export type OperationDeskAct = "escalate" | "disengage";

export interface OperationPressureDeskProps extends OperationDeskInput {
  /**
   * Runs the matching command through the caller's path (direct or confirmed).
   * Returns the command result, or null when the action is held for a
   * confirmation that will run it later.
   */
  onAct: (action: OperationDeskAct) => CommandResult | null;
}

interface Receipt {
  key: number;
  changes: string[];
  refusal: string | null;
}

const NO_RECEIPT: Receipt = { key: 0, changes: [], refusal: null };

/**
 * One command reaches the projection in several steps (clock, trace, operation
 * close). Changes are coalesced over this window and diffed once against the
 * state from before the burst, so the receipt is one complete account.
 */
const SETTLE_MS = 120;

/**
 * The active operation as one instrument: where the signal is, what time it
 * has taken, what it has left behind, what is next, and what the last action
 * actually changed. Stays inside the existing Recon panel so the Network Map
 * below it keeps its place.
 */
export function OperationPressureDesk(props: OperationPressureDeskProps) {
  const { onAct, ...input } = props;
  const view = deriveOperationDesk(input);
  const snapshotKey = JSON.stringify(view.snapshot);
  const reducedMotion = useEffectiveReducedMotion();
  const [receipt, setReceipt] = useState<Receipt>(NO_RECEIPT);
  const baseline = useRef<OperationSnapshot | null>(null);
  const latest = useRef<OperationSnapshot | null>(null);
  const settling = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "What changed" is a diff of player-visible projection, so it is the same
  // whether the action ran from this desk or from the briefing's confirmation.
  useEffect(() => {
    const next = JSON.parse(snapshotKey) as OperationSnapshot;
    latest.current = next;
    if (!baseline.current) {
      baseline.current = next;
      return;
    }
    if (settling.current !== null) return;
    settling.current = setTimeout(() => {
      settling.current = null;
      const from = baseline.current;
      const to = latest.current;
      baseline.current = to;
      if (!from || !to) return;
      const changes = describeOperationChanges(from, to);
      if (changes.length > 0) {
        setReceipt((current) => ({ key: current.key + 1, changes, refusal: null }));
      }
    }, SETTLE_MS);
  }, [snapshotKey]);

  const run = (action: OperationDeskAct) => {
    const result = onAct(action);
    if (result && !result.ok) {
      setReceipt((current) => ({
        key: current.key + 1,
        changes: [],
        refusal: operationBlockerCopy(result.error ?? "COMMAND_FAILED"),
      }));
    }
  };

  const guidanceId = "operation-desk-guidance";
  const stageLabel = view.stageKey ? operationStageLabel(view.stageKey) : "";

  return (
    <section
      className="operation-panel operation-desk"
      aria-label="Operation pressure desk"
      data-active={view.active ? "true" : "false"}
      data-reduce-motion={reducedMotion ? "true" : "false"}
    >
      <span className="panel-label">OPERATION SESSION</span>
      <ContextualHint
        id="hint:recon-operation"
        title="SAFE OPERATION STAGING"
        description="The Recon stage gathers intelligence safely without triggering alarms. Survey host machines and inspect services before deciding whether to escalate to intrusive mode."
      />

      {view.active ? (
        <>
          <div className="operation-desk-head">
            <div>
              <span className="panel-label">TARGET</span>
              <strong>{view.targetId}</strong>
            </div>
            <div>
              <span className="panel-label">CLOCK</span>
              <strong>{view.clockText}</strong>
              <small>{view.elapsedText}</small>
            </div>
          </div>

          <div className="operation-signal" data-stage={view.stageKey ?? ""} aria-label={`Stage ${stageLabel}`}>
            <span className="operation-jack operation-jack-filled" aria-hidden="true" />
            <span className="operation-cable" aria-hidden="true" data-live={view.stageKey === "intrusive" ? "true" : "false"} />
            <span
              className={view.stageKey === "intrusive" ? "operation-jack operation-jack-filled" : "operation-jack"}
              aria-hidden="true"
            />
            <strong>{stageLabel}</strong>
          </div>

          <div className="operation-readouts">
            <div>
              <span className="panel-label">FOOTPRINT</span>
              <strong>{view.footprintLabel}</strong>
            </div>
            <div>
              <span className="panel-label">TRACES</span>
              <strong>{view.traceCount}</strong>
            </div>
            <div>
              <span className="panel-label">EVIDENCE</span>
              <strong>{view.evidenceText}</strong>
            </div>
          </div>

          <p id={guidanceId} className="operation-guidance">{view.guidance}</p>

          <div className="operation-actions">
            {view.actions.map((action) => (
              <button
                key={action.id}
                className="recon-inline-action operation-action"
                type="button"
                disabled={!action.enabled}
                title={action.reason ?? undefined}
                aria-describedby={action.enabled ? undefined : guidanceId}
                onClick={() => run(action.id)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p>{IDLE_OPERATION_TEXT}</p>
      )}

      {/* role="log" keeps this out of the status landmarks other Recon surfaces use. */}
      <div className="operation-receipt" role="log" aria-live="polite" aria-label="Operation receipts">
        {receipt.refusal ? (
          <p key={`refusal-${receipt.key}`} className="operation-receipt-line operation-receipt-refused">
            <span aria-hidden="true">✕</span> REFUSED · {receipt.refusal}
          </p>
        ) : null}
        {receipt.changes.map((line, index) => (
          <p key={`change-${receipt.key}-${index}`} className="operation-receipt-line">
            <span aria-hidden="true">✓</span> {line}
          </p>
        ))}
      </div>
    </section>
  );
}
