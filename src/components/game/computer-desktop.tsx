"use client";

import { FormEvent, useEffect, useState } from "react";
import { useCell, useRow, useRowIds, useTable } from "tinybase/ui-react";

import { formatWorldTime } from "@/game/computer/format-world-time";
import {
  describeForumContractCopy,
  describeForumUnmaskingCopy,
  describeIncidentCopy,
  describeInvestigationSignalCopy,
  describePhysicalSignalCopy,
  describeProbeTellCopy,
} from "@/content/social-copy";
import {
  analyzeTargetFromGui,
  disengageOperationFromGui,
  escalateOperationFromGui,
  inspectMachineFromGui,
  observeTargetFromGui,
  openOperationFromGui,
  surveyTargetFromGui,
} from "@/game/computer/apps/target-actions";
import {
  contractActionFromGui,
  type ContractVerb,
} from "@/game/computer/apps/contract-actions";
import {
  acquireModelFromGui,
  abortBuildFromGui,
  breakLeaseFromGui,
  buyHardwareFromGui,
  buyMachineFromGui,
  buyPlayerToolFromGui,
  disableSoftwareFromGui,
  enableSoftwareFromGui,
  renameMachineFromGui,
  rentHousingFromGui,
  runModelFromGui,
  sellMachineFromGui,
  sellPlayerToolFromGui,
  startBuildFromGui,
  stopModelFromGui,
} from "@/game/computer/apps/economy-actions";
import { readMessageFromGui } from "@/game/computer/apps/message-actions";
import { retirementActionFromGui } from "@/game/computer/apps/retirement-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import type { GameSession } from "@/game/runtime/game-session";
import type { CompletedRunSummary } from "@/game/simulation/systems/run-history";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import { Button } from "@/components/ui/button";
import { TruthMark } from "@/components/ui/truth-mark";
import {
  type ComputerWindowId,
  useUiStore,
} from "@/stores/ui/use-ui-store";

interface ComputerDesktopProps {
  runtime: GameSession;
  onReturnToRoom: () => void;
}

const WINDOW_LABELS: Record<ComputerWindowId, string> = {
  terminal: "TERM_01",
  recon: "RECON INDEX",
  underground: "UNDERGROUND INDEX",
  market: "MARKET // RIG",
  history: "RUN HISTORY",
};

const RECON_ACTION_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["survey", "SURVEY"],
  ["inspect", "INSPECT"],
  ["escalate", "ESCALATE"],
  ["disengage", "DISENGAGE"],
];

export function ComputerDesktop({
  runtime,
  onReturnToRoom,
}: ComputerDesktopProps) {
  const worldMinute = Number(
    useCell("meta", "world", "worldMinute", runtime.projection) ?? 0,
  );
  const handle = String(
    useCell("player", "current", "handle", runtime.projection) ?? "UNKNOWN",
  );
  const rank = Number(
    useCell("player", "current", "rank", runtime.projection) ?? 0,
  );
  const credits = Number(
    useCell("meta", "wallet", "credits", runtime.projection) ?? 0,
  );

  const openWindows = useUiStore((state) => state.openWindows);
  const focusedWindow = useUiStore((state) => state.focusedWindow);
  const openWindow = useUiStore((state) => state.openWindow);
  const closeWindow = useUiStore((state) => state.closeWindow);
  const focusWindow = useUiStore((state) => state.focusWindow);

  return (
    <section className="desktop-surface" aria-label="Ghostrank computer">
      <header className="os-bar">
        <div className="os-brand">
          <span className="status-dot" />
          GHOST/OS
        </div>
        <div className="os-stats">
          <span>{handle}</span>
          <span>RANK #{rank.toLocaleString("en-US")}</span>
          <span>{credits.toLocaleString("en-US")} cr</span>
          <span>{formatWorldTime(worldMinute)}</span>
        </div>
        <Button className="os-room-button" onClick={onReturnToRoom}>
          ROOM
        </Button>
      </header>

      <div className="desktop-workspace">
        <nav className="desktop-launcher" aria-label="Applications">
          <button type="button" onClick={() => openWindow("terminal")}>
            <span className="launcher-glyph">&gt;_</span>
            Terminal
          </button>
          <button type="button" onClick={() => openWindow("recon")}>
            <span className="launcher-glyph">◎</span>
            Recon
          </button>
          <button type="button" onClick={() => openWindow("underground")}>
            <span className="launcher-glyph">◈</span>
            Index
          </button>
          <button type="button" onClick={() => openWindow("market")}>
            <span className="launcher-glyph">⌸</span>
            Market
          </button>
          <button type="button" onClick={() => openWindow("history")}>
            <span className="launcher-glyph">▤</span>
            History
          </button>
        </nav>

        <div className="desktop-grid" aria-hidden="true" />

        {openWindows.includes("terminal") && (
          <WindowFrame
            id="terminal"
            title={WINDOW_LABELS.terminal}
            focused={focusedWindow === "terminal"}
            onFocus={() => focusWindow("terminal")}
            onClose={() => closeWindow("terminal")}
          >
            <TerminalApp runtime={runtime} />
          </WindowFrame>
        )}

        {openWindows.includes("recon") && (
          <WindowFrame
            id="recon"
            title={WINDOW_LABELS.recon}
            focused={focusedWindow === "recon"}
            onFocus={() => focusWindow("recon")}
            onClose={() => closeWindow("recon")}
          >
            <ReconApp runtime={runtime} />
          </WindowFrame>
        )}

        {openWindows.includes("underground") && (
          <WindowFrame
            id="underground"
            title={WINDOW_LABELS.underground}
            focused={focusedWindow === "underground"}
            onFocus={() => focusWindow("underground")}
            onClose={() => closeWindow("underground")}
          >
            <UndergroundApp runtime={runtime} />
          </WindowFrame>
        )}

        {openWindows.includes("market") && (
          <WindowFrame
            id="market"
            title={WINDOW_LABELS.market}
            focused={focusedWindow === "market"}
            onFocus={() => focusWindow("market")}
            onClose={() => closeWindow("market")}
          >
            <MarketApp runtime={runtime} />
          </WindowFrame>
        )}
        {openWindows.includes("history") && (
          <WindowFrame
            id="history"
            title={WINDOW_LABELS.history}
            focused={focusedWindow === "history"}
            onFocus={() => focusWindow("history")}
            onClose={() => closeWindow("history")}
          >
            <HistoryApp runtime={runtime} />
          </WindowFrame>
        )}
      </div>

      <footer className="os-footer">
        <span>LOCAL SIMULATION // OFFLINE</span>
        <span>NO HOST SHELL // NO REAL NETWORK</span>
      </footer>
    </section>
  );
}

