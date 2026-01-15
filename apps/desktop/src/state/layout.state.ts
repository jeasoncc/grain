/**
 * @file state/layout.state.ts
 * @description Layout 状态管理
 *
 * Zustand store with Immer for immutable state updates.
 * Manages overall application layout state including sidebar visibility and panel configuration.
 *
 * 依赖规则：state/ 只能依赖 types/
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import {
	DEFAULT_LAYOUT_CONFIG,
	DEFAULT_LAYOUT_STATE,
	type LayoutActions,
	type LayoutState,
	type SidebarPanel,
} from "@/types/layout"

// ==============================
// Store Type
// ==============================

type LayoutStore = LayoutState & LayoutActions

// ==============================
// Store Implementation
// ==============================

export const useLayoutStore = create<LayoutStore>()(
	persist(
		(set) => ({
			// Initial state
			...DEFAULT_LAYOUT_STATE,

			// ==============================
			// Actions
			// ==============================

			setActivePanel: (panel: SidebarPanel) => {
				set((state) => ({
					...state,
					activePanel: panel,
					// Open sidebar when a panel is selected
					isSidebarOpen: true,
					// Clear drag collapse flag when manually setting panel
					wasCollapsedByDrag: false,
				}))
			},

			toggleSidebar: () => {
				set((state) => ({
					...state,
					isSidebarOpen: !state.isSidebarOpen,
					// Clear drag collapse flag on manual toggle
					wasCollapsedByDrag: false,
				}))
			},

			setSidebarCollapsedByDrag: (collapsed: boolean) => {
				set((state) => ({
					...state,
					wasCollapsedByDrag: collapsed,
					isSidebarOpen: collapsed ? false : state.isSidebarOpen,
				}))
			},

			restoreFromCollapse: () => {
				set((state) => ({
					...state,
					isSidebarOpen: true,
					wasCollapsedByDrag: false,
					// Restore to default width (20%)
					sidebarWidth: DEFAULT_LAYOUT_STATE.sidebarWidth,
				}))
			},

			setSidebarWidth: (width: number) => {
				set((state) => ({
					...state,
					sidebarWidth: width,
				}))
			},
		}),
		{
			name: DEFAULT_LAYOUT_CONFIG.storageKey,
			partialize: (state) => ({
				isSidebarOpen: state.isSidebarOpen,
				activePanel: state.activePanel,
				wasCollapsedByDrag: state.wasCollapsedByDrag,
				sidebarWidth: state.sidebarWidth,
			}),
		},
	),
)

// ==============================
// Selector Hooks
// ==============================

/** Select whether sidebar is open */
export const useIsSidebarOpen = () => useLayoutStore((s) => s.isSidebarOpen)

/** Select active panel */
export const useActivePanel = () => useLayoutStore((s) => s.activePanel)

/** Select whether collapsed by drag */
export const useWasCollapsedByDrag = () => useLayoutStore((s) => s.wasCollapsedByDrag)

/** Select sidebar width */
export const useSidebarWidth = () => useLayoutStore((s) => s.sidebarWidth)

// ==============================
// Action Hooks
// ==============================

/** Get layout actions */
export const useLayoutActions = () => ({
	setActivePanel: useLayoutStore((s) => s.setActivePanel),
	toggleSidebar: useLayoutStore((s) => s.toggleSidebar),
	setSidebarCollapsedByDrag: useLayoutStore((s) => s.setSidebarCollapsedByDrag),
	restoreFromCollapse: useLayoutStore((s) => s.restoreFromCollapse),
	setSidebarWidth: useLayoutStore((s) => s.setSidebarWidth),
})
