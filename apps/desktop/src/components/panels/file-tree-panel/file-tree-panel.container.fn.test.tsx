import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileTreePanelContainer } from "./file-tree-panel.container.fn";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
	useNavigate: vi.fn(() => vi.fn()),
}));

vi.mock("@/components/file-tree", () => ({
	FileTree: vi.fn(() => <div data-testid="file-tree">FileTree</div>),
}));

vi.mock("@/components/ui/confirm", () => ({
	useConfirm: vi.fn(() => vi.fn()),
}));

vi.mock("@/hooks/use-node", () => ({
	useNodesByWorkspace: vi.fn(() => []),
}));

vi.mock("@/state/editor-tabs.state", () => ({
	useEditorTabsStore: vi.fn((selector) => {
		const store = {
			openTab: vi.fn(),
			updateEditorState: vi.fn(),
			editorStates: {},
			closeTab: vi.fn(),
		};
		return selector ? selector(store) : store;
	}),
}));

vi.mock("@/state/selection.state", () => ({
	useSelectionStore: vi.fn((selector) => {
		const store = {
			selectedWorkspaceId: "workspace-1",
			selectedNodeId: null,
			setSelectedNodeId: vi.fn(),
		};
		return selector ? selector(store) : store;
	}),
}));

vi.mock("@/actions", () => ({
	createDiaryCompatAsync: vi.fn(),
	createNode: vi.fn(),
	deleteNode: vi.fn(),
	moveNode: vi.fn(),
	renameNode: vi.fn(),
}));

vi.mock("@/db", () => ({
	getContentByNodeId: vi.fn(),
	getNodeById: vi.fn(),
	setNodeCollapsed: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

describe("FileTreePanelContainer", () => {
	it("should render FileTree component", () => {
		render(<FileTreePanelContainer />);
		expect(screen.getByTestId("file-tree")).toBeInTheDocument();
	});

	it("should render with custom workspaceId prop", () => {
		render(<FileTreePanelContainer workspaceId="custom-workspace" />);
		expect(screen.getByTestId("file-tree")).toBeInTheDocument();
	});

	it("should render without workspaceId prop", () => {
		render(<FileTreePanelContainer />);
		expect(screen.getByTestId("file-tree")).toBeInTheDocument();
	});
});
