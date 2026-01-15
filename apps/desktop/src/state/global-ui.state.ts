/**
 * @file state/global-ui.state.ts
 * @description Global UI 状态管理
 *
 * Zustand store for managing global UI components state.
 * Handles command palette, global search, buffer switcher, and export dialog.
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand"
import {
	type BufferSwitcherDirection,
	DEFAULT_GLOBAL_UI_STATE,
	type GlobalUIActions,
	type GlobalUIState,
} from "@/types/global-ui"

// ==============================
// Store Type
// ==============================

type GlobalUIStore = GlobalUIState & GlobalUIActions

// ==============================
// Store Implementation
// ==============================

export const useGlobalUIStore = create<GlobalUIStore>()((set) => ({
	// Initial state
	...DEFAULT_GLOBAL_UI_STATE,

	closeBufferSwitcher: () => {
		set((state) => ({
			...state,
			bufferSwitcherOpen: false,
		}))
	},

	closeCommandPalette: () => {
		set((state) => ({
			...state,
			commandPaletteOpen: false,
		}))
	},

	closeExportDialog: () => {
		set((state) => ({
			...state,
			exportDialogOpen: false,
		}))
	},

	closeGlobalSearch: () => {
		set((state) => ({
			...state,
			globalSearchOpen: false,
		}))
	},

	// ==============================
	// Buffer Switcher Actions
	// ==============================

	openBufferSwitcher: (direction: BufferSwitcherDirection) => {
		set((state) => ({
			...state,
			bufferSwitcherDirection: direction,
			bufferSwitcherOpen: true,
		}))
	},

	// ==============================
	// Command Palette Actions
	// ==============================

	openCommandPalette: () => {
		set((state) => ({
			...state,
			commandPaletteOpen: true,
		}))
	},

	// ==============================
	// Export Dialog Actions
	// ==============================

	openExportDialog: () => {
		set((state) => ({
			...state,
			exportDialogOpen: true,
		}))
	},

	// ==============================
	// Global Search Actions
	// ==============================

	openGlobalSearch: () => {
		set((state) => ({
			...state,
			globalSearchOpen: true,
		}))
	},

	setBufferSwitcherDirection: (direction: BufferSwitcherDirection) => {
		set((state) => ({
			...state,
			bufferSwitcherDirection: direction,
		}))
	},

	toggleCommandPalette: () => {
		set((state) => ({
			...state,
			commandPaletteOpen: !state.commandPaletteOpen,
		}))
	},

	toggleExportDialog: () => {
		set((state) => ({
			...state,
			exportDialogOpen: !state.exportDialogOpen,
		}))
	},

	toggleGlobalSearch: () => {
		set((state) => ({
			...state,
			globalSearchOpen: !state.globalSearchOpen,
		}))
	},
}))

// ==============================
// Selector Hooks
// ==============================

/** Select command palette open state */
export const useCommandPaletteOpen = () => useGlobalUIStore((s) => s.commandPaletteOpen)

/** Select global search open state */
export const useGlobalSearchOpen = () => useGlobalUIStore((s) => s.globalSearchOpen)

/** Select buffer switcher open state */
export const useBufferSwitcherOpen = () => useGlobalUIStore((s) => s.bufferSwitcherOpen)

/** Select buffer switcher direction */
export const useBufferSwitcherDirection = () => useGlobalUIStore((s) => s.bufferSwitcherDirection)

/** Select export dialog open state */
export const useExportDialogOpen = () => useGlobalUIStore((s) => s.exportDialogOpen)

// ==============================
// Action Hooks
// ==============================

/** Get command palette actions */
export const useCommandPaletteActions = () => ({
	close: useGlobalUIStore((s) => s.closeCommandPalette),
	open: useGlobalUIStore((s) => s.openCommandPalette),
	toggle: useGlobalUIStore((s) => s.toggleCommandPalette),
})

/** Get global search actions */
export const useGlobalSearchActions = () => ({
	close: useGlobalUIStore((s) => s.closeGlobalSearch),
	open: useGlobalUIStore((s) => s.openGlobalSearch),
	toggle: useGlobalUIStore((s) => s.toggleGlobalSearch),
})

/** Get buffer switcher actions */
export const useBufferSwitcherActions = () => ({
	close: useGlobalUIStore((s) => s.closeBufferSwitcher),
	open: useGlobalUIStore((s) => s.openBufferSwitcher),
	setDirection: useGlobalUIStore((s) => s.setBufferSwitcherDirection),
})

/** Get export dialog actions */
export const useExportDialogActions = () => ({
	close: useGlobalUIStore((s) => s.closeExportDialog),
	open: useGlobalUIStore((s) => s.openExportDialog),
	toggle: useGlobalUIStore((s) => s.toggleExportDialog),
})

/** Get all global UI actions */
export const useGlobalUIActions = () => ({
	bufferSwitcher: useBufferSwitcherActions(),
	commandPalette: useCommandPaletteActions(),
	exportDialog: useExportDialogActions(),
	globalSearch: useGlobalSearchActions(),
})
