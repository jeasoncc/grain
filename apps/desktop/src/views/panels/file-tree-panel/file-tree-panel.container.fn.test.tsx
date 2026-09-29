import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { describe, expect, it, vi } from "vitest"
import { FileTreePanelContainer } from "./file-tree-panel.container.fn"

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
	useNavigate: vi.fn(() => vi.fn()),
}))

vi.mock("@/views/file-tree", () => ({
	FileTree: vi.fn(() => <div data-testid="file-tree">FileTree</div>),
}))

vi.mock("@/components/ui/confirm", () => ({
	useConfirm: vi.fn(() => vi.fn()),
}))

vi.mock("@/hooks/use-node", () => ({
	useNodesByWorkspace: vi.fn(() => []),
}))

vi.mock("@/hooks/use-editor-tabs", () => ({
	useEditorTabs: vi.fn(() => ({ closeTab: vi.fn() })),
}))

vi.mock("@/hooks/use-node-operations", () => ({
	useGetNodeById: vi.fn(() => ({ getNode: vi.fn() })),
}))

vi.mock("@/state/editor-tabs.state", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const store = {
			closeTab: vi.fn(),
			editorStates: {},
			openTab: vi.fn(),
			updateEditorState: vi.fn(),
		}
		return selector ? selector(store) : store
	}),
}))

vi.mock("@/state/selection.state", () => ({
	useSelectionStore: vi.fn((selector) => {
		const store = {
			selectedNodeId: null,
			selectedWorkspaceId: "workspace-1",
			setSelectedNodeId: vi.fn(),
		}
		return selector ? selector(store) : store
	}),
}))

vi.mock("@/state/sidebar.state", () => ({
	useSidebarStore: vi.fn((selector) => selector({ setExpandedFolders: vi.fn() })),
}))

vi.mock("@/actions", () => ({
	createDiaryCompatAsync: vi.fn(),
	createNode: vi.fn(),
	deleteNode: vi.fn(),
	moveNode: vi.fn(),
	renameNode: vi.fn(),
}))

vi.mock("@/db", () => ({
	getContentByNodeId: vi.fn(),
	getNodeById: vi.fn(),
	setNodeCollapsed: vi.fn(),
}))

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}))

const renderWithQueryClient = (ui: ReactElement) => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})

	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe("FileTreePanelContainer", () => {
	it("should render FileTree component", () => {
		renderWithQueryClient(<FileTreePanelContainer />)
		expect(screen.getByTestId("file-tree")).toBeInTheDocument()
	})

	it("should render with custom workspaceId prop", () => {
		renderWithQueryClient(<FileTreePanelContainer workspaceId="custom-workspace" />)
		expect(screen.getByTestId("file-tree")).toBeInTheDocument()
	})

	it("should render without workspaceId prop", () => {
		renderWithQueryClient(<FileTreePanelContainer />)
		expect(screen.getByTestId("file-tree")).toBeInTheDocument()
	})
})
