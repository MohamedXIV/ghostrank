import { create } from "zustand";

export type ActiveSurface = "computer" | "room";
export type ComputerWindowId =
  | "terminal"
  | "recon"
  | "underground"
  | "market"
  | "history"
  | "settings";

export type CycleDirection = "forward" | "backward";

interface UiState {
  activeSurface: ActiveSurface;
  openWindows: ComputerWindowId[];
  focusedWindow: ComputerWindowId | null;
  activationSerial: number;
  setActiveSurface: (surface: ActiveSurface) => void;
  openWindow: (windowId: ComputerWindowId) => void;
  closeWindow: (windowId: ComputerWindowId) => void;
  focusWindow: (windowId: ComputerWindowId) => void;
  cycleFocusedWindow: (direction?: CycleDirection) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSurface: "room",
  openWindows: ["terminal", "recon"],
  focusedWindow: "terminal",
  activationSerial: 0,

  setActiveSurface: (activeSurface) => set({ activeSurface }),

  openWindow: (windowId) =>
    set((state) => ({
      openWindows: state.openWindows.includes(windowId)
        ? state.openWindows
        : [...state.openWindows, windowId],
      focusedWindow: windowId,
      activationSerial: state.activationSerial + 1,
    })),

  closeWindow: (windowId) =>
    set((state) => {
      const openWindows = state.openWindows.filter(
        (candidate) => candidate !== windowId,
      );

      return {
        openWindows,
        focusedWindow:
          state.focusedWindow === windowId
            ? (openWindows.at(-1) ?? null)
            : state.focusedWindow,
      };
    }),

  focusWindow: (focusedWindow) => set({ focusedWindow }),

  cycleFocusedWindow: (direction = "forward") =>
    set((state) => {
      if (state.openWindows.length === 0) {
        return { focusedWindow: null };
      }

      const currentIndex = state.focusedWindow
        ? state.openWindows.indexOf(state.focusedWindow)
        : -1;

      const nextIndex =
        direction === "forward"
          ? currentIndex === -1
            ? 0
            : (currentIndex + 1) % state.openWindows.length
          : currentIndex === -1
            ? state.openWindows.length - 1
            : (currentIndex - 1 + state.openWindows.length) %
              state.openWindows.length;

      return { focusedWindow: state.openWindows[nextIndex] };
    }),
}));
