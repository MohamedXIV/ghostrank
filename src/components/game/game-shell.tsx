"use client";

import { useCallback, useEffect, useState } from "react";

import { ComputerDesktop } from "@/components/game/computer-desktop";
import { RoomSurface } from "@/components/game/room-surface";
import {
  createGameSession,
  type GameSession,
} from "@/game/runtime/game-session";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { useUiStore } from "@/stores/ui/use-ui-store";

export function GameShell() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [bootNote, setBootNote] = useState("mounting simulation");
  const activeSurface = useUiStore((state) => state.activeSurface);
  const setActiveSurface = useUiStore((state) => state.setActiveSurface);

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
      <section className="boot-screen" aria-live="polite">
        <div className="boot-mark">GHOST/OS</div>
        <div className="boot-line">{bootNote}</div>
      </section>
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
