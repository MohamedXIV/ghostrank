"use client";

import { SLICE_OUTCOME_TEXT } from "@/content/nightshade-slice";
import { contractActionFromGui } from "@/game/computer/apps/contract-actions";
import { formatWorldTime } from "@/game/computer/format-world-time";
import {
  briefingPreviewLines,
  type BriefingNotice,
} from "@/components/game/briefing/briefing-copy";
import { useBriefing } from "@/components/game/briefing/briefing-context";

/**
 * The Nightshade briefing on the desktop (D071). It shows the same clues,
 * preview and record as the terminal's `brief` and `op preview`, and it runs
 * the same commands. Every trace-costing act waits for an explicit confirmation.
 */
export function NightshadeBriefingPanel() {
  const briefing = useBriefing();

  if (!briefing) {
    return null;
  }

  const { view, pending, notices, cancel, run } = briefing;
  const ended = view.outcome !== null;
  const preview = view.preview;
  const status = ended
    ? SLICE_OUTCOME_TEXT[view.outcome!].title
    : "Open";
  const contractStatus = view.contract?.status ?? "missing";
  const confirmLine =
    pending === "escalate" && preview
      ? preview.escalate.blockedBy
        ? `Escalate: not now // ${preview.escalate.blockedBy.toLowerCase()}`
        : `Escalate: +${preview.escalate.traceWeight} high trace, ${preview.escalate.minutes} min. Footprint ${preview.escalate.footprintAfter} after.`
      : pending === "disengage" && preview
        ? preview.disengage.endsWith
          ? `Leave: ends the briefing as ${SLICE_OUTCOME_TEXT[preview.disengage.endsWith].title}.`
          : `Leave: +${preview.disengage.traceWeight} trace. The briefing stays open.`
        : null;

  return (
    <section className="briefing-panel" aria-label="Nightshade briefing">
      <header className="briefing-header">
        <span className="panel-label">NIGHTSHADE BRIEFING</span>
        <strong>{status.toUpperCase()}</strong>
        <span className="briefing-window">
          Window closes {formatWorldTime(view.windowEndWorldMinute)}
        </span>
      </header>

      <div className="briefing-stats">
        <div>
          <span className="panel-label">FOOTPRINT</span>
          <strong>
            {view.footprint} / {preview?.burnFootprint ?? 8}
          </strong>
        </div>
        <div>
          <span className="panel-label">WATCH</span>
          <strong>{view.watched ? "ACTIVE" : "NOT YET"}</strong>
        </div>
        <div>
          <span className="panel-label">MAP</span>
          <strong>
            {view.map.known} / {view.map.needed}
          </strong>
        </div>
        <div>
          <span className="panel-label">CONTRACT</span>
          <strong>{String(contractStatus).toUpperCase()}</strong>
        </div>
      </div>

      {view.review ? (
        <p className="briefing-line">
          {view.review.status === "ran"
            ? "Owner review ran. The vault's key was rotated."
            : `Owner review due ${formatWorldTime(view.review.dueWorldMinute)}.`}
        </p>
      ) : null}

      {view.pendingClues.map((pendingClue) => (
        <p className="briefing-line" key={pendingClue.clueId}>
          Broker answer due {formatWorldTime(pendingClue.dueWorldMinute)}: {pendingClue.title}.
        </p>
      ))}

      {notices.map((notice, index) => (
        <NoticeLine key={`${notice.badge}-${index}`} notice={notice} />
      ))}

      {!ended && view.contract ? (
        <div className="briefing-actions">
          {view.contract.status === "offered" ? (
            <>
              <button
                className="recon-inline-action"
                type="button"
                onClick={() => run(contractActionFromGui("accept", view.contract!.id))}
              >
                ACCEPT
              </button>
              <button
                className="recon-inline-action"
                type="button"
                onClick={() => run(contractActionFromGui("decline", view.contract!.id))}
              >
                DECLINE
              </button>
            </>
          ) : null}
          {view.contract.status === "accepted" ? (
            <button
              className="recon-inline-action"
              type="button"
              onClick={() => run(contractActionFromGui("deliver", view.contract!.id))}
            >
              DELIVER MAP
            </button>
          ) : null}
        </div>
      ) : null}

      {confirmLine ? (
        <div className="briefing-confirm" role="alertdialog" aria-label="Confirm trace cost">
          <p>{confirmLine}</p>
          <div className="briefing-actions">
            <button
              className="recon-inline-action"
              type="button"
              onClick={() =>
                pending === "escalate"
                  ? run({ type: "escalateOperation", confirmed: true })
                  : run({ type: "disengageOperation" })
              }
            >
              {pending === "escalate" ? "CONFIRM ESCALATION" : "CONFIRM LEAVE"}
            </button>
            <button className="recon-inline-action" type="button" onClick={cancel}>
              CANCEL
            </button>
          </div>
        </div>
      ) : null}

      {!ended && preview ? (
        <div className="briefing-preview">
          <span className="panel-label">BEFORE YOU COMMIT</span>
          {briefingPreviewLines(preview).map((line) => (
            <p className="briefing-line" key={line}>
              {line}
            </p>
          ))}
        </div>
      ) : null}

      <div className="briefing-clues">
        <span className="panel-label">CLUES</span>
        {view.clues.map((clue) => (
          <p className="briefing-line" key={clue.id}>
            <strong>{clue.title}.</strong> {clue.text}
          </p>
        ))}
      </div>

      {ended ? (
        <p className="briefing-outcome">
          <strong>{SLICE_OUTCOME_TEXT[view.outcome!].title}.</strong>{" "}
          {SLICE_OUTCOME_TEXT[view.outcome!].text}
        </p>
      ) : null}

      <div className="briefing-record">
        <span className="panel-label">RECORD</span>
        {view.log.slice(-8).map((entry, index) => (
          <p className="briefing-line" key={`${entry.worldMinute}-${index}`}>
            {`${formatWorldTime(entry.worldMinute)} // ${entry.text} (footprint ${entry.footprint})`}
          </p>
        ))}
      </div>
    </section>
  );
}

function NoticeLine({ notice }: { notice: BriefingNotice }) {
  return (
    <p className="briefing-notice" role="status">
      <span aria-hidden="true">{notice.glyph}</span> <strong>{notice.badge}</strong>{" "}
      {notice.text}
    </p>
  );
}
