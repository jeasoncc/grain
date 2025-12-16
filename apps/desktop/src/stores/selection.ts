import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectionState {
	selectedWorkspaceId: string | null;
	setSelectedWorkspaceId: (id: string | null) => void;
	/** Selected node ID in file tree */
	selectedNodeId: string | null;
	setSelectedNodeId: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>()(
	persist(
		(set) => ({
			selectedWorkspaceId: null,
			setSelectedWorkspaceId: (id: string | null) =>
				set({
					selectedWorkspaceId: id,
					selectedNodeId: null, // Clear node selection when workspace changes
				}),
			selectedNodeId: null,
			setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
		}),
		{
			name: "novel-editor-selection",
			partialize: (state) => ({ selectedWorkspaceId: state.selectedWorkspaceId }),
		}
	)
);
