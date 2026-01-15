import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { WorkspaceInterface } from "@/types/workspace"
import { StoryWorkspaceContainer } from "./story-workspace.container.fn"

// Mock all child components
vi.mock("@grain/editor-lexical", () => ({
	MultiEditorContainer: vi.fn(() => <div data-testid="multi-editor" />),
}))

vi.mock("@/components/blocks/canvas-editor", () => ({
	CanvasEditor: vi.fn(() => <div data-testid="canvas-editor" />),
}))

vi.mock("@/components/keyboard-shortcuts-help", () => ({
	KeyboardShortcutsHelp: vi.fn(() => <div data-testid="keyboard-shortcuts" />),
}))

vi.mock("@/components/save-status-indicator", () => ({
	SaveStatusIndicator: vi.fn(() => <div data-testid="save-status" />),
}))

vi.mock("@/components/theme-selector", () => ({
	ThemeSelector: vi.fn(() => <div data-testid="theme-selector" />),
}))

vi.mock("@/components/blocks/wiki-hover-preview-connected", () => ({
	WikiHoverPreviewConnected: vi.fn(() => <div data-testid="wiki-preview" />),
}))

vi.mock("@/components/word-count-badge", () => ({
	WordCountBadge: vi.fn(() => <div data-testid="word-count" />),
}))

vi.mock("@/components/drawing/drawing-workspace", () => ({
	DrawingWorkspace: vi.fn(() => <div data-testid="drawing-workspace" />),
}))

vi.mock("@/components/editor-tabs", () => ({
	EditorTabs: vi.fn(() => <div data-testid="editor-tabs" />),
}))

vi.mock("@/components/excalidraw-editor", () => ({
	ExcalidrawEditorContainer: vi.fn(() => <div data-testid="excalidraw-editor" />),
}))

vi.mock("@/components/story-right-sidebar", () => ({
	StoryRightSidebar: vi.fn(() => <div data-testid="right-sidebar" />),
}))

// Mock hooks
vi.mock("@/hooks/use-settings", () => ({
	useSettings: vi.fn(() => ({
		autoSave: false,
		autoSaveInterval: 1,
		showWordCountBadge: false,
		wordCountMode: "mixed",
	})),
}))

vi.mock("@/hooks/use-wiki", () => ({
	useWikiFiles: vi.fn(() => []),
}))

vi.mock("@/hooks/use-wiki-hover-preview", () => ({
	useWikiHoverPreview: vi.fn(),
}))

vi.mock("@/hooks/use-unified-save", () => ({
	useUnifiedSave: vi.fn(() => ({
		hasUnsavedChanges: vi.fn(() => false),
		saveNow: vi.fn(),
		setInitialContent: vi.fn(),
		updateContent: vi.fn(),
	})),
}))

// Mock stores
vi.mock("@/state/selection.state", () => ({
	useSelectionStore: vi.fn((selector) => {
		const state = {
			selectedWorkspaceId: "ws1",
			setSelectedWorkspaceId: vi.fn(),
		}
		return selector ? selector(state) : state
	}),
}))

vi.mock("@/state/ui.state", () => ({
	useUIStore: vi.fn((selector) => {
		const state = {
			rightSidebarOpen: false,
			tabPosition: "top",
			toggleRightSidebar: vi.fn(),
		}
		return selector ? selector(state) : state
	}),
}))

vi.mock("@/state/editor-tabs.state", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const state = {
			activeTabId: null,
			closeTab: vi.fn(),
			editorStates: {},
			setActiveTab: vi.fn(),
			tabs: [],
			updateEditorState: vi.fn(),
		}
		return selector ? selector(state) : state
	}),
}))

vi.mock("@/state/save.state", () => ({
	useSaveStore: vi.fn(() => ({
		errorMessage: null,
		hasUnsavedChanges: false,
		isManualSaving: false,
		lastSaveTime: null,
		markAsSaved: vi.fn(),
		markAsSaving: vi.fn(),
		markAsUnsaved: vi.fn(),
		status: "saved",
	})),
}))

// Mock DB
vi.mock("@/db", () => ({
	getContentByNodeId: vi.fn(() => () => Promise.resolve({ _tag: "Left" })),
}))

vi.mock("@/fn/word-count", () => ({
	countWordsFromLexicalState: vi.fn(() => ({
		characters: 0,
		chineseChars: 0,
		englishWords: 0,
		total: 0,
	})),
}))

describe("StoryWorkspaceContainer", () => {
	const mockWorkspaces: WorkspaceInterface[] = [
		{
			author: "Test Author",
			createDate: new Date().toISOString(),
			description: "Test Description",
			id: "ws1",
			language: "en",
			lastOpen: new Date().toISOString(),
			publisher: "Test Publisher",
			title: "Workspace 1",
		},
	]

	it("should render without crashing", () => {
		render(<StoryWorkspaceContainer workspaces={mockWorkspaces} />)
		expect(screen.getByTestId("save-status")).toBeInTheDocument()
	})

	it("should render theme selector", () => {
		render(<StoryWorkspaceContainer workspaces={mockWorkspaces} />)
		expect(screen.getByTestId("theme-selector")).toBeInTheDocument()
	})

	it("should render keyboard shortcuts help", () => {
		render(<StoryWorkspaceContainer workspaces={mockWorkspaces} />)
		expect(screen.getByTestId("keyboard-shortcuts")).toBeInTheDocument()
	})

	it("should show welcome message when no files exist", () => {
		render(<StoryWorkspaceContainer workspaces={mockWorkspaces} />)
		expect(screen.getByText("Welcome to your workspace!")).toBeInTheDocument()
	})

	it("should use activeWorkspaceId prop when provided", () => {
		render(<StoryWorkspaceContainer workspaces={mockWorkspaces} activeWorkspaceId="ws1" />)
		expect(screen.getByTestId("save-status")).toBeInTheDocument()
	})
})
