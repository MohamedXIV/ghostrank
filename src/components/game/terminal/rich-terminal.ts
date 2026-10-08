import type { SimulationCommand } from "@/game/simulation/commands/types";

export interface TerminalLogEntry {
  id: string;
  kind: "system" | "prompt" | "success" | "error" | "table";
  text: string;
  badge?: string;
  glyph?: string;
  meta?: string;
}

export const TERMINAL_WELCOME_HEADER: string[] = [
  "ghostsh 0.2 // virtual capability shell [P2 visual-rich mode]",
  "Type 'help' for command directory, or issue virtual commands below.",
];

export const TERMINAL_HELP_TABLE: string = [
  "┌── RECONNAISSANCE ────────────────────────────────────────────────────────┐",
  "│ observe <target>   │ resolve target profile                             │",
  "│ op open <target>   │ start recon-stage operation                        │",
  "│ survey <target>    │ discover host machines in active operation         │",
  "│ inspect <machine>  │ map service endpoints on host machine              │",
  "│ analyze <target>   │ assistant prediction of unmapped structure (AI)    │",
  "│ op escalate        │ cross the recon boundary into intrusive stage      │",
  "│ op exit            │ disengage from active operation                    │",
  "├── RIG & INFRASTRUCTURE ──────────────────────────────────────────────────┤",
  "│ buy <catalog-id>   │ acquire hardware upgrade                           │",
  "│ rent <housing-id>  │ sign safehouse lease (upkeep + anonymity)          │",
  "│ lease break        │ vacate safehouse and return to baseline            │",
  "│ use <software-id>  │ activate software license (recurring fee)          │",
  "│ stop <software-id> │ stop software license                              │",
  "│ box buy|sell|name  │ acquire, resell, or rename modular machines        │",
  "│ model buy|run|stop │ acquire local AI or rent cloud assistant model     │",
  "│ build <spec-id>    │ commission workflow forge automation               │",
  "├── UNDERGROUND & CAREER ──────────────────────────────────────────────────┤",
  "│ contract accept|decline|deliver <id> │ fulfill syndicate commissions     │",
  "│ read <message-id>  │ review intercepted message or rumor                │",
  "│ retire plan|commit|finish|cancel     │ orchestrate exit from the scene  │",
  "│ wait <minutes>     │ advance world clock                                │",
  "├── SYSTEM DISCOVERY ──────────────────────────────────────────────────────┤",
  "│ settings [subcmd]  │ inspect or adjust display and accessibility        │",
  "│ run [status|new]   │ inspect active run state or request restart        │",
  "│ help <command>     │ view detailed syntax and semantics for a command   │",
  "│ legend             │ display truth vocabulary and symbol glossary       │",
  "│ guide              │ display progressive operational directives         │",
  "└──────────────────────────────────────────────────────────────────────────┘",
].join("\n");

export const TERMINAL_LEGEND_TABLE: string = [
  "┌── EPISTEMIC TRUTH VOCABULARY ────────────────────────────────────────────┐",
  "│ CONFIRMED (●)   │ Authoritative fact from direct telemetry or execution  │",
  "│ OBSERVED  (○)   │ Firsthand intelligence mapped via survey or inspection │",
  "│ INFERRED  (◇)   │ Assistant AI hypothesis; unverified analytical claim   │",
  "│ RUMORED   (┄)   │ Social forum whisper or leak; unconfirmed origin       │",
  "│ STALE     (◌)   │ Aged intelligence; target posture may have changed     │",
  "│ UNKNOWN   (?)   │ Unresolved entity handle or unmapped infrastructure    │",
  "├── AI CONFIDENCE PIPS ────────────────────────────────────────────────────┤",
  "│ ▪▫▫ LOW (1/3)   │ Speculative pattern-match on target architecture       │",
  "│ ▪▪▫ MODERATE    │ Corroborated across multiple observed machine ports    │",
  "│ ▪▪▪ HIGH (3/3)  │ High-probability analytical convergence                │",
  "├── CONTRACT URGENCY ──────────────────────────────────────────────────────┤",
  "│ ON SCHEDULE     │ Abundant operational window                            │",
  "│ CLOSING         │ Approaching cutoff; finalize and deliver evidence      │",
  "│ EXPIRING SOON   │ Imminent expiration; failure causes reputation loss    │",
  "└──────────────────────────────────────────────────────────────────────────┘",
].join("\n");

