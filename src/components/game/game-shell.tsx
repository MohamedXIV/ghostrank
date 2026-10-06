"use client";

import { useCallback, useEffect, useState } from "react";
import { useCell } from "tinybase/ui-react";

import { ComputerDesktop } from "@/components/game/computer-desktop";
import { formatWorldTime } from "@/game/computer/format-world-time";
import { DISTRO_PROFILES } from "@/presentation/distros";
import { RoomSurface } from "@/components/game/room-surface";
import {
  createGameSession,
  type GameSession,
} from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { usePresentationStore } from "@/stores/ui/use-presentation-store";
import { useUiStore } from "@/stores/ui/use-ui-store";

export function GameShell() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [bootNote, setBootNote] = useState("mounting simulation");
  const activeSurface = useUiStore((state) => state.activeSurface);
  const setActiveSurface = useUiStore((state) => state.setActiveSurface);
  const distroId = usePresentationStore((state) => state.distroId);
  const themeId = usePresentationStore((state) => state.themeId);
  const hydratePresentation = usePresentationStore((state) => state.hydrate);
  const distro = DISTRO_PROFILES[distroId];

  useEffect(() => {
    hydratePresentation();
  }, [hydratePresentation]);

  useEffect(() => {
    let disposed = false;
    let activeSession: GameSession | null = null;

    void (async () => {
      try {
        setBootNote("opening local persistence");

        const { createPlatformRunPersistence } = await import(
          "@/persistence/platform-run-persistence"
        );
        const persistence = await createPlatformRunPersistence();

        setBootNote(
          persistence
            ? "restoring active run"
            : "web shell // volatile run",
        );

        activeSession = await createGameSession({
          initialState: createSliceWorldState(),
          persistence,
        });
      } catch (error) {
        console.error("Ghostrank persistence initialization failed", error);
        setBootNote("persistence unavailable // volatile fallback");

        activeSession = await createGameSession({
          initialState: createSliceWorldState(),
        });
      }

      if (disposed) {
        await activeSession.flush();
        return;
      }

      setSession(activeSession);
    })();

    return () => {
      disposed = true;
      if (activeSession) {
        void activeSession.flush();
      }
    };
  }, []);

  const enterComputer = useCallback(() => {
    setActiveSurface("computer");
  }, [setActiveSurface]);

  const enterRoom = useCallback(() => {
    setActiveSurface("room");
  }, [setActiveSurface]);

  if (!session) {
    return (
      <section
        className="boot-screen"
        data-distro={distroId}
        data-theme={themeId}
        aria-live="polite"
      >
        <div className="boot-mark">{distro.label}</div>
        <div className="boot-line">{bootNote}</div>
      </section>
    );
  }

  return (
    <ActiveGameShell
      session={session}
      activeSurface={activeSurface}
      enterComputer={enterComputer}
      enterRoom={enterRoom}
    />
  );
}

function ActiveGameShell({
  session,
  activeSurface,
  enterComputer,
  enterRoom,
}: {
  session: GameSession;
  activeSurface: "room" | "computer";
  enterComputer: () => void;
  enterRoom: () => void;
}) {
  const ended =
    useCell("meta", "run", "ended", session.projection) === true;
  const endingLabel = String(
    useCell("meta", "run", "label", session.projection) ?? "",
  );
  const endingMinute = Number(
    useCell("meta", "run", "worldMinute", session.projection) ?? 0,
  );
  const endingDetail = String(
    useCell("meta", "run", "detail", session.projection) ?? "",
  );

  if (ended) {
    return (
      <main className="game-shell">
        <section className="boot-screen" aria-label="Run ended" aria-live="polite">
          <div className="boot-mark">{endingLabel || "RUN ENDED"}</div>
          <div className="boot-line">
            final // {formatWorldTime(endingMinute)}
          </div>
          <div className="boot-line">
            {endingDetail ||
              "the handle is closed // this run accepts no further commands"}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell">
      {activeSurface === "room" ? (
        <RoomSurface
          runtime={session}
          onUseDesk={enterComputer}
        />
      ) : (
        <ComputerDesktop
          runtime={session}
          onReturnToRoom={enterRoom}
        />
      )}
    </main>
  );
}
