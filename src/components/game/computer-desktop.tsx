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
import {
  contractActionFromGui,
  type ContractVerb,
} from "@/game/computer/apps/contract-actions";
import { readMessageFromGui } from "@/game/computer/apps/message-actions";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import type { SimulationCommand } from "@/game/simulation/commands/types";
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
  underground: "UNDERGROUND INDEX",
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
          <button type="button" onClick={() => openWindow("underground")}>
            <span className="launcher-glyph">◈</span>
            Index
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

function describeIncident(
  actorHandle: string,
  counterpartHandle: string,
  outcome: string,
): string {
  return outcome === "succeeded"
    ? `${actorHandle} got through ${counterpartHandle}'s defenses`
    : `${counterpartHandle} turned ${actorHandle} away`;
}

function describeContract(
  objective: string,
  targetHandle: string,
  requiredServices: number | undefined,
): string {
  if (objective === "recon-report") {
    const count = requiredServices ?? 1;
    return `report ${count} service${count === 1 ? "" : "s"} you have observed on ${targetHandle}`;
  }

  return `get through ${targetHandle}'s defenses`;
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
                    heard that{" "}
                    {describeIncident(
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
                    ? `unmasking is a line nobody crosses — ${String(entry.unmaskerHandle ?? "someone")} did`
                    : entry.subjectKind === "contract"
                      ? `vouching for CobaltXZ on the ${String(entry.targetHandle ?? "")} job`
                      : describeIncident(
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
                  {describeIncident(
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
    </div>
  );
}
