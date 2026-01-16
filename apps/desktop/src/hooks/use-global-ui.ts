/**
 * @file hooks/use-global-ui.ts
 * @description Global UI hook
 *
 * 职责：封装全局 UI 组件状态和操作的 React hook
 * 依赖：state/, types/
 */

import { useCallback } from "react"
import {
	useBufferSwitcherActions,
	useBufferSwitcherDirection,
	useBufferSwitcherOpen,
	useCommandPaletteActions,
	useCommandPaletteOpen,
	useExportDialogActions,
	useExportDialogOpen,
	useGlobalSearchActions,
	useGlobalSearchOpen,
	useGlobalUIStore,
} from "@/state"
import type { BufferSwitcherDirection } from "@/types/global-ui"

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
	const commandPaletteOpen = useCommandPaletteOpen()
	const globalSearchOpen = useGlobalSearchOpen()
	const bufferSwitcherOpen = useBufferSwitcherOpen()
	const bufferSwitcherDirection = useBufferSwitcherDirection()
	const exportDialogOpen = useExportDialogOpen()

	// Actions
	const commandPaletteActions = useCommandPaletteActions()
	const globalSearchActions = useGlobalSearchActions()
	const bufferSwitcherActions = useBufferSwitcherActions()
	const exportDialogActions = useExportDialogActions()

	return {
		// Buffer Switcher
		bufferSwitcher: {
			close: bufferSwitcherActions.close,
			direction: bufferSwitcherDirection,
			isOpen: bufferSwitcherOpen,
			open: bufferSwitcherActions.open,
			setDirection: bufferSwitcherActions.setDirection,
			setOpen: (isOpen: boolean) => (isOpen ? undefined : bufferSwitcherActions.close()),
		},
		// Command Palette
		commandPalette: {
			close: commandPaletteActions.close,
			isOpen: commandPaletteOpen,
			open: commandPaletteActions.open,
			setOpen: (isOpen: boolean) =>
				isOpen ? commandPaletteActions.open() : commandPaletteActions.close(),
			toggle: commandPaletteActions.toggle,
		},

		// Export Dialog
		exportDialog: {
			close: exportDialogActions.close,
			isOpen: exportDialogOpen,
			open: exportDialogActions.open,
			setOpen: (isOpen: boolean) =>
				isOpen ? exportDialogActions.open() : exportDialogActions.close(),
			toggle: exportDialogActions.toggle,
		},

		// Global Search
		globalSearch: {
			close: globalSearchActions.close,
			isOpen: globalSearchOpen,
			open: globalSearchActions.open,
			setOpen: (isOpen: boolean) =>
				isOpen ? globalSearchActions.open() : globalSearchActions.close(),
			toggle: globalSearchActions.toggle,
		},
	}
}

/**
 * Hook for command palette
 */
export function useCommandPalette() {
	const open = useCommandPaletteOpen()
	const actions = useCommandPaletteActions()

	const openPalette = useCallback(() => {
		actions.open()
	}, [actions])

	const closePalette = useCallback(() => {
		actions.close()
	}, [actions])

	const togglePalette = useCallback(() => {
		actions.toggle()
	}, [actions])

	return {
		closePalette,
		open,
		openPalette,
		togglePalette,
	}
}

/**
 * Hook for global search
 */
export function useGlobalSearch() {
	const open = useGlobalSearchOpen()
	const actions = useGlobalSearchActions()

	const openSearch = useCallback(() => {
		actions.open()
	}, [actions])

	const closeSearch = useCallback(() => {
		actions.close()
	}, [actions])

	const toggleSearch = useCallback(() => {
		actions.toggle()
	}, [actions])

	return {
		closeSearch,
		open,
		openSearch,
		toggleSearch,
	}
}

/**
 * Hook for buffer switcher
 */
export function useBufferSwitcher() {
	const open = useBufferSwitcherOpen()
	const direction = useBufferSwitcherDirection()
	const actions = useBufferSwitcherActions()

	const openSwitcher = useCallback(
		(dir: BufferSwitcherDirection) => {
			actions.open(dir)
		},
		[actions],
	)

	const closeSwitcher = useCallback(() => {
		actions.close()
	}, [actions])

	const setDirection = useCallback(
		(dir: BufferSwitcherDirection) => {
			actions.setDirection(dir)
		},
		[actions],
	)

	return {
		closeSwitcher,
		direction,
		open,
		openSwitcher,
		setDirection,
	}
}

/**
 * Hook for export dialog
 */
export function useExportDialog() {
	const open = useExportDialogOpen()
	const actions = useExportDialogActions()

	const openDialog = useCallback(() => {
		actions.open()
	}, [actions])

	const closeDialog = useCallback(() => {
		actions.close()
	}, [actions])

	const toggleDialog = useCallback(() => {
		actions.toggle()
	}, [actions])

	return {
		closeDialog,
		open,
		openDialog,
		toggleDialog,
	}
}

/**
 * Hook for accessing global UI store directly
 * Use sparingly - prefer useGlobalUI() for most cases
 *
 * @returns Global UI store
 */
export function useGlobalUIStore_Direct() {
	return useGlobalUIStore()
}
