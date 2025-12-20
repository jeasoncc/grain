/**
 * Selection Domain - Zustand Store with Immer
 *
 * Manages workspace and node selection state with persistence.
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { SelectionState, SelectionActions } from "./selection.interface";
import { DEFAULT_SELECTION_CONFIG } from "./selection.interface";

// ==============================
// Store Type
// ==============================

type SelectionStore = SelectionState & SelectionActions;

// ==============================
// Store Implementation
// ==============================

export const useSelectionStore = create<SelectionStore>()(
	persist(
		immer((set) => ({
			// Initial State
			selectedWorkspaceId: null,
			selectedNodeId: null,

			// ==============================
			// Actions
			// ==============================

			setSelectedWorkspaceId: (id) => {
				set((state) => {
					state.selectedWorkspaceId = id;
					// Clear node selection when workspace changes
					state.selectedNodeId = null;
				});
			},

			setSelectedNodeId: (id) => {
				set((state) => {
					state.selectedNodeId = id;
				});
			},

			clearSelection: () => {
				set((state) => {
					state.selectedWorkspaceId = null;
					state.selectedNodeId = null;
				});
			},
		})),
		{
			name: DEFAULT_SELECTION_CONFIG.storageKey,
			partialize: (state) => ({
				// Only persist workspace selection, not node selection
				selectedWorkspaceId: state.selectedWorkspaceId,
			}),
		}
	)
);

// ==============================
// Selector Hooks
// ==============================

/**
 * Get the currently selected workspace ID.
 * Optimized to only re-render when workspace changes.
 */
export const useSelectedWorkspaceId = (): string | null => {
	return useSelectionStore((state) => state.selectedWorkspaceId);
};

/**
 * Get the currently selected node ID.
 * Optimized to only re-render when node selection changes.
 */
export const useSelectedNodeId = (): string | null => {
	return useSelectionStore((state) => state.selectedNodeId);
};

/**
 * Check if a specific workspace is selected.
 */
export const useIsWorkspaceSelected = (workspaceId: string): boolean => {
	return useSelectionStore((state) => state.selectedWorkspaceId === workspaceId);
};

/**
 * Check if a specific node is selected.
 */
export const useIsNodeSelected = (nodeId: string): boolean => {
	return useSelectionStore((state) => state.selectedNodeId === nodeId);
};

/**
 * Check if any selection exists.
 */
export const useHasSelection = (): boolean => {
	return useSelectionStore(
		(state) => state.selectedWorkspaceId !== null || state.selectedNodeId !== null
	);
};
