/**
 * Sidebar Domain - Interface Definitions
 *
 * Type definitions for unified sidebar state management.
 * Handles sidebar panels, width, and panel-specific states.
 */

// ==============================
// Types
// ==============================

/**
 * Available sidebar panel types.
 * null represents no active panel.
 */
export type SidebarPanel = "search" | "drawings" | "files" | "tags" | null;

/**
 * Search panel state.
 * Tracks search query, filters, and selected types.
 */
export interface SearchPanelState {
	/** Current search query string */
	readonly query: string;
	/** Selected content types to search */
	readonly selectedTypes: readonly string[];
	/** Whether filter panel is visible */
	readonly showFilters: boolean;
}

/**
 * Drawings panel state.
 * Tracks selected drawing for preview/edit.
 */
export interface DrawingsPanelState {
	/** Currently selected drawing ID, null if none */
	readonly selectedDrawingId: string | null;
}

/**
 * File tree panel state.
 * Tracks expanded folder states.
 */
export interface FileTreeState {
	/** Map of folder IDs to their expanded state */
	readonly expandedFolders: Readonly<Record<string, boolean>>;
}

// ==============================
// Constants
// ==============================

/** Minimum sidebar width in pixels */
export const SIDEBAR_MIN_WIDTH = 200;

/** Maximum sidebar width in pixels */
export const SIDEBAR_MAX_WIDTH = 600;

/** Width threshold below which sidebar auto-collapses */
export const SIDEBAR_AUTO_COLLAPSE_THRESHOLD = 150;

/** Default sidebar width in pixels */
export const SIDEBAR_DEFAULT_WIDTH = 320;

// ==============================
// State Interface
// ==============================

/**
 * Sidebar state representing current sidebar configuration.
 * All properties are readonly to enforce immutability.
 */
export interface SidebarState {
	/** Currently active panel */
	readonly activePanel: SidebarPanel;
	/** Whether sidebar is open/visible */
	readonly isOpen: boolean;
	/** Current sidebar width in pixels */
	readonly width: number;
	/** Whether sidebar was collapsed by drag (vs manual toggle) */
	readonly wasCollapsedByDrag: boolean;
	/** Previous width before drag collapse (for restore) */
	readonly previousWidth: number;

	/** Search panel state */
	readonly searchState: SearchPanelState;
	/** Drawings panel state */
	readonly drawingsState: DrawingsPanelState;
	/** File tree panel state */
	readonly fileTreeState: FileTreeState;
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating sidebar state.
 */
export interface SidebarActions {
	// Main sidebar actions
	/**
	 * Set the active panel.
	 * Opens sidebar if panel is not null.
	 */
	setActivePanel: (panel: SidebarPanel) => void;

	/**
	 * Set sidebar open state.
	 */
	setIsOpen: (open: boolean) => void;

	/**
	 * Toggle sidebar open/closed.
	 */
	toggleSidebar: () => void;

	/**
	 * Set sidebar width (constrained to min/max bounds).
	 */
	setWidth: (width: number) => void;

	/**
	 * Resize sidebar with auto-collapse support.
	 * Collapses if width drops below threshold.
	 */
	resizeSidebar: (newWidth: number) => void;

	/**
	 * Restore sidebar from drag collapse.
	 * Restores previous width.
	 */
	restoreFromCollapse: () => void;

	// Search panel actions
	/**
	 * Set search query string.
	 */
	setSearchQuery: (query: string) => void;

	/**
	 * Set selected search types.
	 */
	setSearchSelectedTypes: (types: string[]) => void;

	/**
	 * Set search filters visibility.
	 */
	setSearchShowFilters: (show: boolean) => void;

	// Drawings panel actions
	/**
	 * Set selected drawing ID.
	 */
	setSelectedDrawingId: (id: string | null) => void;

	// File tree actions
	/**
	 * Set expanded folders map.
	 */
	setExpandedFolders: (folders: Record<string, boolean>) => void;

	/**
	 * Toggle a folder's expanded state.
	 */
	toggleFolderExpanded: (folderId: string) => void;
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for sidebar state persistence.
 */
export interface SidebarConfig {
	/** Storage key for persistence */
	readonly storageKey: string;
}

export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
	storageKey: "grain-unified-sidebar",
} as const;

// ==============================
// Default Values
// ==============================

export const DEFAULT_SEARCH_STATE: SearchPanelState = {
	query: "",
	selectedTypes: ["node"],
	showFilters: false,
} as const;

export const DEFAULT_DRAWINGS_STATE: DrawingsPanelState = {
	selectedDrawingId: null,
} as const;

export const DEFAULT_FILE_TREE_STATE: FileTreeState = {
	expandedFolders: {},
} as const;

export const DEFAULT_SIDEBAR_STATE: SidebarState = {
	activePanel: "files",
	isOpen: true,
	width: SIDEBAR_DEFAULT_WIDTH,
	wasCollapsedByDrag: false,
	previousWidth: SIDEBAR_DEFAULT_WIDTH,
	searchState: DEFAULT_SEARCH_STATE,
	drawingsState: DEFAULT_DRAWINGS_STATE,
	fileTreeState: DEFAULT_FILE_TREE_STATE,
} as const;
