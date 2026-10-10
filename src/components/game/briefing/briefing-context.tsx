"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import {
  briefingEventNotices,
  briefingFailureText,
  type BriefingNotice,
} from "@/components/game/briefing/briefing-copy";
import type { GameRuntime } from "@/game/runtime/game-runtime";
import type { SimulationCommand } from "@/game/simulation/commands/types";
import type { VisibleNightshadeBriefing } from "@/game/simulation/projection/project-world";
import type { CommandResult } from "@/game/simulation/command-bus";

/** A trace-costing act waiting for the player's explicit confirmation (D071). */
export type BriefingPending = "escalate" | "disengage" | null;

export interface BriefingContextValue {
  view: VisibleNightshadeBriefing;
  pending: BriefingPending;
  notices: BriefingNotice[];
  /** Asks for confirmation before an act that costs trace. */
  request: (kind: Exclude<BriefingPending, null>) => void;
  cancel: () => void;
  /** Runs a command and shows its outcome, clue or review in the briefing. */
  run: (command: SimulationCommand) => CommandResult;
}

const BriefingContext = createContext<BriefingContextValue | null>(null);

export function useBriefing(): BriefingContextValue | null {
  return useContext(BriefingContext);
}

/**
 * Carries the briefing's pending confirmation and last outcome to the recon
 * surfaces. Without a briefing the provider is a pass-through, so canonical
 * runs execute exactly as they did.
 */
export function BriefingProvider({
  runtime,
  view,
  children,
}: {
  runtime: GameRuntime;
  view: VisibleNightshadeBriefing | null;
  children?: ReactNode;
}) {
  const [pending, setPending] = useState<BriefingPending>(null);
  const [notices, setNotices] = useState<BriefingNotice[]>([]);

  const value = useMemo<BriefingContextValue | null>(() => {
    if (!view) {
      return null;
    }

    return {
      view,
      pending,
      notices,
      request: (kind) => setPending(kind),
      cancel: () => setPending(null),
      run: (command) => {
        const result = runtime.execute(command);
        setPending(null);

        if (result.ok) {
          setNotices(briefingEventNotices(result.events));
        } else {
          const clue = briefingFailureText(result.error ?? "COMMAND_FAILED", runtime.snapshot());
          setNotices(
            clue
              ? [{ badge: "BLOCKED", glyph: "✕", text: clue }]
              : [],
          );
        }

        return result;
      },
    };
  }, [view, pending, notices, runtime]);

  return (
    <BriefingContext.Provider value={value}>{children}</BriefingContext.Provider>
  );
}
