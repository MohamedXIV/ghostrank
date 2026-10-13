"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useCell } from "tinybase/ui-react";
import { Command, Eraser, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClockControl } from "@/components/game/clock-context";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { CommandDiscovery, DISCOVERABLE_COMMANDS } from "./command-discovery";
import { executeTerminalCommand, type TerminalItem } from "./terminal-command-runner";

const HISTORY_LIMIT = 100;
const completions = [...new Set(DISCOVERABLE_COMMANDS
  .map(command => command.label)
  .filter(label => /^[a-z][a-z ]*$/.test(label)))].sort();

/** Ghostrank's fictional shell: only permitted commands reach the CommandBus.
 * Input history, scroll position and command palette are presentation-only. */
export function TerminalApp({
  runtime, onStartNewRun,
}: {
  runtime: GameRuntime;
  onStartNewRun?: () => void;
}) {
  const clock = useClockControl();
  const distroId = usePresentationStore(state => state.distroId);
  const handle = String(useCell("player", "current", "handle", runtime.projection) ?? "operator");
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [items, setItems] = useState<TerminalItem[]>([
    { id: "init-0", type: "system", text: "ghostsh · Ghostrank virtual shell" },
    { id: "init-1", type: "system", text: "Type help to see available commands." },
  ]);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const draftRef = useRef("");
  const itemSeqRef = useRef(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const followOutputRef = useRef(true);

  const createId = (prefix: string) => `${prefix}-${++itemSeqRef.current}`;
  const emit = (entries: TerminalItem[]) => {
    setItems(current => [...current, ...entries]);
  };
  const run = (command: string) => {
    const raw = command.trim();
    if (!raw) return;
    const history = historyRef.current;
    if (history[history.length - 1] !== raw) history.push(raw);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndexRef.current = -1;
    draftRef.current = "";
    followOutputRef.current = true;
    setInput("");
    if (raw.toLowerCase() === "clear") {
      setItems([]);
    } else {
      executeTerminalCommand(raw, { runtime, clock, onStartNewRun, emit, createId });
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(input);
  };
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      setItems([]);
      return;
    }
    const history = historyRef.current;
    if (event.key === "ArrowUp" && history.length) {
      event.preventDefault();
      if (historyIndexRef.current === -1) draftRef.current = input;
      historyIndexRef.current = historyIndexRef.current === -1
        ? history.length - 1 : Math.max(0, historyIndexRef.current - 1);
      setInput(history[historyIndexRef.current]);
    } else if (event.key === "ArrowDown" && historyIndexRef.current !== -1) {
      event.preventDefault();
      const next = historyIndexRef.current + 1;
      historyIndexRef.current = next >= history.length ? -1 : next;
      setInput(historyIndexRef.current === -1 ? draftRef.current : history[next]);
    } else if (event.key === "Tab" && !event.shiftKey && input.trim()) {
      const query = input.toLowerCase().trimStart();
      const matches = completions.filter(command => command.startsWith(query));
      if (matches.length === 1) {
        event.preventDefault();
        setInput(matches[0] + " ");
      }
    } else if (event.key === "Escape" && showCommands) {
      event.preventDefault();
      event.stopPropagation();
      setShowCommands(false);
    }
  };
  useLayoutEffect(() => {
    const output = outputRef.current;
    if (output && followOutputRef.current) output.scrollTop = output.scrollHeight;
  }, [items]);

  return (
    <section className="terminal-app" aria-label="Virtual terminal">
      <div className="terminal-toolbar">
        <div className="terminal-identity">
          <TerminalSquare size={16} aria-hidden="true" />
          <strong>ghostsh</strong>
          <span>Virtual shell</span>
        </div>
        <div className="terminal-toolbar-actions">
          <Button variant="ghost" size="icon" title="Clear terminal output (Ctrl+L)"
            aria-label="Clear terminal output" onClick={() => setItems([])}>
            <Eraser size={16} aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" aria-expanded={showCommands}
            aria-controls="terminal-command-palette" onClick={() => setShowCommands(v => !v)}>
            <Command size={15} aria-hidden="true" /> Commands
          </Button>
        </div>
      </div>
      <div ref={outputRef} className="terminal-output" aria-live="polite"
        aria-relevant="additions" onScroll={() => {
          const el = outputRef.current;
          if (el) followOutputRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
        }}>
        {items.map(item => (
          <div key={item.id} className={`terminal-entry terminal-entry-${item.type}`}>
            {item.type === "prompt" && <span className="terminal-entry-prompt">&gt; {item.text}</span>}
            {item.type === "system" && <span>{item.text}</span>}
            {item.type === "table" && <pre className="terminal-table-pre">{item.text}</pre>}
            {item.type === "result" && (
              <div className="terminal-entry-result">
                <span className="terminal-badge badge-success">{item.glyph} {item.badge}</span>
                <span>{item.text}</span>
              </div>
            )}
            {item.type === "error" && (
              <div className="terminal-entry-error">
                <span className="terminal-badge badge-error">{item.glyph} {item.badge}</span>
                <span>{item.text}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {showCommands && (
        <div className="terminal-command-palette" id="terminal-command-palette">
          <CommandDiscovery onSelectCommand={command => {
            setInput(command);
            setShowCommands(false);
            inputRef.current?.focus();
          }} />
        </div>
      )}
      <form className="terminal-input-row" onSubmit={submit}>
        <label htmlFor="ghostsh-input" className="terminal-prompt">
          {handle}@{distroId}:~$
        </label>
        <Input ref={inputRef} id="ghostsh-input" aria-label="Terminal command" type="text"
          autoComplete="off" autoCapitalize="none" spellCheck={false}
          value={input} onChange={event => setInput(event.target.value)}
          onKeyDown={handleInputKeyDown} placeholder="Enter a command..." />
      </form>
      <div className="terminal-statusline">
        <span>↑↓ History</span><span>Tab Complete</span><span>Ctrl+L Clear</span>
      </div>
    </section>
  );
}
