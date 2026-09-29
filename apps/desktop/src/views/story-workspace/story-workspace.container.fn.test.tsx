import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { WorkspaceInterface } from "@/types/workspace"
import { StoryWorkspaceContainer } from "./story-workspace.container.fn"

// Mock child components at their current view-layer import paths.
vi.mock("@grain/editor-lexical", () => ({
	MultiEditorContainer: vi.fn(() => <div data-testid="multi-editor" />),
}))

vi.mock("@/views/blocks/wiki-hover-preview-connected", () => ({
	WikiHoverPreviewConnected: vi.fn(() => <div data-testid="wiki-preview" />),
}))

vi.mock("@/views/editor-tabs", () => ({
	EditorTabs: vi.fn(() => <div data-testid="editor-tabs" />),
}))

vi.mock("@/views/excalidraw-editor", () => ({
	ExcalidrawEditorContainer: vi.fn(() => <div data-testid="excalidraw-editor" />),
}))

vi.mock("@/views/keyboard-shortcuts-help", () => ({
	KeyboardShortcutsHelp: vi.fn(() => <div data-testid="keyboard-shortcuts" />),
}))

vi.mock("@/views/save-status-indicator", () => ({
	SaveStatusIndicator: vi.fn(() => <div data-testid="save-status" />),
}))

vi.mock("@/views/story-right-sidebar", () => ({
	StoryRightSidebar: vi.fn(() => <div data-testid="right-sidebar" />),
}))

vi.mock("@/views/theme-selector", () => ({
	ThemeSelector: vi.fn(() => <div data-testid="theme-selector" />),
}))

vi.mock("@/views/word-count-badge", () => ({
	WordCountBadge: vi.fn(() => <div data-testid="word-count" />),
}))

// Mock the container's current orchestration hook contract.
vi.mock("@/hooks/use-story-workspace", () => ({
	useStoryWorkspace: vi.fn(({ activeWorkspaceId }) => ({
		activeTab: undefined,
		activeTabId: null,
		editorStates: {},
		foldIconStyle: "default",
		handleMultiEditorContentChange: vi.fn(),
		handleScrollChange: vi.fn(),
		isExcalidrawTab: false,
		lexicalTabs: [],
		mentionEntries: [],
		rightSidebarOpen: false,
		selectedWorkspaceId: activeWorkspaceId ?? "ws1",
		showWordCount: false,
		tabPosition: "top",
		tabs: [],
		toggleRightSidebar: vi.fn(),
		useWikiHoverPreview: vi.fn(),
		wikiFiles: [],
		wordCountDisplayText: "0 words",
		wordCountMode: "mixed",
		wordCountResult: {
			characters: 0,
			chineseChars: 0,
			englishWords: 0,
			total: 0,
		},
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
