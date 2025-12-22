/**
 * Sidebar Domain - Public API
 *
 * Unified sidebar state management for panels, width, and panel-specific states.
 */

// Types
export type {
	DrawingsPanelState,
	FileTreeState,
	SearchPanelState,
	SidebarActions,
	SidebarConfig,
	SidebarPanel,
	SidebarState,
} from "./sidebar.interface";

// Constants
export {
	DEFAULT_DRAWINGS_STATE,
	DEFAULT_FILE_TREE_STATE,
	DEFAULT_SEARCH_STATE,
	DEFAULT_SIDEBAR_CONFIG,
	DEFAULT_SIDEBAR_STATE,
	SIDEBAR_AUTO_COLLAPSE_THRESHOLD,
	SIDEBAR_DEFAULT_WIDTH,
	SIDEBAR_MAX_WIDTH,
	SIDEBAR_MIN_WIDTH,
} from "./sidebar.interface";
// Store
// Selector Hooks
// Action Hooks
// Legacy Compatibility
export {
	useActivePanel,
	useDrawingsPanelState,
	useExpandedFolders,
	useFileTreeState,
	useSearchPanelState,
	useSidebarActions,
	useSidebarIsOpen,
	useSidebarStore,
	useSidebarWidth,
	useUnifiedSidebarStore,
	useWasCollapsedByDrag,
} from "./sidebar.store";
