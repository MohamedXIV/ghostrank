"use client";

import { formatWorldTime } from "@/game/computer/format-world-time";
import type { CompletedRunSummary } from "@/game/simulation/systems/run-history";

export interface RunTimelineProps {
  run: CompletedRunSummary;
}

export function RunTimeline({ run }: RunTimelineProps) {
  const endingMeta = getEndingMeta(run.endingStatus);

  return (
    <article
      className={`history-run-card ending-${run.endingStatus}`}
      data-ending={run.endingStatus}
      aria-label={`Completed run: ${run.handle} - ${run.endingLabel}`}
    >
      {/* Ending Hero Banner */}
      <div className="ending-hero-banner">
        <div className="ending-hero-left">
          <span className="ending-glyph" aria-hidden="true">
            {endingMeta.glyph}
          </span>
          <div>
            <div className="ending-type-row">
              <span className="ending-badge">{run.endingLabel.toUpperCase()}</span>
              {run.retirementVariant && (
                <span className="retirement-variant-pill">
                  {run.retirementVariant.replaceAll("-", " ").toUpperCase()}
                </span>
              )}
            </div>
            <strong className="ending-handle">{run.handle}</strong>
          </div>
        </div>
        <div className="ending-time-block">
          <span className="panel-label">ENDED AT</span>
          <span className="ending-timestamp">{formatWorldTime(run.endingWorldMinute)}</span>
        </div>
      </div>

      {run.endingDetail && (
        <p className="ending-narrative-detail">{run.endingDetail}</p>
      )}

      {/* Visual Career Metrics Grid */}
      <div className="career-metrics-grid">
        <div className="metric-tile">
          <span className="metric-label">FINAL RANK</span>
          <strong className="metric-value">#{run.finalRank.toLocaleString("en-US")}</strong>
        </div>
        <div className="metric-tile">
          <span className="metric-label">CREDITS SURVIVED</span>
          <strong className="metric-value">{run.finalCredits.toLocaleString("en-US")} cr</strong>
        </div>
        <div className="metric-tile">
          <span className="metric-label">VALUE MOVED</span>
          <strong className="metric-value">{run.valueMoved.toLocaleString("en-US")} cr</strong>
        </div>
        <div className="metric-tile">
          <span className="metric-label">CONTRACTS</span>
          <strong className="metric-value">{run.completedContracts}</strong>
        </div>
        <div className="metric-tile">
          <span className="metric-label">ESCALATIONS</span>
          <strong className="metric-value">{run.operationEscalations}</strong>
        </div>
        <div className="metric-tile">
          <span className="metric-label">COMPROMISES</span>
          <strong className="metric-value">{run.compromiseCount}</strong>
        </div>
      </div>

      {/* Reputation descriptors */}
      {run.descriptors.length > 0 && (
        <div className="run-reputation-badges">
          <span className="panel-label">SCENE REPUTATION:</span>
          <div className="descriptors-list">
            {run.descriptors.map((desc) => (
              <span key={desc.id} className="reputation-descriptor-pill">
                <span className="desc-glyph">◈</span>
                <span className="desc-label">{desc.label}</span>
                <span className="desc-basis">({desc.basis}×)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Causal Postmortem Timelines */}
      {run.postmortems.length > 0 && (
        <div className="run-postmortems-section">
          <span className="panel-label">CAUSAL POSTMORTEM TIMELINES</span>
          {run.postmortems.map((pm) => (
            <div key={pm.compromiseId} className="postmortem-timeline-block">
              <div className="postmortem-header">
                <div className="pm-title-group">
                  <span className="pm-glyph" aria-hidden="true">✕</span>
                  <strong>{pm.compromiseLabel}</strong>
                </div>
                <span className={`attribution-pill is-${pm.attribution}`}>
                  {pm.attribution === "complete" ? "COMPLETE ATTRIBUTION" : "PARTIAL ATTRIBUTION"}
                </span>
              </div>

              {/* Vertical Step Timeline with Causal Connectors */}
              <div className="causal-stepper">
                {pm.steps.map((step, idx) => {
                  const stepMeta = getStepMeta(step.kind);
                  const isLast = idx === pm.steps.length - 1;

                  return (
                    <div key={step.id} className={`stepper-node ${isLast ? "is-terminal" : ""}`}>
                      <div className="stepper-spine">
                        <div className="node-marker" title={stepMeta.label}>
                          <span className="marker-glyph" aria-hidden="true">{stepMeta.glyph}</span>
                        </div>
                        {!isLast && <div className="connector-line" />}
                      </div>
                      <div className="node-content">
                        <div className="node-meta">
                          <span className="step-kind-tag">{stepMeta.label}</span>
                          <span className="node-timestamp">{formatWorldTime(step.worldMinute)}</span>
                        </div>
                        <p className="node-text">{step.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pm.note && <p className="postmortem-analysis-note">{pm.note}</p>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function getEndingMeta(status: string): { glyph: string; title: string } {
  switch (status.toLowerCase()) {
    case "arrested":
      return { glyph: "⚠", title: "CUSTODIAL ARREST" };
    case "retired":
      return { glyph: "◆", title: "VOLUNTARY RETIREMENT" };
    case "vanished":
      return { glyph: "◌", title: "VANISHED WITHOUT TRACE" };
    case "compromised":
      return { glyph: "✕", title: "CATASTROPHIC BREACH" };
    case "stranded":
      return { glyph: "▲", title: "STRANDED RIG" };
    case "unmasked":
      return { glyph: "⚡", title: "PUBLIC UNMASKING" };
    default:
      return { glyph: "▣", title: "CONCLUDED RUN" };
  }
}

function getStepMeta(kind: string): { glyph: string; label: string } {
  switch (kind?.toLowerCase()) {
    case "action":
    case "intrusion":
      return { glyph: "⚡", label: "PLAYER ACTION" };
    case "reaction":
      return { glyph: "✕", label: "TARGET REACTION" };
    case "probe":
      return { glyph: "◌", label: "RIVAL PROBE" };
    case "investigation":
      return { glyph: "◈", label: "AUTHORITY SIGNAL" };
    case "physical":
    case "physical-threat":
      return { glyph: "⚠", label: "PHYSICAL REACH" };
    case "compromise":
      return { glyph: "✕", label: "COMPROMISE" };
    default:
      return { glyph: "•", label: "INCIDENT" };
  }
}
