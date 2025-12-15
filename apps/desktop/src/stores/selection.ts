import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SelectionState {
	selectedProjectId: string | null;
	setSelectedProjectId: (id: string | null) => void;
	/** Selected node ID in file tree */
	selectedNodeId: string | null;
	setSelectedNodeId: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>()(
	persist(
		(set) => ({
			selectedProjectId: null,
			setSelectedProjectId: (id: string | null) =>
				set({
					selectedProjectId: id,
					selectedNodeId: null, // Clear node selection when workspace changes
				}),
			selectedNodeId: null,
			setSelectedNodeId: (id: string | null) => set({ selectedNodeId: id }),
		}),
		{
			name: "novel-editor-selection",
			// 只持久化 selectedProjectId，不持久化 selectedNodeId
			partialize: (state) => ({ selectedProjectId: state.selectedProjectId }),
		}
	)
);
