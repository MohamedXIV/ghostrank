"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCell, useRow, useRowIds, useTable } from "tinybase/ui-react";

import { AppearanceApp } from "@/components/game/appearance-app";
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
import { contractActionFromGui } from "@/game/computer/apps/contract-actions";
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
import { renderNetworkRouteQuery } from "@/game/computer/terminal/network-route-view";
import { projectWorld } from "@/game/simulation/projection/project-world";
import { formatNarrativeTerminalView } from "@/game/narrative/terminal-view";
import {
  briefingBriefLines,
  briefingEventNotices,
  briefingFailureText,
  briefingPreviewLines,
} from "@/components/game/briefing/briefing-copy";
import { previewSliceActions } from "@/game/simulation/systems/nightshade-slice";
import {
  BriefingProvider,
  useBriefing,
} from "@/components/game/briefing/briefing-context";
import { NightshadeBriefingPanel } from "@/components/game/briefing/nightshade-briefing-panel";
import { parseBriefingView } from "@/components/game/briefing/briefing-copy";
import { parsePlaybackCommand } from "@/game/runtime/playback-command";
import { useClockControl } from "@/components/game/clock-context";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import type { GameSession } from "@/game/runtime/game-session";
import type { CompletedRunSummary } from "@/game/simulation/systems/run-history";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DesktopLauncher } from "@/components/game/desktop/desktop-launcher";
import { shellLayoutFor } from "@/presentation/shell-layout";
import { themeModeFor } from "@/presentation/distros";
import { TruthMark } from "@/components/ui/truth-mark";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { ReconTopology } from "@/components/game/recon/recon-topology";
import { ReconStationHeader } from "@/components/game/recon/recon-station-header";
import { OperationPressureDesk } from "@/components/game/operation/operation-pressure-desk";
import { deriveOpeningReconCue } from "@/game/onboarding/opening-recon-cue";
import { RelationshipBadge } from "@/components/game/social/relationship-badge";
import { ContractCard } from "@/components/game/contracts/contract-card";
import { deriveContractSceneIntel } from "@/game/computer/apps/contract-scene-intel";
import { CapabilityBar, type CapabilityMetric } from "@/components/game/market/capability-bar";
import { HardwareProductCard } from "@/components/game/market/hardware-product-card";
import { SoftwareLicenseCard } from "@/components/game/market/software-license-card";
import { HousingLocationCard } from "@/components/game/market/housing-location-card";
import { MachineListingCard, OwnedMachineCard } from "@/components/game/market/machine-cards";
import { ModelLicenseCard } from "@/components/game/market/model-license-card";
import { AuthoredToolListingCard, OwnedAuthoredToolCard } from "@/components/game/market/authored-tool-cards";
import { ForgeSpecCard, ForgeQueueCard, ForgeOwnedCard } from "@/components/game/market/forge-cards";
import { presentForgeSpec, presentForgeBuild, presentForgeOwned } from "@/components/game/market/forge-listing-model";
import { presentToolListing, presentOwnedTool } from "@/components/game/market/authored-tool-model";
import { presentModelListing } from "@/components/game/market/model-listing-model";
import { presentMachineListing, presentOwnedMachine } from "@/components/game/market/machine-listing-model";
import { presentHousingListing } from "@/components/game/market/housing-listing-model";
import { presentSoftwareListing } from "@/components/game/market/software-listing-model";
import { presentHardwareItem } from "@/components/game/market/hardware-item-model";
import { RunTimeline } from "@/components/game/history/run-timeline";
import {
  RecordScopeControl,
  recordPageCount,
  visibleRecords,
} from "@/components/game/visible-records";
import {
  formatDetailedHelp,
  formatPlaybackResult,
  formatRichCommandResult,
  formatRichError,
  TERMINAL_GUIDE_TABLE,
  TERMINAL_HELP_TABLE,
  TERMINAL_LEGEND_TABLE,
  TERMINAL_WELCOME_HEADER,
} from "@/components/game/terminal/rich-terminal";
import { ContextualHint } from "@/components/ui/contextual-hint";
import { OrientationModal } from "@/components/game/onboarding/orientation-modal";
import { SystemLegendModal } from "@/components/game/onboarding/system-legend-modal";
import { FieldDirectives } from "@/components/game/onboarding/field-directives";
import { CommandDiscovery } from "@/components/game/terminal/command-discovery";
import {
  getWindowMotionProps,
  useEffectiveReducedMotion,
} from "@/components/game/window-motion";
import { DISTRO_PROFILES } from "@/presentation/distros";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { useOnboardingStore } from "@/stores/ui/use-onboarding-store";
import {
  type ComputerWindowId,
  useUiStore,
} from "@/stores/ui/use-ui-store";

const DockingWorkspace = dynamic(
  () => import("@/components/game/desktop/docking-workspace").then(m => m.DockingWorkspace),
  { ssr: false },
);

// SSR and first hydration keep accessible legacy markup identical; React's
// external-store hydration boundary then switches to FlexLayout on the client.
const subscribeClientMount = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

const StableTerminalApp = memo(TerminalApp);
const StableReconApp = memo(ReconApp);
const StableUndergroundApp = memo(UndergroundApp);
const StableMarketApp = memo(MarketApp);
const StableHistoryApp = memo(HistoryApp);
const StableAppearanceApp = memo(AppearanceApp);

interface ComputerDesktopProps {
  runtime: GameSession;
  onReturnToRoom: () => void;
  onStartNewRun?: () => void;
}

