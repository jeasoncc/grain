/**
 * @file hooks/use-global-ui.ts
 * @description Global UI hook
 *
 * 职责：封装全局 UI 组件状态和操作的 React hook
 * 依赖：state/, types/
 */

import { useCallback } from "react";
import {
	useGlobalUIStore,
	useCommandPaletteOpen,
	useGlobalSearchOpen,
	useBufferSwitcherOpen,
	useBufferSwitcherDirection,
	useExportDialogOpen,
	useCommandPaletteActions,
	useGlobalSearchActions,
	useBufferSwitcherActions,
	useExportDialogActions,
} from "@/state";
import type { BufferSwitcherDirection } from "@/types/global-ui";

// ============================================================================
// Global UI Hook
// ============================================================================

/**
 * Hook for accessing global UI state and actions
 *
 * @returns Global UI state and actions
 */
export function useGlobalUI() {
	// Selectors
	const commandPaletteOpen = useCommandPaletteOpen();
	const globalSearchOpen = useGlobalSearchOpen();
	const bufferSwitcherOpen = useBufferSwitcherOpen();
	const bufferSwitcherDirection = useBufferSwitcherDirection();
	const exportDialogOpen = useExportDialogOpen();

	// Actions
	const commandPaletteActions = useCommandPaletteActions();
	const globalSearchActions = useGlobalSearchActions();
	const bufferSwitcherActions = useBufferSwitcherActions();
	const exportDialogActions = useExportDialogActions();

	return {
		// Command Palette
		commandPalette: {
			isOpen: commandPaletteOpen,
			open: commandPaletteActions.open,
			close: commandPaletteActions.close,
			toggle: commandPaletteActions.toggle,
		},

		// Global Search
		globalSearch: {
			isOpen: globalSearchOpen,
			open: globalSearchActions.open,
			close: globalSearchActions.close,
			toggle: globalSearchActions.toggle,
		},

		// Buffer Switcher
		bufferSwitcher: {
			isOpen: bufferSwitcherOpen,
			direction: bufferSwitcherDirection,
			open: bufferSwitcherActions.open,
			close: bufferSwitcherActions.close,
			setDirection: bufferSwitcherActions.setDirection,
		},

		// Export Dialog
		exportDialog: {
			isOpen: exportDialogOpen,
			open: exportDialogActions.open,
			close: exportDialogActions.close,
			toggle: exportDialogActions.toggle,
		},
	};
}

/**
 * Hook for command palette
 */
export function useCommandPalette() {
	const open = useCommandPaletteOpen();
	const actions = useCommandPaletteActions();

	const openPalette = useCallback(() => {
		actions.open();
	}, [actions]);

	const closePalette = useCallback(() => {
		actions.close();
	}, [actions]);

	const togglePalette = useCallback(() => {
		actions.toggle();
	}, [actions]);

	return {
		open,
		openPalette,
		closePalette,
		togglePalette,
	};
}

/**
 * Hook for global search
 */
export function useGlobalSearch() {
	const open = useGlobalSearchOpen();
	const actions = useGlobalSearchActions();

	const openSearch = useCallback(() => {
		actions.open();
	}, [actions]);

	const closeSearch = useCallback(() => {
		actions.close();
	}, [actions]);

	const toggleSearch = useCallback(() => {
		actions.toggle();
	}, [actions]);

	return {
		open,
		openSearch,
		closeSearch,
		toggleSearch,
	};
}

/**
 * Hook for buffer switcher
 */
export function useBufferSwitcher() {
	const open = useBufferSwitcherOpen();
	const direction = useBufferSwitcherDirection();
	const actions = useBufferSwitcherActions();

	const openSwitcher = useCallback(
		(dir: BufferSwitcherDirection) => {
			actions.open(dir);
		},
		[actions],
	);

	const closeSwitcher = useCallback(() => {
		actions.close();
	}, [actions]);

	const setDirection = useCallback(
		(dir: BufferSwitcherDirection) => {
			actions.setDirection(dir);
		},
		[actions],
	);

	return {
		open,
		direction,
		openSwitcher,
		closeSwitcher,
		setDirection,
	};
}

/**
 * Hook for export dialog
 */
export function useExportDialog() {
	const open = useExportDialogOpen();
	const actions = useExportDialogActions();

	const openDialog = useCallback(() => {
		actions.open();
	}, [actions]);

	const closeDialog = useCallback(() => {
		actions.close();
	}, [actions]);

	const toggleDialog = useCallback(() => {
		actions.toggle();
	}, [actions]);

	return {
		open,
		openDialog,
		closeDialog,
		toggleDialog,
	};
}

/**
 * Hook for accessing global UI store directly
 * Use sparingly - prefer useGlobalUI() for most cases
 *
 * @returns Global UI store
 */
export function useGlobalUIStore_Direct() {
	return useGlobalUIStore();
}
