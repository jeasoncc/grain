/**
 * FileTreeItem View Component Tests
 * Tests for the FileTreeItem pure view component
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { TreeNode } from "@/fn/node";
import type { DragState, FileTreeItemProps } from "./file-tree.types";
import { FileTreeItem } from "./file-tree-item.view.fn";

describe("FileTreeItem", () => {
	const mockFolderNode: TreeNode = {
		id: "folder-1",
		title: "Test Folder",
		type: "folder",
		collapsed: false,
		depth: 0,
		children: [],
	};

	const mockFileNode: TreeNode = {
		id: "file-1",
		title: "Test File",
		type: "file",
		collapsed: false,
		depth: 1,
		children: [],
	};

	const mockDragState: DragState = {
		draggedId: "",
		targetId: null,
		position: null,
	};

	const defaultProps: FileTreeItemProps = {
		node: mockFileNode,
		selectedId: null,
		renamingId: null,
		dragState: mockDragState,
		onSelect: vi.fn(),
		onToggle: vi.fn(),
		onStartRename: vi.fn(),
		onRename: vi.fn(),
		onCancelRename: vi.fn(),
		onDelete: vi.fn(),
		onCreateFolder: vi.fn(),
		onCreateFile: vi.fn(),
		onDragStart: vi.fn(),
		onDragOver: vi.fn(),
		onDragEnd: vi.fn(),
		onDrop: vi.fn(),
	};

	it("should render file node", () => {
		render(<FileTreeItem {...defaultProps} />);
		expect(screen.getByText("Test File")).toBeInTheDocument();
	});

	it("should render folder node", () => {
		render(<FileTreeItem {...defaultProps} node={mockFolderNode} />);
		expect(screen.getByText("Test Folder")).toBeInTheDocument();
	});

	it("should call onSelect when file node clicked", () => {
		const onSelect = vi.fn();
		render(<FileTreeItem {...defaultProps} onSelect={onSelect} />);

		fireEvent.click(screen.getByText("Test File"));

		expect(onSelect).toHaveBeenCalledWith("file-1");
	});

	it("should call onToggle when folder node clicked", () => {
		const onToggle = vi.fn();
		render(
			<FileTreeItem
				{...defaultProps}
				node={mockFolderNode}
				onToggle={onToggle}
			/>,
		);

		fireEvent.click(screen.getByText("Test Folder"));

		expect(onToggle).toHaveBeenCalledWith("folder-1", false);
	});

	it("should show selected state", () => {
		render(<FileTreeItem {...defaultProps} selectedId="file-1" />);

		const item = screen.getByRole("treeitem");
		expect(item).toHaveClass("bg-primary/10");
	});

	it("should call onStartRename on double click", () => {
		const onStartRename = vi.fn();
		render(<FileTreeItem {...defaultProps} onStartRename={onStartRename} />);

		fireEvent.doubleClick(screen.getByText("Test File"));

		expect(onStartRename).toHaveBeenCalledWith("file-1");
	});

	it("should show rename input when renaming", () => {
		render(<FileTreeItem {...defaultProps} renamingId="file-1" />);

		const input = screen.getByDisplayValue("Test File");
		expect(input).toBeInTheDocument();
	});

	it("should call onRename when Enter pressed in rename input", () => {
		const onRename = vi.fn();
		render(
			<FileTreeItem
				{...defaultProps}
				renamingId="file-1"
				onRename={onRename}
			/>,
		);

		const input = screen.getByDisplayValue("Test File");
		fireEvent.change(input, { target: { value: "New Name" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onRename).toHaveBeenCalledWith("file-1", "New Name");
	});

	it("should call onCancelRename when Escape pressed in rename input", () => {
		const onCancelRename = vi.fn();
		render(
			<FileTreeItem
				{...defaultProps}
				renamingId="file-1"
				onCancelRename={onCancelRename}
			/>,
		);

		const input = screen.getByDisplayValue("Test File");
		fireEvent.keyDown(input, { key: "Escape" });

		expect(onCancelRename).toHaveBeenCalled();
	});

	it("should show chevron for folder nodes", () => {
		render(<FileTreeItem {...defaultProps} node={mockFolderNode} />);

		const chevron = screen.getByRole("button");
		expect(chevron).toBeInTheDocument();
	});

	it("should toggle folder when chevron clicked", () => {
		const onToggle = vi.fn();
		render(
			<FileTreeItem
				{...defaultProps}
				node={mockFolderNode}
				onToggle={onToggle}
			/>,
		);

		const chevron = screen.getByRole("button");
		fireEvent.click(chevron);

		expect(onToggle).toHaveBeenCalledWith("folder-1", false);
	});

	it("should render children for expanded folders", () => {
		const folderWithChildren: TreeNode = {
			...mockFolderNode,
			collapsed: false,
			children: [mockFileNode],
		};

		render(<FileTreeItem {...defaultProps} node={folderWithChildren} />);

		expect(screen.getByText("Test Folder")).toBeInTheDocument();
		expect(screen.getByText("Test File")).toBeInTheDocument();
	});

	it("should not render children for collapsed folders", () => {
		const folderWithChildren: TreeNode = {
			...mockFolderNode,
			collapsed: true,
			children: [mockFileNode],
		};

		render(<FileTreeItem {...defaultProps} node={folderWithChildren} />);

		expect(screen.getByText("Test Folder")).toBeInTheDocument();
		expect(screen.queryByText("Test File")).not.toBeInTheDocument();
	});
});