export const TERMINAL_GUIDE_TABLE: string = [
  "┌── OPERATIONAL FIELD GUIDE // QUICKSTART ─────────────────────────────────┐",
  "│ 1. RESOLVE LEAD     │ observe <target>     e.g. observe nightshade       │",
  "│ 2. OPEN RECON       │ op open <target>     stage: RECON (safe from heat) │",
  "│ 3. SURVEY HOSTS     │ survey <target>      discovers perimeter machines  │",
  "│ 4. MAP SERVICES     │ inspect <machine>    reveals evidence & ports      │",
  "│ 5. DELIVER CONTRACT │ contract accept <id> -> contract deliver <id>      │",
  "│ 6. CAUTION          │ op escalate enters intrusive stage (trace mounts)  │",
  "│                     │ op exit disengages before retaliatory counter-probe│",
  "└──────────────────────────────────────────────────────────────────────────┘",
].join("\n");

export const DETAILED_COMMAND_HELP: Record<string, string> = {
  observe: [
    "COMMAND: observe <target>",
    "CATEGORY: Reconnaissance",
    "PURPOSE: Resolves an unresolved handle lead into an indexed target profile.",
    "EXAMPLE: observe nightshade",
  ].join("\n"),
  survey: [
    "COMMAND: survey <target>",
    "CATEGORY: Reconnaissance",
    "PURPOSE: Scans the network perimeter of an active operation to discover host machines.",
    "REQUIRES: Active operation session (op open <target>).",
    "EXAMPLE: survey nightshade",
  ].join("\n"),
  inspect: [
    "COMMAND: inspect <machine>",
    "CATEGORY: Reconnaissance",
    "PURPOSE: Probes a discovered host machine to map active services and port evidence.",
    "EXAMPLE: inspect ns-relay",
  ].join("\n"),
  analyze: [
    "COMMAND: analyze <target>",
    "CATEGORY: Reconnaissance (AI)",
    "PURPOSE: Dispatches an AI assistant to infer unmapped machines and services.",
    "NOTE: Inferred claims carry confidence pips and must be verified.",
    "EXAMPLE: analyze nightshade",
  ].join("\n"),
  op: [
    "COMMAND: op open <target> | op escalate | op exit",
    "CATEGORY: Operation Lifecycle",
    "PURPOSE: Controls operation engagement stages.",
    "  op open <target> : Begins passive recon session (low trace).",
    "  op escalate      : Crosses into intrusive perimeter (accumulates trace).",
    "  op exit          : Disengages and closes session safely.",
  ].join("\n"),
  contract: [
    "COMMAND: contract accept|decline|deliver <id>",
    "CATEGORY: Underground Syndicate",
    "PURPOSE: Accepts or fulfills syndicate commissions based on mapped evidence.",
    "EXAMPLE: contract accept contract:1",
    "         contract deliver contract:1",
  ].join("\n"),
  buy: [
    "COMMAND: buy <catalog-id>",
    "CATEGORY: Rig & Hardware",
    "PURPOSE: Purchases modular rig hardware to increase throughput and capability.",
    "EXAMPLE: buy cpu-overclock",
  ].join("\n"),
  rent: [
    "COMMAND: rent <housing-id>",
    "CATEGORY: Housing & Anonymity",
    "PURPOSE: Leases a safehouse dwelling to provide physical security and heat shielding.",
    "EXAMPLE: rent housing-cowork-loft",
  ].join("\n"),
  model: [
    "COMMAND: model buy|run|stop <model-id>",
    "CATEGORY: AI Inference",
    "PURPOSE: Manages local or cloud assistant models for automated analysis.",
    "EXAMPLE: model run model-local-workhorse",
  ].join("\n"),
  wait: [
    "COMMAND: wait <minutes>",
    "CATEGORY: Simulation Clock",
    "PURPOSE: Advances the world simulation clock by specified minutes.",
    "EXAMPLE: wait 30",
  ].join("\n"),
  legend: [
    "COMMAND: legend",
    "CATEGORY: System Glossary",
    "PURPOSE: Displays epistemic truth vocabulary, confidence pips, and urgency bands.",
  ].join("\n"),
  guide: [
    "COMMAND: guide",
    "CATEGORY: Operational Guidance",
    "PURPOSE: Displays progressive operational steps and beginner quickstart cues.",
  ].join("\n"),
  settings: [
    "COMMAND: settings [scale|motion|transparency|density|contrast|sound] [value]",
    "CATEGORY: Presentation & Accessibility",
    "PURPOSE: Inspects or modifies client-side presentation overrides.",
    "SUBCOMMANDS:",
    "  settings                     - print active presentation configuration",
    "  settings scale <normal|large|extra-large>",
    "  settings motion <system|reduce|standard>",
    "  settings transparency <default|opaque>",
    "  settings density <compact|comfortable>",
    "  settings contrast <normal|high>",
    "  settings sound <on|off>",
    "EXAMPLE: settings contrast high",
  ].join("\n"),
  accessibility: [
    "COMMAND: accessibility",
    "CATEGORY: Presentation & Accessibility",
    "PURPOSE: Alias for 'settings'. Inspects display and accessibility options.",
  ].join("\n"),
  run: [
    "COMMAND: run [status|new]",
    "CATEGORY: Session Lifecycle",
    "PURPOSE: Inspects the current session metadata or requests a fresh run.",
    "SUBCOMMANDS:",
    "  run status                  - display active player handle, rank, credits, and world minute",
    "  run new                     - trigger confirmation prompt to start a fresh simulation run",
    "EXAMPLE: run status",
  ].join("\n"),
};


