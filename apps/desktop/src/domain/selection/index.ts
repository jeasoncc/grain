/**
 * Selection Domain - Module Entry Point
 *
 * Unified exports for selection state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	SelectionState,
	SelectionActions,
	SetWorkspacePayload,
	SetNodePayload,
	SelectionConfig,
} from "./selection.interface";

export { DEFAULT_SELECTION_CONFIG } from "./selection.interface";

// ==============================
// Store & Hooks
// ==============================

export {
	useSelectionStore,
	useSelectedWorkspaceId,
	useSelectedNodeId,
	useIsWorkspaceSelected,
	useIsNodeSelected,
	useHasSelection,
} from "./selection.store";
