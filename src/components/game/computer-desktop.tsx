"use client";

import { FormEvent, useState } from "react";
import { useCell, useRow, useRowIds, useTable } from "tinybase/ui-react";

import { formatWorldTime } from "@/game/computer/format-world-time";
import {
  disengageOperationFromGui,
  escalateOperationFromGui,
  inspectMachineFromGui,
  observeTargetFromGui,
  openOperationFromGui,
  surveyTargetFromGui,
} from "@/game/computer/apps/target-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import {
  type ComputerWindowId,
  useUiStore,
} from "@/stores/ui/use-ui-store";

interface ComputerDesktopProps {
  runtime: GameRuntime;
  onReturnToRoom: () => void;
}

const WINDOW_LABELS: Record<ComputerWindowId, string> = {
  terminal: "TERM_01",
  recon: "RECON INDEX",
};

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
          <span>{formatWorldTime(worldMinute)}</span>
        </div>
        <button className="os-room-button" type="button" onClick={onReturnToRoom}>
          ROOM
        </button>
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
          <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
            ×
          </button>
        </div>
      </header>
      <div className="window-content">{children}</div>
    </section>
  );
}

function TerminalApp({ runtime }: { runtime: GameRuntime }) {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<string[]>([
    "ghostsh 0.1 // virtual capability shell",
    "commands: observe <target-id> | op open <target-id> | survey <target-id> | inspect <machine-id> | op escalate | op exit | wait <minutes> | help",
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
        "survey <target-id>   discover one machine in the active operation (12m)",
        "inspect <machine-id> inspect one known machine in the active operation (8m)",
        "op escalate          cross the fictional recon boundary (5m)",
        "op exit              disengage from the active operation (3m)",
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

function describeCommandResult(
  type:
    | "observeTarget"
    | "openOperation"
    | "surveyTarget"
    | "inspectMachine"
    | "escalateOperation"
    | "disengageOperation"
    | "advanceTime",
) {
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
    case "advanceTime":
      return "world clock advanced";
  }
}

function ReconApp({ runtime }: { runtime: GameRuntime }) {
  const [targetId, setTargetId] = useState("nightshade");
  const targetIds = useRowIds("targets", runtime.projection);
  const machineIds = useRowIds("machines", runtime.projection);
  const reactionIds = useRowIds("reactions", runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const services = useTable("services", runtime.projection);
  const footprint = useRow("footprint", "current", runtime.projection);
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
        <span className="uncertain-badge">UNVERIFIED</span>
      </div>

      <div className="recon-command">
        <input
          aria-label="Target identifier"
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        />
        <button type="button" onClick={observe}>
          OBSERVE
        </button>
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
    </div>
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
