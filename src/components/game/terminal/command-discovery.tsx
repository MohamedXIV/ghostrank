"use client";

import { useState } from "react";

export interface DiscoveredCommand {
  syntax: string;
  category: "recon" | "rig" | "underground" | "system";
  label: string;
  description: string;
  example: string;
}

export const DISCOVERABLE_COMMANDS: DiscoveredCommand[] = [
  // Recon
  {
    category: "recon",
    syntax: "observe <target>",
    label: "observe",
    description: "Resolve target profile and add to player index",
    example: "observe nightshade",
  },
  {
    category: "recon",
    syntax: "op open <target>",
    label: "op open",
    description: "Initialize operation session in recon stage",
    example: "op open nightshade",
  },
  {
    category: "recon",
    syntax: "survey <target>",
    label: "survey",
    description: "Discover perimeter host machines in active operation",
    example: "survey nightshade",
  },
  {
    category: "recon",
    syntax: "inspect <machine>",
    label: "inspect",
    description: "Map active service endpoints on host machine",
    example: "inspect ns-relay",
  },
  {
    category: "recon",
    syntax: "analyze <target>",
    label: "analyze",
    description: "Generate assistant AI predictive structural claims",
    example: "analyze nightshade",
  },
  {
    category: "recon",
    syntax: "op escalate",
    label: "op escalate",
    description: "Cross into intrusive stage (trace begins accumulating)",
    example: "op escalate",
  },
  {
    category: "recon",
    syntax: "op exit",
    label: "op exit",
    description: "Disengage cleanly from active operation session",
    example: "op exit",
  },

  // Rig & Market
  {
    category: "rig",
    syntax: "buy <catalog-id>",
    label: "buy",
    description: "Acquire modular hardware upgrade for rig",
    example: "buy cpu-overclock",
  },
  {
    category: "rig",
    syntax: "rent <housing-id>",
    label: "rent",
    description: "Sign safehouse lease for physical anonymity",
    example: "rent housing-cowork-loft",
  },
  {
    category: "rig",
    syntax: "lease break",
    label: "lease break",
    description: "Vacate leased safehouse and return to default baseline",
    example: "lease break",
  },
  {
    category: "rig",
    syntax: "use <software-id>",
    label: "use",
    description: "Activate background software license",
    example: "use software-net-monitor",
  },
  {
    category: "rig",
    syntax: "model run <id>",
    label: "model run",
    description: "Run local or cloud AI assistant model",
    example: "model run model-local-workhorse",
  },

  // Underground
  {
    category: "underground",
    syntax: "contract accept <id>",
    label: "contract accept",
    description: "Accept syndicate commission contract",
    example: "contract accept contract:1",
  },
  {
    category: "underground",
    syntax: "contract deliver <id>",
    label: "contract deliver",
    description: "Submit evidence to fulfill accepted contract",
    example: "contract deliver contract:1",
  },
  {
    category: "underground",
    syntax: "read <message-id>",
    label: "read",
    description: "Review intercepted message or rumor",
    example: "read message:1",
  },
  {
    category: "underground",
    syntax: "wait <minutes>",
    label: "wait",
    description: "Advance world clock by specified minutes",
    example: "wait 30",
  },
  {
    category: "underground",
    syntax: "sleep <minutes>",
    label: "sleep",
    description: "Rest on the clock; stops early only if something needs you",
    example: "sleep 480",
  },
  {
    category: "underground",
    syntax: "ff <minutes>",
    label: "ff",
    description: "Fast-forward the clock; also stops for notable news",
    example: "ff 1440",
  },
  {
    category: "underground",
    syntax: "halt",
    label: "halt",
    description: "Stop a sleep or fast-forward where it stands",
    example: "halt",
  },

  // System
  {
    category: "system",
    syntax: "help",
    label: "help",
    description: "Display full terminal command directory",
    example: "help",
  },
  {
    category: "system",
    syntax: "help <command>",
    label: "help <cmd>",
    description: "Explain syntax and semantics of a specific command",
    example: "help observe",
  },
  {
    category: "system",
    syntax: "legend",
    label: "legend",
    description: "Display truth vocabulary and system symbol glossary",
    example: "legend",
  },
  {
    category: "system",
    syntax: "settings",
    label: "settings",
    description: "Display or modify presentation and accessibility overrides",
    example: "settings",
  },
  {
    category: "system",
    syntax: "guide",
    label: "guide",
    description: "Display operational field directives and orientation",
    example: "guide",
  },
];

interface CommandDiscoveryProps {
  onSelectCommand: (commandExample: string) => void;
}

export function CommandDiscovery({ onSelectCommand }: CommandDiscoveryProps) {
  const [activeCategory, setActiveCategory] = useState<
    "all" | "recon" | "rig" | "underground" | "system"
  >("all");
  const [expanded, setExpanded] = useState(true);

  const filteredCommands =
    activeCategory === "all"
      ? DISCOVERABLE_COMMANDS
      : DISCOVERABLE_COMMANDS.filter((cmd) => cmd.category === activeCategory);

  return (
    <div className="command-discovery-container" aria-label="Command discovery">
      <div className="discovery-header-row">
        <div className="discovery-title-group">
          <span className="discovery-glyph" aria-hidden="true">⌘</span>
          <span className="discovery-title">COMMAND DISCOVERY</span>
        </div>

        <div className="discovery-category-tabs">
          {(["all", "recon", "rig", "underground", "system"] as const).map(
            (category) => (
              <button
                key={category}
                type="button"
                className={`category-tab ${activeCategory === category ? "is-active" : ""}`}
                onClick={() => {
                  setActiveCategory(category);
                  setExpanded(true);
                }}
              >
                {category.toUpperCase()}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          className="discovery-toggle-btn"
          onClick={() => setExpanded(!expanded)}
          title={expanded ? "Collapse command discovery" : "Expand command discovery"}
        >
          {expanded ? "HIDE ▲" : "SHOW ▼"}
        </button>
      </div>

      {expanded && (
        <div className="discovery-chips-grid">
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.syntax}
              type="button"
              className="command-chip"
              onClick={() => onSelectCommand(cmd.example)}
              title={`${cmd.syntax}: ${cmd.description}`}
              aria-label={`Insert command ${cmd.syntax}`}
            >
              <span className="chip-syntax">{cmd.syntax}</span>
              <span className="chip-desc">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
