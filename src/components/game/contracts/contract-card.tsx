"use client";

import { Button } from "@/components/ui/button";
import { formatWorldTime } from "@/game/computer/format-world-time";
import {
  contractObjectiveMeta,
  deriveDeadlineUrgency,
} from "@/components/ui/semantic-state";
import type { ContractVerb } from "@/game/computer/apps/contract-actions";

export function describeContract(
  objective: string,
  targetHandle: string,
  requiredServices?: number,
  requiredMachines?: number,
): string {
  switch (objective) {
    case "recon-report": {
      const count = requiredServices ?? 1;
      return `report ${count} service${count === 1 ? "" : "s"} you have observed on ${targetHandle}`;
    }
    case "infrastructure-map": {
      const count = requiredMachines ?? 1;
      return `map ${count} host${count === 1 ? "" : "s"} on ${targetHandle}'s simulated infrastructure`;
    }
    case "quiet-recon":
      return `verify ${targetHandle}'s infrastructure and leave the operation at recon stage`;
    case "intrusion":
      return `cross the intrusive boundary on ${targetHandle}`;
    default:
      return `work against ${targetHandle}`;
  }
}

export interface ContractData {
  id: string;
  issuerHandle?: string;
  targetId?: string;
  targetHandle?: string;
  objective?: string;
  status?: string;
  expiresWorldMinute?: number;
  dueWorldMinute?: number;
  requiredMachines?: number;
  requiredServices?: number;
  currentKnownMachines?: number;
  currentKnownServices?: number;
}

interface ContractCardProps {
  contract: ContractData;
  currentWorldMinute: number;
  onAction?: (verb: ContractVerb, contractId: string) => void;
}

export function ContractCard({
  contract,
  currentWorldMinute,
  onAction,
}: ContractCardProps) {
  const status = String(contract.status ?? "offered");
  const objectiveMeta = contractObjectiveMeta(contract.objective);
  const deadlineMinute = Number(
    status === "accepted"
      ? (contract.dueWorldMinute ?? 0)
      : (contract.expiresWorldMinute ?? 0),
  );

  const { urgency, minutesRemaining, meta: deadlineMeta } = deriveDeadlineUrgency({
    currentMinute: currentWorldMinute,
    deadlineMinute,
    status,
  });

  const verbs: ContractVerb[] =
    status === "offered"
      ? ["accept", "decline"]
      : status === "accepted"
        ? ["deliver"]
        : [];

  // Requirements progress
  const hasMachineReq = contract.requiredMachines !== undefined && contract.requiredMachines > 0;
  const hasServiceReq = contract.requiredServices !== undefined && contract.requiredServices > 0;
  const knownMachines = contract.currentKnownMachines ?? 0;
  const knownServices = contract.currentKnownServices ?? 0;

  return (
    <article
      className={`contract-visual-card is-status-${status} is-urgency-${urgency}`}
      data-status={status}
      data-urgency={urgency}
      aria-label={`Contract ${contract.id}: ${objectiveMeta.familyLabel}`}
    >
      <header className="contract-card-header">
        <div className="contract-objective-badge">
          <span className="contract-obj-glyph" aria-hidden="true">
            {objectiveMeta.glyph}
          </span>
          <span className="contract-obj-family">{objectiveMeta.familyLabel}</span>
        </div>

        <div className="contract-status-pill">
          <span>{status.toUpperCase()}</span>
        </div>
      </header>

      <div className="contract-target-summary">
        <div className="contract-meta-row">
          <span className="contract-meta-label">TARGET:</span>
          <strong className="contract-target-name">{String(contract.targetHandle ?? "UNKNOWN")}</strong>
          <span className="contract-issuer-tag">from {String(contract.issuerHandle ?? "UNKNOWN")}</span>
        </div>

        <p className="contract-description-text">
          {describeContract(
            String(contract.objective ?? ""),
            String(contract.targetHandle ?? "unknown"),
            contract.requiredServices,
            contract.requiredMachines,
          )}
        </p>
      </div>

      {/* Visual Requirements Progress Bar */}
      {(hasMachineReq || hasServiceReq) && status === "accepted" && (
        <div className="contract-requirements-box">
          <div className="req-header">
            <span>OBJECTIVE PROGRESS</span>
          </div>
          <div className="req-items">
            {hasMachineReq && (
              <div className="req-progress-item">
                <span className="req-label">
                  Hosts Mapped: {knownMachines}/{contract.requiredMachines}
                </span>
                <div className="req-progress-track">
                  <div
                    className="req-progress-fill"
                    style={{
                      width: `${Math.min(100, (knownMachines / (contract.requiredMachines ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {hasServiceReq && (
              <div className="req-progress-item">
                <span className="req-label">
                  Services Verified: {knownServices}/{contract.requiredServices}
                </span>
                <div className="req-progress-track">
                  <div
                    className="req-progress-fill"
                    style={{
                      width: `${Math.min(100, (knownServices / (contract.requiredServices ?? 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Deadline Gauge */}
      {status !== "completed" && deadlineMinute > 0 && (
        <div className="contract-deadline-gauge">
          <div className="deadline-info-row">
            <span className="deadline-urgency-tag">
              <span className="deadline-glyph" aria-hidden="true">{deadlineMeta.glyph}</span>
              <span>{deadlineMeta.label}</span>
            </span>
            <span className="deadline-time-text">
              {status === "accepted" ? "Due at " : "Expires at "}
              {formatWorldTime(deadlineMinute)}
              {minutesRemaining > 0 && (
                <span className="time-remaining-subtext">
                  {" "}({formatRemainingMinutes(minutesRemaining)} remaining)
                </span>
              )}
            </span>
          </div>
          <div
            className="deadline-urgency-track"
            data-urgency={urgency}
            aria-label={`Deadline urgency: ${deadlineMeta.label}`}
          >
            {(["calm", "closing", "urgent"] as const).map((band) => (
              <span
                key={band}
                className={`deadline-band deadline-band-${band}`}
                data-active={urgency === band ? "true" : "false"}
              >
                {band === "calm"
                  ? "ON SCHEDULE"
                  : band === "closing"
                    ? "CLOSING"
                    : "EXPIRING"}
              </span>
            ))}
            {urgency === "expired" && (
              <span className="deadline-band deadline-band-expired" data-active="true">
                EXPIRED
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {verbs.length > 0 && onAction && (
        <footer className="contract-actions-footer">
          {verbs.map((verb) => (
            <Button
              key={verb}
              size="sm"
              variant={verb === "decline" ? "ghost" : "default"}
              onClick={() => onAction(verb, contract.id)}
            >
              {verb.toUpperCase()}
            </Button>
          ))}
        </footer>
      )}
    </article>
  );
}

function formatRemainingMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
