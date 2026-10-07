import { Button } from "@/components/ui/button";
import { formatWorldTime } from "@/game/computer/format-world-time";
import type { VisibleRunEnding } from "@/game/simulation/projection/project-world";

export interface EndingEvidenceItem {
  id: string;
  category: string;
  worldMinute: number;
  text: string;
}

interface EndingCopy {
  glyph: string;
  title: string;
  line: string;
  recordLimit: string;
}

const ENDING_COPY: Record<VisibleRunEnding["status"], EndingCopy> = {
  arrested: {
    glyph: "⌑",
    title: "Taken into custody",
    line: "The final record closes with the operation under arrest.",
    recordLimit:
      "The arrest is authoritative; the visible record does not establish what led to it.",
  },
  unmasked: {
    glyph: "◉",
    title: "The mask is gone",
    line: "Identity exposed; the mask no longer holds.",
    recordLimit:
      "Exposure is confirmed; the visible record does not establish where it began.",
  },
  missing: {
    glyph: "··",
    title: "No one can find you",
    line: "The run closes with you recorded as missing.",
    recordLimit:
      "The missing status is confirmed; no further cause is established here.",
  },
  compromised: {
    glyph: "╳",
    title: "The system gives way",
    line: "A named compromise marks the final state of the operation.",
    recordLimit:
      "The ending is final. Nearby surfaced evidence is context, not proof of a hidden link.",
  },
  stranded: {
    glyph: "△",
    title: "Out of reach",
    line: "The run closes in a stranded state; the record stops here.",
    recordLimit:
      "Stranding is confirmed; the visible record does not identify a hidden source.",
  },
  retired: {
    glyph: "⌂",
    title: "You leave the work behind",
    line: "The operation closes by choice, on the terms the record can support.",
    recordLimit:
      "This run ended through voluntary retirement.",
  },
  vanished: {
    glyph: "∅",
    title: "The signal stops",
    line: "VANISHED is the final status in the record; no further account is inferred.",
    recordLimit:
      "The vanished status is confirmed; no explanation is inferred from silence.",
  },
};

export function getEndingCopy(status: VisibleRunEnding["status"]): EndingCopy {
  return ENDING_COPY[status];
}

export interface EndingPresentationProps {
  ending: VisibleRunEnding;
  handle: string;
  finalRank: number;
  finalCredits: number;
  traceCount: number;
  evidence: EndingEvidenceItem[];
  distroId: string;
  themeId: string;
  textScale: string;
  motionMode: string;
  transparencyMode: string;
  densityMode: string;
  contrastMode: string;
  onStartNewRun: () => void;
}

export function EndingPresentation({
  ending,
  handle,
  finalRank,
  finalCredits,
  traceCount,
  evidence,
  distroId,
  themeId,
  textScale,
  motionMode,
  transparencyMode,
  densityMode,
  contrastMode,
  onStartNewRun,
}: EndingPresentationProps) {
  const copy = getEndingCopy(ending.status);
  const causeLine =
    ending.status === "retired" && ending.detail
      ? ending.detail
      : copy.recordLimit;

  return (
    <section
      className={`boot-screen ending-presentation ending-${ending.status}`}
      data-ending={ending.status}
      data-distro={distroId}
      data-theme={themeId}
      data-text-scale={textScale}
      data-motion-mode={motionMode}
      data-transparency={transparencyMode}
      data-density={densityMode}
      data-contrast={contrastMode}
      aria-label={`${ending.label}: ${copy.title}`}
      aria-live="polite"
    >
      <article className="ending-monument">
        <div className="ending-monument-head">
          <span className="ending-monument-glyph" aria-hidden="true">
            {copy.glyph}
          </span>
          <div>
            <span className="ending-kicker">RUN CLOSED // {ending.label}</span>
            <h1>{copy.title}</h1>
            <p className="ending-epitaph">{copy.line}</p>
          </div>
          <div className="ending-final-time">
            <span className="panel-label">WORLD TIME</span>
            <strong>{formatWorldTime(ending.worldMinute)}</strong>
          </div>
        </div>

        <section className="ending-record" aria-label="Ending record">
          <span className="panel-label">CAUSE / WHAT THE RECORD SUPPORTS</span>
          <p>{causeLine}</p>
          {ending.status === "retired" && ending.variant ? (
            <span className="ending-variant">
              {ending.variant.replaceAll("-", " ").toUpperCase()}
            </span>
          ) : null}
        </section>

        <div className="ending-run-summary" aria-label="Run summary">
          <div>
            <span className="panel-label">HANDLE</span>
            <strong>{handle}</strong>
          </div>
          <div>
            <span className="panel-label">REPUTATION RANK</span>
            <strong>#{finalRank.toLocaleString("en-US")}</strong>
          </div>
          <div>
            <span className="panel-label">CREDITS REMAINING</span>
            <strong>{finalCredits.toLocaleString("en-US")} cr</strong>
          </div>
          <div>
            <span className="panel-label">RECORDED OPERATION TRACES</span>
            <strong>{traceCount}</strong>
          </div>
        </div>

        <section className="ending-evidence" aria-label="Surfaced run evidence">
          <div className="ending-evidence-heading">
            <span className="panel-label">SURFACED IN THIS RUN</span>
            <span>ordered by world time · connection unconfirmed</span>
          </div>
          {evidence.length > 0 ? (
            <ol>
              {evidence.map((item) => (
                <li key={item.id}>
                  <span className="ending-evidence-kind">{item.category}</span>
                  <span className="ending-evidence-text">{item.text}</span>
                  <time>{formatWorldTime(item.worldMinute)}</time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ending-no-evidence">
              No additional cause is confirmed by surfaced evidence.
            </p>
          )}
        </section>

        <div className="lifecycle-actions lifecycle-actions-center ending-actions">
          <Button
            variant="default"
            size="sm"
            onClick={onStartNewRun}
            title="Initialize a fresh simulation run with a new random seed"
          >
            + START NEW OPERATION
          </Button>
        </div>
      </article>
    </section>
  );
}
