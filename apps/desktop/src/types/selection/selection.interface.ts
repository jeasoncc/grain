/**
 * Selection Domain - Interface Definitions
 *
 * Type definitions for selection state management.
 * Handles workspace and node selection across the application.
 */

// ==============================
// State Interface
// ==============================

/**
 * Selection state representing the currently selected workspace and node.
 * All properties are readonly to enforce immutability.
 */
export interface SelectionState {
	/** Currently selected workspace ID, null if none selected */
	readonly selectedWorkspaceId: string | null
	/** Currently selected node ID in file tree, null if none selected */
	readonly selectedNodeId: string | null
}

// ==============================
// Action Payloads
// ==============================

/**
 * Payload for setting the selected workspace.
 * When workspace changes, node selection is automatically cleared.
 */
export interface SetWorkspacePayload {
	readonly workspaceId: string | null
}

/**
 * Payload for setting the selected node.
 */
export interface SetNodePayload {
	readonly nodeId: string | null
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating selection state.
 */
export interface SelectionActions {
	/**
	 * Set the selected workspace ID.
	 * Clears the selected node when workspace changes.
	 */
	readonly setSelectedWorkspaceId: (id: string | null) => void

	/**
	 * Set the selected node ID in the file tree.
	 */
	readonly setSelectedNodeId: (id: string | null) => void

	/**
	 * Clear all selection state.
	 */
	readonly clearSelection: () => void
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for selection persistence.
 */
export interface SelectionConfig {
	/** Storage key for persistence */
	readonly storageKey: string
	/** Whether to persist workspace selection */
	readonly persistWorkspace: boolean
}

export const DEFAULT_SELECTION_CONFIG: SelectionConfig = {
	persistWorkspace: true,
	storageKey: "grain-selection",
} as const
