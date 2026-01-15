/**
 * UI Domain - Interface Definitions
 *
 * Type definitions for UI state management.
 * Handles right sidebar, tab position, and locale settings.
 */

// ==============================
// Types
// ==============================

/**
 * Available views for the right panel.
 * null indicates the panel is closed.
 */
export type RightPanelView = "outline" | "characters" | "drawings" | null

/**
 * Tab position options.
 * - "top": Displays tabs above the editor
 * - "right-sidebar": Displays tabs in the right panel
 */
export type TabPosition = "top" | "right-sidebar"

// ==============================
// State Interface
// ==============================

/**
 * UI state representing sidebar and settings configuration.
 * All properties are readonly to enforce immutability.
 */
export interface UIState {
	/** Current view displayed in the right panel, null if closed */
	readonly rightPanelView: RightPanelView
	/** Whether the right sidebar is open */
	readonly rightSidebarOpen: boolean
	/** Tab position: "top" or "right-sidebar" */
	readonly tabPosition: TabPosition
	/** Application locale (e.g., "en", "zh-CN") */
	readonly locale: string
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating UI state.
 */
export interface UIActions {
	/**
	 * Set the current view in the right panel.
	 */
	readonly setRightPanelView: (view: RightPanelView) => void

	/**
	 * Set whether the right sidebar is open.
	 */
	readonly setRightSidebarOpen: (open: boolean) => void

	/**
	 * Toggle the right sidebar open/closed state.
	 */
	readonly toggleRightSidebar: () => void

	/**
	 * Set the tab position.
	 */
	readonly setTabPosition: (position: TabPosition) => void

	/**
	 * Set the application locale.
	 */
	readonly setLocale: (locale: string) => void
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for UI state persistence.
 */
export interface UIConfig {
	/** Storage key for persistence */
	readonly storageKey: string
}

export const DEFAULT_UI_CONFIG: UIConfig = {
	storageKey: "grain-ui",
} as const

// ==============================
// Default Values
// ==============================

export const DEFAULT_UI_STATE: UIState = {
	locale: "en",
	rightPanelView: null,
	rightSidebarOpen: true,
	tabPosition: "right-sidebar",
} as const