interface WindowFrameProps {
  id: ComputerWindowId;
  title: string;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

function WindowFrame({
  id,
  title,
  focused,
  onFocus,
  onClose,
  children,
}: WindowFrameProps) {
  return (
    <section
      className={`os-window os-window-${id} ${focused ? "is-focused" : ""}`}
      onMouseDown={onFocus}
      aria-label={title}
    >
      <header className="window-titlebar">
        <span>{title}</span>
        <div className="window-controls">
          <span>{focused ? "ACTIVE" : "IDLE"}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            ×
          </Button>
        </div>
      </header>
      <div className="window-content">{children}</div>
    </section>
  );
}


function HistoryApp({ runtime }: { runtime: GameSession }) {
  const [runs, setRuns] = useState<CompletedRunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    void runtime
      .history()
      .then((history) => {
        if (mounted) {
          setRuns(history);
          setError(null);
        }
      })
      .catch(() => {
        if (mounted) {
          setRuns([]);
          setError("completed-run history could not be read");
        }
      });

    return () => {
      mounted = false;
    };
  }, [runtime]);

  return (
    <div className="history-app">
      <section aria-label="Completed runs">
        <span className="panel-label">COMPLETED RUNS</span>
        {runs === null ? (
          <p className="underground-empty">Reading local archive…</p>
        ) : error ? (
          <p className="underground-empty">{error}</p>
        ) : runs.length === 0 ? (
          <p className="underground-empty">
            No completed runs are archived on this browser yet.
          </p>
        ) : (
          <div className="history-runs">
            {runs.map((run, index) => (
              <article
                className="history-run"
                key={`${run.endingStatus}:${run.endingWorldMinute}:${index}`}
              >
                <div className="history-run-heading">
                  <div>
                    <span className="panel-label">
                      {run.endingLabel}
                      {run.retirementVariant
                        ? ` // ${run.retirementVariant
                            .replaceAll("-", " ")
                            .toUpperCase()}`
                        : ""}
                    </span>
                    <strong>{run.handle}</strong>
                  </div>
                  <span className="underground-time">
                    {formatWorldTime(run.endingWorldMinute)}
                  </span>
                </div>

                {run.endingDetail && (
                  <p className="analysis-caveat">{run.endingDetail}</p>
                )}

                <ul className="underground-feed">
                  <li>
                    <span>final rank</span>
                    <span>#{run.finalRank.toLocaleString("en-US")}</span>
                  </li>
                  <li>
                    <span>credits left</span>
                    <span>{run.finalCredits.toLocaleString("en-US")} cr</span>
                  </li>
                  <li>
                    <span>value moved</span>
                    <span>{run.valueMoved.toLocaleString("en-US")} cr</span>
                  </li>
                  <li>
                    <span>completed contracts</span>
                    <span>{run.completedContracts}</span>
                  </li>
                  <li>
                    <span>intrusive escalations</span>
                    <span>{run.operationEscalations}</span>
                  </li>
                  <li>
                    <span>authored workflows</span>
                    <span>{run.authoredWorkflows}</span>
                  </li>
                  <li>
                    <span>compromises</span>
                    <span>{run.compromiseCount}</span>
                  </li>
                </ul>

                {run.descriptors.length > 0 && (
                  <p className="underground-note">
                    {"reputation // "}
                    {run.descriptors.map((entry) => entry.label).join(" · ")}
                  </p>
                )}

                {run.postmortems.map((postmortem) => (
                  <div
                    className="history-postmortem"
                    key={postmortem.compromiseId}
                  >
                    <span className="panel-label">
                      {"POSTMORTEM // "}
                      {postmortem.compromiseLabel}
                      {" // "}
                      {postmortem.attribution === "complete"
                        ? "COMPLETE"
                        : "INCOMPLETE ATTRIBUTION"}
                    </span>
                    <ul className="underground-feed">
                      {postmortem.steps.map((step) => (
                        <li key={step.id}>
                          <span className="underground-time">
                            {formatWorldTime(step.worldMinute)}
                          </span>
                          <span>{step.text}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="underground-note">{postmortem.note}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TerminalApp({ runtime }: { runtime: GameRuntime }) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>([
    "ghostsh 0.1 // virtual capability shell",
    "commands: observe <target-id> | op open <target-id> | survey <target-id> | inspect <machine-id> | analyze <target-id> | op escalate | op exit | buy <catalog-id> | build <spec-id> | retire plan|commit|finish|cancel | wait <minutes> | help",
  ]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const raw = input.trim();
    if (!raw) {
      return;
    }

    setInput("");

    if (raw.toLowerCase() === "help") {
      setLines((current) => [
        ...current,
        `> ${raw}`,
        "observe <target-id>  resolve a target profile",
        "op open <target-id>  start a recon-stage operation",
        "survey <target-id>   discover machines in the active operation (rig scale + speed)",
        "inspect <machine-id> inspect known machines in the active operation (rig scale + speed)",
        "analyze <target-id>  the running assistant's read of what recon has not seen (no time, fallible)",
        "op escalate          cross the fictional recon boundary (rig speed)",
        "op exit              disengage from the active operation (3m)",
        "buy <catalog-id>     acquire hardware from the market (rig upgrades)",
        "rent <housing-id>    sign a housing lease (recurring upkeep, capability lift)",
        "lease break          move out and return to the free baseline",
        "use <software-id>    run a premium tool (recurring license fee)",
        "stop <software-id>   stop a tool (its fee stops with it)",
        "buytool <tool-id>    buy an authored player tool (one-time, carries provenance)",
        "selltool <tool-id>   resell an owned copy (recovers part of the price)",
        "box buy <catalog-id> acquire a complete named machine (one-time)",
        "box sell <box-id>    resell an owned machine through the fence",
        "box name <box-id> <label>  rename an owned machine",
        "model buy <model-id> acquire a local model (one-time, runs free)",
        "model run <model-id> run a model (cloud rents daily; local must be owned)",
        "model stop         stop the running model",
        "build <spec-id>    commission the assistant to build a workflow (time, not credits)",
        "build abort <build-id>  cancel an in-flight build (nothing is charged)",
        "retire plan          begin a voluntary exit plan",
        "retire commit        commit once obligations/infrastructure/location are wound down (costs 60m)",
        "retire finish        close the handle once cooling is READY",
        "retire cancel        abandon the exit plan and resume normal play",
        "wait <minutes>       advance world time",
      ]);
      return;
    }

    const parsed = parseTerminalCommand(raw);

    if (!parsed.ok) {
      setLines((current) => [
        ...current,
        `> ${raw}`,
        `error: ${parsed.error.toLowerCase()}`,
      ]);
      return;
    }

    const result = runtime.execute(parsed.command);

    setLines((current) => [
      ...current,
      `> ${raw}`,
      result.ok
        ? describeCommandResult(parsed.command.type)
        : `error: ${result.error?.toLowerCase() ?? "command_failed"}`,
    ]);
  };

  return (
    <div className="terminal-app">
      <div className="terminal-output" aria-live="polite">
        {lines.map((line, index) => (
          <div key={`${index}-${line}`}>{line}</div>
        ))}
      </div>
      <form className="terminal-input-row" onSubmit={submit}>
        <span>cobaltxz@local:~$</span>
        <input
          aria-label="Terminal command"
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="observe nightshade"
        />
      </form>
    </div>
  );
}

function describeCommandResult(type: SimulationCommand["type"]) {
  switch (type) {
    case "observeTarget":
      return "observation complete // target profile updated";
    case "openOperation":
      return "operation opened // stage recon";
    case "surveyTarget":
      return "survey complete // machine evidence updated";
    case "inspectMachine":
      return "inspection complete // service evidence updated";
    case "escalateOperation":
      return "operation escalated // stage intrusive";
    case "disengageOperation":
      return "operation disengaged";
    case "readMessage":
      return "message marked read";
    case "acceptContract":
      return "contract accepted // clock is running";
    case "declineContract":
      return "contract declined";
    case "deliverContract":
      return "contract delivered";
    case "buyHardware":
      return "hardware acquired // rig updated";
    case "rentHousing":
      return "lease signed // location capability active";
    case "breakLease":
      return "lease broken // back to the free baseline";
    case "enableSoftware":
      return "license activated // recurring fee starts at the next day";
    case "disableSoftware":
      return "license stopped // fee stops with it";
    case "buyPlayerTool":
      return "player tool acquired // author provenance recorded";
    case "sellPlayerTool":
      return "player tool sold // resale credits recovered";
    case "buyMachine":
      return "machine acquired // new box added to the rack";
    case "sellMachine":
      return "machine sold // resale credits recovered";
    case "renameMachine":
      return "machine renamed // label updated";
    case "acquireModel":
      return "local model acquired // owned outright, runs free";
    case "runModel":
      return "model running // analysis assist active";
    case "stopModel":
      return "model stopped // its shortcut ends";
    case "analyzeTarget":
      return "assistant read stored // predictions, not evidence";
    case "startBuild":
      return "build commissioned // assistant working, garage shows the queue";
    case "abortBuild":
      return "build aborted // rig freed, nothing charged";
    case "advanceTime":
      return "world clock advanced";
    case "startRetirement":
      return "exit plan opened // wind down the visible blockers";
    case "commitRetirement":
      return "exit committed // cooling period started";
    case "cancelRetirement":
      return "exit plan cancelled // normal play resumed";
    case "finishRetirement":
      return "handle closed // final disposition recorded";
  }
}

/**
 * Inline rename for one owned machine: local draft text, applied through the
 * shared typed command on submit. Empty or over-long drafts are rejected by the
 * simulation, so the view never invents its own rules.
 */
function MachineRenameRow({
  machineId,
  currentLabel,
  onRename,
}: {
  machineId: string;
  currentLabel: string;
  onRename: (label: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();

  return (
    <form
      className="machine-rename-row"
      onSubmit={(event) => {
        event.preventDefault();

        if (trimmed.length === 0) {
          return;
        }

        onRename(trimmed);
        setDraft("");
      }}
    >
      <input
        aria-label={`Rename machine ${machineId}`}
        autoComplete="off"
        maxLength={24}
        placeholder={`rename "${currentLabel}"`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="submit" disabled={trimmed.length === 0}>
        NAME
      </button>
    </form>
  );
}

function ReconApp({ runtime }: { runtime: GameRuntime }) {
  const [targetId, setTargetId] = useState("nightshade");
  const targetIds = useRowIds("targets", runtime.projection);
  const machineIds = useRowIds("machines", runtime.projection);
  const reactionIds = useRowIds("reactions", runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const services = useTable("services", runtime.projection);
  const footprint = useRow("footprint", "current", runtime.projection);
  const analysisIds = useRowIds("analysisClaims", runtime.projection);
  const operationTargetId = String(operation.targetId ?? "");
  const operationStage = String(operation.stage ?? "");
  const canEscalate = Object.values(services).some(
    (service) => service.targetId === operationTargetId,
  );

  const observe = () => {
    const normalized = targetId.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    runtime.execute(observeTargetFromGui(normalized));
  };

  return (
    <div className="recon-app">
      <div className="recon-lead">
        <div>
          <span className="panel-label">UNRESOLVED LEAD</span>
          <strong>nightshade</strong>
        </div>
        <TruthMark level="unknown" label="UNVERIFIED" />
      </div>

      <div className="recon-command">
        <input
          aria-label="Target identifier"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        />
        <Button size="sm" onClick={observe}>
          OBSERVE
        </Button>
      </div>

      <div className="operation-panel">
        <span className="panel-label">OPERATION SESSION</span>
        {operationTargetId ? (
          <div className="operation-session">
            <div>
              <span className="panel-label">TARGET</span>
              <strong>{operationTargetId}</strong>
            </div>
            <div>
              <span className="panel-label">STAGE</span>
              <strong>{operationStage.toUpperCase()}</strong>
            </div>
            <div className="operation-actions">
              {operationStage === "recon" && (
                <button
                  className="recon-inline-action"
                  type="button"
                  disabled={!canEscalate}
                  title={
                    canEscalate
                      ? "Escalate the current fictional operation"
                      : "Discover service evidence before escalation"
                  }
                  onClick={() => runtime.execute(escalateOperationFromGui())}
                >
                  ESCALATE
                </button>
              )}
              <button
                className="recon-inline-action"
                type="button"
                onClick={() => runtime.execute(disengageOperationFromGui())}
              >
                DISENGAGE
              </button>
            </div>
          </div>
        ) : (
          <p>No active operation. Open one from an observed target profile.</p>
        )}
      </div>

      <div className="footprint-panel">
        <span className="panel-label">SELF-OBSERVED FOOTPRINT</span>
        <div className="footprint-summary">
          <div>
            <span className="panel-label">LEVEL</span>
            <strong>{String(footprint.level ?? "none").toUpperCase()}</strong>
          </div>
          <div>
            <span className="panel-label">SCORE</span>
            <strong>{Number(footprint.score ?? 0)}</strong>
          </div>
          <div>
            <span className="panel-label">TRACES</span>
            <strong>{Number(footprint.traceCount ?? 0)}</strong>
          </div>
        </div>
        <p>
          This is your own simulated footprint summary. It does not reveal who
          has noticed it or predict a reaction.
        </p>
      </div>

      <div className="reaction-panel">
        <span className="panel-label">VISIBLE TARGET REACTIONS</span>
        {reactionIds.length === 0 ? (
          <p>No observable target reaction is active.</p>
        ) : (
          reactionIds.map((id) => (
            <ReactionCard key={id} reactionId={id} runtime={runtime} />
          ))
        )}
      </div>

      <div className="recon-results">
        <span className="panel-label">PLAYER-VISIBLE INDEX</span>
        {targetIds.length === 0 ? (
          <p>No resolved target records. Observation does not guarantee safety.</p>
        ) : (
          targetIds.map((id) => (
            <ReconTarget key={id} targetId={id} runtime={runtime} />
          ))
        )}
      </div>

      <div className="recon-infrastructure">
        <span className="panel-label">KNOWN INFRASTRUCTURE</span>
        {machineIds.length === 0 ? (
          <p>
            No infrastructure evidence. A target profile is not a topology map.
          </p>
        ) : (
          machineIds.map((id) => (
            <ReconMachine key={id} machineId={id} runtime={runtime} />
          ))
        )}
      </div>

      <div className="assistant-analysis">
        <span className="panel-label">ASSISTANT ANALYSIS</span>
        {analysisIds.length === 0 ? (
          <p>
            No stored read. Ask the running assistant with ANALYZE or{" "}
            <code>analyze &lt;target-id&gt;</code>; it costs no time and reads
            only what recon has not mapped yet.
          </p>
        ) : (
          analysisIds.map((id) => (
            <AnalysisClaimRow key={id} claimId={id} runtime={runtime} />
          ))
        )}
        {analysisIds.length > 0 && (
          <p className="analysis-caveat">
            These are predictions, not evidence. The assistant guesses the parts
            of the target you have not surveyed or inspected, and it can be
            wrong — mislabelling a host, inventing one entirely, or stating
            either with more confidence than it has earned. Verify anything you
            plan to act on with SURVEY and INSPECT.
          </p>
        )}
      </div>
    </div>
  );
}

function AnalysisClaimRow({
  claimId,
  runtime,
}: {
  claimId: string;
  runtime: GameRuntime;
}) {
  const claim = useRow("analysisClaims", claimId, runtime.projection);
  const minute = Number(claim.worldMinute ?? 0);

  return (
    <article className="analysis-claim">
      <span className="analysis-subject">{String(claim.subject ?? "")}</span>
      <span className="analysis-assertion">
        {String(claim.kind ?? "") === "service-kind"
          ? "service likely"
          : "host likely"}{" "}
        <strong>{String(claim.assertion ?? "")}</strong>
      </span>
      <span className="analysis-truth">
        <TruthMark level="inferred" />
        <span className={`confidence-${String(claim.confidence ?? "low")}`}>
          {String(claim.confidence ?? "low").toUpperCase()}
        </span>
      </span>
      <span className="analysis-meta">
        {String(claim.modelLabel ?? "")} @ {formatWorldTime(minute)}
      </span>
    </article>
  );
}

function ReconTarget({
  targetId,
  runtime,
}: {
  targetId: string;
  runtime: GameRuntime;
}) {
  const target = useRow("targets", targetId, runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const operationTargetId = String(operation.targetId ?? "");
  const isActiveTarget = operationTargetId === targetId;
  const operationElsewhere =
    operationTargetId.length > 0 && !isActiveTarget;

  const act = () => {
    runtime.execute(
      isActiveTarget
        ? surveyTargetFromGui(targetId)
        : openOperationFromGui(targetId),
    );
  };

  return (
    <article className="target-card">
      <div>
        <span className="panel-label">HANDLE</span>
        <strong>{String(target.handle ?? targetId)}</strong>
      </div>
      <div>
        <span className="panel-label">PUBLIC RANK</span>
        <strong>#{Number(target.rank ?? 0).toLocaleString("en-US")}</strong>
      </div>
      <div>
        <span className="panel-label">STATUS</span>
        <strong>{isActiveTarget ? "ACTIVE OP" : "OBSERVED"}</strong>
      </div>
      <div className="operation-actions">
        <button
          className="recon-inline-action"
          type="button"
          disabled={operationElsewhere}
          onClick={act}
        >
          {isActiveTarget
            ? "SURVEY"
            : operationElsewhere
              ? "OP ACTIVE"
              : "OPEN OP"}
        </button>
        {isActiveTarget && (
          <button
            className="recon-inline-action"
            type="button"
            title="Ask the running assistant for its read of what recon has not mapped yet (costs no time, can be wrong)"
            onClick={() => runtime.execute(analyzeTargetFromGui(targetId))}
          >
            ANALYZE
          </button>
        )}
      </div>
    </article>
  );
}


function ReconMachine({
  machineId,
  runtime,
}: {
  machineId: string;
  runtime: GameRuntime;
}) {
  const machine = useRow("machines", machineId, runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const services = useTable("services", runtime.projection);
  const operationTargetId = String(operation.targetId ?? "");
  const canInspect =
    operationTargetId.length > 0 &&
    operationTargetId === String(machine.targetId ?? "");
  const machineServices = Object.entries(services).filter(
    ([, service]) => service.machineId === machineId,
  );

  return (
    <article className="machine-card">
      <header>
        <div>
          <span className="panel-label">MACHINE</span>
          <strong>{String(machine.label ?? machineId)}</strong>
        </div>
        <div className="machine-actions">
          <span className="machine-role">{String(machine.role ?? "unknown")}</span>
          <button
            className="recon-inline-action"
            type="button"
            disabled={!canInspect}
            onClick={() => runtime.execute(inspectMachineFromGui(machineId))}
          >
            INSPECT
          </button>
        </div>
      </header>

      <div className="machine-services">
        {machineServices.length === 0 ? (
          <p>No service evidence attached to this machine.</p>
        ) : (
          machineServices.map(([serviceId, service]) => (
            <div className="service-row" key={serviceId}>
              <div>
                <span className="panel-label">SERVICE</span>
                <strong>{String(service.label ?? serviceId)}</strong>
              </div>
              <span>{String(service.kind ?? "unknown")}</span>
              <span>{String(service.state ?? "unknown")}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}


function ReactionCard({
  reactionId,
  runtime,
}: {
  reactionId: string;
  runtime: GameRuntime;
}) {
  const reaction = useRow("reactions", reactionId, runtime.projection);

  return (
    <article className="reaction-card">
      <div>
        <span className="panel-label">TARGET</span>
        <strong>{String(reaction.targetId ?? "unknown")}</strong>
      </div>
      <div>
        <span className="panel-label">REACTION</span>
        <strong>
          {String(reaction.kind ?? "unknown")
            .replaceAll("-", " ")
            .toUpperCase()}
        </strong>
      </div>
      <div>
        <span className="panel-label">CAUSAL SCORE</span>
        <strong>{Number(reaction.footprintScore ?? 0)}</strong>
      </div>
      <div className="reaction-provenance">
        <span className="panel-label">CAUSAL TRACES</span>
        <span>{String(reaction.sourceTraceIds ?? "none")}</span>
      </div>
    </article>
  );
}

function describeContract(
  objective: string,
  targetHandle: string,
  requiredServices: number | undefined,
  requiredMachines: number | undefined,
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

function describeLongRunPressureReason(reason: string): string {
  switch (reason) {
    case "completed-work":
      return "completed and missed obligations have left a longer paper trail";
    case "intrusive-history":
      return "intrusive work and surfaced authority attention have accumulated";
    case "counterpressure":
      return "retaliation and rival probing have become part of this run's history";
    case "physical-history":
      return "physical incidents and compromises have made the infrastructure harder to keep quiet";
    default:
      return reason.replaceAll("-", " ");
  }
}

function UndergroundApp({ runtime }: { runtime: GameRuntime }) {
  const board = useTable("board", runtime.projection);
  const feed = useTable("feed", runtime.projection);
  const stances = useTable("stances", runtime.projection);
  const inbox = useTable("inbox", runtime.projection);
  const contractTable = useTable("contracts", runtime.projection);
  const retaliationTable = useTable("retaliations", runtime.projection);
  const descriptorTable = useTable("descriptors", runtime.projection);
  const forumTable = useTable("forum", runtime.projection);
  const assistantsTable = useTable("assistants", runtime.projection);
  // Phase 6 P1: the case files and the evidence they have surfaced.
  const investigationTable = useTable("investigations", runtime.projection);
  const signalTable = useTable("investigationSignals", runtime.projection);
  // Phase 6 P2: the tells rival probes leaked into your logs.
  const probeTable = useTable("probes", runtime.projection);
  // Phase 6 P3: physical evidence only — never the cause or a countdown.
  const physicalSignalTable = useTable("physicalSignals", runtime.projection);
  // Phase 6 P4: named catastrophic conditions, still without causal internals.
  const compromiseTable = useTable("compromises", runtime.projection);
  // Phase 6 P5: safe causal reads derived from the hidden provenance graph.
  const postmortemTable = useTable("postmortems", runtime.projection);
  const postmortemStepTable = useTable("postmortemSteps", runtime.projection);
  const retirement = useRow("retirement", "current", runtime.projection);
  const longRunPressure = useRow(
    "longRunPressure",
    "current",
    runtime.projection,
  );
  const unread = Number(
    useCell("meta", "inbox", "unread", runtime.projection) ?? 0,
  );

  const handles = Object.entries(board).sort(
    ([idA, a], [idB, b]) =>
      Number(a.rank ?? 0) - Number(b.rank ?? 0) || idA.localeCompare(idB),
  );
  const incidents = Object.entries(feed).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  const stanceEntries = Object.entries(stances);
  const messages = Object.entries(inbox).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );

  const contracts = Object.entries(contractTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.expiresWorldMinute ?? 0) - Number(a.expiresWorldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );

  const heat = Object.entries(retaliationTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );

  const descriptors = Object.entries(descriptorTable);
  const forumPosts = Object.entries(forumTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  // Phase 5 P4: the ecosystem's AI users, read-only, name and model label only.
  const assistants = Object.entries(assistantsTable).sort(([idA], [idB]) =>
    idA.localeCompare(idB),
  );
  // Phase 6 P1: authority case files, read as evidence lists. The stage is a
  // band and each row is a noticed thing; there is deliberately no number here
  // to read as a meter, and no minute that implies a deadline.
  const cases = Object.fromEntries(
    Object.entries(investigationTable).map(([id, entry]) => [
      id,
      String(entry.stage ?? "probing"),
    ]),
  );
  const signals = Object.entries(signalTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  const tells = Object.entries(probeTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  const physicalSignals = Object.entries(physicalSignalTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  const compromises = Object.entries(compromiseTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  const postmortems = Object.entries(postmortemTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );
  const postmortemStepsFor = (compromiseId: string) =>
    Object.entries(postmortemStepTable)
      .filter(([, entry]) => entry.compromiseId === compromiseId)
      .sort(
        ([idA, a], [idB, b]) =>
          Number(a.worldMinute ?? 0) - Number(b.worldMinute ?? 0) ||
          idA.localeCompare(idB, undefined, { numeric: true }),
      );
  const caseStage = (investigationId: string): string =>
    cases[investigationId] ?? "probing";
  const exitStatus = String(retirement.status ?? "idle");
  const exitBlockers = String(retirement.blockers ?? "")
    .split(",")
    .filter(Boolean);
  const pressureBand = String(longRunPressure.band ?? "ordinary");
  const pressureReasons = String(longRunPressure.reasons ?? "")
    .split(",")
    .filter(Boolean);

  return (
    <div className="underground-app">
      <section aria-label="Reputation">
        <span className="panel-label">HOW THE SCENE KNOWS YOU</span>
        {descriptors.length === 0 ? (
          <p className="underground-empty">Nobody has a word for you yet.</p>
        ) : (
          <ul className="underground-stances">
            {descriptors.map(([id, entry]) => (
              <li key={id}>
                <span>{String(entry.label ?? id)}</span>
                <span className="underground-time">
                  {String(entry.context ?? "")} · seen {Number(entry.basis ?? 0)}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Long-run pressure">
        <span className="panel-label">
          {"LONG-RUN PRESSURE // "}
          {pressureBand.toUpperCase()}
        </span>
        {pressureBand === "ordinary" ? (
          <p className="underground-empty">
            This run has not accumulated veteran pressure yet.
          </p>
        ) : (
          <ul className="underground-feed">
            {pressureReasons.map((reason) => (
              <li key={reason}>
                <span>{describeLongRunPressureReason(reason)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="analysis-caveat">
          Pressure comes from the history this run has accumulated, not from
          rank. It can make work arrive more often and existing enemies pay more
          attention, but it never creates a grudge, probe, or physical reach
          from nothing.
        </p>
      </section>

      {heat.length > 0 && (
        <section aria-label="Heat">
          <span className="panel-label">HEAT</span>
          <ul className="underground-feed">
            {heat.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))}
                </span>
                <span>
                  {entry.kind === "unmasking"
                    ? `${String(entry.actorHandle ?? "unknown")} tried to unmask you — the scene will not forget it`
                    : `${String(entry.actorHandle ?? "unknown")} is dragging your name through the scene`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Attention">
        <span className="panel-label">ATTENTION</span>
        {signals.length === 0 &&
        tells.length === 0 &&
        physicalSignals.length === 0 ? (
          <p className="underground-empty">
            Nothing unusual in the logs. Nobody has asked about you yet.
          </p>
        ) : (
          <ul className="underground-feed">
            {signals.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))}
                  {` // ${caseStage(String(entry.investigationId ?? ""))}`}
                </span>
                <span>
                  {describeInvestigationSignalCopy(
                    id,
                    String(entry.kind ?? ""),
                    String(entry.targetHandle ?? "unknown"),
                  )}
                </span>
              </li>
            ))}
            {tells.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))}
                </span>
                <span>
                  {describeProbeTellCopy(
                    id,
                    String(entry.artifactKind ?? ""),
                  )}
                </span>
              </li>
            ))}
            {physicalSignals.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))} {"// OUTSIDE"}
                </span>
                <span>
                  {describePhysicalSignalCopy(
                    id,
                    String(entry.kind ?? ""),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {(signals.length > 0 ||
          tells.length > 0 ||
          physicalSignals.length > 0) && (
          <p className="analysis-caveat">
            Each line is a thing you noticed, not a verdict. None of them says
            how close anyone is — lay low, change relays, or move, and see
            whether the list stops growing.
          </p>
        )}
      </section>

      {compromises.length > 0 && (
        <section aria-label="Compromise">
          <span className="panel-label">COMPROMISE</span>
          <ul className="underground-feed">
            {compromises.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))}
                </span>
                <span>{String(entry.label ?? entry.kind ?? "COMPROMISED")}</span>
              </li>
            ))}
          </ul>
          <p className="analysis-caveat">
            This is a condition, not an ending. The system still answers; what
            you can recover from here belongs to the run, not this warning.
          </p>

          {postmortems.map(([id, entry]) => (
            <div key={`postmortem:${id}`}>
              <span className="panel-label">
                POSTMORTEM {"//"}{" "}
                {String(entry.compromiseLabel ?? "COMPROMISE")} {"//"}{" "}
                {entry.attribution === "complete"
                  ? "COMPLETE"
                  : "INCOMPLETE ATTRIBUTION"}
              </span>
              <ul className="underground-feed">
                {postmortemStepsFor(id).map(([stepId, step]) => (
                  <li key={stepId}>
                    <span className="underground-time">
                      {formatWorldTime(Number(step.worldMinute ?? 0))}
                    </span>
                    <span>{String(step.text ?? "")}</span>
                  </li>
                ))}
              </ul>
              <p className="analysis-caveat">{String(entry.note ?? "")}</p>
            </div>
          ))}
        </section>
      )}

      <section aria-label="Exit plan">
        <span className="panel-label">EXIT PLAN</span>
        {exitStatus === "idle" ? (
          <>
            <p className="underground-empty">
              No exit is being prepared. Planning one does not end the run.
            </p>
            <button
              type="button"
              onClick={() => runtime.execute(retirementActionFromGui("plan"))}
            >
              PLAN EXIT
            </button>
          </>
        ) : (
          <>
            <p>
              Status: <strong>{exitStatus.toUpperCase()}</strong>
              {retirement.readyWorldMinute
                ? ` // ${formatWorldTime(Number(retirement.readyWorldMinute))}`
                : ""}
            </p>
            {exitStatus === "planning" && (
              <>
                {exitBlockers.length === 0 ? (
                  <p className="analysis-caveat">
                    Obligations, active work, running software, and the lease are
                    wound down. COMMIT spends one hour in-world, then the handle
                    must stay quiet for two days while the world keeps moving.
                  </p>
                ) : (
                  <ul className="underground-feed">
                    {exitBlockers.map((blocker) => (
                      <li key={blocker}>
                        <span>{blocker.replaceAll("-", " ")}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  disabled={exitBlockers.length > 0}
                  onClick={() =>
                    runtime.execute(retirementActionFromGui("commit"))
                  }
                >
                  COMMIT EXIT
                </button>
              </>
            )}
            {exitStatus === "cooling" && (
              <p className="analysis-caveat">
                The exit is committed. Only waiting, reading messages, or
                cancelling the plan is allowed while the handle cools.
              </p>
            )}
            {exitStatus === "ready" && (
              <>
                <p className="analysis-caveat">
                  Cooling is complete. The handle is ready to close; its final
                  disposition will reflect the history that brought you here.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    runtime.execute(retirementActionFromGui("finish"))
                  }
                >
                  CLOSE HANDLE
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => runtime.execute(retirementActionFromGui("cancel"))}
            >
              CANCEL EXIT
            </button>
          </>
        )}
      </section>

      <section aria-label="Contracts">
        <span className="panel-label">CONTRACTS</span>
        {contracts.length === 0 ? (
          <p className="underground-empty">No work on offer.</p>
        ) : (
          <ul className="underground-contracts">
            {contracts.map(([id, entry]) => {
              const status = String(entry.status ?? "");
              const verbs: ContractVerb[] =
                status === "offered"
                  ? ["accept", "decline"]
                  : status === "accepted"
                    ? ["deliver"]
                    : [];

              return (
                <li
                  key={id}
                  className={verbs.length > 0 ? "is-open" : undefined}
                >
                  <div>
                    <span className="underground-time">
                      {id} · {String(entry.issuerHandle ?? "unknown")} ·{" "}
                      {status.toUpperCase()}
                    </span>
                    <span>
                      {describeContract(
                        String(entry.objective ?? ""),
                        String(entry.targetHandle ?? "unknown"),
                        entry.requiredServices === undefined
                          ? undefined
                          : Number(entry.requiredServices),
                        entry.requiredMachines === undefined
                          ? undefined
                          : Number(entry.requiredMachines),
                      )}
                    </span>
                    <span className="underground-time">
                      {status === "accepted"
                        ? `due ${formatWorldTime(Number(entry.dueWorldMinute ?? 0))}`
                        : status === "offered"
                          ? `offer open until ${formatWorldTime(Number(entry.expiresWorldMinute ?? 0))}`
                          : ""}
                    </span>
                  </div>
                  {verbs.length > 0 && (
                    <div className="underground-contract-actions">
                      {verbs.map((verb) => (
                        <button
                          key={verb}
                          type="button"
                          onClick={() =>
                            runtime.execute(contractActionFromGui(verb, id))
                          }
                        >
                          {verb.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Messages">
        <span className="panel-label">
          MESSAGES{unread > 0 ? ` // ${unread} UNREAD` : ""}
        </span>
        {messages.length === 0 ? (
          <p className="underground-empty">No messages.</p>
        ) : (
          <ul className="underground-messages">
            {messages.map(([id, entry]) => (
              <li key={id} className={entry.read ? undefined : "is-unread"}>
                <div>
                  <span className="underground-time">
                    {formatWorldTime(Number(entry.worldMinute ?? 0))} ·{" "}
                    {String(entry.fromHandle ?? "unknown")} · {id}
                  </span>
                  <span>
                    {describeIncidentCopy(
                      "message",
                      id,
                      String(entry.claimActorHandle ?? "unknown"),
                      String(entry.claimCounterpartHandle ?? "unknown"),
                      String(entry.claimOutcome ?? ""),
                    )}{" "}
                    (unverified)
                  </span>
                </div>
                {!entry.read && (
                  <button
                    type="button"
                    onClick={() => runtime.execute(readMessageFromGui(id))}
                  >
                    MARK READ
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Forum">
        <span className="panel-label">FORUM</span>
        {forumPosts.length === 0 ? (
          <p className="underground-empty">The board is quiet.</p>
        ) : (
          <ul className="underground-feed">
            {forumPosts.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))} ·{" "}
                  {String(entry.authorHandle ?? "unknown")}
                </span>
                <span>
                  {entry.subjectKind === "unmasking"
                    ? describeForumUnmaskingCopy(
                        id,
                        String(entry.unmaskerHandle ?? "someone"),
                      )
                    : entry.subjectKind === "contract"
                      ? describeForumContractCopy(
                          id,
                          String(entry.targetHandle ?? "unknown"),
                        )
                      : describeIncidentCopy(
                          "forum",
                          id,
                          String(entry.actorHandle ?? "unknown"),
                          String(entry.counterpartHandle ?? "unknown"),
                          String(entry.outcome ?? ""),
                        )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Public index">
        <span className="panel-label">PUBLIC INDEX</span>
        <ol className="underground-board">
          {handles.map(([id, entry]) => (
            <li
              key={id}
              className={entry.isPlayer ? "is-player" : undefined}
            >
              <span>{String(entry.handle ?? id)}</span>
              <span>#{Number(entry.rank ?? 0).toLocaleString("en-US")}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Public feed">
        <span className="panel-label">PUBLIC FEED</span>
        {incidents.length === 0 ? (
          <p className="underground-empty">Nothing public yet.</p>
        ) : (
          <ul className="underground-feed">
            {incidents.map(([id, entry]) => (
              <li key={id}>
                <span className="underground-time">
                  {formatWorldTime(Number(entry.worldMinute ?? 0))}
                </span>
                <span>
                  {describeIncidentCopy(
                    "feed",
                    id,
                    String(entry.actorHandle ?? "unknown"),
                    String(entry.counterpartHandle ?? "unknown"),
                    String(entry.outcome ?? ""),
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Standing toward you">
        <span className="panel-label">HOW THEY SEE YOU</span>
        {stanceEntries.length === 0 ? (
          <p className="underground-empty">No one you have observed has formed a view.</p>
        ) : (
          <ul className="underground-stances">
            {stanceEntries.map(([id, entry]) => (
              <li key={id}>
                <span>{String(entry.handle ?? id)}</span>
                <span className="underground-stance">
                  {String(entry.stance ?? "neutral").toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Peer assistants">
        <span className="panel-label">PEER ASSISTANTS // ECOSYSTEM AI</span>
        {assistants.length === 0 ? (
          <p className="underground-empty">No one in the scene is running an assistant.</p>
        ) : (
          <ul className="underground-assistants">
            {assistants.map(([id, entry]) => (
              <li key={id}>
                <span>{String(entry.handle ?? id)}</span>
                <span>
                  {String(entry.modelLabel ?? "")}
                  {entry.modelAuthor
                    ? ` — by ${String(entry.modelAuthor)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="underground-note">
          You see which peer runs which assistant, never what it earns them.
          Peers using AI is part of the scene, not a player-only superpower —
          and like yours, theirs is fallible, so the same model that helps a
          peer can also make their work slip into the public feed.
        </p>
      </section>
    </div>
  );
}

function MarketApp({ runtime }: { runtime: GameRuntime }) {
  const credits = Number(
    useCell("meta", "wallet", "credits", runtime.projection) ?? 0,
  );
  const dailyCost = Number(
    useCell("meta", "wallet", "dailyCost", runtime.projection) ?? 0,
  );
  const currentHousingId = String(
    useCell("meta", "wallet", "currentHousingId", runtime.projection) ?? "",
  );
  const rig = useRow("rig", "capability", runtime.projection);
  const actionMinutes = useRow("rig", "actionMinutes", runtime.projection);
  const scale = useRow("rig", "scale", runtime.projection);
  const lease = useRow("rig", "lease", runtime.projection);
  const softwareLift = useRow("rig", "softwareLift", runtime.projection);
  const playerToolLift = useRow("rig", "playerToolLift", runtime.projection);
  const machineLift = useRow("rig", "machineLift", runtime.projection);
  const assistant = useRow("rig", "assistant", runtime.projection);
  const hardwareTable = useTable("hardware", runtime.projection);
  const catalogTable = useTable("catalog", runtime.projection);
  const housingTable = useTable("housing", runtime.projection);
  const softwareTable = useTable("software", runtime.projection);
  const ownedToolsTable = useTable("ownedTools", runtime.projection);
  const toolListingsTable = useTable("toolListings", runtime.projection);
  const ownedMachinesTable = useTable("ownedMachines", runtime.projection);
  const machineListingsTable = useTable("machineListings", runtime.projection);
  const modelsTable = useTable("modelListings", runtime.projection);
  const forgeSpecsTable = useTable("forgeSpecs", runtime.projection);
  const buildQueueTable = useTable("buildQueue", runtime.projection);
  const ownedWorkflowsTable = useTable("ownedWorkflows", runtime.projection);
  const valueNodesTable = useTable("valueNodes", runtime.projection);
  const valueInflow = Number(
    useCell("meta", "wallet", "valueInflow", runtime.projection) ?? 0,
  );
  const valueOutflow = Number(
    useCell("meta", "wallet", "valueOutflow", runtime.projection) ?? 0,
  );
  const valueCounterparties = Number(
    useCell("meta", "wallet", "valueCounterparties", runtime.projection) ?? 0,
  );
  const ledgerTable = useTable("ledger", runtime.projection);

  const capability = [
    ["compute", rig.compute],
    ["memory", rig.memory],
    ["vram", rig.vram],
    ["storage", rig.storage],
    ["network", rig.network],
  ] as const;

  const liftRows = [
    [
      "compute",
      Number(lease.compute ?? 0) +
        Number(softwareLift.compute ?? 0) +
        Number(playerToolLift.compute ?? 0) +
        Number(machineLift.compute ?? 0),
    ],
    [
      "memory",
      Number(lease.memory ?? 0) +
        Number(softwareLift.memory ?? 0) +
        Number(playerToolLift.memory ?? 0) +
        Number(machineLift.memory ?? 0),
    ],
    [
      "vram",
      Number(lease.vram ?? 0) +
        Number(softwareLift.vram ?? 0) +
        Number(playerToolLift.vram ?? 0) +
        Number(machineLift.vram ?? 0),
    ],
    [
      "storage",
      Number(lease.storage ?? 0) +
        Number(softwareLift.storage ?? 0) +
        Number(playerToolLift.storage ?? 0) +
        Number(machineLift.storage ?? 0),
    ],
    [
      "network",
      Number(lease.network ?? 0) +
        Number(softwareLift.network ?? 0) +
        Number(playerToolLift.network ?? 0) +
        Number(machineLift.network ?? 0),
    ],
  ] as const;

  const ownedHardware = Object.entries(hardwareTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.acquiredWorldMinute ?? 0) - Number(b.acquiredWorldMinute ?? 0) ||
      idA.localeCompare(idB, undefined, { numeric: true }),
  );

  const catalog = Object.entries(catalogTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.cost ?? 0) - Number(b.cost ?? 0) || idA.localeCompare(idB),
  );

  const housing = Object.entries(housingTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.dailyCost ?? 0) - Number(b.dailyCost ?? 0) ||
      idA.localeCompare(idB),
  );

  const software = Object.entries(softwareTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.dailyCost ?? 0) - Number(b.dailyCost ?? 0) ||
      idA.localeCompare(idB),
  );

  const ownedTools = Object.entries(ownedToolsTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.acquiredWorldMinute ?? 0) -
        Number(b.acquiredWorldMinute ?? 0) ||
      idA.localeCompare(idB, undefined, { numeric: true }),
  );

  const toolListings = Object.entries(toolListingsTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.cost ?? 0) - Number(b.cost ?? 0) || idA.localeCompare(idB),
  );

  const ownedMachines = Object.entries(ownedMachinesTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.acquiredWorldMinute ?? 0) -
        Number(b.acquiredWorldMinute ?? 0) ||
      idA.localeCompare(idB, undefined, { numeric: true }),
  );

  const machineListings = Object.entries(machineListingsTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.cost ?? 0) - Number(b.cost ?? 0) || idA.localeCompare(idB),
  );

  const models = Object.entries(modelsTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.cost ?? 0) - Number(b.cost ?? 0) ||
      Number(a.dailyCost ?? 0) - Number(b.dailyCost ?? 0) ||
      idA.localeCompare(idB),
  );

  const forgeSpecs = Object.entries(forgeSpecsTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.estimatedMinutes ?? 0) - Number(b.estimatedMinutes ?? 0) ||
      idA.localeCompare(idB),
  );

  // The queue reads like a build log: soonest deadline first.
  const buildQueue = Object.entries(buildQueueTable).sort(
    ([idA, a], [idB, b]) =>
      Number(a.dueWorldMinute ?? 0) - Number(b.dueWorldMinute ?? 0) ||
      idA.localeCompare(idB, undefined, { numeric: true }),
  );

  const ownedWorkflows = Object.entries(ownedWorkflowsTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.acquiredWorldMinute ?? 0) - Number(a.acquiredWorldMinute ?? 0) ||
      idA.localeCompare(idB, undefined, { numeric: true }),
  );

  const assistantRunning = String(assistant.modelId ?? "").length > 0;

  const ledger = Object.entries(ledgerTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );

  // Re-apply the graph's volume ordering here so the panel is stable even
  // though TinyBase table keys carry no guaranteed order across re-syncs.
  const valueNodes = Object.entries(valueNodesTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.paid ?? 0) +
        Number(b.received ?? 0) -
        (Number(a.paid ?? 0) + Number(a.received ?? 0)) ||
      idA.localeCompare(idB),
  );

  return (
    <div className="market-app">
      <section aria-label="Wallet">
        <span className="panel-label">WALLET</span>
        <div className="market-wallet">
          <strong>{credits.toLocaleString("en-US")} cr</strong>
          <span>
            {dailyCost > 0
              ? `${dailyCost.toLocaleString("en-US")} cr upkeep per world day.`
              : "Credits never go negative."}{" "}
            Hardware raises capability, never a gate.
          </span>
        </div>
      </section>

      <section aria-label="Rig capability">
        <span className="panel-label">RIG CAPABILITY</span>
        <ul className="market-capability">
          {capability.map(([label, value]) => (
            <li key={label}>
              <span>{label.toUpperCase()}</span>
              <strong>{Number(value ?? 0)}</strong>
            </li>
          ))}
        </ul>
        {liftRows.some(([, value]) => Number(value ?? 0) > 0) && (
          <p className="market-hint">
            Includes lease + software + tool + machine lift:{" "}
            {liftRows
              .filter(([, value]) => Number(value ?? 0) > 0)
              .map(([label, value]) => `${label} +${Number(value ?? 0)}`)
              .join(" · ")}
            .
          </p>
        )}
      </section>

      <section aria-label="Rig speed">
        <span className="panel-label">RIG SPEED // EST. MINUTES PER ACTION</span>
        <ul className="market-speed">
          {RECON_ACTION_LABELS.map(([action, label]) => (
            <li key={action}>
              <span>{label}</span>
              <strong>{Number(actionMinutes[action] ?? 0)}m</strong>
            </li>
          ))}
        </ul>
        <p className="market-hint">
          Better hardware works faster. It never unlocks or blocks a target —
          capability is speed and scale, not a level gate.
          {Number(assistant.factor ?? 1) < 1 && (
            <> An assistant is running: every accelerated action costs{" "}
            <strong>×{Number(assistant.factor ?? 1)}</strong> its hardware
            minutes.</>
          )}
        </p>
      </section>

      <section aria-label="Rig scale">
        <span className="panel-label">RIG SCALE // ITEMS PER PASS</span>
        <ul className="market-speed">
          <li>
            <span>SURVEY + INSPECT</span>
            <strong>×{Number(scale.discoveryScope ?? 1)}</strong>
          </li>
        </ul>
        <p className="market-hint">
          Memory decides how many machines or services one pass covers. A modest
          rig still discovers everything — it just needs more passes.
        </p>
      </section>

      <section aria-label="Owned hardware">
        <span className="panel-label">OWNED HARDWARE</span>
        {ownedHardware.length === 0 ? (
          <p className="market-empty">No hardware installed.</p>
        ) : (
          <ul className="market-hardware">
            {ownedHardware.map(([id, entry]) => (
              <li key={id}>
                <span>{String(entry.label ?? entry.catalogId ?? id)}</span>
                <span className="market-time">
                  {String(entry.category ?? "")} ·{" "}
                  {formatWorldTime(Number(entry.acquiredWorldMinute ?? 0))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Catalog">
        <span className="panel-label">MARKET CATALOG</span>
        {catalog.length === 0 ? (
          <p className="market-empty">Nothing listed.</p>
        ) : (
          <ul className="market-catalog">
            {catalog.map(([id, entry]) => {
              const cost = Number(entry.cost ?? 0);
              const owned = Number(entry.owned ?? 0);
              const affordable = credits >= cost;
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);

              return (
                <li key={id} className={owned > 0 ? "is-owned" : undefined}>
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? id)}
                    </span>
                    <span>
                      {stats.length === 0
                        ? "baseline platform"
                        : stats
                            .map(
                              ([label, value]) =>
                                `${label} +${Number(value ?? 0)}`,
                            )
                            .join(" · ")}
                    </span>
                    <span className="market-time">
                      {cost === 0 ? "included" : `${cost.toLocaleString("en-US")} cr`}
                      {owned > 0 ? ` · owned ×${owned}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!affordable}
                    title={
                      affordable
                        ? "Acquire this hardware"
                        : "Not enough credits"
                    }
                    onClick={() => runtime.execute(buyHardwareFromGui(id))}
                  >
                    BUY
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Housing market">
        <span className="panel-label">HOUSING // RECURRING</span>
        {housing.length === 0 ? (
          <p className="market-empty">No locations listed.</p>
        ) : (
          <ul className="market-catalog">
            {housing.map(([id, entry]) => {
              const cost = Number(entry.dailyCost ?? 0);
              const active = entry.active === true;
              // Phase 6 P0: distance is part of the price of a dwelling, so it is
              // shown with the rent. Names for kind/anonymity, never numbers.
              const travel = Number(entry.travelMinutes ?? 0);
              const anonymity = String(entry.anonymity ?? "public");
              const kind = String(entry.kind ?? "residential");
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);

              return (
                <li key={id} className={active ? "is-owned" : undefined}>
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? id)}
                    </span>
                    <span>
                      {stats.length === 0
                        ? "no capability lift"
                        : stats
                            .map(
                              ([label, value]) =>
                                `${label} +${Number(value ?? 0)}`,
                            )
                            .join(" · ")}
                      {` · ${kind} · ${anonymity}`}
                    </span>
                    <span className="market-time">
                      {cost.toLocaleString("en-US")} cr / day
                      {active
                        ? " · active lease"
                        : travel > 0
                          ? ` · ${travel} min travel from here`
                          : " · same district"}
                    </span>
                  </div>
                  {active ? (
                    <button
                      type="button"
                      title={
                        travel > 0
                          ? `Move out and return to the free baseline (${travel} min back)`
                          : "Move out and return to the free baseline"
                      }
                      onClick={() => runtime.execute(breakLeaseFromGui())}
                    >
                      MOVE OUT
                    </button>
                  ) : (
                    <button
                      type="button"
                      title={
                        travel > 0
                          ? `Sign this lease and spend ${travel} min travelling there`
                          : currentHousingId
                            ? "Switch to this lease (same district, no travel)"
                            : "Sign this lease"
                      }
                      onClick={() => runtime.execute(rentHousingFromGui(id))}
                    >
                      {travel > 0 ? "TRAVEL & SIGN" : "MOVE IN"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="market-hint">
          A lease adds capability while you keep paying its daily upkeep — it
          never unlocks or blocks a target. Signing, switching, and moving out
          move no credits, and rent is only levied at each world-day boundary;
          miss a payment and you simply return to the free baseline. No debt, no
          gate. Dwellings marked <em>safehouse</em> contribute no capability at
          all: what they sell is distance, and distance is paid in world time,
          which is also exposure. Moving out of one pays the trip back.
        </p>
      </section>

      <section aria-label="Software market">
        <span className="panel-label">SOFTWARE // RECURRING</span>
        {software.length === 0 ? (
          <p className="market-empty">No tools listed.</p>
        ) : (
          <ul className="market-catalog">
            {software.map(([id, entry]) => {
              const cost = Number(entry.dailyCost ?? 0);
              const active = entry.active === true;
              const factor = Number(entry.discountFactor ?? 1);
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);

              return (
                <li key={id} className={active ? "is-owned" : undefined}>
                  <div>
                    <span className="panel-label">{String(entry.label ?? id)}</span>
                    <span>
                      {factor < 1
                        ? `×${factor} action time`
                        : stats.length === 0
                          ? "no capability lift"
                          : stats
                              .map(
                                ([label, value]) =>
                                  `${label} +${Number(value ?? 0)}`,
                              )
                              .join(" · ")}
                    </span>
                    <span className="market-time">
                      {cost.toLocaleString("en-US")} cr / day
                      {active ? " · running" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    title={
                      active
                        ? "Stop this license (fee stops with it)"
                        : "Run this license (fee starts at the next day)"
                    }
                    onClick={() =>
                      runtime.execute(
                        active
                          ? disableSoftwareFromGui(id)
                          : enableSoftwareFromGui(id),
                      )
                    }
                  >
                    {active ? "STOP" : "RUN"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="market-hint">
          Premium tools make the same rig more productive — wider passes, faster
          work — for a daily license fee. Running, swapping, or stopping a tool
          costs nothing; only each world-day boundary bills. A fee you cannot
          pay just lapses that one license. Tools never unlock or block a
          target. No debt, no gate.
        </p>
      </section>

      <section aria-label="Player tools">
        <span className="panel-label">PLAYER TOOLS // ONE-TIME</span>
        {ownedTools.length === 0 && toolListings.length === 0 ? (
          <p className="market-empty">Nothing authored is on offer.</p>
        ) : (
          <ul className="market-catalog">
            {ownedTools.map(([id, entry]) => {
              const factor = Number(entry.discountFactor ?? 1);
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);
              const resale = Number(entry.resaleValue ?? 0);

              return (
                <li key={id} className="is-owned">
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? entry.catalogId ?? id)}
                    </span>
                    <span>
                      {factor < 1
                        ? `×${factor} action time`
                        : stats.length === 0
                          ? "no capability lift"
                          : stats
                              .map(
                                ([label, value]) =>
                                  `${label} +${Number(value ?? 0)}`,
                              )
                              .join(" · ")}
                    </span>
                    <span className="market-time">
                      by {String(entry.author ?? "unknown")} · paid{" "}
                      {Number(entry.paidCost ?? 0).toLocaleString("en-US")} cr ·
                      sells {resale.toLocaleString("en-US")} cr ·{" "}
                      {formatWorldTime(
                        Number(entry.acquiredWorldMinute ?? 0),
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    title="Resell this copy to the fence (no upkeep is lost)"
                    onClick={() => runtime.execute(sellPlayerToolFromGui(id))}
                  >
                    SELL
                  </button>
                </li>
              );
            })}
            {toolListings.map(([id, entry]) => {
              const cost = Number(entry.cost ?? 0);
              const affordable = credits >= cost;
              const factor = Number(entry.discountFactor ?? 1);
              const owned = Number(entry.ownedCount ?? 0);
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);

              return (
                <li key={`listing-${id}`} className={owned > 0 ? "is-owned" : undefined}>
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? id)}
                    </span>
                    <span>
                      {factor < 1
                        ? `×${factor} action time`
                        : stats.length === 0
                          ? "no capability lift"
                          : stats
                              .map(
                                ([label, value]) =>
                                  `${label} +${Number(value ?? 0)}`,
                              )
                              .join(" · ")}
                    </span>
                    <span className="market-time">
                      by {String(entry.author ?? "unknown")} ·{" "}
                      {cost.toLocaleString("en-US")} cr one-time
                      {owned > 0 ? ` · owned ×${owned}` : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!affordable}
                    title={
                      affordable
                        ? "Buy this authored copy (one-time, no upkeep)"
                        : "Not enough credits"
                    }
                    onClick={() => runtime.execute(buyPlayerToolFromGui(id))}
                  >
                    BUY
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="market-hint">
          Authored tools are property, not rent: pay once, keep the lift with no
          daily fee, and resell to the fence for half the price you paid. Each
          copy carries its author&apos;s handle, so every trade is a named edge in
          the scene&apos;s value graph. Like every other layer, tools are a lift —
          never a gate.
        </p>
      </section>

      <section aria-label="Machines">
        <span className="panel-label">MACHINES // NAMED BOXES</span>
        {ownedMachines.length === 0 && machineListings.length === 0 ? (
          <p className="market-empty">No machines on offer.</p>
        ) : (
          <ul className="market-catalog">
            {ownedMachines.map(([id, entry]) => {
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);
              const resale = Number(entry.resaleValue ?? 0);

              return (
                <li key={id} className="is-owned">
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? id)}
                    </span>
                    <span>
                      {stats.length === 0
                        ? "no capability lift"
                        : stats
                            .map(
                              ([label, value]) =>
                                `${label} +${Number(value ?? 0)}`,
                            )
                            .join(" · ")}
                    </span>
                    <span className="market-time">
                      {String(entry.catalogId ?? "")} · paid{" "}
                      {Number(entry.paidCost ?? 0).toLocaleString("en-US")} cr ·
                      sells {resale.toLocaleString("en-US")} cr ·{" "}
                      {formatWorldTime(
                        Number(entry.acquiredWorldMinute ?? 0),
                      )}
                    </span>
                    <MachineRenameRow
                      machineId={id}
                      currentLabel={String(entry.label ?? id)}
                      onRename={(label) =>
                        runtime.execute(renameMachineFromGui(id, label))
                      }
                    />
                  </div>
                  <button
                    type="button"
                    title="Resell this machine to the fence (no upkeep is lost)"
                    onClick={() => runtime.execute(sellMachineFromGui(id))}
                  >
                    SELL
                  </button>
                </li>
              );
            })}
            {machineListings.map(([id, entry]) => {
              const cost = Number(entry.cost ?? 0);
              const affordable = credits >= cost;
              const owned = Number(entry.ownedCount ?? 0);
              const exotic = entry.exotic === true;
              const stats = [
                ["cpu", entry.compute],
                ["mem", entry.memory],
                ["vrm", entry.vram],
                ["sto", entry.storage],
                ["net", entry.network],
              ].filter(([, value]) => Number(value ?? 0) > 0);

              return (
                <li
                  key={`listing-${id}`}
                  className={owned > 0 ? "is-owned" : undefined}
                >
                  <div>
                    <span className="panel-label">
                      {exotic ? "EXOTIC // " : ""}
                      {String(entry.label ?? id)}
                    </span>
                    <span>
                      {stats.length === 0
                        ? "no capability lift"
                        : stats
                            .map(
                              ([label, value]) =>
                                `${label} +${Number(value ?? 0)}`,
                            )
                            .join(" · ")}
                    </span>
                    <span className="market-time">
                      {cost.toLocaleString("en-US")} cr one-time
                      {owned > 0 ? ` · owned ×${owned}` : ""}
                      {exotic ? " · one-shot off-market stock" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!affordable}
                    title={
                      affordable
                        ? "Buy this machine (one-time, no upkeep)"
                        : "Not enough credits"
                    }
                    onClick={() => runtime.execute(buyMachineFromGui(id))}
                  >
                    BUY
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="market-hint">
          A machine is a whole named box. Standard stock can be bought in
          multiples; rare off-market stock appears only when this run has earned
          it and can be claimed once. Every box still folds into the same rig
          capability profile — exotic hardware adds no new attack verb, success
          roll, or target gate.
        </p>
      </section>

      <section aria-label="AI models">
        <span className="panel-label">AI MODELS // ASSISTANTS</span>
        <ul className="market-catalog">
          {models.map(([id, entry]) => {
            const cost = Number(entry.cost ?? 0);
            const perDay = Number(entry.dailyCost ?? 0);
            const owned = Boolean(entry.owned ?? false);
            const running = Boolean(entry.running ?? false);
            const cloud = String(entry.source ?? "cloud") === "cloud";
            const factor = Number(entry.factor ?? 1);
            const delivered = Number(entry.deliveredFactor ?? factor);
            // Contention pulls a local model's delivered shortcut toward ×1;
            // "starved" means the rig covers less than the model asked for.
            const starved = !cloud && delivered > factor;

            return (
              <li key={id} className={running ? "is-owned" : undefined}>
                <div>
                  <span className="panel-label">
                    {String(entry.label ?? id)}
                  </span>
                  <span>
                    analysis ×{factor} action minutes
                    {starved && (
                      <>
                        {" — this rig delivers "}
                        <strong>×{delivered}</strong>
                      </>
                    )}
                  </span>
                  {!cloud && (
                    <span className="market-time">
                      rig load {Number(entry.vram ?? 0)} vram /{" "}
                      {Number(entry.storage ?? 0)} storage · your rig{" "}
                      {Number(rig.vram ?? 0)} / {Number(rig.storage ?? 0)}
                    </span>
                  )}
                  {entry.author && (
                    // Phase 5 P4 marketplace provenance: an in-fiction peer
                    // authored this copy and collects for it — like a P5 tool.
                    <span className="market-time">
                      by {String(entry.author)} · paid to them directly
                    </span>
                  )}
                  <span className="market-time">
                    {cloud
                      ? `${perDay.toLocaleString("en-US")} cr / day while running`
                      : `${cost.toLocaleString("en-US")} cr one-time · runs free`}
                    {owned ? " · owned" : ""}
                    {running ? " · running" : ""}
                  </span>
                </div>
                {running ? (
                  <button
                    type="button"
                    onClick={() => runtime.execute(stopModelFromGui())}
                    title="Stop this assistant (its shortcut ends)"
                  >
                    STOP
                  </button>
                ) : owned || cloud ? (
                  <button
                    type="button"
                    onClick={() => runtime.execute(runModelFromGui(id))}
                    title={
                      cloud
                        ? "Start renting this cloud model (bills daily while it runs)"
                        : starved
                          ? "Run this owned model — your rig under-provisions it, so it helps less"
                          : "Run this owned model (costs nothing)"
                    }
                  >
                    RUN
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={credits < cost}
                    title={
                      credits >= cost
                        ? "Buy this local model (one-time, runs free)"
                        : "Not enough credits"
                    }
                    onClick={() => runtime.execute(acquireModelFromGui(id))}
                  >
                    BUY
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="market-hint">
          A model is an assistant, not an autopilot: while one runs it shortens
          the minutes accelerated actions cost, composed with your licenses and
          tools under the same one-minute floor. Cloud models rent — starting or
          stopping moves nothing, the fee lands at each crossed day and an
          unpayable one simply stops the model; they run on the provider&apos;s
          hardware, so your rig never contends with them. Local models are
          property — one purchase, then running them is free forever — but they
          occupy your VRAM and storage: a rig that covers the footprint gets the
          full shortcut, one that under-provisions it gets less, never worse
          than running nothing at all. Buy GPUs and storage to feed a local
          model, or rent the speed from the cloud instead. No model at all is
          the baseline, and an assistant never unlocks or blocks a target.
        </p>
      </section>

      <section aria-label="Software forge">
        <span className="panel-label">SOFTWARE FORGE // SPECS</span>
        {forgeSpecs.length === 0 ? (
          <p className="market-empty">The forge shelves are empty.</p>
        ) : (
          <ul className="market-catalog forge-specs">
            {forgeSpecs.map(([id, entry]) => {
              const minutes = Number(entry.estimatedMinutes ?? 0);

              return (
                <li key={id}>
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? id)}
                    </span>
                    <span className="forge-steps">
                      {String(entry.steps ?? "").split("\n").map((step) => (
                        <span key={step} className="forge-step">
                          {step}
                        </span>
                      ))}
                    </span>
                    <span className="market-time">
                      replaces {String(entry.replacesLabel ?? "")} · about{" "}
                      {minutes.toLocaleString("en-US")} min on this rig · load{" "}
                      {Number(entry.vram ?? 0)} vram /{" "}
                      {Number(entry.storage ?? 0)} storage
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={!assistantRunning}
                    title={
                      assistantRunning
                        ? "Commission the running assistant to build this (pays in time, not credits)"
                        : "Run a model first — the forge needs an assistant"
                    }
                    onClick={() => runtime.execute(startBuildFromGui(id))}
                  >
                    BUILD
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <span className="panel-label">BUILD QUEUE</span>
        {buildQueue.length === 0 ? (
          <p className="market-empty">
            No builds in flight — the rig is not writing anything.
          </p>
        ) : (
          <ul className="market-catalog forge-queue">
            {buildQueue.map(([id, entry]) => (
              <li key={id}>
                <div>
                  <span className="panel-label">{String(entry.specLabel ?? id)}</span>
                  <span>
                    {String(entry.modelLabel ?? "")} · occupies{" "}
                    {Number(entry.vram ?? 0)} vram /{" "}
                    {Number(entry.storage ?? 0)} storage
                  </span>
                  <span className="market-time">
                    started {formatWorldTime(Number(entry.startedWorldMinute ?? 0))} ·{" "}
                    {entry.paused === true
                      ? "PAUSED // work clock stopped"
                      : `due ${formatWorldTime(Number(entry.dueWorldMinute ?? 0))}`}
                  </span>
                </div>
                <button
                  type="button"
                  title="Abort this build — the queue slot frees, nothing is charged"
                  onClick={() => runtime.execute(abortBuildFromGui(id))}
                >
                  ABORT
                </button>
              </li>
            ))}
          </ul>
        )}
        <span className="panel-label">SELF-AUTHORED</span>
        {ownedWorkflows.length === 0 ? (
          <p className="market-empty">
            Nothing built yet — a finished workflow is yours permanently, with no
            recurring fee.
          </p>
        ) : (
          <ul className="market-catalog forge-owned">
            {ownedWorkflows.map(([id, entry]) => {
              const outcome = String(entry.outcome ?? "");

              return (
                <li key={id}>
                  <div>
                    <span className="panel-label">
                      {String(entry.label ?? id)}
                      <span className={`workflow-outcome-${outcome}`}>
                        {outcome}
                      </span>
                    </span>
                    <span className="forge-tests">
                      {String(entry.tests ?? "").split("\n").filter(Boolean).map((test) => (
                        <span key={test} className="forge-test">
                          {test}
                        </span>
                      ))}
                    </span>
                    <span className="market-time">
                      built by {String(entry.builtWithLabel ?? "")} · delivered{" "}
                      {formatWorldTime(Number(entry.acquiredWorldMinute ?? 0))}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="market-hint">
          The forge is where you stop renting: hand the running assistant a spec
          — a safe workflow/IR, plan only, never executable code — and it writes
          the program over world time. Building costs no credits; you pay in
          minutes and rig occupancy instead. Each build occupies VRAM and
          storage while it runs, competing with a local assistant for the same
          pool, so a queue taxes both the next build&apos;s estimate and the
          model&apos;s delivered shortcut. The finished workflow is yours
          forever, contributes through the same capability language as the
          license it replaces, and — because the assistant can be wrong — may
          arrive clean, with warnings, or defective. A defective copy still
          works, just for less; software is a lift, never a trap.
        </p>
      </section>

      <section aria-label="Value graph">
        <span className="panel-label">
          VALUE GRAPH // {valueCounterparties} COUNTERPART
          {valueCounterparties === 1 ? "" : "IES"}
        </span>
        {valueNodes.length === 0 ? (
          <p className="market-empty">
            No value has moved yet — every wallet tells a story once it starts.
          </p>
        ) : (
          <ul className="market-value-graph">
            {valueNodes.map(([id, entry]) => {
              const received = Number(entry.received ?? 0);
              const paid = Number(entry.paid ?? 0);
              const net = Number(entry.net ?? 0);
              const volume = Math.max(received, paid, 1);
              const kind = String(entry.kind ?? "peer");
              const causes = String(entry.causeKinds ?? "")
                .split(",")
                .filter(Boolean);

              return (
                <li key={id} className={`value-node value-node-${kind}`}>
                  <div>
                    <span className="panel-label">
                      {id}
                      <span className="value-node-tag">
                        {kind === "institution" ? " role" : " peer"}
                      </span>
                    </span>
                    <span>
                      {causes.length > 0 ? causes.join(" · ") : "—"}
                    </span>
                    <span className="market-time">
                      {Number(entry.interactions ?? 0)}× · first{" "}
                      {formatWorldTime(
                        Number(entry.firstWorldMinute ?? 0),
                      )}{" "}
                      · last{" "}
                      {formatWorldTime(Number(entry.lastWorldMinute ?? 0))}
                    </span>
                  </div>
                  <div className="value-node-bars">
                    <span className="value-node-bar value-node-in">
                      <span style={{ width: `${(received / volume) * 100}%` }} />
                      +{received.toLocaleString("en-US")}
                    </span>
                    <span className="value-node-bar value-node-out">
                      <span style={{ width: `${(paid / volume) * 100}%` }} />
                      −{paid.toLocaleString("en-US")}
                    </span>
                    <span className="value-node-net">
                      net {net >= 0 ? "+" : "−"}
                      {Math.abs(net).toLocaleString("en-US")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="market-hint">
          Money is a graph, not a bar: this is the ledger aggregated by who
          actually got paid. <strong>In</strong> is value they gave you,
          <strong> out</strong> is value you gave them; <strong>net</strong> is
          your standing with each. Institutions (market, landlord, vendor,
          fence) are roles — every other name is a scene handle.
        </p>
        <p className="market-hint">
          Lifetime totals: in +{valueInflow.toLocaleString("en-US")} · out −
          {valueOutflow.toLocaleString("en-US")} · net{" "}
          {valueInflow - valueOutflow >= 0 ? "+" : "−"}
          {Math.abs(valueInflow - valueOutflow).toLocaleString("en-US")} cr.
        </p>
      </section>

      <section aria-label="Ledger">
        <span className="panel-label">VALUE LEDGER</span>
        {ledger.length === 0 ? (
          <p className="market-empty">No value has moved yet.</p>
        ) : (
          <ul className="market-ledger">
            {ledger.map(([id, entry]) => (
              <li key={id}>
                <span
                  className={
                    entry.direction === "credit"
                      ? "market-credit"
                      : "market-debit"
                  }
                >
                  {entry.direction === "credit" ? "+" : "−"}
                  {Number(entry.amount ?? 0).toLocaleString("en-US")}
                </span>
                <span>
                  {String(entry.causeKind ?? "")} ·{" "}
                  {String(entry.counterparty ?? "")}
                </span>
                <span className="market-time">
                  bal {Number(entry.balanceAfter ?? 0).toLocaleString("en-US")} ·{" "}
                  {formatWorldTime(Number(entry.worldMinute ?? 0))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
