"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCell } from "tinybase/ui-react";
import { ClockHud, createSessionClockPort } from "@/components/game/clock-hud";
import { createClockDriver } from "@/game/runtime/time-driver";
import type { ClockNotice } from "@/game/runtime/time-notices";

import { ComputerDesktop } from "@/components/game/computer-desktop";
import { DISTRO_PROFILES } from "@/presentation/distros";
import { RoomSurface } from "@/components/game/room-surface";
import { EndingScreen } from "@/components/game/ending/ending-screen";
import {
  createGameSession,
  type GameSession,
} from "@/game/runtime/game-session";
import {
  createNewRunWorldState,
  createSliceWorldState,
} from "@/game/runtime/slice-world";
import type {
  ActiveRunInspectResult,
  RunPersistence,
} from "@/persistence/run-persistence";
import {
  formatSaveDiagnostic,
  type SaveDiagnosticError,
} from "@/persistence/save-diagnostics";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { useUiStore } from "@/stores/ui/use-ui-store";
import { Button } from "@/components/ui/button";

export type ShellLifecyclePhase =
  | { type: "booting"; note: string }
  | { type: "active"; session: GameSession }
  | { type: "no_run"; note: string }
  | {
      type: "corrupt_save";
      diagnostic: SaveDiagnosticError;
      rawSnippet?: string;
    }
  | { type: "prompt_new_run"; activeSession: GameSession };

export function lifecycleFromActiveRunInspection(
  inspection: ActiveRunInspectResult,
): ShellLifecyclePhase | null {
  if (inspection.status === "diagnostic_error") {
    return {
      type: "corrupt_save",
      diagnostic: inspection.error,
      rawSnippet: inspection.rawContent,
    };
  }

  if (inspection.status === "empty") {
    return {
      type: "no_run",
      note: "no active operation is stored on this browser",
    };
  }

  return null;
}

export async function prepareFreshRunState(
  previousSession: GameSession | null,
  persistence: RunPersistence | null,
) {
  if (previousSession) {
    await previousSession.flush();
  }

  const freshState = createNewRunWorldState();

  if (persistence) {
    await persistence.saveActiveState(freshState, []);
  }

  return freshState;
}

