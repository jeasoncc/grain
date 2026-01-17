/**
 * @file stores/sidebar.store.ts
 * @description Sidebar 状态管理
 *
 * Zustand store with Immer for immutable state updates.
 * Manages unified sidebar state including panels and panel-specific states.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
	DEFAULT_SIDEBAR_CONFIG,
	DEFAULT_SIDEBAR_STATE,
	SIDEBAR_AUTO_COLLAPSE_THRESHOLD,
	SIDEBAR_DEFAULT_WIDTH,
	SIDEBAR_MAX_WIDTH,
	SIDEBAR_MIN_WIDTH,
	type SidebarActions,
	type SidebarPanel,
	type SidebarState,
} from "@/types/sidebar"

// ==============================
// Store Type
// ==============================

type SidebarStore = SidebarState & SidebarActions

// ==============================
// Utility Functions
// ==============================

/**
 * Constrain width to valid bounds.
 */
const constrainWidth = (width: number): number =>
	Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width))

// ==============================
// Store Implementation
// ==============================

export const useSidebarStore = create<SidebarStore>()(
	persist(
		(set, get) => ({
			// Initial state
			...DEFAULT_SIDEBAR_STATE,

			resizeSidebar: (newWidth: number) => {
				const state = get()
				// Auto-collapse when width drops below threshold
				if (newWidth < SIDEBAR_AUTO_COLLAPSE_THRESHOLD) {
					set((currentState) => ({
						...currentState,
						isOpen: false,
						previousWidth: state.width,
						wasCollapsedByDrag: true,
					}))
					return
				}
				// Constrain width within bounds
				set((currentState) => ({
					...currentState,
					wasCollapsedByDrag: false,
					width: constrainWidth(newWidth),
				}))
			},

			restoreFromCollapse: () => {
				const state = get()
				set((currentState) => ({
					...currentState,
					isOpen: true,
					wasCollapsedByDrag: false,
					width: state.previousWidth || SIDEBAR_DEFAULT_WIDTH,
				}))
			},

			// Main sidebar actions
			setActivePanel: (panel: SidebarPanel) => {
				const newIsOpen = true // 选择面板时总是打开侧边栏
				set((state) => ({
					...state,
					activePanel: panel,
					isOpen: newIsOpen,
				}))
			},

			// File tree actions
			setExpandedFolders: (folders: Record<string, boolean>) => {
				set((state) => ({
					...state,
					fileTreeState: {
						...state.fileTreeState,
						expandedFolders: folders,
					},
				}))
			},

			setIsOpen: (open: boolean) => {
				set((state) => ({
					...state,
					isOpen: open,
				}))
			},

			// Search panel actions
			setSearchQuery: (query: string) => {
				set((state) => ({
					...state,
					searchState: {
						...state.searchState,
						query,
					},
				}))
			},

			setSearchSelectedTypes: (types: readonly string[]) => {
				set((state) => ({
					...state,
					searchState: {
						...state.searchState,
						selectedTypes: [...types],
					},
				}))
			},

			setSearchShowFilters: (show: boolean) => {
				set((state) => ({
					...state,
					searchState: {
						...state.searchState,
						showFilters: show,
					},
				}))
			},

			// Drawings panel actions
			setSelectedDrawingId: (id: string | null) => {
				set((state) => ({
					...state,
					drawingsState: {
						...state.drawingsState,
						selectedDrawingId: id,
					},
				}))
			},

			setWidth: (width: number) => {
				set((state) => ({
					...state,
					width: constrainWidth(width),
				}))
			},

			toggleFolderExpanded: (folderId: string) => {
				set((state) => {
					const current = state.fileTreeState.expandedFolders[folderId]
					return {
						...state,
						fileTreeState: {
							...state.fileTreeState,
							expandedFolders: {
								...state.fileTreeState.expandedFolders,
								[folderId]: !current,
							},
						},
					}
				})
			},

			toggleSidebar: () => {
				set((state) => ({
					...state,
					isOpen: !state.isOpen,
					wasCollapsedByDrag: false,
				}))
			},
		}),
		{
			name: DEFAULT_SIDEBAR_CONFIG.storageKey,
			partialize: (state) => ({
				activePanel: state.activePanel,
				drawingsState: state.drawingsState,
				// fileTreeState 不持久化 - expandedFolders 是运行时状态
				// fileTreeState is not persisted - expandedFolders is runtime state
				isOpen: state.isOpen,
				previousWidth: state.previousWidth,
				searchState: state.searchState,
				wasCollapsedByDrag: state.wasCollapsedByDrag,
				width: state.width,
			}),
		},
	),
)

// ==============================
// Selector Hooks
// ==============================

/** Select active panel (legacy - use useActivePanel from layout.state.ts for new code) */
export const useSidebarActivePanel = () => useSidebarStore((s) => s.activePanel)

/** Select sidebar open state */
export const useSidebarIsOpen = () => useSidebarStore((s) => s.isOpen)

/** Select sidebar width (legacy - use useSidebarWidth from layout.state.ts for new code) */
export const useLegacySidebarWidth = () => useSidebarStore((s) => s.width)

/** Select whether collapsed by drag (legacy - use useWasCollapsedByDrag from layout.state.ts for new code) */
export const useLegacyWasCollapsedByDrag = () => useSidebarStore((s) => s.wasCollapsedByDrag)

/** Select search panel state */
export const useSearchPanelState = () => useSidebarStore((s) => s.searchState)

/** Select drawings panel state */
export const useDrawingsPanelState = () => useSidebarStore((s) => s.drawingsState)

/** Select file tree state */
export const useFileTreeState = () => useSidebarStore((s) => s.fileTreeState)

/** Select expanded folders */
export const useExpandedFolders = () => useSidebarStore((s) => s.fileTreeState.expandedFolders)

// ==============================
// Action Hooks
// ==============================

/** Get sidebar actions */
export const useSidebarActions = () => ({
	resizeSidebar: useSidebarStore((s) => s.resizeSidebar),
	restoreFromCollapse: useSidebarStore((s) => s.restoreFromCollapse),
	setActivePanel: useSidebarStore((s) => s.setActivePanel),
	setExpandedFolders: useSidebarStore((s) => s.setExpandedFolders),
	setIsOpen: useSidebarStore((s) => s.setIsOpen),
	setSearchQuery: useSidebarStore((s) => s.setSearchQuery),
	setSearchSelectedTypes: useSidebarStore((s) => s.setSearchSelectedTypes),
	setSearchShowFilters: useSidebarStore((s) => s.setSearchShowFilters),
	setSelectedDrawingId: useSidebarStore((s) => s.setSelectedDrawingId),
	setWidth: useSidebarStore((s) => s.setWidth),
	toggleFolderExpanded: useSidebarStore((s) => s.toggleFolderExpanded),
	toggleSidebar: useSidebarStore((s) => s.toggleSidebar),
})
