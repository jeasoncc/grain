/**
 * Sidebar Domain - Public API
 *
 * Unified sidebar state management for panels, width, and panel-specific states.
 */

// Types
export type {
	SidebarPanel,
	SearchPanelState,
	DrawingsPanelState,
	FileTreeState,
	SidebarState,
	SidebarActions,
	SidebarConfig,
} from "./sidebar.interface";

// Constants
export {
	SIDEBAR_MIN_WIDTH,
	SIDEBAR_MAX_WIDTH,
	SIDEBAR_AUTO_COLLAPSE_THRESHOLD,
	SIDEBAR_DEFAULT_WIDTH,
	DEFAULT_SIDEBAR_CONFIG,
	DEFAULT_SEARCH_STATE,
	DEFAULT_DRAWINGS_STATE,
	DEFAULT_FILE_TREE_STATE,
	DEFAULT_SIDEBAR_STATE,
} from "./sidebar.interface";

// Store
export { useSidebarStore } from "./sidebar.store";

// Selector Hooks
export {
	useActivePanel,
	useSidebarIsOpen,
	useSidebarWidth,
	useWasCollapsedByDrag,
	useSearchPanelState,
	useDrawingsPanelState,
	useFileTreeState,
	useExpandedFolders,
} from "./sidebar.store";

// Action Hooks
export { useSidebarActions } from "./sidebar.store";

// Legacy Compatibility
export { useUnifiedSidebarStore } from "./sidebar.store";
