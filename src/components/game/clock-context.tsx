"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { ClockDriver, ClockState } from "@/game/runtime/time-driver";
import type { ClockNotice } from "@/game/runtime/time-notices";

/**
 * The one presentation clock for a running session (G1 closeout, D062).
 *
 * The HUD, the terminal and every blocking window reach the same driver through
 * this context, so there is exactly one thing that moves the clock. The context
 * holds presentation state only; the simulation never reads it.
 */

export interface ClockControl {
  driver: ClockDriver;
  notice: ClockNotice | null;
  dismissNotice: () => void;
}

const ClockContext = createContext<ClockControl | null>(null);

export function ClockProvider({
  value,
  children,
}: {
  value: ClockControl;
  children: ReactNode;
}) {
  return (
    <ClockContext.Provider value={value}>{children}</ClockContext.Provider>
  );
}

/** The shared clock, or null where none is running (static renders and tests). */
export function useClockControl(): ClockControl | null {
  return useContext(ClockContext);
}

/** The clock's current state, or null where none is running. */
export function useClockState(): ClockState | null {
  const driver = useContext(ClockContext)?.driver ?? null;

  return useSyncExternalStore(
    (listener) => (driver ? driver.subscribe(listener) : () => {}),
    () => (driver ? driver.state() : null),
    () => null,
  );
}

/**
 * Holds playback while a blocking window is open (D062). Each window holds
 * under its own id, so nested windows never release one another. Closing the
 * window, or unmounting it, releases its hold. Playback then resumes at the
 * speed the player had chosen, unless the player changed it while held.
 */
export function useClockHold(active: boolean): void {
  const driver = useContext(ClockContext)?.driver ?? null;
  const reason = useId();

  useEffect(() => {
    if (!driver || !active) {
      return;
    }

    driver.hold(reason);

    return () => {
      driver.release(reason);
    };
  }, [driver, active, reason]);
}
