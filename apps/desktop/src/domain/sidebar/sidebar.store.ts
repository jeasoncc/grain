/**
 * Sidebar Domain - Store Implementation
 *
 * Zustand store with Immer for immutable state updates.
 * Manages unified sidebar state including panels and panel-specific states.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import logger from "@/log";
import {
	type SidebarState,
	type SidebarActions,
	type SidebarPanel,
	DEFAULT_SIDEBAR_STATE,
	DEFAULT_SIDEBAR_CONFIG,
	SIDEBAR_MIN_WIDTH,
	SIDEBAR_MAX_WIDTH,
	SIDEBAR_AUTO_COLLAPSE_THRESHOLD,
	SIDEBAR_DEFAULT_WIDTH,
} from "./sidebar.interface";

// ==============================
// Store Type
// ==============================

type SidebarStore = SidebarState & SidebarActions;

// ==============================
// Utility Functions
// ==============================

/**
 * Constrain width to valid bounds.
 */
const constrainWidth = (width: number): number =>
	Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));

// ==============================
// Store Implementation
// ==============================

export const useSidebarStore = create<SidebarStore>()(
	persist(
		immer((set, get) => ({
			// Initial state
			...DEFAULT_SIDEBAR_STATE,

			// Main sidebar actions
			setActivePanel: (panel: SidebarPanel) => {
				const state = get();
				const newIsOpen = panel !== null ? true : state.isOpen;
				logger.info(
					`[Sidebar] setActivePanel: panel=${panel}, currentIsOpen=${state.isOpen}, newIsOpen=${newIsOpen}`
				);
				set((draft) => {
					draft.activePanel = panel;
					draft.isOpen = newIsOpen;
				});
			},

			setIsOpen: (open: boolean) => {
				const state = get();
				logger.info(
					`[Sidebar] setIsOpen: open=${open}, currentIsOpen=${state.isOpen}`
				);
				set((draft) => {
					draft.isOpen = open;
				});
			},

			toggleSidebar: () => {
				const state = get();
				logger.info(
					`[Sidebar] toggleSidebar: currentIsOpen=${state.isOpen}, newIsOpen=${!state.isOpen}`
				);
				set((draft) => {
					draft.isOpen = !draft.isOpen;
					draft.wasCollapsedByDrag = false;
				});
			},

			setWidth: (width: number) => {
				set((draft) => {
					draft.width = constrainWidth(width);
				});
			},

			resizeSidebar: (newWidth: number) => {
				const state = get();
				// Auto-collapse when width drops below threshold
				if (newWidth < SIDEBAR_AUTO_COLLAPSE_THRESHOLD) {
					set((draft) => {
						draft.isOpen = false;
						draft.wasCollapsedByDrag = true;
						draft.previousWidth = state.width;
					});
					return;
				}
				// Constrain width within bounds
				set((draft) => {
					draft.width = constrainWidth(newWidth);
					draft.wasCollapsedByDrag = false;
				});
			},

			restoreFromCollapse: () => {
				const state = get();
				set((draft) => {
					draft.isOpen = true;
					draft.wasCollapsedByDrag = false;
					draft.width = state.previousWidth || SIDEBAR_DEFAULT_WIDTH;
				});
			},

			// Search panel actions
			setSearchQuery: (query: string) => {
				set((draft) => {
					draft.searchState.query = query;
				});
			},

			setSearchSelectedTypes: (types: string[]) => {
				set((draft) => {
					draft.searchState.selectedTypes = types;
				});
			},

			setSearchShowFilters: (show: boolean) => {
				set((draft) => {
					draft.searchState.showFilters = show;
				});
			},

			// Drawings panel actions
			setSelectedDrawingId: (id: string | null) => {
				set((draft) => {
					draft.drawingsState.selectedDrawingId = id;
				});
			},

			// File tree actions
			setExpandedFolders: (folders: Record<string, boolean>) => {
				set((draft) => {
					draft.fileTreeState.expandedFolders = folders;
				});
			},

			toggleFolderExpanded: (folderId: string) => {
				set((draft) => {
					const current = draft.fileTreeState.expandedFolders[folderId];
					draft.fileTreeState.expandedFolders[folderId] = !current;
				});
			},
		})),
		{
			name: DEFAULT_SIDEBAR_CONFIG.storageKey,
			partialize: (state) => ({
				activePanel: state.activePanel,
				isOpen: state.isOpen,
				width: state.width,
				wasCollapsedByDrag: state.wasCollapsedByDrag,
				previousWidth: state.previousWidth,
				searchState: state.searchState,
				drawingsState: state.drawingsState,
				fileTreeState: state.fileTreeState,
			}),
		}
	)
);

// ==============================
// Selector Hooks
// ==============================

/** Select active panel */
export const useActivePanel = () => useSidebarStore((s) => s.activePanel);

/** Select sidebar open state */
export const useSidebarIsOpen = () => useSidebarStore((s) => s.isOpen);

/** Select sidebar width */
export const useSidebarWidth = () => useSidebarStore((s) => s.width);

/** Select whether collapsed by drag */
export const useWasCollapsedByDrag = () =>
	useSidebarStore((s) => s.wasCollapsedByDrag);

/** Select search panel state */
export const useSearchPanelState = () => useSidebarStore((s) => s.searchState);

/** Select drawings panel state */
export const useDrawingsPanelState = () =>
	useSidebarStore((s) => s.drawingsState);

/** Select file tree state */
export const useFileTreeState = () => useSidebarStore((s) => s.fileTreeState);

/** Select expanded folders */
export const useExpandedFolders = () =>
	useSidebarStore((s) => s.fileTreeState.expandedFolders);

// ==============================
// Action Hooks
// ==============================

/** Get sidebar actions */
export const useSidebarActions = () => ({
	setActivePanel: useSidebarStore((s) => s.setActivePanel),
	setIsOpen: useSidebarStore((s) => s.setIsOpen),
	toggleSidebar: useSidebarStore((s) => s.toggleSidebar),
	setWidth: useSidebarStore((s) => s.setWidth),
	resizeSidebar: useSidebarStore((s) => s.resizeSidebar),
	restoreFromCollapse: useSidebarStore((s) => s.restoreFromCollapse),
	setSearchQuery: useSidebarStore((s) => s.setSearchQuery),
	setSearchSelectedTypes: useSidebarStore((s) => s.setSearchSelectedTypes),
	setSearchShowFilters: useSidebarStore((s) => s.setSearchShowFilters),
	setSelectedDrawingId: useSidebarStore((s) => s.setSelectedDrawingId),
	setExpandedFolders: useSidebarStore((s) => s.setExpandedFolders),
	toggleFolderExpanded: useSidebarStore((s) => s.toggleFolderExpanded),
});

// ==============================
// Legacy Compatibility Export
// ==============================

/**
 * @deprecated Use useSidebarStore instead
 */
export const useUnifiedSidebarStore = useSidebarStore;
