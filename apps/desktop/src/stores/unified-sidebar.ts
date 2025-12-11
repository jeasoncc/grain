import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UnifiedSidebarPanel = "search" | "books" | "drawings" | "wiki" | "chapters" | null;

interface SearchPanelState {
	query: string;
	selectedTypes: string[];
	showFilters: boolean;
}

interface BooksPanelState {
	selectedProjectId: string | null;
	expandedChapters: Record<string, boolean>;
	selectedChapter: string | null;
	selectedScene: string | null;
}

interface DrawingsPanelState {
	selectedDrawingId: string | null;
}

interface WikiPanelState {
	selectedEntryId: string | null;
}

interface ChaptersPanelState {
	selectedProjectId: string | null;
	expandedChapters: Record<string, boolean>;
	selectedChapterId: string | null;
	selectedSceneId: string | null;
}

interface UnifiedSidebarState {
	// Main sidebar state
	activePanel: UnifiedSidebarPanel;
	isOpen: boolean;
	width: number;

	// Panel states
	searchState: SearchPanelState;
	booksState: BooksPanelState;
	drawingsState: DrawingsPanelState;
	wikiState: WikiPanelState;
	chaptersState: ChaptersPanelState;

	// Actions
	setActivePanel: (panel: UnifiedSidebarPanel) => void;
	setIsOpen: (open: boolean) => void;
	toggleSidebar: () => void;
	setWidth: (width: number) => void;

	// Search panel actions
	setSearchQuery: (query: string) => void;
	setSearchSelectedTypes: (types: string[]) => void;
	setSearchShowFilters: (show: boolean) => void;

	// Books panel actions
	setSelectedProjectId: (id: string | null) => void;
	setExpandedChapters: (chapters: Record<string, boolean>) => void;
	setSelectedChapter: (id: string | null) => void;
	setSelectedScene: (id: string | null) => void;

	// Drawings panel actions
	setSelectedDrawingId: (id: string | null) => void;

	// Wiki panel actions
	setSelectedWikiEntryId: (id: string | null) => void;

	// Chapters panel actions
	setChaptersSelectedProjectId: (id: string | null) => void;
	setChaptersExpandedChapters: (chapters: Record<string, boolean>) => void;
	setChaptersSelectedChapterId: (id: string | null) => void;
	setChaptersSelectedSceneId: (id: string | null) => void;
}

export const useUnifiedSidebarStore = create<UnifiedSidebarState>()(
	persist(
		(set, get) => ({
			// Main sidebar state
			activePanel: "books",
			isOpen: true,
			width: 320,

			// Panel states
			searchState: {
				query: "",
				selectedTypes: ["scene", "role", "world"],
				showFilters: false,
			},
			booksState: {
				selectedProjectId: null,
				expandedChapters: {},
				selectedChapter: null,
				selectedScene: null,
			},
			drawingsState: {
				selectedDrawingId: null,
			},
			wikiState: {
				selectedEntryId: null,
			},
			chaptersState: {
				selectedProjectId: null,
				expandedChapters: {},
				selectedChapterId: null,
				selectedSceneId: null,
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
				set({ isOpen: !state.isOpen });
			},
			setWidth: (width) => set({ width: Math.max(280, Math.min(600, width)) }),

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

			// Books panel actions
			setSelectedProjectId: (id) =>
				set((state) => ({
					booksState: { ...state.booksState, selectedProjectId: id },
				})),
			setExpandedChapters: (chapters) =>
				set((state) => ({
					booksState: { ...state.booksState, expandedChapters: chapters },
				})),
			setSelectedChapter: (id) =>
				set((state) => ({
					booksState: { ...state.booksState, selectedChapter: id },
				})),
			setSelectedScene: (id) =>
				set((state) => ({
					booksState: { ...state.booksState, selectedScene: id },
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

			// Chapters panel actions
			setChaptersSelectedProjectId: (id) =>
				set((state) => ({
					chaptersState: { ...state.chaptersState, selectedProjectId: id },
				})),
			setChaptersExpandedChapters: (chapters) =>
				set((state) => ({
					chaptersState: { ...state.chaptersState, expandedChapters: chapters },
				})),
			setChaptersSelectedChapterId: (id) =>
				set((state) => ({
					chaptersState: { ...state.chaptersState, selectedChapterId: id },
				})),
			setChaptersSelectedSceneId: (id) =>
				set((state) => ({
					chaptersState: { ...state.chaptersState, selectedSceneId: id },
				})),
		}),
		{
			name: "novel-editor-unified-sidebar",
			partialize: (state) => ({
				activePanel: state.activePanel,
				isOpen: state.isOpen,
				width: state.width,
				searchState: state.searchState,
				booksState: state.booksState,
				drawingsState: state.drawingsState,
				wikiState: state.wikiState,
				chaptersState: state.chaptersState,
			}),
		},
	),
);
