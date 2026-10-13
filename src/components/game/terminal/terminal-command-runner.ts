import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import type { useClockControl } from "@/components/game/clock-context";
import { formatWorldTime } from "@/game/computer/format-world-time";
import { parseTerminalCommand } from "@/game/computer/terminal/parse-command";
import { renderNetworkRouteQuery } from "@/game/computer/terminal/network-route-view";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { formatNarrativeTerminalView } from "@/game/narrative/terminal-view";
import {
  briefingBriefLines, briefingEventNotices, briefingFailureText, briefingPreviewLines,
} from "@/components/game/briefing/briefing-copy";
import { previewSliceActions } from "@/game/simulation/systems/nightshade-slice";
import { parsePlaybackCommand } from "@/game/runtime/playback-command";
import {
  formatDetailedHelp, formatPlaybackResult, formatRichCommandResult,
  formatRichError, TERMINAL_GUIDE_TABLE, TERMINAL_HELP_TABLE,
  TERMINAL_LEGEND_TABLE,
} from "./rich-terminal";

export interface TerminalItem {
  id: string;
  type: "system" | "prompt" | "result" | "error" | "table";
  text: string;
  badge?: string;
  glyph?: string;
}
export interface TerminalCommandContext {
  runtime: GameRuntime;
  clock: ReturnType<typeof useClockControl>;
  onStartNewRun?: () => void;
  emit: (items: TerminalItem[]) => void;
  createId: (prefix: string) => string;
}

/** Virtual commands retain the exact simulation/CommandBus semantics.
 * The React terminal controls input, history and visual output separately. */
