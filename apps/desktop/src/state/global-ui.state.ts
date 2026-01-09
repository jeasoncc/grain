/**
 * @file state/global-ui.state.ts
 * @description Global UI 状态管理
 *
 * Zustand store for managing global UI components state.
 * Handles command palette, global search, buffer switcher, and export dialog.
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
	DEFAULT_GLOBAL_UI_STATE,
	type BufferSwitcherDirection,
	type GlobalUIActions,
	type GlobalUIState,
} from "@/types/global-ui";

// ==============================
// Store Type
// ==============================

type GlobalUIStore = GlobalUIState & GlobalUIActions;

// ==============================
// Store Implementation
// ==============================

export const useGlobalUIStore = create<GlobalUIStore>()(
	immer((set) => ({
		// Initial state
		...DEFAULT_GLOBAL_UI_STATE,

		// ==============================
		// Command Palette Actions
		// ==============================

		openCommandPalette: () => {
			set((draft) => {
				draft.commandPaletteOpen = true;
			});
		},

		closeCommandPalette: () => {
			set((draft) => {
				draft.commandPaletteOpen = false;
			});
		},

		toggleCommandPalette: () => {
			set((draft) => {
				draft.commandPaletteOpen = !draft.commandPaletteOpen;
			});
		},

		// ==============================
		// Global Search Actions
		// ==============================

		openGlobalSearch: () => {
			set((draft) => {
				draft.globalSearchOpen = true;
			});
		},

		closeGlobalSearch: () => {
			set((draft) => {
				draft.globalSearchOpen = false;
			});
		},

		toggleGlobalSearch: () => {
			set((draft) => {
				draft.globalSearchOpen = !draft.globalSearchOpen;
			});
		},

		// ==============================
		// Buffer Switcher Actions
		// ==============================

		openBufferSwitcher: (direction: BufferSwitcherDirection) => {
			set((draft) => {
				draft.bufferSwitcherOpen = true;
				draft.bufferSwitcherDirection = direction;
			});
		},

		closeBufferSwitcher: () => {
			set((draft) => {
				draft.bufferSwitcherOpen = false;
			});
		},

		setBufferSwitcherDirection: (direction: BufferSwitcherDirection) => {
			set((draft) => {
				draft.bufferSwitcherDirection = direction;
			});
		},

		// ==============================
		// Export Dialog Actions
		// ==============================

		openExportDialog: () => {
			set((draft) => {
				draft.exportDialogOpen = true;
			});
		},

		closeExportDialog: () => {
			set((draft) => {
				draft.exportDialogOpen = false;
			});
		},

		toggleExportDialog: () => {
			set((draft) => {
				draft.exportDialogOpen = !draft.exportDialogOpen;
			});
		},
	})),
);

// ==============================
// Selector Hooks
// ==============================

/** Select command palette open state */
export const useCommandPaletteOpen = () =>
	useGlobalUIStore((s) => s.commandPaletteOpen);

/** Select global search open state */
export const useGlobalSearchOpen = () =>
	useGlobalUIStore((s) => s.globalSearchOpen);

/** Select buffer switcher open state */
export const useBufferSwitcherOpen = () =>
	useGlobalUIStore((s) => s.bufferSwitcherOpen);

/** Select buffer switcher direction */
export const useBufferSwitcherDirection = () =>
	useGlobalUIStore((s) => s.bufferSwitcherDirection);

/** Select export dialog open state */
export const useExportDialogOpen = () =>
	useGlobalUIStore((s) => s.exportDialogOpen);

// ==============================
// Action Hooks
// ==============================

/** Get command palette actions */
export const useCommandPaletteActions = () => ({
	open: useGlobalUIStore((s) => s.openCommandPalette),
	close: useGlobalUIStore((s) => s.closeCommandPalette),
	toggle: useGlobalUIStore((s) => s.toggleCommandPalette),
});

/** Get global search actions */
export const useGlobalSearchActions = () => ({
	open: useGlobalUIStore((s) => s.openGlobalSearch),
	close: useGlobalUIStore((s) => s.closeGlobalSearch),
	toggle: useGlobalUIStore((s) => s.toggleGlobalSearch),
});

/** Get buffer switcher actions */
export const useBufferSwitcherActions = () => ({
	open: useGlobalUIStore((s) => s.openBufferSwitcher),
	close: useGlobalUIStore((s) => s.closeBufferSwitcher),
	setDirection: useGlobalUIStore((s) => s.setBufferSwitcherDirection),
});

/** Get export dialog actions */
export const useExportDialogActions = () => ({
	open: useGlobalUIStore((s) => s.openExportDialog),
	close: useGlobalUIStore((s) => s.closeExportDialog),
	toggle: useGlobalUIStore((s) => s.toggleExportDialog),
});

/** Get all global UI actions */
export const useGlobalUIActions = () => ({
	commandPalette: useCommandPaletteActions(),
	globalSearch: useGlobalSearchActions(),
	bufferSwitcher: useBufferSwitcherActions(),
	exportDialog: useExportDialogActions(),
});
