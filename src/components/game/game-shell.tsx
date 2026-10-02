"use client";

import { useCallback, useMemo } from "react";

import { ComputerDesktop } from "@/components/game/computer-desktop";
import { RoomSurface } from "@/components/game/room-surface";
import { createGameRuntime } from "@/game/runtime/game-runtime";
import { createSliceWorldState } from "@/game/runtime/slice-world";
import { useUiStore } from "@/stores/ui/use-ui-store";

export function GameShell() {
  const runtime = useMemo(
    () => createGameRuntime(createSliceWorldState()),
    [],
  );
  const activeSurface = useUiStore((state) => state.activeSurface);
  const setActiveSurface = useUiStore((state) => state.setActiveSurface);

  const enterComputer = useCallback(() => {
    setActiveSurface("computer");
  }, [setActiveSurface]);

  const enterRoom = useCallback(() => {
    setActiveSurface("room");
  }, [setActiveSurface]);

  return (
    <main className="game-shell">
      {activeSurface === "room" ? (
        <RoomSurface
          runtime={runtime}
          onUseDesk={enterComputer}
        />
      ) : (
        <ComputerDesktop
          runtime={runtime}
          onReturnToRoom={enterRoom}
        />
      )}
    </main>
  );
}
