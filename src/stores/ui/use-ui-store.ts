import { create } from "zustand";

export type ActiveSurface = "computer" | "room";

interface UiState {
  activeSurface: ActiveSurface;
  setActiveSurface: (surface: ActiveSurface) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSurface: "computer",
  setActiveSurface: (activeSurface) => set({ activeSurface }),
}));
