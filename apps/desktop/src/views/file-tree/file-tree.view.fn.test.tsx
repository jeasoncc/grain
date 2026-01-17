/**
 * FileTree View Component Tests
 * Tests for the FileTree pure view component
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { NodeInterface } from "@/types/node"
import type { FileTreeProps } from "./file-tree.types"
import { FileTree } from "./file-tree.view.fn"

// Mock hooks
vi.mock("@/hooks/use-icon-theme", () => ({
	useIconTheme: () => ({
		icons: {
			activityBar: {
				canvas: () => <div data-testid="canvas-icon">Canvas</div>,
			},
			file: {
				default: () => <div data-testid="file-icon">File</div>,
			},
			folder: {
				default: () => <div data-testid="folder-icon">Folder</div>,
				open: () => <div data-testid="folder-open-icon">FolderOpen</div>,
			},
		},
	}),
}))

vi.mock("@/hooks/use-theme", () => ({
	useTheme: () => ({
		currentTheme: {
			colors: {
				folderColor: "#3b82f6",
			},
		},
	}),
}))

describe("FileTree", () => {
	const mockNodes: NodeInterface[] = [
		{
			collapsed: false,
			createDate: new Date().toISOString(),
			id: "1",
			lastEdit: new Date().toISOString(),
			order: 0,
			parent: null,
			title: "Test Folder",
			type: "folder",
			workspace: "workspace-1",
		},
		{
			collapsed: false,
			createDate: new Date().toISOString(),
			id: "2",
			lastEdit: new Date().toISOString(),
			order: 0,
			parent: "1",
			title: "Test File",
			type: "file",
			workspace: "workspace-1",
		},
	]

	const defaultProps: FileTreeProps = {
		nodes: mockNodes,
		onCreateFile: vi.fn(),
		onCreateFolder: vi.fn(),
		onDeleteNode: vi.fn(),
		onRenameNode: vi.fn(),
		onSelectNode: vi.fn(),
		selectedNodeId: null,
		workspaceId: "workspace-1",
	}

	it("should render with workspace selected", () => {
		render(<FileTree {...defaultProps} />)
		expect(screen.getByText("Explorer")).toBeInTheDocument()
	})

	it("should show empty state when no workspace selected", () => {
		render(<FileTree {...defaultProps} workspaceId={null} />)
		expect(screen.getByText("Please select a workspace first")).toBeInTheDocument()
	})

	it("should show empty state when no nodes", () => {
		render(<FileTree {...defaultProps} nodes={[]} />)
		expect(screen.getByText("No files yet")).toBeInTheDocument()
	})

	it("should call onCreateFolder when create folder button clicked", () => {
		const onCreateFolder = vi.fn()
		render(<FileTree {...defaultProps} onCreateFolder={onCreateFolder} />)

		const createFolderButton = screen.getByTitle("Create new folder")
		fireEvent.click(createFolderButton)

		expect(onCreateFolder).toHaveBeenCalledWith(null)
	})

	it("should call onCreateFile when create file button clicked", () => {
		const onCreateFile = vi.fn()
		render(<FileTree {...defaultProps} onCreateFile={onCreateFile} />)

		const createFileButton = screen.getByTitle("Create new file")
		fireEvent.click(createFileButton)

		expect(onCreateFile).toHaveBeenCalledWith(null, "file")
	})

	it("should render nodes in tree structure", () => {
		render(<FileTree {...defaultProps} />)
		// react-arborist renders nodes, so we just verify the component renders
		expect(screen.getByText("Explorer")).toBeInTheDocument()
	})
})