export function GameShell() {
  const [lifecycle, setLifecycle] = useState<ShellLifecyclePhase>({
    type: "booting",
    note: "mounting simulation",
  });
  const [persistenceInstance, setPersistenceInstance] =
    useState<RunPersistence | null>(null);
  const activeSessionRef = useRef<GameSession | null>(null);

  const activeSurface = useUiStore((state) => state.activeSurface);
  const setActiveSurface = useUiStore((state) => state.setActiveSurface);
  const distroId = usePresentationStore((state) => state.distroId);
  const themeId = usePresentationStore((state) => state.themeId);
  const textScale = usePresentationStore((state) => state.textScale);
  const motionMode = usePresentationStore((state) => state.motionMode);
  const transparencyMode = usePresentationStore(
    (state) => state.transparencyMode,
  );
  const densityMode = usePresentationStore((state) => state.densityMode);
  const contrastMode = usePresentationStore((state) => state.contrastMode);
  const hydratePresentation = usePresentationStore((state) => state.hydrate);
  const distro = DISTRO_PROFILES[distroId];

  useEffect(() => {
    hydratePresentation();
  }, [hydratePresentation]);

  useEffect(() => {
    activeSessionRef.current =
      lifecycle.type === "active"
        ? lifecycle.session
        : lifecycle.type === "prompt_new_run"
          ? lifecycle.activeSession
          : null;
  }, [lifecycle]);

  const bootSimulation = useCallback(async (forcedSeed?: number) => {
    setLifecycle({ type: "booting", note: "opening local persistence" });

    try {
      const { createPlatformRunPersistence } = await import(
        "@/persistence/platform-run-persistence"
      );
      const persistence = await createPlatformRunPersistence();
      setPersistenceInstance(persistence);

      // Inspect active run state non-destructively.
      // An empty durable slot is not permission to create a run implicitly:
      // P5 requires the player to deliberately initialize every fresh run.
      if (persistence.inspectActiveRun) {
        const inspection = await persistence.inspectActiveRun();
        const inspectionLifecycle = lifecycleFromActiveRunInspection(inspection);
        if (inspectionLifecycle) {
          setLifecycle(inspectionLifecycle);
          return;
        }
      }

      setLifecycle({
        type: "booting",
        note: persistence ? "restoring active run" : "web shell // volatile run",
      });

      const initial = forcedSeed !== undefined
        ? createSliceWorldState({ seed: forcedSeed })
        : createNewRunWorldState();

      const session = await createGameSession({
        initialState: initial,
        persistence,
      });

      setLifecycle({ type: "active", session });
    } catch (error) {
      console.error("Ghostrank persistence initialization failed", error);
      setPersistenceInstance(null);
      setLifecycle({
        type: "no_run",
        note:
          "persistent storage is unavailable; a manually started operation will run in volatile mode and will not overwrite durable data",
      });
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      await bootSimulation();
      if (disposed) {
        return;
      }
    })();

    return () => {
      disposed = true;
      const activeSession = activeSessionRef.current;
      if (activeSession) {
        void activeSession.flush();
      }
    };
  }, [bootSimulation]);


  const enterComputer = useCallback(() => {
    setActiveSurface("computer");
  }, [setActiveSurface]);

  const enterRoom = useCallback(() => {
    setActiveSurface("room");
  }, [setActiveSurface]);

  const requestNewRun = useCallback(() => {
    if (lifecycle.type === "active") {
      setLifecycle({
        type: "prompt_new_run",
        activeSession: lifecycle.session,
      });
    }
  }, [lifecycle]);

  const cancelNewRunPrompt = useCallback(() => {
    if (lifecycle.type === "prompt_new_run") {
      setLifecycle({
        type: "active",
        session: lifecycle.activeSession,
      });
    }
  }, [lifecycle]);

  const confirmStartFreshRun = useCallback(async () => {
    const previousSession =
      lifecycle.type === "prompt_new_run"
        ? lifecycle.activeSession
        : lifecycle.type === "active"
          ? lifecycle.session
          : null;

    setLifecycle({ type: "booting", note: "finalizing previous run state" });

    try {
      // Do not let a delayed autosave from the previous session race with and
      // overwrite the fresh run. Ended sessions also need their archive move
      // fully settled before the next active slot is created.
      setLifecycle({ type: "booting", note: "initializing new simulation run" });
      const freshState = await prepareFreshRunState(
        previousSession,
        persistenceInstance,
      );

      const nextSession = await createGameSession({
        initialState: freshState,
        persistence: persistenceInstance,
      });
      setLifecycle({ type: "active", session: nextSession });
    } catch (error) {
      console.error("Ghostrank failed to start a fresh run safely", error);

      // A persistence/flush failure must never destroy or replace the previous
      // recoverable session. Return it to the foreground when one exists;
      // otherwise return to the explicit no-run screen.
      if (previousSession) {
        setLifecycle({ type: "active", session: previousSession });
      } else {
        setLifecycle({
          type: "no_run",
          note: "new run could not be initialized safely // retry",
        });
      }
    }
  }, [lifecycle, persistenceInstance]);

  const archiveCorruptAndStartFresh = useCallback(async () => {
    if (lifecycle.type !== "corrupt_save" || !persistenceInstance) {
      return;
    }

    if (!persistenceInstance.archiveCorruptActiveRun) {
      // Never overwrite corrupt durable data if this persistence adapter cannot
      // archive it non-destructively.
      return;
    }

    await persistenceInstance.archiveCorruptActiveRun(lifecycle.diagnostic);
    await confirmStartFreshRun();
  }, [confirmStartFreshRun, lifecycle, persistenceInstance]);

  if (lifecycle.type === "booting") {
    return (
      <section
        className="boot-screen"
        data-distro={distroId}
        data-theme={themeId}
        data-text-scale={textScale}
        data-motion-mode={motionMode}
        data-transparency={transparencyMode}
        data-density={densityMode}
        data-contrast={contrastMode}
        aria-live="polite"
      >
        <div className="boot-mark">{distro.label}</div>
        <div className="boot-line">{lifecycle.note}</div>
      </section>
    );
  }

  if (lifecycle.type === "no_run") {
    return (
      <main
        className="boot-screen"
        data-distro={distroId}
        data-theme={themeId}
        data-text-scale={textScale}
        data-motion-mode={motionMode}
        data-transparency={transparencyMode}
        data-density={densityMode}
        data-contrast={contrastMode}
      >
        <div className="lifecycle-screen">
          <div className="lifecycle-card">
            <div className="lifecycle-header">
              <span className="lifecycle-title">NO ACTIVE RUN</span>
              <span className="lifecycle-badge">READY</span>
            </div>
            <p className="boot-line" style={{ textAlign: "left" }}>
              {lifecycle.note}. A fresh operation is created only when you
              explicitly start one; its world seed is chosen at initialization
              and then remains deterministic for that run.
            </p>
            <div className="lifecycle-actions">
              <Button
                variant="default"
                size="sm"
                onClick={() => void confirmStartFreshRun()}
              >
                + START NEW OPERATION
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (lifecycle.type === "corrupt_save") {
    return (
      <main
        className="boot-screen"
        data-distro={distroId}
        data-theme={themeId}
        data-text-scale={textScale}
        data-motion-mode={motionMode}
        data-transparency={transparencyMode}
        data-density={densityMode}
        data-contrast={contrastMode}
      >
        <div className="lifecycle-screen">
          <div className="lifecycle-card">
            <div className="lifecycle-header">
              <span className="lifecycle-title">RECOVERY DIAGNOSTIC</span>
              <span className="lifecycle-badge lifecycle-badge-error">
                CORRUPT OR INCOMPATIBLE SAVE
              </span>
            </div>
            <p className="boot-line" style={{ textAlign: "left" }}>
              Active persistent run data could not be parsed safely. Existing data has
              been held intact and has not been silently discarded.
            </p>
            <div className="lifecycle-diagnostic">
              <strong>{formatSaveDiagnostic(lifecycle.diagnostic)}</strong>
              {lifecycle.diagnostic.details && (
                <span className="lifecycle-diagnostic-detail">
                  {lifecycle.diagnostic.details}
                </span>
              )}
            </div>
            <div className="lifecycle-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void bootSimulation()}
              >
                RETRY LOAD
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => void archiveCorruptAndStartFresh()}
              >
                ARCHIVE BACKUP &amp; START FRESH RUN
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (lifecycle.type === "prompt_new_run") {
    const active = lifecycle.activeSession.snapshot();
    const isEnded = Boolean(active.ending);
    return (
      <main
        className="boot-screen"
        data-distro={distroId}
        data-theme={themeId}
        data-text-scale={textScale}
        data-motion-mode={motionMode}
        data-transparency={transparencyMode}
        data-density={densityMode}
        data-contrast={contrastMode}
      >
        <div className="lifecycle-screen">
          <div className="lifecycle-card">
            <div className="lifecycle-header">
              <span className="lifecycle-title">INITIALIZE NEW RUN</span>
              <span
                className={`lifecycle-badge ${
                  isEnded ? "lifecycle-badge-ended" : "lifecycle-badge-active"
                }`}
              >
                {isEnded ? "COMPLETED RUN ARCHIVED" : "ACTIVE PROGRESS IN PROGRESS"}
              </span>
            </div>
            <p className="boot-line" style={{ textAlign: "left" }}>
              {isEnded
                ? "The previous run has ended and is permanently archived in history. Initialize a fresh operation with a new random world seed?"
                : `An active operation for ${active.player.handle} at minute ${active.worldMinute} is currently in progress. Starting a new run will replace this active progress after pending saves finish, then initialize a fresh seed.`}
            </p>
            <div className="lifecycle-actions">
              {!isEnded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelNewRunPrompt}
                >
                  RESUME ACTIVE RUN
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => void confirmStartFreshRun()}
              >
                CONFIRM START FRESH RUN
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ActiveGameShell
      session={lifecycle.session}
      activeSurface={activeSurface}
      enterComputer={enterComputer}
      enterRoom={enterRoom}
      onStartNewRun={requestNewRun}
    />
  );
}

function ActiveGameShell({
  session,
  activeSurface,
  enterComputer,
  enterRoom,
  onStartNewRun,
}: {
  session: GameSession;
  activeSurface: "room" | "computer";
  enterComputer: () => void;
  enterRoom: () => void;
  onStartNewRun: () => void;
}) {
  const ended =
    useCell("meta", "run", "ended", session.projection) === true;
  const [clockNotice, setClockNotice] = useState<ClockNotice | null>(null);
  const clockDriver = useMemo(
    () =>
      createClockDriver({
        port: createSessionClockPort(session),
        onNotice: setClockNotice,
      }),
    [session],
  );

  useEffect(() => {
    clockDriver.start();

    return () => {
      clockDriver.dispose();
    };
  }, [clockDriver]);

  if (ended) {
    return (
      <EndingScreen
        projection={session.projection}
        onStartNewRun={onStartNewRun}
      />
    );
  }

  return (
    <main className="game-shell">
      <ClockHud
        session={session}
        driver={clockDriver}
        notice={clockNotice}
        onDismissNotice={() => setClockNotice(null)}
      />
      {activeSurface === "room" ? (
        <RoomSurface
          runtime={session}
          onUseDesk={enterComputer}
        />
      ) : (
        <ComputerDesktop
          runtime={session}
          onReturnToRoom={enterRoom}
          onStartNewRun={onStartNewRun}
        />
      )}
    </main>
  );
}
