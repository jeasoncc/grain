/**
 * Layout Domain - Interface Definitions
 *
 * Type definitions for overall application layout state management.
 * Handles the coordination between ActivityBar, Sidebar, and Main Content areas.
 */

import type { SidebarPanel } from "../sidebar/sidebar.interface";

// ==============================
// State Interface
// ==============================

/**
 * Layout state representing the overall application layout configuration.
 * All properties are readonly to enforce immutability.
 */
export interface LayoutState {
	/** Whether the sidebar is currently open/visible */
	readonly isSidebarOpen: boolean;

	/** Currently active sidebar panel */
	readonly activePanel: SidebarPanel;

	/** Whether the sidebar was collapsed by drag (vs manual toggle) */
	readonly wasCollapsedByDrag: boolean;

	/** Sidebar width as a percentage (for react-resizable-panels) */
	readonly sidebarWidth: number;
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating layout state.
 */
export interface LayoutActions {
	/**
	 * Set the active sidebar panel.
	 * Opens the sidebar if a panel is selected.
	 */
	setActivePanel: (panel: SidebarPanel) => void;

	/**
	 * Toggle the sidebar open/closed state.
	 */
	toggleSidebar: () => void;

	/**
	 * Set whether the sidebar was collapsed by drag.
	 */
	setSidebarCollapsedByDrag: (collapsed: boolean) => void;

	/**
	 * Restore the sidebar from drag collapse.
	 * Reopens the sidebar to its previous state.
	 */
	restoreFromCollapse: () => void;

	/**
	 * Set the sidebar width percentage.
	 */
	setSidebarWidth: (width: number) => void;
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for layout state persistence.
 */
export interface LayoutConfig {
	/** Storage key for persistence */
	readonly storageKey: string;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
	storageKey: "grain-main-layout",
} as const;

// ==============================
// Default Values
// ==============================

export const DEFAULT_LAYOUT_STATE: LayoutState = {
	isSidebarOpen: true,
	activePanel: "files",
	wasCollapsedByDrag: false,
	sidebarWidth: 20, // 20% default width
} as const;
