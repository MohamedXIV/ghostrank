import { create } from "zustand";

export type ActiveSurface = "computer" | "room";
export type ComputerWindowId = "terminal" | "recon";

interface UiState {
  activeSurface: ActiveSurface;
  openWindows: ComputerWindowId[];
  focusedWindow: ComputerWindowId | null;
  setActiveSurface: (surface: ActiveSurface) => void;
  openWindow: (windowId: ComputerWindowId) => void;
  closeWindow: (windowId: ComputerWindowId) => void;
  focusWindow: (windowId: ComputerWindowId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSurface: "room",
  openWindows: ["terminal", "recon"],
  focusedWindow: "terminal",

  setActiveSurface: (activeSurface) => set({ activeSurface }),

  openWindow: (windowId) =>
    set((state) => ({
      openWindows: state.openWindows.includes(windowId)
        ? state.openWindows
        : [...state.openWindows, windowId],
      focusedWindow: windowId,
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
}));
