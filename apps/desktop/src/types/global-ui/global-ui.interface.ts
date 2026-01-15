/**
 * Global UI Domain - Interface Definitions
 *
 * Type definitions for global UI component state management.
 * Handles command palette, global search, buffer switcher, export dialog, and other global overlays.
 */

// ==============================
// Types
// ==============================

/**
 * Direction for buffer switcher navigation.
 * - "forward": Move to next tab (Ctrl+Tab)
 * - "backward": Move to previous tab (Ctrl+Shift+Tab)
 */
export type BufferSwitcherDirection = "forward" | "backward"

// ==============================
// State Interface
// ==============================

/**
 * Global UI state representing the visibility and configuration of global components.
 * All properties are readonly to enforce immutability.
 */
export interface GlobalUIState {
	/** Whether the command palette is open */
	readonly commandPaletteOpen: boolean

	/** Whether the global search panel is open */
	readonly globalSearchOpen: boolean

	/** Whether the buffer switcher is open */
	readonly bufferSwitcherOpen: boolean

	/** Direction for buffer switcher navigation */
	readonly bufferSwitcherDirection: BufferSwitcherDirection

	/** Whether the export dialog is open */
	readonly exportDialogOpen: boolean
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating global UI state.
 */
export interface GlobalUIActions {
	// Command Palette
	/**
	 * Open the command palette.
	 */
	readonly openCommandPalette: () => void

	/**
	 * Close the command palette.
	 */
	readonly closeCommandPalette: () => void

	/**
	 * Toggle the command palette open/closed.
	 */
	readonly toggleCommandPalette: () => void

	// Global Search
	/**
	 * Open the global search panel.
	 */
	readonly openGlobalSearch: () => void

	/**
	 * Close the global search panel.
	 */
	readonly closeGlobalSearch: () => void

	/**
	 * Toggle the global search panel open/closed.
	 */
	readonly toggleGlobalSearch: () => void

	// Buffer Switcher
	/**
	 * Open the buffer switcher with specified direction.
	 */
	readonly openBufferSwitcher: (direction: BufferSwitcherDirection) => void

	/**
	 * Close the buffer switcher.
	 */
	readonly closeBufferSwitcher: () => void

	/**
	 * Set the buffer switcher direction.
	 */
	readonly setBufferSwitcherDirection: (direction: BufferSwitcherDirection) => void

	// Export Dialog
	/**
	 * Open the export dialog.
	 */
	readonly openExportDialog: () => void

	/**
	 * Close the export dialog.
	 */
	readonly closeExportDialog: () => void

	/**
	 * Toggle the export dialog open/closed.
	 */
	readonly toggleExportDialog: () => void
}

// ==============================
// Configuration
// ==============================

/**
 * Configuration for global UI state.
 * Note: Global UI state is typically not persisted.
 */
export interface GlobalUIConfig {
	/** Whether to persist state (typically false for global UI) */
	readonly persistState: boolean
}

export const DEFAULT_GLOBAL_UI_CONFIG: GlobalUIConfig = {
	persistState: false,
} as const

// ==============================
// Default Values
// ==============================

export const DEFAULT_GLOBAL_UI_STATE: GlobalUIState = {
	bufferSwitcherDirection: "forward",
	bufferSwitcherOpen: false,
	commandPaletteOpen: false,
	exportDialogOpen: false,
	globalSearchOpen: false,
} as const
