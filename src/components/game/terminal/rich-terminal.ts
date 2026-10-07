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
  "└──────────────────────────────────────────────────────────────────────────┘",
].join("\n");

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
    default:
      return {
        badge: "EXECUTED",
        glyph: "✓",
        text: "Simulation command executed successfully",
      };
  }
}

export function formatRichError(error: string): {
  badge: string;
  glyph: string;
  text: string;
} {
  return {
    badge: "ERROR",
    glyph: "✕",
    text: `${error.toLowerCase()} // Type 'help' to review valid command formats`,
  };
}
