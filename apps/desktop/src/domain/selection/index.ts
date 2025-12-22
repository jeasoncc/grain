/**
 * Selection Domain - Module Entry Point
 *
 * Unified exports for selection state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	SelectionActions,
	SelectionConfig,
	SelectionState,
	SetNodePayload,
	SetWorkspacePayload,
} from "./selection.interface";

export { DEFAULT_SELECTION_CONFIG } from "./selection.interface";

// ==============================
// Store & Hooks
// ==============================

export {
	useHasSelection,
	useIsNodeSelected,
	useIsWorkspaceSelected,
	useSelectedNodeId,
	useSelectedWorkspaceId,
	useSelectionStore,
} from "./selection.store";
