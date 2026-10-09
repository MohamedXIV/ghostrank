"use client";

import { useState } from "react";

import { formatWorldTime } from "@/game/computer/format-world-time";
import { getEndingCopy } from "@/components/game/ending/ending-presentation";
import { SCENARIO_PRESENTATION } from "@/content/world-scenarios";
import type { CompletedRunSummary } from "@/game/simulation/systems/run-history";
import { paginateTimeline } from "./timeline-pagination";

const TIMELINE_PAGE_SIZE = 100;

export interface RunTimelineProps {
  run: CompletedRunSummary;
}

export function RunTimeline({ run }: RunTimelineProps) {
  const endingCopy = getEndingCopy(run.endingStatus);
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const timelinePage = paginateTimeline(
    run.timeline,
    requestedPage ?? 0,
    TIMELINE_PAGE_SIZE,
  );

  return (
    <article
      className={`history-run-card ending-${run.endingStatus}`}
      data-ending={run.endingStatus}
      aria-label={`Completed run: ${run.handle} - ${run.endingLabel}`}
    >
      <div className="ending-hero-banner">
        <div className="ending-hero-left">
          <span className="ending-glyph" aria-hidden="true">
            {endingCopy.glyph}
          </span>
          <div>
            <div className="ending-type-row">
              <span className="ending-badge">{run.endingLabel.toUpperCase()}</span>
              <span className="run-scenario-pill" data-scenario={run.scenario}>
                {SCENARIO_PRESENTATION[run.scenario].label.toUpperCase()}
              </span>
              {run.retirementVariant && (
                <span className="retirement-variant-pill">
                  {run.retirementVariant.replaceAll("-", " ").toUpperCase()}
                </span>
              )}
            </div>
            <strong className="ending-handle">{run.handle}</strong>
            <p className="history-ending-line">{endingCopy.line}</p>
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

      <section className="run-timeline-section" aria-label="Run timeline">
        <div className="run-timeline-heading">
          <span className="panel-label">RUN RECORD // SURFACED EVENTS</span>
          <p>
            Ordered by recorded world time. Nearby events share context; the
            timeline does not claim one caused another.
          </p>
        </div>
        {timelinePage.pageCount > 1 && (
          <nav className="timeline-page-controls" aria-label="Run timeline pages">
            <button
              type="button"
              onClick={() => setRequestedPage(timelinePage.page + 1)}
              disabled={timelinePage.page === timelinePage.pageCount - 1}
            >
              OLDER EVENTS
            </button>
            <span aria-live="polite">
              EVENTS {timelinePage.startIndex + 1}–{timelinePage.endIndex} OF{" "}
              {run.timeline.length}
            </span>
            <button
              type="button"
              onClick={() => setRequestedPage(timelinePage.page - 1)}
              disabled={timelinePage.page === 0}
            >
              NEWER EVENTS
            </button>
          </nav>
        )}
        {run.timeline.length > 0 ? (
          <ol className="run-event-timeline">
            {timelinePage.items.map((beat) => {
              const meta = getBeatMeta(beat.kind);
              return (
                <li key={beat.id} className={`run-event run-event-${beat.kind}`}>
                  <span className="run-event-glyph" aria-hidden="true">
                    {meta.glyph}
                  </span>
                  <div className="run-event-copy">
                    <div className="run-event-meta">
                      <span>{meta.label}</span>
                      <time>{formatWorldTime(beat.worldMinute)}</time>
                    </div>
                    <p>{beat.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="history-empty-note">No surfaced events were archived.</p>
        )}
      </section>

      {/* Visual Career Metrics Grid */}
      <div className="career-metrics-grid">
        <div className="metric-tile">
            <span className="metric-label">REPUTATION RANK</span>
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

      {run.postmortems.length > 0 && (
        <div className="run-postmortems-section">
          <span className="panel-label">POSTMORTEM // RECORDED PROVENANCE</span>
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

              <p className="postmortem-sequence-note">
                Ordered evidence is shown with its stored provenance. Connected
                rows do not make adjacent observations a proven cause.
              </p>
              <div className="sequence-stepper">
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

function getBeatMeta(kind: string): { glyph: string; label: string } {
  switch (kind) {
    case "action":
      return { glyph: "↳", label: "PLAYER ACTION" };
    case "escalation":
      return { glyph: "↑", label: "OPERATION ESCALATION" };
    case "consequence":
      return { glyph: "·", label: "RECORDED CONSEQUENCE" };
    case "retaliation":
      return { glyph: "↯", label: "PUBLIC RETALIATION" };
    case "rival-probe":
      return { glyph: "⌁", label: "RIVAL PROBE TELL" };
    case "investigation":
      return { glyph: "⌕", label: "SURFACED INVESTIGATION" };
    case "physical-threat":
      return { glyph: "!", label: "PHYSICAL SIGNAL" };
    case "ending":
      return { glyph: "■", label: "ENDING" };
    default:
      return { glyph: "•", label: "RECORDED EVENT" };
  }
}

function getStepMeta(kind: string): { glyph: string; label: string } {
  switch (kind?.toLowerCase()) {
    case "player-action":
    case "action":
    case "intrusion":
      return { glyph: "⚡", label: "PLAYER ACTION" };
    case "defensive-reaction":
    case "reaction":
      return { glyph: "·", label: "VISIBLE CONSEQUENCE" };
    case "probe-tell":
    case "probe":
      return { glyph: "◌", label: "RIVAL PROBE TELL" };
    case "authority-evidence":
    case "investigation":
      return { glyph: "◈", label: "SURFACED INVESTIGATION" };
    case "physical-evidence":
    case "physical":
    case "physical-threat":
      return { glyph: "⚠", label: "PHYSICAL SIGNAL" };
    case "compromise":
      return { glyph: "✕", label: "RECORDED COMPROMISE" };
    default:
      return { glyph: "•", label: "INCIDENT" };
  }
}
