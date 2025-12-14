import { create, type StateCreator } from "zustand";

export interface SelectionState {
	selectedProjectId: string | null;
	setSelectedProjectId: (id: string | null) => void;
	/** Selected node ID in file tree */
	selectedNodeId: string | null;
	setSelectedNodeId: (id: string | null) => void;
}

type Setter = (
	partial:
		| Partial<SelectionState>
		| ((state: SelectionState) => Partial<SelectionState>),
) => void;

const initializer: StateCreator<SelectionState> = (set: Setter) => ({
	selectedProjectId: null,
	setSelectedProjectId: (id: string | null) =>
		set({
			selectedProjectId: id,
			selectedNodeId: null, // Clear node selection when workspace changes
		}),
	selectedNodeId: null,
	setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
});

export const useSelectionStore = create<SelectionState>(initializer);
