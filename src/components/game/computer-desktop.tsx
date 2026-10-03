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
import { buyHardwareFromGui } from "@/game/computer/apps/economy-actions";
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
  market: "MARKET // RIG",
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
          <button type="button" onClick={() => openWindow("market")}>
            <span className="launcher-glyph">⌸</span>
            Market
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
    "commands: observe <target-id> | op open <target-id> | survey <target-id> | inspect <machine-id> | op escalate | op exit | buy <catalog-id> | wait <minutes> | help",
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
        "survey <target-id>   discover one machine in the active operation (rig speed)",
        "inspect <machine-id> inspect one known machine in the active operation (rig speed)",
        "op escalate          cross the fictional recon boundary (rig speed)",
        "op exit              disengage from the active operation (3m)",
        "buy <catalog-id>     acquire hardware from the market (rig upgrades)",
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

function MarketApp({ runtime }: { runtime: GameRuntime }) {
  const credits = Number(
    useCell("meta", "wallet", "credits", runtime.projection) ?? 0,
  );
  const rig = useRow("rig", "capability", runtime.projection);
  const actionMinutes = useRow("rig", "actionMinutes", runtime.projection);
  const hardwareTable = useTable("hardware", runtime.projection);
  const catalogTable = useTable("catalog", runtime.projection);
  const ledgerTable = useTable("ledger", runtime.projection);

  const capability = [
    ["compute", rig.compute],
    ["memory", rig.memory],
    ["vram", rig.vram],
    ["storage", rig.storage],
    ["network", rig.network],
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

  const ledger = Object.entries(ledgerTable).sort(
    ([idA, a], [idB, b]) =>
      Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
      idB.localeCompare(idA, undefined, { numeric: true }),
  );

  return (
    <div className="market-app">
      <section aria-label="Wallet">
        <span className="panel-label">WALLET</span>
        <div className="market-wallet">
          <strong>{credits.toLocaleString("en-US")} cr</strong>
          <span>Credits never go negative. Hardware raises capability, never a gate.</span>
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
