import { create } from "zustand";
import { persist } from "zustand/middleware";

// Simplified panel types - files panel is the main file tree
export type UnifiedSidebarPanel = "search" | "drawings" | "wiki" | "files" | null;

interface SearchPanelState {
	query: string;
	selectedTypes: string[];
	showFilters: boolean;
}

interface DrawingsPanelState {
	selectedDrawingId: string | null;
}

interface WikiPanelState {
	selectedEntryId: string | null;
}

interface FileTreeState {
	/** 展开的文件夹 ID 映射 */
	expandedFolders: Record<string, boolean>;
}

// Sidebar width constraints
export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 600;
export const SIDEBAR_AUTO_COLLAPSE_THRESHOLD = 150;
export const SIDEBAR_DEFAULT_WIDTH = 320;

interface UnifiedSidebarState {
	// Main sidebar state
	activePanel: UnifiedSidebarPanel;
	isOpen: boolean;
	width: number;
	// Track if sidebar was collapsed by drag vs manual toggle
	wasCollapsedByDrag: boolean;
	// Store previous width for restore after drag collapse
	previousWidth: number;

	// Panel states
	searchState: SearchPanelState;
	drawingsState: DrawingsPanelState;
	wikiState: WikiPanelState;
	fileTreeState: FileTreeState;

	// Actions
	setActivePanel: (panel: UnifiedSidebarPanel) => void;
	setIsOpen: (open: boolean) => void;
	toggleSidebar: () => void;
	setWidth: (width: number) => void;
	// Resize with auto-collapse support
	resizeSidebar: (newWidth: number) => void;
	// Restore from drag collapse
	restoreFromCollapse: () => void;

	// Search panel actions
	setSearchQuery: (query: string) => void;
	setSearchSelectedTypes: (types: string[]) => void;
	setSearchShowFilters: (show: boolean) => void;

	// Drawings panel actions
	setSelectedDrawingId: (id: string | null) => void;

	// Wiki panel actions
	setSelectedWikiEntryId: (id: string | null) => void;

	// File tree actions
	setExpandedFolders: (folders: Record<string, boolean>) => void;
	toggleFolderExpanded: (folderId: string) => void;
}

export const useUnifiedSidebarStore = create<UnifiedSidebarState>()(
	persist(
		(set, get) => ({
			// Main sidebar state
			activePanel: "files",
			isOpen: true,
			width: SIDEBAR_DEFAULT_WIDTH,
			wasCollapsedByDrag: false,
			previousWidth: SIDEBAR_DEFAULT_WIDTH,

			// Panel states
			searchState: {
				query: "",
				selectedTypes: ["node", "wiki"],
				showFilters: false,
			},
			drawingsState: {
				selectedDrawingId: null,
			},
			wikiState: {
				selectedEntryId: null,
			},
			fileTreeState: {
				expandedFolders: {},
			},

			// Actions
			setActivePanel: (panel) => {
				const state = get();
				set({
					activePanel: panel,
					isOpen: panel !== null ? true : state.isOpen,
				});
			},
			setIsOpen: (open) => set({ isOpen: open }),
			toggleSidebar: () => {
				const state = get();
				set({ isOpen: !state.isOpen, wasCollapsedByDrag: false });
			},
			setWidth: (width) => set({ width: Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width)) }),
			resizeSidebar: (newWidth) => {
				const state = get();
				// Auto-collapse when width drops below threshold
				if (newWidth < SIDEBAR_AUTO_COLLAPSE_THRESHOLD) {
					set({
						isOpen: false,
						wasCollapsedByDrag: true,
						previousWidth: state.width,
					});
					return;
				}
				// Constrain width within bounds
				const constrainedWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, newWidth));
				set({ width: constrainedWidth, wasCollapsedByDrag: false });
			},
			restoreFromCollapse: () => {
				const state = get();
				set({
					isOpen: true,
					wasCollapsedByDrag: false,
					width: state.previousWidth || SIDEBAR_DEFAULT_WIDTH,
				});
			},

			// Search panel actions
			setSearchQuery: (query) =>
				set((state) => ({
					searchState: { ...state.searchState, query },
				})),
			setSearchSelectedTypes: (types) =>
				set((state) => ({
					searchState: { ...state.searchState, selectedTypes: types },
				})),
			setSearchShowFilters: (show) =>
				set((state) => ({
					searchState: { ...state.searchState, showFilters: show },
				})),

			// Drawings panel actions
			setSelectedDrawingId: (id) =>
				set((state) => ({
					drawingsState: { ...state.drawingsState, selectedDrawingId: id },
				})),

			// Wiki panel actions
			setSelectedWikiEntryId: (id) =>
				set((state) => ({
					wikiState: { ...state.wikiState, selectedEntryId: id },
				})),

			// File tree actions
			setExpandedFolders: (folders) =>
				set((state) => ({
					fileTreeState: { ...state.fileTreeState, expandedFolders: folders },
				})),
			toggleFolderExpanded: (folderId) =>
				set((state) => ({
					fileTreeState: {
						...state.fileTreeState,
						expandedFolders: {
							...state.fileTreeState.expandedFolders,
							[folderId]: !state.fileTreeState.expandedFolders[folderId],
						},
					},
				})),
		}),
		{
			name: "novel-editor-unified-sidebar",
			partialize: (state) => ({
				activePanel: state.activePanel,
				isOpen: state.isOpen,
				width: state.width,
				wasCollapsedByDrag: state.wasCollapsedByDrag,
				previousWidth: state.previousWidth,
				searchState: state.searchState,
				drawingsState: state.drawingsState,
				wikiState: state.wikiState,
				fileTreeState: state.fileTreeState,
			}),
		},
	),
);
