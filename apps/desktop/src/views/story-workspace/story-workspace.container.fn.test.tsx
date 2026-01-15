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
		wordCountMode: "mixed",
		showWordCountBadge: false,
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
		updateContent: vi.fn(),
		saveNow: vi.fn(),
		hasUnsavedChanges: vi.fn(() => false),
		setInitialContent: vi.fn(),
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
			toggleRightSidebar: vi.fn(),
			tabPosition: "top",
		}
		return selector ? selector(state) : state
	}),
}))

vi.mock("@/state/editor-tabs.state", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const state = {
			tabs: [],
			activeTabId: null,
			editorStates: {},
			updateEditorState: vi.fn(),
			setActiveTab: vi.fn(),
			closeTab: vi.fn(),
		}
		return selector ? selector(state) : state
	}),
}))

vi.mock("@/state/save.state", () => ({
	useSaveStore: vi.fn(() => ({
		status: "saved",
		lastSaveTime: null,
		errorMessage: null,
		hasUnsavedChanges: false,
		isManualSaving: false,
		markAsUnsaved: vi.fn(),
		markAsSaved: vi.fn(),
		markAsSaving: vi.fn(),
	})),
}))

// Mock DB
vi.mock("@/db", () => ({
	getContentByNodeId: vi.fn(() => () => Promise.resolve({ _tag: "Left" })),
}))

vi.mock("@/fn/word-count", () => ({
	countWordsFromLexicalState: vi.fn(() => ({
		chineseChars: 0,
		englishWords: 0,
		total: 0,
		characters: 0,
	})),
}))

describe("StoryWorkspaceContainer", () => {
	const mockWorkspaces: WorkspaceInterface[] = [
		{
			id: "ws1",
			title: "Workspace 1",
			author: "Test Author",
			description: "Test Description",
			publisher: "Test Publisher",
			language: "en",
			lastOpen: new Date().toISOString(),
			createDate: new Date().toISOString(),
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