export function formatDetailedHelp(commandName: string): string | null {
  const normalized = commandName.trim().toLowerCase();
  return DETAILED_COMMAND_HELP[normalized] ?? null;
}


export function formatRichCommandResult(type: SimulationCommand["type"]): {
  text: string;
  badge: string;
  glyph: string;
} {
  switch (type) {
    case "observeTarget":
      return {
        badge: "OBSERVED",
        glyph: "◉",
        text: "Target profile resolved // Added to player index",
      };
    case "openOperation":
      return {
        badge: "OP OPEN",
        glyph: "◎",
        text: "Operation session initialized // Stage: RECON",
      };
    case "surveyTarget":
      return {
        badge: "SURVEYED",
        glyph: "☲",
        text: "Host machines mapped in perimeter topology",
      };
    case "inspectMachine":
      return {
        badge: "INSPECTED",
        glyph: "⚙",
        text: "Service endpoints discovered on host machine",
      };
    case "analyzeTarget":
      return {
        badge: "INFERENCE",
        glyph: "◇",
        text: "Assistant generated predictive claims // Review in Recon topology",
      };
    case "escalateOperation":
      return {
        badge: "ESCALATED",
        glyph: "⚡",
        text: "Crossed perimeter boundary // Stage: INTRUSIVE (trace accumulating)",
      };
    case "disengageOperation":
      return {
        badge: "DISENGAGED",
        glyph: "✓",
        text: "Operation session safely closed",
      };
    case "readMessage":
      return {
        badge: "READ",
        glyph: "✓",
        text: "Message marked as read",
      };
    case "acceptContract":
      return {
        badge: "ACCEPTED",
        glyph: "⏱",
        text: "Contract accepted // Clock is ticking toward deadline",
      };
    case "declineContract":
      return {
        badge: "DECLINED",
        glyph: "✕",
        text: "Contract offer declined and removed from board",
      };
    case "deliverContract":
      return {
        badge: "DELIVERED",
        glyph: "✓",
        text: "Contract completed // Payout credited to wallet",
      };
    case "buyHardware":
      return {
        badge: "UPGRADED",
        glyph: "⚙",
        text: "Hardware upgrade installed // Rig capabilities increased",
      };
    case "rentHousing":
      return {
        badge: "RELOCATED",
        glyph: "⌸",
        text: "New safehouse lease signed // Base and anonymity updated",
      };
    case "breakLease":
      return {
        badge: "MOVED OUT",
        glyph: "✓",
        text: "Lease terminated // Returned to baseline quarters",
      };
    case "enableSoftware":
      return {
        badge: "SOFTWARE ON",
        glyph: "▶",
        text: "Software tool license activated",
      };
    case "disableSoftware":
      return {
        badge: "SOFTWARE OFF",
        glyph: "■",
        text: "Software tool license stopped // Daily fee ceased",
      };
    case "buyPlayerTool":
      return {
        badge: "TOOL ACQUIRED",
        glyph: "◈",
        text: "Authored player tool installed on rig",
      };
    case "sellPlayerTool":
      return {
        badge: "TOOL SOLD",
        glyph: "✓",
        text: "Tool sold // Credits recovered to wallet",
      };
    case "buyMachine":
      return {
        badge: "BOX ACQUIRED",
        glyph: "▣",
        text: "Modular machine connected to local cluster",
      };
    case "sellMachine":
      return {
        badge: "BOX SOLD",
        glyph: "✓",
        text: "Machine sold through fence // Net payout received",
      };
    case "renameMachine":
      return {
        badge: "RENAMED",
        glyph: "✓",
        text: "Machine identity label updated",
      };
    case "acquireModel":
      return {
        badge: "MODEL OWNED",
        glyph: "◇",
        text: "Local model acquired // Available to run offline",
      };
    case "runModel":
      return {
        badge: "MODEL ACTIVE",
        glyph: "▶",
        text: "Assistant neural model running",
      };
    case "stopModel":
      return {
        badge: "MODEL STOPPED",
        glyph: "■",
        text: "Assistant neural model disengaged",
      };
    case "startBuild":
      return {
        badge: "BUILDING",
        glyph: "⚙",
        text: "Assistant commissioned for workflow automation build",
      };
    case "abortBuild":
      return {
        badge: "ABORTED",
        glyph: "✕",
        text: "In-flight build cancelled // No credits consumed",
      };
    case "startRetirement":
      return {
        badge: "EXIT PLANNED",
        glyph: "◷",
        text: "Exit preparation initiated // Wind down commitments",
      };
    case "commitRetirement":
      return {
        badge: "COMMITTED",
        glyph: "🔒",
        text: "Exit committed // 2-day cooling window started",
      };
    case "finishRetirement":
      return {
        badge: "RETIRED",
        glyph: "◆",
        text: "Handle closed // Run archived in History",
      };
    case "cancelRetirement":
      return {
        badge: "RESUMED",
        glyph: "✓",
        text: "Exit plan cancelled // Active career resumed",
      };
    case "advanceTime":
      return {
        badge: "TIME PASSED",
        glyph: "⏱",
        text: "World clock advanced // Ecosystem ticked",
      };
    case "sleep":
      return {
        badge: "RESTING",
        glyph: "☾",
        text: "Rest started // The clock plays it out and stops early only for interrupts",
      };
    case "fastForward":
      return {
        badge: "FAST FORWARD",
        glyph: "»",
        text: "Fast-forward started // The clock plays it out and stops for interrupts and notable news",
      };
    case "cancelAdvance":
      return {
        badge: "HALTED",
        glyph: "■",
        text: "Clock halted // Time stays where it stopped",
      };
    case "pumpTime":
      return {
        badge: "CLOCK",
        glyph: "⏱",
        text: "Clock advanced // Ecosystem ticked",
      };
    default:
      return {
        badge: "EXECUTED",
        glyph: "✓",
        text: "Simulation command executed successfully",
      };
  }
}

/**
 * Player-facing wording for clock refusals (D055). These are the only errors
 * that name the clock itself, so they are written out rather than shown as codes.
 */
const CLOCK_ERROR_TEXT: Record<string, string> = {
  TIME_JOB_ACTIVE:
    "The clock is busy // Wait for it to finish, or 'halt' a sleep or fast-forward",
  ADVANCE_NOT_CANCELLABLE: "This wait cannot be halted // It finishes on its own",
  NO_ACTIVE_TIME_JOB: "Nothing is running on the clock",
  INVALID_TIME_DELTA:
    "Enter a whole number of minutes above zero // Type 'help' for syntax",
};

export function formatRichError(error: string): {
  badge: string;
  glyph: string;
  text: string;
} {
  const clockText = CLOCK_ERROR_TEXT[error];

  return {
    badge: "ERROR",
    glyph: "✕",
    text:
      clockText ??
      `${error.toLowerCase()} // Type 'help' to review valid command formats`,
  };
}
