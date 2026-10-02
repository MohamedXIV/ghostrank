"use client";

import { FormEvent, useState } from "react";
import { useCell, useRow, useRowIds, useTable } from "tinybase/ui-react";

import { formatWorldTime } from "@/game/computer/format-world-time";
import { observeTargetFromGui } from "@/game/computer/apps/target-actions";
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
    "commands: observe <target-id> | wait <minutes> | help",
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
        "observe <target-id>  inspect a known lead through the simulation",
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

function describeCommandResult(type: "observeTarget" | "advanceTime") {
  switch (type) {
    case "observeTarget":
      return "observation complete // projection updated";
    case "advanceTime":
      return "world clock advanced";
  }
}

function ReconApp({ runtime }: { runtime: GameRuntime }) {
  const [targetId, setTargetId] = useState("nightshade");
  const targetIds = useRowIds("targets", runtime.projection);
  const machineIds = useRowIds("machines", runtime.projection);

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
        <strong>OBSERVED</strong>
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
  const services = useTable("services", runtime.projection);
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
        <span className="machine-role">{String(machine.role ?? "unknown")}</span>
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