export function executeTerminalCommand(rawCommand: string, {
  runtime, clock, onStartNewRun, emit, createId,
}: TerminalCommandContext): void {
    const raw = rawCommand.trim();
    if (!raw) {
      return;
    }

    const promptId = createId("prompt");

    if (raw.toLowerCase() === "help") {
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        { id: createId("help"), type: "table", text: TERMINAL_HELP_TABLE + "\nNETWORK ROUTES: path map <target>  |  help path" },
      ]);
      return;
    }

    if (raw.toLowerCase().startsWith("help ")) {
      const topic = raw.slice(5).trim();
      const detailed = topic.toLowerCase() === "path"
        ? "path map <target> | path inspect <target> <challenge> <route> | path preview <target> <challenge> <route> | path test <target> <challenge> <route>"
        : formatDetailedHelp(topic);
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("help"),
          type: "table",
          text:
            detailed ??
            `Unknown command '${topic}'. Type 'help' to review the command directory.`,
        },
      ]);
      return;
    }

    if (raw.toLowerCase() === "story view") {
      const read = projectWorld(runtime.snapshot()).narrative;
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("story"),
          type: "table",
          text: formatNarrativeTerminalView(read),
        },
      ]);
      return;
    }

    // Generic read-only network queries use the same player-safe data as Recon.
    const routeRead = renderNetworkRouteQuery(raw, projectWorld(runtime.snapshot()).networkRoutes);
    if (routeRead !== null) {
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        { id: createId("path"), type: "table", text: routeRead },
      ]);
      return;
    }

    // The Nightshade briefing's own read-only verbs (D071). Canonical runs have
    // no briefing, so for them these words fall through to the parser as before.
    const briefingWorld = runtime.snapshot();
    const briefingView = briefingWorld.slice
      ? projectWorld(briefingWorld).slice
      : undefined;

    if (briefingView && raw.toLowerCase() === "brief") {
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("brief"),
          type: "table",
          text: [
            ...briefingBriefLines(briefingView),
            "Commands: op preview // op escalate confirm // op exit",
          ].join("\n"),
        },
      ]);
      return;
    }

    if (briefingView && raw.toLowerCase() === "op preview") {
      const preview = previewSliceActions(briefingWorld);
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("preview"),
          type: "table",
          text: preview
            ? briefingPreviewLines(preview).join("\n")
            : "No briefing is open for a preview.",
        },
      ]);
      return;
    }

    if (raw.toLowerCase() === "legend") {
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        { id: createId("legend"), type: "table", text: TERMINAL_LEGEND_TABLE },
      ]);
      return;
    }

    if (raw.toLowerCase() === "guide") {
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        { id: createId("guide"), type: "table", text: TERMINAL_GUIDE_TABLE },
      ]);
      return;
    }

    if (raw.toLowerCase() === "run" || raw.toLowerCase().startsWith("run ")) {
      const sub = raw.slice(3).trim().toLowerCase();
      if (!sub || sub === "status") {
        const snap = runtime.snapshot();
        const runTable = [
          "┌── SIMULATION RUN STATUS ─────────────────────────────────────────────────┐",
          `│ Operator Handle │ ${snap.player.handle.padEnd(20)} │ Global Rank  │ #${String(snap.player.rank).padEnd(15)} │`,
          `│ Credits Balance │ ${String(snap.economy.credits).padEnd(17)} cr │ World Time   │ ${formatWorldTime(snap.worldMinute).padEnd(16)} │`,
          `│ World Seed      │ ${String(snap.underground.seed).padEnd(20)} │ Run Status   │ ${snap.ending ? snap.ending.status.toUpperCase() : "ACTIVE".padEnd(16)} │`,
          "├──────────────────────────────────────────────────────────────────────────┤",
          "│ Command: run new (requests fresh simulation run initialization)          │",
          "└──────────────────────────────────────────────────────────────────────────┘",
        ].join("\n");
        emit([
          
          { id: promptId, type: "prompt", text: raw },
          { id: createId("run"), type: "table", text: runTable },
        ]);
        return;
      }
      if (sub === "new") {
        if (onStartNewRun) {
          onStartNewRun();
          emit([
            
            { id: promptId, type: "prompt", text: raw },
            {
              id: createId("res"),
              type: "result",
              badge: "NEW_RUN_INITIATED",
              glyph: "✦",
              text: "Fresh run initialization requested. Reviewing run lifecycle...",
            },
          ]);
        } else {
          emit([
            
            { id: promptId, type: "prompt", text: raw },
            {
              id: createId("err"),
              type: "error",
              badge: "UNAVAILABLE",
              glyph: "✖",
              text: "Run lifecycle manager is not attached in this session context.",
            },
          ]);
        }
        return;
      }
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("err"),
          type: "error",
          badge: "INVALID_ARGUMENT",
          glyph: "✖",
          text: `Unknown run subcommand '${sub}'. Usage: run [status|new]`,
        },
      ]);
      return;
    }


    const lower = raw.toLowerCase();
    if (lower === "settings" || lower === "accessibility") {
      const pres = usePresentationStore.getState();
      const summaryTable = [
        "┌── SYSTEM PRESENTATION & ACCESSIBILITY CONFIGURATION ────────────────────┐",
        `│ Active Distro  │ ${pres.distroId.padEnd(20)} │ Sound FX     │ ${pres.soundEnabled ? "ENABLED" : "MUTED"}          │`,
        `│ Active Theme   │ ${pres.themeId.padEnd(20)} │ Text Scale   │ ${pres.textScale.padEnd(16)} │`,
        `│ Motion Mode    │ ${pres.motionMode.padEnd(20)} │ Transparency │ ${pres.transparencyMode.padEnd(16)} │`,
        `│ Density Mode   │ ${pres.densityMode.padEnd(20)} │ Contrast     │ ${pres.contrastMode.padEnd(16)} │`,
        "├──────────────────────────────────────────────────────────────────────────┤",
        "│ Subcommands:                                                             │",
        "│   settings scale <normal|large|extra-large>                              │",
        "│   settings motion <system|reduce|standard>                               │",
        "│   settings transparency <default|opaque>                                 │",
        "│   settings density <compact|comfortable>                                 │",
        "│   settings contrast <normal|high>                                        │",
        "│   settings sound <on|off>                                                │",
        "└──────────────────────────────────────────────────────────────────────────┘",
      ].join("\n");
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        { id: createId("settings"), type: "table", text: summaryTable },
      ]);
      return;
    }

    if (lower.startsWith("settings ") || lower.startsWith("accessibility ")) {
      const parts = raw.split(/\s+/);
      const sub = parts[1]?.toLowerCase();
      const val = parts[2]?.toLowerCase();
      const pres = usePresentationStore.getState();

      let successMessage: string | null = null;
      let errorMessage: string | null = null;

      if (sub === "scale") {
        if (val === "normal" || val === "large" || val === "extra-large") {
          pres.setTextScale(val);
          successMessage = `Text scale updated to '${val}'.`;
        } else {
          errorMessage = "Usage: settings scale <normal|large|extra-large>";
        }
      } else if (sub === "motion") {
        if (val === "system" || val === "reduce" || val === "standard") {
          pres.setMotionMode(val);
          successMessage = `Motion mode updated to '${val}'.`;
        } else {
          errorMessage = "Usage: settings motion <system|reduce|standard>";
        }
      } else if (sub === "transparency") {
        if (val === "default" || val === "opaque") {
          pres.setTransparencyMode(val);
          successMessage = `Transparency updated to '${val}'.`;
        } else {
          errorMessage = "Usage: settings transparency <default|opaque>";
        }
      } else if (sub === "density") {
        if (val === "compact" || val === "comfortable") {
          pres.setDensityMode(val);
          successMessage = `Density mode updated to '${val}'.`;
        } else {
          errorMessage = "Usage: settings density <compact|comfortable>";
        }
      } else if (sub === "contrast") {
        if (val === "normal" || val === "high") {
          pres.setContrastMode(val);
          successMessage = `Contrast level updated to '${val}'.`;
        } else {
          errorMessage = "Usage: settings contrast <normal|high>";
        }
      } else if (sub === "sound") {
        if (val === "on" || val === "off") {
          pres.setSoundEnabled(val === "on");
          successMessage = `UI audio effects ${val === "on" ? "enabled" : "muted"}.`;
        } else {
          errorMessage = "Usage: settings sound <on|off>";
        }
      } else {
        errorMessage = `Unknown settings subcommand '${sub}'. Type 'settings' or 'help settings' for options.`;
      }

      if (successMessage) {
        emit([
          
          { id: promptId, type: "prompt", text: raw },
          {
            id: createId("res"),
            type: "result",
            badge: "CONFIG_SET",
            glyph: "✦",
            text: successMessage,
          },
        ]);
      } else {
        emit([
          
          { id: promptId, type: "prompt", text: raw },
          {
            id: createId("err"),
            type: "error",
            badge: "INVALID_ARGUMENT",
            glyph: "✖",
            text: errorMessage ?? "Unknown setting.",
          },
        ]);
      }
      return;
    }

    const playback = parsePlaybackCommand(raw);

    if (playback) {
      // Playback changes how this screen's clock plays and nothing else (D062).
      // It never becomes a simulation command, so it cannot write a world event.
      let reply: { kind: "result" | "error"; badge: string; glyph: string; text: string };

      if (!playback.ok) {
        reply = { kind: "error", badge: "INVALID_ARGUMENT", glyph: "✖", text: playback.error };
      } else if (!clock) {
        reply = {
          kind: "error",
          badge: "ERROR",
          glyph: "✕",
          text: "The clock is not running in this view.",
        };
      } else {
        const { request } = playback;
        clock.driver.setSpeed(
          request.type === "pause"
            ? "paused"
            : request.type === "resume"
              ? "1x"
              : request.speed,
        );
        reply = {
          kind: "result",
          ...formatPlaybackResult(
            request,
            clock.driver.state(),
            runtime.snapshot().worldMinute,
          ),
        };
      }

      emit([
        
        { id: promptId, type: "prompt", text: raw },
        reply.kind === "result"
          ? {
              id: createId("res"),
              type: "result",
              badge: reply.badge,
              glyph: reply.glyph,
              text: reply.text,
            }
          : {
              id: createId("err"),
              type: "error",
              badge: reply.badge,
              glyph: reply.glyph,
              text: reply.text,
            },
      ]);
      return;
    }

    const parsed = parseTerminalCommand(raw);

    if (!parsed.ok) {
      const err = {
        ...formatRichError(parsed.error),
        text:
          briefingFailureText(parsed.error, runtime.snapshot()) ??
          formatRichError(parsed.error).text,
      };
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("err"),
          type: "error",
          badge: err.badge,
          glyph: err.glyph,
          text: err.text,
        },
      ]);
      return;
    }

    const result = runtime.execute(parsed.command);

    if (result.ok) {
      const rich = formatRichCommandResult(parsed.command.type);
      const notices = briefingEventNotices(result.events);
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("res"),
          type: "result",
          badge: rich.badge,
          glyph: rich.glyph,
          text: rich.text,
        },
        ...(parsed.command.type === "startNarrative" ||
           parsed.command.type === "chooseNarrative"
          ? [{
              id: createId("story"),
              type: "table" as const,
              text: formatNarrativeTerminalView(projectWorld(runtime.snapshot()).narrative),
            }]
          : []),
        ...notices.map((notice, index) => ({
          id: `${createId("briefing")}-${index}`,
          type: "result" as const,
          badge: notice.badge,
          glyph: notice.glyph,
          text: notice.text,
        })),
      ]);
    } else {
      const err = {
        ...formatRichError(result.error ?? "COMMAND_FAILED"),
        text:
          briefingFailureText(result.error ?? "COMMAND_FAILED", runtime.snapshot()) ??
          formatRichError(result.error ?? "COMMAND_FAILED").text,
      };
      emit([
        
        { id: promptId, type: "prompt", text: raw },
        {
          id: createId("err"),
          type: "error",
          badge: err.badge,
          glyph: err.glyph,
          text: err.text,
        },
      ]);
    }
}
