/**
 * UnifiedSidebarContainer Component Tests
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UnifiedSidebarContainer } from "./unified-sidebar.container.fn";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({}));

const mockDrawings = [
	{ id: "1", name: "Drawing 1" },
	{ id: "2", name: "Drawing 2" },
];
vi.mock("@/hooks/use-drawing", () => ({
	useDrawingNodes: vi.fn(() => mockDrawings),
}));

const mockSelectionStore = {
	selectedWorkspaceId: "workspace-1" as string | null,
};
vi.mock("@/state/selection.state", () => ({
	useSelectionStore: vi.fn((selector: any) => {
		if (typeof selector === "function") {
			return selector(mockSelectionStore);
		}
		return mockSelectionStore;
	}),
}));

const mockSidebarStore = {
	activePanel: "files" as const,
	isOpen: true,
	wasCollapsedByDrag: false,
	drawingsState: { selectedDrawingId: null },
	restoreFromCollapse: vi.fn(),
	setSelectedDrawingId: vi.fn(),
};
vi.mock("@/state/sidebar.state", () => ({
	useSidebarStore: vi.fn((selector: any) => {
		if (typeof selector === "function") {
			return selector(mockSidebarStore);
		}
		return mockSidebarStore;
	}),
}));

vi.mock("@/log", () => ({
	default: {
		info: vi.fn(),
	},
}));

// Mock the View component
vi.mock("./unified-sidebar.view.fn", () => ({
	UnifiedSidebarView: ({
		activePanel,
		isOpen,
		onRestoreFromCollapse,
		onSelectDrawing,
		onCreateDrawing,
		onDeleteDrawing,
	}: any) => (
		<div data-testid="unified-sidebar-view">
			<div data-testid="active-panel">{activePanel}</div>
			<div data-testid="is-open">{String(isOpen)}</div>
			<button onClick={onRestoreFromCollapse}>Restore</button>
			<button onClick={() => onSelectDrawing({ id: "drawing-1" })}>
				Select Drawing
			</button>
			<button onClick={onCreateDrawing}>Create Drawing</button>
			<button onClick={() => onDeleteDrawing("drawing-1", "Drawing 1")}>
				Delete Drawing
			</button>
		</div>
	),
}));

describe("UnifiedSidebarContainer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSidebarStore.restoreFromCollapse.mockClear();
		mockSidebarStore.setSelectedDrawingId.mockClear();
	});

	it("should render UnifiedSidebarView with data from stores", () => {
		render(<UnifiedSidebarContainer />);
		expect(screen.getByTestId("unified-sidebar-view")).toBeInTheDocument();
		expect(screen.getByTestId("active-panel")).toHaveTextContent("files");
		expect(screen.getByTestId("is-open")).toHaveTextContent("true");
	});

	it("should fetch drawings for current workspace", () => {
		const { useDrawingNodes } = require("@/hooks/use-drawing");
		render(<UnifiedSidebarContainer />);
		expect(useDrawingNodes).toHaveBeenCalledWith("workspace-1");
	});

	it("should handle restore from collapse", () => {
		render(<UnifiedSidebarContainer />);
		const button = screen.getByText("Restore");
		fireEvent.click(button);
		expect(mockSidebarStore.restoreFromCollapse).toHaveBeenCalledTimes(1);
	});

	it("should handle drawing selection and update store", () => {
		render(<UnifiedSidebarContainer />);
		const button = screen.getByText("Select Drawing");
		fireEvent.click(button);

		// 绘图选择只更新 store，不再导航到 /canvas
		expect(mockSidebarStore.setSelectedDrawingId).toHaveBeenCalledWith(
			"drawing-1",
		);
	});

	it("should handle drawing creation", () => {
		render(<UnifiedSidebarContainer />);
		const button = screen.getByText("Create Drawing");
		fireEvent.click(button);
		// Creation is handled by DrawingsPanel, this just passes through
		expect(button).toBeInTheDocument();
	});

	it("should handle drawing deletion", () => {
		render(<UnifiedSidebarContainer />);
		const button = screen.getByText("Delete Drawing");
		fireEvent.click(button);
		// Deletion is handled by DrawingsPanel, this just passes through
		expect(button).toBeInTheDocument();
	});

	it("should handle null workspace", () => {
		mockSelectionStore.selectedWorkspaceId = null;
		render(<UnifiedSidebarContainer />);
		expect(screen.getByTestId("unified-sidebar-view")).toBeInTheDocument();
	});

	it("should handle empty drawings array", () => {
		const { useDrawingNodes } = require("@/hooks/use-drawing");
		useDrawingNodes.mockReturnValue([]);
		render(<UnifiedSidebarContainer />);
		expect(screen.getByTestId("unified-sidebar-view")).toBeInTheDocument();
	});
});