const WINDOW_LABELS: Record<ComputerWindowId, string> = {
  terminal: "TERM_01",
  recon: "RECON INDEX",
  underground: "UNDERGROUND INDEX",
  market: "MARKET // RIG",
  history: "RUN HISTORY",
  settings: "SYSTEM // APPEARANCE",
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
  onStartNewRun,
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
  const cycleFocusedWindow = useUiStore((state) => state.cycleFocusedWindow);
  const distroId = usePresentationStore((state) => state.distroId);
  const themeId = usePresentationStore((state) => state.themeId);
  const textScale = usePresentationStore((state) => state.textScale);
  const motionMode = usePresentationStore((state) => state.motionMode);
  const transparencyMode = usePresentationStore(
    (state) => state.transparencyMode,
  );
  const densityMode = usePresentationStore((state) => state.densityMode);
  const contrastMode = usePresentationStore((state) => state.contrastMode);
  const distro = DISTRO_PROFILES[distroId];
  const shellLayout = shellLayoutFor(distroId);
  // Server/first hydration keeps the existing accessible window markup;
  // the real FlexLayout desktop mounts after hydration, not during SSR.
  const dockingMounted = useSyncExternalStore(
    subscribeClientMount,
    getClientMounted,
    getServerMounted,
  );

  const renderDockedApp = useCallback((id: ComputerWindowId) => {
    switch (id) {
      case "terminal":
        return <StableTerminalApp runtime={runtime} onStartNewRun={onStartNewRun} />;
      case "recon":
        return <StableReconApp runtime={runtime} />;
      case "underground":
        return <StableUndergroundApp runtime={runtime} />;
      case "market":
        return <StableMarketApp runtime={runtime} />;
      case "history":
        return <StableHistoryApp runtime={runtime} />;
      case "settings":
        return <StableAppearanceApp />;
    }
  }, [runtime, onStartNewRun]);


  const orientationModalOpen = useOnboardingStore(
    (state) => state.orientationModalOpen,
  );
  const legendModalOpen = useOnboardingStore((state) => state.legendModalOpen);
  const closeOrientationModal = useOnboardingStore(
    (state) => state.closeOrientationModal,
  );
  const closeLegendModal = useOnboardingStore((state) => state.closeLegendModal);
  const hydrateOnboarding = useOnboardingStore((state) => state.hydrate);
  const openOrientationModal = useOnboardingStore(
    (state) => state.openOrientationModal,
  );
  const openLegendModal = useOnboardingStore((state) => state.openLegendModal);

  useEffect(() => {
    hydrateOnboarding();
  }, [hydrateOnboarding]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape closes open modals or active window
      if (event.key === "Escape") {
        if (orientationModalOpen) {
          event.preventDefault();
          closeOrientationModal();
          return;
        }
        if (legendModalOpen) {
          event.preventDefault();
          closeLegendModal();
          return;
        }
        if (focusedWindow) {
          event.preventDefault();
          closeWindow(focusedWindow);
          return;
        }
      }

      // While a modal owns focus, global app/window shortcuts must stay dormant.
      // Escape is handled above; the modal focus trap owns all remaining keys.
      if (orientationModalOpen || legendModalOpen) {
        return;
      }

      // F1 opens Glossary modal
      if (event.key === "F1") {
        event.preventDefault();
        openLegendModal();
        return;
      }

      // Alt+1..6 and Alt+W window shortcuts
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === "1") {
          event.preventDefault();
          openWindow("terminal");
        } else if (event.key === "2") {
          event.preventDefault();
          openWindow("recon");
        } else if (event.key === "3") {
          event.preventDefault();
          openWindow("underground");
        } else if (event.key === "4") {
          event.preventDefault();
          openWindow("market");
        } else if (event.key === "5") {
          event.preventDefault();
          openWindow("history");
        } else if (event.key === "6") {
          event.preventDefault();
          openWindow("settings");
        } else if (event.key.toLowerCase() === "w") {
          event.preventDefault();
          cycleFocusedWindow(event.shiftKey ? "backward" : "forward");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    orientationModalOpen,
    legendModalOpen,
    closeOrientationModal,
    closeLegendModal,
    focusedWindow,
    closeWindow,
    openWindow,
    cycleFocusedWindow,
    openLegendModal,
  ]);

  return (
    <section
      className="desktop-surface"
      data-distro={distroId}
      data-shell-mode={shellLayout.mode}
      data-theme={themeId}
      data-color-mode={themeModeFor(distroId, themeId)}
      data-text-scale={textScale}
      data-motion-mode={motionMode}
      data-transparency={transparencyMode}
      data-density={densityMode}
      data-contrast={contrastMode}
      aria-label={`${distro.label} computer`}
    >
      <header className="os-bar">
        <div className="os-brand">
          <span className="status-dot" />
          {distro.label}
        </div>
        <div className="os-stats">
          <span>{handle}</span>
          <span>RANK #{rank.toLocaleString("en-US")}</span>
          <span>{credits.toLocaleString("en-US")} cr</span>
          <span>{formatWorldTime(worldMinute)}</span>
        </div>
        {/* Guidance buttons and ROOM share one wrapper so that, when the bar
            wraps on a narrow screen, they wrap together and stay in DOM order. */}
        <div className="os-actions">
          <div className="os-guidance-actions">
            {onStartNewRun && (
              <Button
                variant="ghost"
                size="sm"
                className="os-help-button"
                onClick={onStartNewRun}
                title="Start a fresh simulation run with a new random seed"
                aria-label="Start fresh simulation run"
              >
                + NEW RUN
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="os-help-button"
              onClick={openLegendModal}
              title="Open system symbols & truth vocabulary glossary (F1)"
              aria-label="Open system glossary (F1)"
            >
              ? GLOSSARY
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="os-help-button"
              onClick={openOrientationModal}
              title="Open operational orientation briefing"
              aria-label="Open operational orientation briefing"
            >
              DIRECTIVES
            </Button>
          </div>
          <Button className="os-room-button" onClick={onReturnToRoom}>
            ROOM
          </Button>
        </div>
      </header>

      <div className="desktop-workspace">
        <DesktopLauncher
          distroId={distroId}
          openWindows={openWindows}
          focusedWindow={focusedWindow}
          onOpenWindow={openWindow}
          onOpenGlossary={openLegendModal}
        />

        <div className="desktop-grid" aria-hidden="true" />

        <FieldDirectives runtime={runtime} />
        <OrientationModal />
        <SystemLegendModal />

        {dockingMounted ? (
          <DockingWorkspace
            key={distroId}
            distroId={distroId}
            colorMode={themeModeFor(distroId, themeId)}
            openWindows={openWindows}
            focusedWindow={focusedWindow}
            onFocus={focusWindow}
            onClose={closeWindow}
            renderApp={renderDockedApp}
          />
        ) : (
        <AnimatePresence initial={false}>
          {openWindows.includes("terminal") && (
            <WindowFrame
              key="terminal"
              id="terminal"
              title={WINDOW_LABELS.terminal}
              focused={focusedWindow === "terminal"}
              onFocus={() => focusWindow("terminal")}
              onClose={() => closeWindow("terminal")}
            >
              <StableTerminalApp runtime={runtime} onStartNewRun={onStartNewRun} />
            </WindowFrame>
          )}

          {openWindows.includes("recon") && (
            <WindowFrame
              key="recon"
              id="recon"
              title={WINDOW_LABELS.recon}
              focused={focusedWindow === "recon"}
              onFocus={() => focusWindow("recon")}
              onClose={() => closeWindow("recon")}
            >
              <StableReconApp runtime={runtime} />
            </WindowFrame>
          )}

          {openWindows.includes("underground") && (
            <WindowFrame
              key="underground"
              id="underground"
              title={WINDOW_LABELS.underground}
              focused={focusedWindow === "underground"}
              onFocus={() => focusWindow("underground")}
              onClose={() => closeWindow("underground")}
            >
              <StableUndergroundApp runtime={runtime} />
            </WindowFrame>
          )}

          {openWindows.includes("market") && (
            <WindowFrame
              key="market"
              id="market"
              title={WINDOW_LABELS.market}
              focused={focusedWindow === "market"}
              onFocus={() => focusWindow("market")}
              onClose={() => closeWindow("market")}
            >
              <StableMarketApp runtime={runtime} />
            </WindowFrame>
          )}
          {openWindows.includes("history") && (
            <WindowFrame
              key="history"
              id="history"
              title={WINDOW_LABELS.history}
              focused={focusedWindow === "history"}
              onFocus={() => focusWindow("history")}
              onClose={() => closeWindow("history")}
            >
              <StableHistoryApp runtime={runtime} />
            </WindowFrame>
          )}
          {openWindows.includes("settings") && (
            <WindowFrame
              key="settings"
              id="settings"
              title={WINDOW_LABELS.settings}
              focused={focusedWindow === "settings"}
              onFocus={() => focusWindow("settings")}
              onClose={() => closeWindow("settings")}
            >
              <StableAppearanceApp />
            </WindowFrame>
          )}
        </AnimatePresence>
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
  const reducedMotion = useEffectiveReducedMotion();

  return (
    <motion.section
      {...getWindowMotionProps(reducedMotion)}
      className={`os-window os-window-${id} ${focused ? "is-focused" : ""}`}
      onMouseDown={onFocus}
      aria-label={title}
      tabIndex={-1}
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
    </motion.section>
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
              <RunTimeline
                key={`${run.endingStatus}:${run.endingWorldMinute}:${index}`}
                run={run}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface TerminalItem {
  id: string;
  type: "system" | "prompt" | "result" | "error" | "table";
  text: string;
  badge?: string;
  glyph?: string;
}

function TerminalApp({
  runtime,
  onStartNewRun,
}: {
  runtime: GameRuntime;
  onStartNewRun?: () => void;
}) {
  const [input, setInput] = useState("");
  const clock = useClockControl();
  const [items, setItems] = useState<TerminalItem[]>([
    {
      id: "init-0",
      type: "system",
      text: TERMINAL_WELCOME_HEADER[0],
    },
    {
      id: "init-1",
      type: "system",
      text: TERMINAL_WELCOME_HEADER[1],
    },
  ]);

  const submitCommand = (rawCommand: string) => {
    const raw = rawCommand.trim();
    if (!raw) {
      return;
    }

    const promptId = `prompt-${Date.now()}`;

    if (raw.toLowerCase() === "help") {
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        { id: `help-${Date.now()}`, type: "table", text: TERMINAL_HELP_TABLE + "\nNETWORK ROUTES: path map <target>  |  help path" },
      ]);
      return;
    }

    if (raw.toLowerCase().startsWith("help ")) {
      const topic = raw.slice(5).trim();
      const detailed = topic.toLowerCase() === "path"
        ? "path map <target> | path inspect <target> <challenge> <route> | path preview <target> <challenge> <route> | path test <target> <challenge> <route>"
        : formatDetailedHelp(topic);
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `help-${Date.now()}`,
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `story-${Date.now()}`,
          type: "table",
          text: formatNarrativeTerminalView(read),
        },
      ]);
      return;
    }

    // Generic read-only network queries use the same player-safe data as Recon.
    const routeRead = renderNetworkRouteQuery(raw, projectWorld(runtime.snapshot()).networkRoutes);
    if (routeRead !== null) {
      setItems(current => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        { id: `path-${Date.now()}`, type: "table", text: routeRead },
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `brief-${Date.now()}`,
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `preview-${Date.now()}`,
          type: "table",
          text: preview
            ? briefingPreviewLines(preview).join("\n")
            : "No briefing is open for a preview.",
        },
      ]);
      return;
    }

    if (raw.toLowerCase() === "legend") {
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        { id: `legend-${Date.now()}`, type: "table", text: TERMINAL_LEGEND_TABLE },
      ]);
      return;
    }

    if (raw.toLowerCase() === "guide") {
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        { id: `guide-${Date.now()}`, type: "table", text: TERMINAL_GUIDE_TABLE },
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
        setItems((current) => [
          ...current,
          { id: promptId, type: "prompt", text: raw },
          { id: `run-${Date.now()}`, type: "table", text: runTable },
        ]);
        return;
      }
      if (sub === "new") {
        if (onStartNewRun) {
          onStartNewRun();
          setItems((current) => [
            ...current,
            { id: promptId, type: "prompt", text: raw },
            {
              id: `res-${Date.now()}`,
              type: "result",
              badge: "NEW_RUN_INITIATED",
              glyph: "✦",
              text: "Fresh run initialization requested. Reviewing run lifecycle...",
            },
          ]);
        } else {
          setItems((current) => [
            ...current,
            { id: promptId, type: "prompt", text: raw },
            {
              id: `err-${Date.now()}`,
              type: "error",
              badge: "UNAVAILABLE",
              glyph: "✖",
              text: "Run lifecycle manager is not attached in this session context.",
            },
          ]);
        }
        return;
      }
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `err-${Date.now()}`,
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        { id: `settings-${Date.now()}`, type: "table", text: summaryTable },
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
        setItems((current) => [
          ...current,
          { id: promptId, type: "prompt", text: raw },
          {
            id: `res-${Date.now()}`,
            type: "result",
            badge: "CONFIG_SET",
            glyph: "✦",
            text: successMessage,
          },
        ]);
      } else {
        setItems((current) => [
          ...current,
          { id: promptId, type: "prompt", text: raw },
          {
            id: `err-${Date.now()}`,
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

      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        reply.kind === "result"
          ? {
              id: `res-${Date.now()}`,
              type: "result",
              badge: reply.badge,
              glyph: reply.glyph,
              text: reply.text,
            }
          : {
              id: `err-${Date.now()}`,
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `err-${Date.now()}`,
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `res-${Date.now()}`,
          type: "result",
          badge: rich.badge,
          glyph: rich.glyph,
          text: rich.text,
        },
        ...(parsed.command.type === "startNarrative" ||
           parsed.command.type === "chooseNarrative"
          ? [{
              id: `story-${Date.now()}`,
              type: "table" as const,
              text: formatNarrativeTerminalView(projectWorld(runtime.snapshot()).narrative),
            }]
          : []),
        ...notices.map((notice, index) => ({
          id: `briefing-${Date.now()}-${index}`,
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
      setItems((current) => [
        ...current,
        { id: promptId, type: "prompt", text: raw },
        {
          id: `err-${Date.now()}`,
          type: "error",
          badge: err.badge,
          glyph: err.glyph,
          text: err.text,
        },
      ]);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = input.trim();
    if (!raw) {
      return;
    }
    setInput("");
    submitCommand(raw);
  };

  return (
    <div className="terminal-app">
      <ContextualHint
        id="hint:terminal-commands"
        title="COMMAND DISCOVERY"
        description="Type 'help' for directory, 'help <cmd>' for syntax, or click any command chip below to discover terminal capabilities."
      />

      <div className="terminal-output" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`terminal-entry terminal-entry-${item.type}`}>
            {item.type === "prompt" && (
              <span className="terminal-entry-prompt">&gt; {item.text}</span>
            )}
            {item.type === "system" && <span>{item.text}</span>}
            {item.type === "table" && (
              <pre className="terminal-table-pre">{item.text}</pre>
            )}
            {item.type === "result" && (
              <div className="terminal-entry-result">
                <span className="terminal-badge badge-success">
                  {item.glyph} {item.badge}
                </span>
                <span>{item.text}</span>
              </div>
            )}
            {item.type === "error" && (
              <div className="terminal-entry-error">
                <span className="terminal-badge badge-error">
                  {item.glyph} {item.badge}
                </span>
                <span>{item.text}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <CommandDiscovery onSelectCommand={(cmd) => setInput(cmd)} />

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
      <Input
        aria-label={`Rename machine ${machineId}`}
        autoComplete="off"
        maxLength={24}
        placeholder={`rename "${currentLabel}"`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={trimmed.length === 0}>
        NAME
      </Button>
    </form>
  );
}

function ReconApp({ runtime }: { runtime: GameRuntime }) {
  const briefingJson = useCell("briefing", "current", "json", runtime.projection);
  const briefingView = useMemo(
    () => parseBriefingView(briefingJson),
    [briefingJson],
  );

  return (
    <BriefingProvider runtime={runtime} view={briefingView}>
      <ReconAppBody runtime={runtime} />
    </BriefingProvider>
  );
}

function ReconAppBody({ runtime }: { runtime: GameRuntime }) {
  const briefing = useBriefing();
  const [manualTargetId, setManualTargetId] = useState<string | null>(null);
  const [observeFeedback, setObserveFeedback] = useState<string | null>(null);
  const topologyRef = useRef<HTMLDivElement>(null);
  const targetIds = useRowIds("targets", runtime.projection);
  const contractRows = useTable("contracts", runtime.projection);
  const worldMinute = Number(useCell("meta", "world", "worldMinute", runtime.projection) ?? 0);
  const opening = deriveOpeningReconCue({
    contracts: contractRows,
    observedTargetIds: targetIds,
    worldMinute,
  });
  // A human override stays intact. Otherwise the initial target follows only
  // live player-visible offers; never a fabricated Nightshade fallback.
  const targetId = manualTargetId ?? opening?.targetId ?? "";
  const machineIds = useRowIds("machines", runtime.projection);
  const reactionIds = useRowIds("reactions", runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const services = useTable("services", runtime.projection);
  const machines = useTable("machines", runtime.projection);
  const footprint = useRow("footprint", "current", runtime.projection);
  const analysisIds = useRowIds("analysisClaims", runtime.projection);
  const operationTargetId = String(operation.targetId ?? "");
  const operationStage = String(operation.stage ?? "");
  const operationEvidenceCount = Object.values(services).filter(
    (service) => service.targetId === operationTargetId,
  ).length;
  const operationMachineCount = Object.values(machines).filter(
    (machine) => machine.targetId === operationTargetId,
  ).length;
  const operationSummary = operationTargetId
    ? {
        targetId: operationTargetId,
        stage: operationStage,
        openedWorldMinute: Number(operation.openedWorldMinute ?? 0),
        ...(operation.escalatedWorldMinute === undefined
          ? {}
          : { escalatedWorldMinute: Number(operation.escalatedWorldMinute) }),
      }
    : null;
  // With the Nightshade briefing the authoritative preview names the blocker;
  // otherwise the same evidence rule the CommandBus enforces decides it.
  const escalateBlocker = briefing
    ? (briefing.view.preview?.escalate.blockedBy ?? null)
    : operationEvidenceCount > 0
      ? null
      : "SERVICE_EVIDENCE_REQUIRED";

  const observe = (requestedTarget = targetId) => {
    const normalized = requestedTarget.trim().toLowerCase();
    if (!normalized) {
      setObserveFeedback("No target selected. Check the public Index for a current lead.");
      return;
    }

    const command = observeTargetFromGui(normalized);
    const result = briefing ? briefing.run(command) : runtime.execute(command);
    setObserveFeedback(result.ok
      ? `OBSERVED: ${normalized}. Open its operation to survey the perimeter.`
      : "OBSERVE BLOCKED: this ID is not an accessible target. Check the Index or a known profile.");
  };

  return (
    <div className="recon-app recon-workstation">
      <ReconStationHeader
        observedTargets={targetIds.length}
        knownMachines={machineIds.length}
        activeEvidence={operationEvidenceCount}
        activeOperation={operationTargetId.length > 0}
        onViewTopology={() => {
          topologyRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
          topologyRef.current?.focus({ preventScroll: true });
        }}
      />

      <Card className="recon-target-card">
        <CardHeader className="recon-target-card-heading">
          <CardTitle>TARGET ACQUISITION</CardTitle>
          <Badge variant="outline">
            {opening ? (targetIds.includes(opening.targetId) ? "PROFILE OBSERVED" : "UNVERIFIED LEAD") : "NO PUBLIC LEAD"}
          </Badge>
        </CardHeader>
        <CardContent className="recon-target-card-body">
      <div className="recon-lead" aria-label="Public opening Recon lead">
        <div>
          <span className="panel-label">PLAYER-KNOWN OPENING LEAD</span>
          <strong>{opening ? opening.label : "No public target yet"}</strong>
          {opening?.source === "contract" && <small>Commission reference: {opening.contractId}</small>}
        </div>
        {opening && (
          targetIds.includes(opening.targetId)
            ? <TruthMark level="observed" label="OBSERVED PROFILE" />
            : <TruthMark level="unknown" label="UNVERIFIED" />
        )}
      </div>

      <div className="recon-command">
        <Input
          aria-label="Target identifier"
          value={targetId}
          placeholder={opening ? opening.targetId : "Use a public target ID"}
          onChange={(event) => {
            setManualTargetId(event.target.value);
            setObserveFeedback(null);
          }}
        />
        <Button size="sm" onClick={() => observe()}>
          OBSERVE
        </Button>
      </div>
      {observeFeedback && (
        <p role="status" className="analysis-caveat">{observeFeedback}</p>
      )}

        </CardContent>
      </Card>

      {briefing ? <NightshadeBriefingPanel /> : null}

      <div className="recon-tactical-workspace" aria-label="Recon map and operation instruments">
        <div className="recon-topology-stage" ref={topologyRef} tabIndex={-1}>
      <ReconTopology
        targetId={operationTargetId || targetId.trim().toLowerCase() || (targetIds[0] ?? "")}
        runtime={runtime}
      />

        </div>
        <aside className="recon-ops-sidebar" aria-label="Operation instruments">
      <OperationPressureDesk
        operation={operationSummary}
        worldMinute={worldMinute}
        evidenceCount={operationEvidenceCount}
        machineCount={operationMachineCount}
        footprintLevel={String(footprint.level ?? "none")}
        traceCount={Number(footprint.traceCount ?? 0)}
        escalateBlocker={escalateBlocker}
        escalateNeedsConfirmation={Boolean(briefing)}
        onAct={(action) => {
          if (briefing) {
            briefing.request(action);
            return null;
          }
          return runtime.execute(
            action === "escalate"
              ? escalateOperationFromGui()
              : disengageOperationFromGui(),
          );
        }}
      />

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
        </aside>
      </div>

      <ContextualHint
        id="hint:recon-lead"
        title="PASSIVE RECONNAISSANCE"
        description={opening
          ? `Public commission / known profile: ${opening.label}. OBSERVE verifies its profile; it does not prove rumors or unlock the target by rank.`
          : "No public target is currently available. Check Underground for visible offers before observing; no target ID is assumed."}
        {...(opening ? { commandSuggestion: `observe ${opening.targetId}` } : {})}
        onRunCommand={(cmd) => {
          const parts = cmd.trim().split(" ");
          if (parts[0] === "observe" && parts[1]) observe(parts[1]);
        }}
      />

      <div className="recon-intel-archive" aria-label="Additional observed intelligence">


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
        <ConfidenceMeter confidence={String(claim.confidence ?? "low")} />
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
  const briefing = useBriefing();
  const target = useRow("targets", targetId, runtime.projection);
  const operation = useRow("operation", "active", runtime.projection);
  const operationTargetId = String(operation.targetId ?? "");
  const isActiveTarget = operationTargetId === targetId;
  const operationElsewhere =
    operationTargetId.length > 0 && !isActiveTarget;

  const act = () => {
    const command = isActiveTarget
      ? surveyTargetFromGui(targetId)
      : openOperationFromGui(targetId);

    if (briefing) {
      briefing.run(command);
    } else {
      runtime.execute(command);
    }
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
  const briefing = useBriefing();
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
            onClick={() => {
              const command = inspectMachineFromGui(machineId);
              if (briefing) {
                briefing.run(command);
              } else {
                runtime.execute(command);
              }
            }}
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
  const [recordPage, setRecordPage] = useState(0);
  const board = useTable("board", runtime.projection);
  const feed = useTable("feed", runtime.projection);
  const stances = useTable("stances", runtime.projection);
  const inbox = useTable("inbox", runtime.projection);
  const contractTable = useTable("contracts", runtime.projection);
  const leadTable = useTable("leads", runtime.projection);
  const civicCasesTable = useTable("civicCases", runtime.projection);
  const [civicFeedback, setCivicFeedback] = useState<string | null>(null);
  const runCivic = (command: Parameters<GameRuntime["execute"]>[0]) => {
    const result = runtime.execute(command);
    setCivicFeedback(result.ok
      ? "Action accepted. Agency responses continue on the simulation clock."
      : `Blocked: ${result.error ?? "UNAVAILABLE"}`);
  };
  const narrativeTable = useTable("narrative", runtime.projection);
  const narrativeChoicesTable = useTable("narrativeChoices", runtime.projection);
  const [narrativeFeedback, setNarrativeFeedback] = useState<string | null>(null);
  const runNarrative = (command: Parameters<GameRuntime["execute"]>[0]) => {
    const outcome = runtime.execute(command);
    if (!outcome.ok) {
      setNarrativeFeedback(`Action blocked: ${outcome.error ?? "UNAVAILABLE"}`);
      return;
    }
    const credit = outcome.events.find((event) => event.type === "ValueTransferred");
    const relation = outcome.events.find((event) => event.type === "RelationshipChanged");
    setNarrativeFeedback(credit && credit.type === "ValueTransferred"
      ? `Action accepted: +${credit.amount} credits. The subject may react.`
      : relation ? "Action accepted: the subject relationship changed."
      : "Choice recorded. No extra world time charged for dialogue.");
  };
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
  const currentWorldMinute = Number(
    useCell("meta", "world", "worldMinute", runtime.projection) ?? 0,
  );
  const machinesTable = useTable("machines", runtime.projection);
  const servicesTable = useTable("services", runtime.projection);

  const handles = useMemo(
    () =>
      Object.entries(board).sort(
        ([idA, a], [idB, b]) =>
          Number(a.rank ?? 0) - Number(b.rank ?? 0) || idA.localeCompare(idB),
      ),
    [board],
  );
  const incidents = useMemo(
    () =>
      Object.entries(feed).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [feed],
  );
  const stanceEntries = useMemo(() => Object.entries(stances), [stances]);
  const messages = useMemo(
    () =>
      Object.entries(inbox).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [inbox],
  );

  const contracts = useMemo(
    () =>
      Object.entries(contractTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.expiresWorldMinute ?? 0) -
            Number(a.expiresWorldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [contractTable],
  );

  const leads = useMemo(
    () => Object.entries(leadTable).sort(
      ([idA, a], [idB, b]) =>
        Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) || idB.localeCompare(idA),
    ),
    [leadTable],
  );

  const heat = useMemo(
    () =>
      Object.entries(retaliationTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [retaliationTable],
  );

  const descriptors = useMemo(
    () => Object.entries(descriptorTable),
    [descriptorTable],
  );
  const forumPosts = useMemo(
    () =>
      Object.entries(forumTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [forumTable],
  );
  // Phase 5 P4: the ecosystem's AI users, read-only, name and model label only.
  const assistants = useMemo(
    () =>
      Object.entries(assistantsTable).sort(([idA], [idB]) =>
        idA.localeCompare(idB),
      ),
    [assistantsTable],
  );
  // Phase 6 P1: authority case files, read as evidence lists. The stage is a
  // band and each row is a noticed thing; there is deliberately no number here
  // to read as a meter, and no minute that implies a deadline.
  const cases = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(investigationTable).map(([id, entry]) => [
          id,
          String(entry.stage ?? "probing"),
        ]),
      ),
    [investigationTable],
  );
  const signals = useMemo(
    () =>
      Object.entries(signalTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [signalTable],
  );
  const tells = useMemo(
    () =>
      Object.entries(probeTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [probeTable],
  );
  const physicalSignals = useMemo(
    () =>
      Object.entries(physicalSignalTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [physicalSignalTable],
  );
  const compromises = useMemo(
    () =>
      Object.entries(compromiseTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [compromiseTable],
  );
  const postmortems = useMemo(
    () =>
      Object.entries(postmortemTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [postmortemTable],
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
  const recordLists = [
    descriptors,
    heat,
    signals,
    tells,
    physicalSignals,
    compromises,
    postmortems,
    Object.entries(postmortemStepTable),
    contracts,
    leads,
    messages,
    forumPosts,
    handles,
    incidents,
    stanceEntries,
    assistants,
  ];
  const pageCount = recordPageCount(recordLists);

  return (
    <div className="underground-app">
      <RecordScopeControl
        page={recordPage}
        pageCount={pageCount}
        onPageChange={setRecordPage}
      />
      <section aria-label="Reputation">
        <span className="panel-label">HOW THE SCENE KNOWS YOU</span>
        {descriptors.length === 0 ? (
          <p className="underground-empty">Nobody has a word for you yet.</p>
        ) : (
          <ul className="underground-stances">
            {visibleRecords(descriptors, recordPage).map(([id, entry]) => (
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
            {visibleRecords(heat, recordPage).map(([id, entry]) => (
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
        <ContextualHint
          id="hint:underground-intel"
          title="COUNTER-INTELLIGENCE & HEAT"
          description="Rivals and corporate targets actively notice intrusions. Watch for investigation signals, probe tells, and physical heat in this log."
        />
        {signals.length === 0 &&
        tells.length === 0 &&
        physicalSignals.length === 0 ? (
          <p className="underground-empty">
            Nothing unusual in the logs. Nobody has asked about you yet.
          </p>
        ) : (
          <ul className="underground-feed">
            {visibleRecords(signals, recordPage).map(([id, entry]) => (
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
            {visibleRecords(tells, recordPage).map(([id, entry]) => (
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
            {visibleRecords(physicalSignals, recordPage).map(([id, entry]) => (
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
            {visibleRecords(compromises, recordPage).map(([id, entry]) => (
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

          {visibleRecords(postmortems, recordPage).map(([id, entry]) => (
            <div key={`postmortem:${id}`}>
              <span className="panel-label">
                POSTMORTEM {"//"}{" "}
                {String(entry.compromiseLabel ?? "COMPROMISE")} {"//"}{" "}
                {entry.attribution === "complete"
                  ? "COMPLETE"
                  : "INCOMPLETE ATTRIBUTION"}
              </span>
              <ul className="underground-feed">
                {visibleRecords(postmortemStepsFor(id), recordPage).map(([stepId, step]) => (
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

      <section aria-label="Narrative conversation">
        <span className="panel-label">INTERCEPTED CONVERSATION // INK</span>
        {!narrativeTable.current ? (
          <p className="underground-empty">Choose TALK on a public handle or STORY on an independent lead.</p>
        ) : (
          <div aria-live="polite">
            <p><strong>{String(narrativeTable.current.subjectLabel ?? "")}</strong></p>
            <p style={{ whiteSpace: "pre-line" }}>{String(narrativeTable.current.text ?? "")}</p>
            <div className="underground-lead-actions" role="group" aria-label="Narrative choices">
              {Object.entries(narrativeChoicesTable)
                .sort(([, a], [, b]) => Number(a.index ?? 0) - Number(b.index ?? 0))
                .map(([choiceId, choice]) => (
                  <button key={choiceId} type="button"
                    title={String(choice.costLabel ?? "No extra time")}
                    onClick={() => runNarrative({
                      type: "chooseNarrative",
                      sceneId: String(narrativeTable.current.id ?? ""),
                      choiceId,
                    })}>
                    {String(choice.text ?? "Select")}
                  </button>
                ))}
            </div>
            {narrativeTable.current.finished && <p>Conversation concluded.</p>}
          </div>
        )}
        {narrativeFeedback && <p role="status">{narrativeFeedback}</p>}
      </section>

      <section aria-label="Institutional records cases">
        <span className="panel-label">CIVIC RECORDS // INSTITUTIONAL CONSEQUENCES</span>
        <p className="analysis-caveat">
          Real public NPC archive incidents can trigger a local records inquiry
          or a federated response across participating offices. The inquiry
          develops as the world advances, even without your involvement.
        </p>
        {!Object.keys(civicCasesTable).length ? (
          <p className="underground-empty">No public institutional cases yet.</p>
        ) : (
          <ul className="underground-feed">
            {visibleRecords(Object.entries(civicCasesTable), recordPage).map(([id, c]) => {
              const status = String(c.status ?? "open");
              return <li key={id}>
                <p><strong>{String(c.publicBody)}</strong>{" // "}{String(c.scope)}</p>
                <p>Source: {String(c.sourceHandle)}{" // "}{String(c.responsePhase)}
                  {" // "}{String(c.publicAttention)} public attention
                  {" // "}{String(c.affectedOfficeCount)} affected offices</p>
                <p>{status.toUpperCase()}{" // "}Expires {formatWorldTime(Number(c.expiresWorldMinute ?? 0))}</p>
                {c.knownTargetHandle && <p>Known host: {String(c.knownTargetHandle)}</p>}
                <small>Case ID: {id}</small>
                {(status === "open" || status === "mapped") && (
                  <div className="underground-lead-actions" role="group"
                    aria-label={`Case actions for ${id}`}>
                    {status === "open" && (
                      <button type="button" onClick={() => runCivic({
                        type: "mapInstitutionalCase", caseId: id,
                      })}>MAP EVIDENCE</button>
                    )}
                    {(status === "mapped"
                      ? ["disclose", "handoff", "sell", "suppress", "walk-away"]
                      : ["walk-away"]).map(choice => (
                      <button type="button" key={choice}
                        onClick={() => runCivic({
                          type: "resolveInstitutionalCase", caseId: id,
                          choice: choice as "disclose" | "handoff" | "sell" | "suppress" | "walk-away",
                        })}>{choice.toUpperCase()}</button>
                    ))}
                  </div>
                )}
              </li>;
            })}
          </ul>
        )}
        {civicFeedback && <p role="status">{civicFeedback}</p>}
      </section>

      <section aria-label="Independent leads">
        <span className="panel-label">INDEPENDENT LEADS // NO BROKER REQUIRED</span>
        <p className="analysis-caveat">
          Incidents and relayed claims can open a lead. Map an involved host with Recon
          before taking action. A mapped host does not prove a rumored outcome.
          Leads expire while the world continues.
        </p>
        {leads.length === 0 ? (
          <p className="underground-empty">No independent leads surfaced yet.</p>
        ) : (
          <ul className="underground-feed">
            {visibleRecords(leads, recordPage).map(([id, lead]) => {
              const status = String(lead.status ?? "open");
              return (
                <li key={id}>
                  <div>
                    <span className="underground-time">
                      {String(lead.origin) === "relay-report" ? "UNVERIFIED RELAY" : "PUBLIC INCIDENT"}
                      {" // "}{formatWorldTime(Number(lead.worldMinute ?? 0))}
                      {" // EXPIRES "}{formatWorldTime(Number(lead.expiresWorldMinute ?? 0))}
                    </span>
                    <p>
                      {String(lead.actorHandle ?? "?")} vs {String(lead.counterpartHandle ?? "?")}
                      {" // "}{String(lead.claimOutcome ?? "unknown")}
                      {" // "}<strong>{status.toUpperCase()}</strong>
                    </p>
                    {lead.targetHandle && <p>Mapped host: {String(lead.targetHandle)}</p>}
                    {(status === "open" || status === "mapped") && (
                      <button type="button" onClick={() => runNarrative({
                        type: "startNarrative", storyId: "g9.lead-dilemma.v1", refId: id,
                      })}>STORY // DECIDE</button>
                    )}
                    <small>Lead ID: {id}</small>
                    {(status === "open" || status === "mapped") && (
                      <div className="underground-lead-actions">
                        {status === "open" ? (
                          <button type="button" onClick={() =>
                            runtime.execute({ type: "investigateLead", leadId: id })
                          }>INVESTIGATE</button>
                        ) : (["disclose", "trade", "exploit"] as const).map((approach) => (
                          <button key={approach} type="button" onClick={() =>
                            runtime.execute({ type: "resolveLead", leadId: id, approach })
                          }>{approach.toUpperCase()}</button>
                        ))}
                        <button type="button" onClick={() =>
                          runtime.execute({ type: "resolveLead", leadId: id, approach: "ignore" })
                        }>IGNORE</button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Contracts">
        <span className="panel-label">CONTRACTS</span>
        <ContextualHint
          id="hint:contracts-delivery"
          title="CONTRACT COMMISSIONS"
          description="Contracts require verified host machines or services before delivery. Gather intelligence in Recon topology to fulfill requirements before deadlines expire."
        />
        {contracts.length === 0 ? (
          <p className="underground-empty">No work on offer.</p>
        ) : (
          <div className="underground-contracts-list">
            {visibleRecords(contracts, recordPage).map(([id, entry]) => {
              const targetId = String(entry.targetId ?? "");
              const currentKnownMachines = Object.values(machinesTable).filter(
                (m) => m.targetId === targetId,
              ).length;
              const currentKnownServices = Object.values(servicesTable).filter(
                (s) => s.targetId === targetId,
              ).length;

              return (
                <ContractCard
                  key={id}
                  contract={{
                    id,
                    issuerHandle: String(entry.issuerHandle ?? "unknown"),
                    issuerOrganization:
                      entry.issuerOrganization === undefined
                        ? undefined
                        : String(entry.issuerOrganization),
                    targetId,
                    targetHandle: String(entry.targetHandle ?? "unknown"),
                    objective: String(entry.objective ?? ""),
                    status: String(entry.status ?? ""),
                    expiresWorldMinute: Number(entry.expiresWorldMinute ?? 0),
                    dueWorldMinute: entry.dueWorldMinute ? Number(entry.dueWorldMinute) : undefined,
                    requiredMachines: entry.requiredMachines ? Number(entry.requiredMachines) : undefined,
                    requiredServices: entry.requiredServices ? Number(entry.requiredServices) : undefined,
                    currentKnownMachines,
                    currentKnownServices,
                    sceneIntel: deriveContractSceneIntel({
                      targetHandle: String(entry.targetHandle ?? ""),
                      currentWorldMinute,
                      // These are TinyBase copies of the PUBLIC feed and player
                      // inbox; we never access raw incidents, NPC factions, or
                      // hidden rumor truth from this player-facing component.
                      incidents: incidents.map(([sourceId, row]) => ({
                        id: sourceId,
                        actorHandle: String(row.actorHandle ?? ""),
                        counterpartHandle: String(row.counterpartHandle ?? ""),
                        outcome: String(row.outcome ?? ""),
                        worldMinute: Number(row.worldMinute ?? 0),
                      })),
                      messages: messages.map(([sourceId, row]) => ({
                        id: sourceId,
                        fromHandle: String(row.fromHandle ?? ""),
                        claimActorHandle: String(row.claimActorHandle ?? ""),
                        claimCounterpartHandle: String(row.claimCounterpartHandle ?? ""),
                        claimOutcome: String(row.claimOutcome ?? ""),
                        worldMinute: Number(row.worldMinute ?? 0),
                        read: row.read === true,
                      })),
                    }),
                  }}
                  currentWorldMinute={currentWorldMinute}
                  onAction={(verb, contractId) =>
                    runtime.execute(contractActionFromGui(verb, contractId))
                  }
                />
              );
            })}
          </div>
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
            {visibleRecords(messages, recordPage).map(([id, entry]) => (
              <li key={id} className={entry.read ? undefined : "is-unread"}>
                <div>
                  <span className="underground-time">
                    {formatWorldTime(Number(entry.worldMinute ?? 0))} ·{" "}
                    {String(entry.fromHandle ?? "unknown")} · {id}
                  </span>
                  <div>
                    <span>
                      {describeIncidentCopy(
                        "message",
                        id,
                        String(entry.claimActorHandle ?? "unknown"),
                        String(entry.claimCounterpartHandle ?? "unknown"),
                        String(entry.claimOutcome ?? ""),
                      )}{" "}
                    </span>
                    <TruthMark level="rumored" label="UNVERIFIED" />
                  </div>
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
            {visibleRecords(forumPosts, recordPage).map(([id, entry]) => (
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
          {visibleRecords(handles, recordPage).map(([id, entry]) => {
            const handle = String(entry.handle ?? id);
            const stanceEntry = stanceEntries.find(([, s]) => String(s.handle ?? "") === handle);
            const heatEntry = heat.find(([, h]) => String(h.actorHandle ?? "") === handle);

            return (
              <li
                key={id}
                className={entry.isPlayer ? "is-player" : undefined}
              >
                <div className="board-handle-col">
                  <span>{handle}</span>
                  <RelationshipBadge
                    isPlayer={Boolean(entry.isPlayer)}
                    stance={stanceEntry ? String(stanceEntry[1].stance ?? "") : null}
                    hasHeat={Boolean(heatEntry)}
                    heatKind={heatEntry ? String(heatEntry[1].kind ?? "") : null}
                    showHeatDetail={false}
                  />
                </div>
                <span>#{Number(entry.rank ?? 0).toLocaleString("en-US")}</span>
                {!entry.isPlayer && (
                  <button type="button" aria-label={`Talk to ${handle}`}
                    onClick={() => runNarrative({
                      type: "startNarrative",
                      storyId: "g9.npc-relay.v1", refId: id,
                    })}>TALK</button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Public feed">
        <span className="panel-label">PUBLIC FEED</span>
        {incidents.length === 0 ? (
          <p className="underground-empty">Nothing public yet.</p>
        ) : (
          <ul className="underground-feed">
            {visibleRecords(incidents, recordPage).map(([id, entry]) => (
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
          <div className="underground-stances-grid">
            {visibleRecords(stanceEntries, recordPage).map(([id, entry]) => {
              const handle = String(entry.handle ?? id);
              const heatEntry = heat.find(([, h]) => String(h.actorHandle ?? "") === handle);

              return (
                <div key={id} className="stance-card">
                  <span className="stance-handle">{handle}</span>
                  <RelationshipBadge
                    stance={String(entry.stance ?? "neutral")}
                    hasHeat={Boolean(heatEntry)}
                    heatKind={heatEntry ? String(heatEntry[1].kind ?? "") : null}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Peer assistants">
        <span className="panel-label">PEER ASSISTANTS // ECOSYSTEM AI</span>
        {assistants.length === 0 ? (
          <p className="underground-empty">No one in the scene is running an assistant.</p>
        ) : (
          <ul className="underground-assistants">
            {visibleRecords(assistants, recordPage).map(([id, entry]) => (
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
  const [recordPage, setRecordPage] = useState(0);
  const credits = Number(
    useCell("meta", "wallet", "credits", runtime.projection) ?? 0,
  );
  const dailyCost = Number(
    useCell("meta", "wallet", "dailyCost", runtime.projection) ?? 0,
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

  const ownedHardware = useMemo(
    () =>
      Object.entries(hardwareTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.acquiredWorldMinute ?? 0) -
            Number(b.acquiredWorldMinute ?? 0) ||
          idA.localeCompare(idB, undefined, { numeric: true }),
      ),
    [hardwareTable],
  );

  const catalog = useMemo(
    () =>
      Object.entries(catalogTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.cost ?? 0) - Number(b.cost ?? 0) || idA.localeCompare(idB),
      ),
    [catalogTable],
  );

  const housing = useMemo(
    () =>
      Object.entries(housingTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.dailyCost ?? 0) - Number(b.dailyCost ?? 0) ||
          idA.localeCompare(idB),
      ),
    [housingTable],
  );

  const software = useMemo(
    () =>
      Object.entries(softwareTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.dailyCost ?? 0) - Number(b.dailyCost ?? 0) ||
          idA.localeCompare(idB),
      ),
    [softwareTable],
  );

  const ownedTools = useMemo(
    () =>
      Object.entries(ownedToolsTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.acquiredWorldMinute ?? 0) -
            Number(b.acquiredWorldMinute ?? 0) ||
          idA.localeCompare(idB, undefined, { numeric: true }),
      ),
    [ownedToolsTable],
  );

  const toolListings = useMemo(
    () =>
      Object.entries(toolListingsTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.cost ?? 0) - Number(b.cost ?? 0) || idA.localeCompare(idB),
      ),
    [toolListingsTable],
  );

  const ownedMachines = useMemo(
    () =>
      Object.entries(ownedMachinesTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.acquiredWorldMinute ?? 0) -
            Number(b.acquiredWorldMinute ?? 0) ||
          idA.localeCompare(idB, undefined, { numeric: true }),
      ),
    [ownedMachinesTable],
  );

  const machineListings = useMemo(
    () =>
      Object.entries(machineListingsTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.cost ?? 0) - Number(b.cost ?? 0) || idA.localeCompare(idB),
      ),
    [machineListingsTable],
  );

  const models = useMemo(
    () =>
      Object.entries(modelsTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.cost ?? 0) - Number(b.cost ?? 0) ||
          Number(a.dailyCost ?? 0) - Number(b.dailyCost ?? 0) ||
          idA.localeCompare(idB),
      ),
    [modelsTable],
  );

  const forgeSpecs = useMemo(
    () =>
      Object.entries(forgeSpecsTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.estimatedMinutes ?? 0) -
            Number(b.estimatedMinutes ?? 0) ||
          idA.localeCompare(idB),
      ),
    [forgeSpecsTable],
  );

  // The queue reads like a build log: soonest deadline first.
  const buildQueue = useMemo(
    () =>
      Object.entries(buildQueueTable).sort(
        ([idA, a], [idB, b]) =>
          Number(a.dueWorldMinute ?? 0) - Number(b.dueWorldMinute ?? 0) ||
          idA.localeCompare(idB, undefined, { numeric: true }),
      ),
    [buildQueueTable],
  );

  const ownedWorkflows = useMemo(
    () =>
      Object.entries(ownedWorkflowsTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.acquiredWorldMinute ?? 0) -
            Number(a.acquiredWorldMinute ?? 0) ||
          idA.localeCompare(idB, undefined, { numeric: true }),
      ),
    [ownedWorkflowsTable],
  );

  const assistantRunning = String(assistant.modelId ?? "").length > 0;

  const ledger = useMemo(
    () =>
      Object.entries(ledgerTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.worldMinute ?? 0) - Number(a.worldMinute ?? 0) ||
          idB.localeCompare(idA, undefined, { numeric: true }),
      ),
    [ledgerTable],
  );

  // Re-apply the graph's volume ordering here so the panel is stable even
  // though TinyBase table keys carry no guaranteed order across re-syncs.
  const valueNodes = useMemo(
    () =>
      Object.entries(valueNodesTable).sort(
        ([idA, a], [idB, b]) =>
          Number(b.paid ?? 0) +
            Number(b.received ?? 0) -
            (Number(a.paid ?? 0) + Number(a.received ?? 0)) ||
          idA.localeCompare(idB),
      ),
    [valueNodesTable],
  );
  const recordLists = [
    ownedHardware,
    catalog,
    housing,
    software,
    ownedTools,
    toolListings,
    ownedMachines,
    machineListings,
    models,
    forgeSpecs,
    buildQueue,
    ownedWorkflows,
    valueNodes,
    ledger,
  ];
  const pageCount = recordPageCount(recordLists);

  return (
    <div className="market-app">
      <RecordScopeControl
        page={recordPage}
        pageCount={pageCount}
        onPageChange={setRecordPage}
      />
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

      {/* Market merchandise takes visual priority over rig telemetry. */}
      <section aria-label="Catalog" className="hardware-market-section">
        <div className="hardware-market-heading">
          <div>
            <span className="panel-label">EQUIPMENT EXCHANGE</span>
            <h2>Hardware catalog</h2>
            <p>Build your rig. Every upgrade changes compute capability, never your rank.</p>
          </div>
          <span className="hardware-market-count">{catalog.length} listed</span>
        </div>
        {catalog.length === 0 ? (
          <p className="market-empty">Nothing listed.</p>
        ) : (
          <ul className="market-catalog hardware-product-grid">
            {visibleRecords(catalog, recordPage).map(([id, entry]) => (
              <HardwareProductCard
                key={id}
                item={presentHardwareItem(
                  id,
                  {
                    label: String(entry.label ?? id),
                    category: String(entry.category ?? ""),
                    cost: Number(entry.cost ?? 0),
                    compute: Number(entry.compute ?? 0),
                    memory: Number(entry.memory ?? 0),
                    vram: Number(entry.vram ?? 0),
                    storage: Number(entry.storage ?? 0),
                    network: Number(entry.network ?? 0),
                    owned: Number(entry.owned ?? 0),
                  },
                  credits,
                )}
                onBuy={() => runtime.execute(buyHardwareFromGui(id))}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Software market" className="software-store">
        <div className="software-store-heading">
          <div>
            <span className="panel-label">LICENSE EXCHANGE / RECURRING</span>
            <h2>Software library</h2>
            <p>Activate a license for a daily fee. No software is required to access targets.</p>
          </div>
          <span className="software-store-total">{software.length} licenses listed</span>
        </div>
        {software.length === 0 ? (
          <p className="market-empty">No tools listed.</p>
        ) : (
          <ul className="market-catalog software-store-grid">
            {visibleRecords(software, recordPage).map(([id, entry]) => (
              <SoftwareLicenseCard
                key={id}
                item={presentSoftwareListing(id, {
                  label: String(entry.label ?? id),
                  dailyCost: Number(entry.dailyCost ?? 0),
                  active: entry.active === true,
                  discountFactor: Number(entry.discountFactor ?? 1),
                  compute: Number(entry.compute ?? 0),
                  memory: Number(entry.memory ?? 0),
                  vram: Number(entry.vram ?? 0),
                  storage: Number(entry.storage ?? 0),
                  network: Number(entry.network ?? 0),
                })}
                onToggle={() => runtime.execute(
                  entry.active === true ? disableSoftwareFromGui(id) : enableSoftwareFromGui(id),
                )}
              />
            ))}
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

      <section aria-label="Housing market" className="housing-store">
        <div className="housing-store-heading">
          <div>
            <span className="panel-label">LOCATION EXCHANGE / RECURRING</span>
            <h2>Housing & safehouses</h2>
            <p>Choose where to operate. Compare the real daily lease, travel time, anonymity band and rig lift.</p>
          </div>
          <span className="housing-store-total">{housing.length} locations listed</span>
        </div>
        {housing.length === 0 ? (
          <p className="market-empty">No locations listed.</p>
        ) : (
          <ul className="market-catalog housing-store-grid">
            {visibleRecords(housing, recordPage).map(([id, entry]) => (
              <HousingLocationCard
                key={id}
                item={presentHousingListing(id, {
                  label: String(entry.label ?? id),
                  dailyCost: Number(entry.dailyCost ?? 0),
                  active: entry.active === true,
                  travelMinutes: Number(entry.travelMinutes ?? 0),
                  kind: String(entry.kind ?? "residential"),
                  anonymity: String(entry.anonymity ?? "public"),
                  compute: Number(entry.compute ?? 0),
                  memory: Number(entry.memory ?? 0),
                  vram: Number(entry.vram ?? 0),
                  storage: Number(entry.storage ?? 0),
                  network: Number(entry.network ?? 0),
                })}
                onMoveIn={() => runtime.execute(rentHousingFromGui(id))}
                onMoveOut={() => runtime.execute(breakLeaseFromGui())}
              />
            ))}
          </ul>
        )}
        <p className="market-hint">
          Daily rent is charged at world-day boundaries, not when you sign.
          Switching or leaving a lease transfers no credits. Insufficient upkeep
          returns you to the free baseline without debt. Travel consumes world
          time; safehouses provide no capability lift. Anonymity is a catalog
          band, not a promised safety score. Returning from a distant lease
          takes the same world-time journey.
        </p>
      </section>

      <section aria-label="Machines" className="machine-store">
        <div className="machine-store-heading">
          <div>
            <span className="panel-label">MACHINE EXCHANGE / OWNED SYSTEMS</span>
            <h2>Machines & rack</h2>
            <p>Complete hardware boxes. Pay once, stack their projected capability, then rename or resell any box you own.</p>
          </div>
          <span className="machine-store-count">{machineListings.length} listed · {ownedMachines.length} owned</span>
        </div>
        {machineListings.length === 0 ? (
          <p className="market-empty">No machines on offer.</p>
        ) : (
          <ul className="market-catalog machine-store-grid">
            {visibleRecords(machineListings, recordPage).map(([id, entry]) => (
              <MachineListingCard
                key={id}
                item={presentMachineListing(id, {
                  label: String(entry.label ?? id),
                  cost: Number(entry.cost ?? 0),
                  ownedCount: Number(entry.ownedCount ?? 0),
                  exotic: entry.exotic === true,
                  compute: Number(entry.compute ?? 0),
                  memory: Number(entry.memory ?? 0),
                  vram: Number(entry.vram ?? 0),
                  storage: Number(entry.storage ?? 0),
                  network: Number(entry.network ?? 0),
                }, credits)}
                onBuy={() => runtime.execute(buyMachineFromGui(id))}
              />
            ))}
          </ul>
        )}
        <h3 className="machine-owned-heading">YOUR RACK / {ownedMachines.length} MACHINES</h3>
        {ownedMachines.length === 0 ? (
          <p className="market-empty">No machines owned yet.</p>
        ) : (
          <ul className="market-catalog machine-store-grid">
            {visibleRecords(ownedMachines, recordPage).map(([id, entry]) => (
              <OwnedMachineCard
                key={id}
                item={presentOwnedMachine(id, {
                  catalogId: String(entry.catalogId ?? ""),
                  label: String(entry.label ?? id),
                  paidCost: Number(entry.paidCost ?? 0),
                  resaleValue: Number(entry.resaleValue ?? 0),
                  acquiredWorldMinute: Number(entry.acquiredWorldMinute ?? 0),
                  compute: Number(entry.compute ?? 0),
                  memory: Number(entry.memory ?? 0),
                  vram: Number(entry.vram ?? 0),
                  storage: Number(entry.storage ?? 0),
                  network: Number(entry.network ?? 0),
                })}
                renameControl={<MachineRenameRow
                  machineId={id}
                  currentLabel={String(entry.label ?? id)}
                  onRename={(label) => runtime.execute(renameMachineFromGui(id, label))}
                />}
                onSell={() => runtime.execute(sellMachineFromGui(id))}
              />
            ))}
          </ul>
        )}
        <p className="market-hint">
          Standard machines can be owned in multiples. Exotic stock is displayed
          only when this run has it available and can be claimed once.
          Machine purchases have no daily rent; owned boxes retain the price
          actually paid and resell for their projected value.
          Capability changes action throughput, not target access or rank.
        </p>
      </section>

      <section aria-label="AI models" className="model-store">
        <div className="model-store-heading">
          <div>
            <span className="panel-label">ASSISTANT EXCHANGE / LOCAL & CLOUD</span>
            <h2>AI models</h2>
            <p>Rent compute on the cloud or own local weights. Compare projected speed, real rig load and recurring cost.</p>
          </div>
          <span className="model-store-total">{models.length} models listed</span>
        </div>
        {models.length === 0 ? (
          <p className="market-empty">No models listed.</p>
        ) : (
          <ul className="market-catalog model-store-grid">
            {visibleRecords(models, recordPage).map(([id, entry]) => (
              <ModelLicenseCard
                key={id}
                item={presentModelListing(id, {
                  label: String(entry.label ?? id),
                  source: String(entry.source ?? ""),
                  cost: Number(entry.cost ?? 0),
                  dailyCost: Number(entry.dailyCost ?? 0),
                  factor: Number(entry.factor ?? 1),
                  deliveredFactor: Number(entry.deliveredFactor ?? entry.factor ?? 1),
                  vram: Number(entry.vram ?? 0),
                  storage: Number(entry.storage ?? 0),
                  author: String(entry.author ?? ""),
                  owned: entry.owned === true,
                  running: entry.running === true,
                }, credits, {
                  vram: Number(rig.vram ?? 0),
                  storage: Number(rig.storage ?? 0),
                })}
                onBuy={() => runtime.execute(acquireModelFromGui(id))}
                onRun={() => runtime.execute(runModelFromGui(id))}
                onStop={() => runtime.execute(stopModelFromGui())}
              />
            ))}
          </ul>
        )}
        <p className="market-hint">
          Models accelerate the same actions; none unlocks a target or acts as
          an autopilot. Cloud services charge at each crossed world-day only while
          running, and unpayable rent stops the assistant without debt. Local models
          cost credits once and run free afterward, with VRAM/storage contention
          affecting their delivered shortcut. Current-rig values include other
          workloads; purchasing a model does not automatically run it.
        </p>
      </section>

      <section aria-label="Player tools" className="authored-tool-store">
        <div className="authored-tool-heading">
          <div>
            <span className="panel-label">SIGNED ARTIFACTS / PEER EXCHANGE</span>
            <h2>Player-authored tools</h2>
            <p>Buy verified catalog effects, not promised outcomes. Each tool names its in-world author.</p>
          </div>
          <span className="authored-tool-count">{toolListings.length} tools listed · {ownedTools.length} owned</span>
        </div>
        {toolListings.length===0 ? (
          <p className="market-empty">Nothing authored is on offer.</p>
        ) : (
          <ul className="market-catalog authored-tool-grid">
            {visibleRecords(toolListings,recordPage).map(([id,entry])=>(
              <AuthoredToolListingCard key={id}
                item={presentToolListing(id,{
                  label:String(entry.label??id),author:String(entry.author??""),
                  cost:Number(entry.cost??0),ownedCount:Number(entry.ownedCount??0),
                  compute:Number(entry.compute??0),memory:Number(entry.memory??0),
                  vram:Number(entry.vram??0),storage:Number(entry.storage??0),
                  network:Number(entry.network??0),discountFactor:Number(entry.discountFactor??1),
                },credits)}
                onBuy={()=>runtime.execute(buyPlayerToolFromGui(id))}/>
            ))}
          </ul>
        )}
        <h3 className="authored-tool-section-title">YOUR COPIES / {ownedTools.length} OWNED</h3>
        {ownedTools.length===0 ? (
          <p className="market-empty">No authored tools in your library.</p>
        ) : (
          <ul className="market-catalog authored-tool-grid">
            {visibleRecords(ownedTools,recordPage).map(([id,entry])=>(
              <OwnedAuthoredToolCard key={id}
                item={presentOwnedTool(id,{
                  catalogId:String(entry.catalogId??""),label:String(entry.label??id),
                  author:String(entry.author??""),paidCost:Number(entry.paidCost??0),
                  resaleValue:Number(entry.resaleValue??0),
                  acquiredWorldMinute:Number(entry.acquiredWorldMinute??0),
                  compute:Number(entry.compute??0),memory:Number(entry.memory??0),
                  vram:Number(entry.vram??0),storage:Number(entry.storage??0),
                  network:Number(entry.network??0),discountFactor:Number(entry.discountFactor??1),
                })}
                onSell={()=>runtime.execute(sellPlayerToolFromGui(id))}/>
            ))}
          </ul>
        )}
        <p className="market-hint">
          Buy once, keep the projected lift without daily rent. Reselling an owned
          copy pays the projected resale amount, derived from its original paid price,
          not today&apos;s catalog price. Transactions preserve peer authorship in the
          value ledger. An owned tool never unlocks a target or changes rank.
        </p>
      </section>

      <section aria-label="Software forge" className="forge-store">
        <div className="forge-heading">
          <div>
            <span className="panel-label">SOFTWARE FORGE / SAFE WORKFLOW IR</span>
            <h2>Software forge</h2>
            <p>Commission a model to build a real projected workflow over world time. No executable host code.</p>
          </div>
          <span className="forge-heading-count">{forgeSpecs.length} specs · {buildQueue.length} queued · {ownedWorkflows.length} built</span>
        </div>
        {forgeSpecs.length===0 ? <p className="market-empty">No workflow specs available.</p> : (
          <ul className="market-catalog forge-grid">
            {visibleRecords(forgeSpecs,recordPage).map(([id,entry])=>(
              <ForgeSpecCard key={id} item={presentForgeSpec(id,{
                label:String(entry.label??id),steps:String(entry.steps??""),
                tests:String(entry.tests??""),estimatedMinutes:Number(entry.estimatedMinutes??0),
                vram:Number(entry.vram??0),storage:Number(entry.storage??0),
                replacesLabel:String(entry.replacesLabel??""),
              })}
              assistantRunning={assistantRunning}
              onBuild={()=>runtime.execute(startBuildFromGui(id))}/>
            ))}
          </ul>
        )}
        <h3 className="forge-section-label">BUILD QUEUE / {buildQueue.length} ACTIVE</h3>
        {buildQueue.length===0?<p className="market-empty">No builds in flight.</p>:(
          <ul className="market-catalog forge-grid">
            {visibleRecords(buildQueue,recordPage).map(([id,entry])=>(
              <ForgeQueueCard key={id} item={presentForgeBuild(id,{
                specLabel:String(entry.specLabel??id),modelLabel:String(entry.modelLabel??""),
                startedWorldMinute:Number(entry.startedWorldMinute??0),
                dueWorldMinute:Number(entry.dueWorldMinute??0),
                paused:entry.paused===true,vram:Number(entry.vram??0),storage:Number(entry.storage??0),
              })} onAbort={()=>runtime.execute(abortBuildFromGui(id))}/>
            ))}
          </ul>
        )}
        <h3 className="forge-section-label">SELF-AUTHORED / {ownedWorkflows.length} DELIVERED</h3>
        {ownedWorkflows.length===0 ? (
          <p className="market-empty">No finished workflows yet. Completed work is permanent.</p>
        ) : (
          <ul className="market-catalog forge-grid">
            {visibleRecords(ownedWorkflows,recordPage).map(([id,entry])=>(
              <ForgeOwnedCard key={id} item={presentForgeOwned(id,{
                label:String(entry.label??id),outcome:String(entry.outcome??""),
                builtWithLabel:String(entry.builtWithLabel??""),
                acquiredWorldMinute:Number(entry.acquiredWorldMinute??0),
                tests:String(entry.tests??""),
              })}/>
            ))}
          </ul>
        )}
        <p className="market-hint">
          BUILD uses world time and rig occupancy, never credits. A running assistant
          is required; completed workflows contribute through the same capability
          system as licensed software. The assistant can make defective or warning-level
          copies. Test labels describe coverage, not a promise of passing. Queue dates
          and outcomes only reflect known projected state.
        </p>
      </section>

      <ContextualHint
        id="hint:market-capacity"
        title="RIG CAPACITY & UPKEEP"
        description="Rig compute limits concurrent AI models and workflow builds. A lease changes your operating location, travel exposure, anonymity band and possibly capability."
      />
      <section aria-label="Rig capability">
        <span className="panel-label">RIG CAPABILITY</span>
        <div className="market-capability-grid">
          {capability.map(([metric, value]) => {
            const liftEntry = liftRows.find(([l]) => l === metric);
            const liftVal = liftEntry ? Number(liftEntry[1]) : 0;
            return (
              <CapabilityBar
                key={metric}
                metric={metric as CapabilityMetric}
                currentValue={Number(value ?? 0)}
                deltaValue={liftVal > 0 ? liftVal : 0}
                maxScale={24}
              />
            );
          })}
        </div>
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
            {visibleRecords(ownedHardware, recordPage).map(([id, entry]) => (
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
            {visibleRecords(valueNodes, recordPage).map(([id, entry]) => {
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
            {visibleRecords(ledger, recordPage).map(([id, entry]) => (
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
