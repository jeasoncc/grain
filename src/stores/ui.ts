import { create } from "zustand";

export type RightPanelView = "outline" | "characters" | "world" | null;

interface UIState {
  rightPanelView: RightPanelView;
  setRightPanelView: (view: RightPanelView) => void;
}

export const useUIStore = create<UIState>((set) => ({
  rightPanelView: null,
  setRightPanelView: (view) => set({ rightPanelView: view }),
}));
