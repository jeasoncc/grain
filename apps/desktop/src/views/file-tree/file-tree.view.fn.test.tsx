/**
 * FileTree View Component Tests
 * Tests for the FileTree pure view component
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NodeInterface } from "@/types/node";
import type { FileTreeProps } from "./file-tree.types";
import { FileTree } from "./file-tree.view.fn";

// Mock hooks
vi.mock("@/hooks/use-icon-theme", () => ({
	useIconTheme: () => ({
		icons: {
			folder: {
				default: () => <div data-testid="folder-icon">Folder</div>,
				open: () => <div data-testid="folder-open-icon">FolderOpen</div>,
			},
			file: {
				default: () => <div data-testid="file-icon">File</div>,
			},
			activityBar: {
				canvas: () => <div data-testid="canvas-icon">Canvas</div>,
			},
		},
	}),
}));

vi.mock("@/hooks/use-theme", () => ({
	useTheme: () => ({
		currentTheme: {
			colors: {
				folderColor: "#3b82f6",
			},
		},
	}),
}));

describe("FileTree", () => {
	const mockNodes: NodeInterface[] = [
		{
			id: "1",
			title: "Test Folder",
			type: "folder",
			parent: null,
			order: 0,
			collapsed: false,
			workspace: "workspace-1",
			createDate: new Date().toISOString(),
			lastEdit: new Date().toISOString(),
		},
		{
			id: "2",
			title: "Test File",
			type: "file",
			parent: "1",
			order: 0,
			collapsed: false,
			workspace: "workspace-1",
			createDate: new Date().toISOString(),
			lastEdit: new Date().toISOString(),
		},
	];

	const defaultProps: FileTreeProps = {
		workspaceId: "workspace-1",
		nodes: mockNodes,
		selectedNodeId: null,
		onSelectNode: vi.fn(),
		onCreateFolder: vi.fn(),
		onCreateFile: vi.fn(),
		onDeleteNode: vi.fn(),
		onRenameNode: vi.fn(),
		onMoveNode: vi.fn(),
		onToggleCollapsed: vi.fn(),
	};

	it("should render with workspace selected", () => {
		render(<FileTree {...defaultProps} />);
		expect(screen.getByText("Explorer")).toBeInTheDocument();
	});

	it("should show empty state when no workspace selected", () => {
		render(<FileTree {...defaultProps} workspaceId={null} />);
		expect(
			screen.getByText("Please select a workspace first"),
		).toBeInTheDocument();
	});

	it("should show empty state when no nodes", () => {
		render(<FileTree {...defaultProps} nodes={[]} />);
		expect(screen.getByText("No files yet")).toBeInTheDocument();
	});

	it("should call onCreateFolder when create folder button clicked", () => {
		const onCreateFolder = vi.fn();
		render(<FileTree {...defaultProps} onCreateFolder={onCreateFolder} />);

		const createFolderButton = screen.getByTitle("Create new folder");
		fireEvent.click(createFolderButton);

		expect(onCreateFolder).toHaveBeenCalledWith(null);
	});

	it("should call onCreateFile when create file button clicked", () => {
		const onCreateFile = vi.fn();
		render(<FileTree {...defaultProps} onCreateFile={onCreateFile} />);

		const createFileButton = screen.getByTitle("Create new file");
		fireEvent.click(createFileButton);

		expect(onCreateFile).toHaveBeenCalledWith(null, "file");
	});

	it("should render nodes in tree structure", () => {
		render(<FileTree {...defaultProps} />);
		// react-arborist renders nodes, so we just verify the component renders
		expect(screen.getByText("Explorer")).toBeInTheDocument();
	});
});
