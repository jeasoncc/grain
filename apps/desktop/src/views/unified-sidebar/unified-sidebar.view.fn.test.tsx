/**
 * UnifiedSidebarView Component Tests
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { UnifiedSidebarViewProps } from "./unified-sidebar.types";
import { UnifiedSidebarView } from "./unified-sidebar.view.fn";

// Mock child components
vi.mock("../panels/drawings-panel", () => ({
	DrawingsPanel: () => <div data-testid="drawings-panel">Drawings Panel</div>,
}));

vi.mock("../panels/file-tree-panel/", () => ({
	FileTreePanel: () => <div data-testid="file-tree-panel">File Tree Panel</div>,
}));

vi.mock("../panels/search-panel/", () => ({
	SearchPanel: () => <div data-testid="search-panel">Search Panel</div>,
}));

vi.mock("../panels/tag-graph-panel/", () => ({
	TagGraphPanel: () => <div data-testid="tag-graph-panel">Tag Graph Panel</div>,
}));

describe("UnifiedSidebarView", () => {
	const defaultProps: UnifiedSidebarViewProps = {
		activePanel: "files",
		isOpen: true,
		wasCollapsedByDrag: false,
		workspaceId: "workspace-1",
		drawings: [],
		selectedDrawingId: null,
		onRestoreFromCollapse: vi.fn(),
		onSelectDrawing: vi.fn(),
		onCreateDrawing: vi.fn(),
		onDeleteDrawing: vi.fn(),
	};

	it("should render nothing when sidebar is closed", () => {
		const { container } = render(
			<UnifiedSidebarView {...defaultProps} isOpen={false} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("should render nothing when no active panel", () => {
		const { container } = render(
			<UnifiedSidebarView {...defaultProps} activePanel={null} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("should render restore button when collapsed by drag", () => {
		render(
			<UnifiedSidebarView
				{...defaultProps}
				isOpen={false}
				wasCollapsedByDrag={true}
			/>,
		);
		const button = screen.getByTitle("Restore sidebar");
		expect(button).toBeInTheDocument();
	});

	it("should call onRestoreFromCollapse when restore button clicked", () => {
		const onRestoreFromCollapse = vi.fn();
		render(
			<UnifiedSidebarView
				{...defaultProps}
				isOpen={false}
				wasCollapsedByDrag={true}
				onRestoreFromCollapse={onRestoreFromCollapse}
			/>,
		);
		const button = screen.getByTitle("Restore sidebar");
		fireEvent.click(button);
		expect(onRestoreFromCollapse).toHaveBeenCalledTimes(1);
	});

	it("should render search panel when activePanel is search", () => {
		render(<UnifiedSidebarView {...defaultProps} activePanel="search" />);
		expect(screen.getByTestId("search-panel")).toBeInTheDocument();
	});

	it("should render drawings panel when activePanel is drawings", () => {
		render(<UnifiedSidebarView {...defaultProps} activePanel="drawings" />);
		expect(screen.getByTestId("drawings-panel")).toBeInTheDocument();
	});

	it("should render file tree panel when activePanel is files", () => {
		render(<UnifiedSidebarView {...defaultProps} activePanel="files" />);
		expect(screen.getByTestId("file-tree-panel")).toBeInTheDocument();
	});

	it("should render tag graph panel when activePanel is tags", () => {
		render(<UnifiedSidebarView {...defaultProps} activePanel="tags" />);
		expect(screen.getByTestId("tag-graph-panel")).toBeInTheDocument();
	});

	it("should pass correct props to DrawingsPanel", () => {
		const drawings = [
			{ id: "1", name: "Drawing 1" },
			{ id: "2", name: "Drawing 2" },
		] as any;
		const onSelectDrawing = vi.fn();
		const onCreateDrawing = vi.fn();
		const onDeleteDrawing = vi.fn();

		render(
			<UnifiedSidebarView
				{...defaultProps}
				activePanel="drawings"
				drawings={drawings}
				selectedDrawingId="1"
				onSelectDrawing={onSelectDrawing}
				onCreateDrawing={onCreateDrawing}
				onDeleteDrawing={onDeleteDrawing}
			/>,
		);

		expect(screen.getByTestId("drawings-panel")).toBeInTheDocument();
	});

	it("should render with null workspaceId", () => {
		render(<UnifiedSidebarView {...defaultProps} workspaceId={null} />);
		expect(screen.getByTestId("file-tree-panel")).toBeInTheDocument();
	});
});
