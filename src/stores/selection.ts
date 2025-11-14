import { create, type StateCreator } from "zustand";

export interface SelectionState {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  selectedChapterId: string | null;
  setSelectedChapterId: (id: string | null) => void;
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
}

type Setter = (partial: Partial<SelectionState> | ((state: SelectionState) => Partial<SelectionState>)) => void;

const initializer: StateCreator<SelectionState> = (set: Setter) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id: string | null) => set({ selectedProjectId: id, selectedChapterId: id ? null : null, selectedSceneId: null }),
  selectedChapterId: null,
  setSelectedChapterId: (id: string | null) => set({ selectedChapterId: id, selectedSceneId: null }),
  selectedSceneId: null,
  setSelectedSceneId: (id: string | null) => set({ selectedSceneId: id }),
});

export const useSelectionStore = create<SelectionState>(initializer);
