/**
 * FileTree Component using react-arborist
 * Displays a hierarchical tree structure with VS Code-like experience.
 * Features: drag-drop, virtualization, keyboard navigation, inline rename.
 *
 * 纯展示组件：所有数据通过 props 传入，不直接访问 Store 或 DB
 */

import { ChevronDown, ChevronRight, FolderPlus, Plus } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { type NodeApi, type NodeRendererProps, Tree } from "react-arborist"
import { useIconTheme } from "@/hooks/use-icon-theme"
import { useTheme } from "@/hooks/use-theme"
import type { NodeInterface, NodeType } from "@/types/node"
import { cn } from "@/utils/cn.util"
import { Button } from "@/views/ui/button"
import { Input } from "@/views/ui/input"
import type { FileTreeProps, TreeData } from "./file-tree.types"
import { TreeNodeDropdown } from "./tree-node-dropdown.view.fn"
import { TreeNodeIcon } from "./tree-node-icon.view.fn"

/**
 * FileTree Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export type { FileTreeProps, TreeData } from "./file-tree.types"

function buildTreeData(
	nodes: readonly NodeInterface[],
	parentId: string | null = null,
): TreeData[] {
	return nodes
		.filter((n) => n.parent === parentId)
		.toSorted((a, b) => a.order - b.order)
		.map((node) => ({
			children: node.type === "folder" ? buildTreeData(nodes, node.id) : undefined,
			collapsed: node.collapsed ?? true,
			id: node.id,
			name: node.title,
			type: node.type,
		}))
}

// ============================================================================
// 主组件
// ============================================================================

function TreeNode({
	node,
	style,
	dragHandle,
	onDelete,
	onCreateFolder,
	onCreateFile,
	folderColor,
	hasSelection,
}: NodeRendererProps<TreeData> & {
	onDelete: (nodeId: string) => void
	onCreateFolder: (parentId: string | null) => void
	onCreateFile: (parentId: string | null, type: NodeType) => void
	folderColor?: string
	hasSelection: boolean
}) {
	const data = node.data
	const isFolder = data.type === "folder"

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (isFolder) {
			node.toggle()
		} else {
			node.select()
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault()
			e.stopPropagation()
			if (isFolder) {
				node.toggle()
			} else {
				node.select()
			}
		} else if (e.key === "F2") {
			e.preventDefault()
			node.edit()
		}
	}

	return (
		<div
			style={style}
			ref={dragHandle}
			role="treeitem"
			tabIndex={0}
			aria-selected={node.isSelected}
			aria-expanded={isFolder ? node.isOpen : undefined}
			data-testid="file-tree-item"
			data-node-id={data.id}
			data-title={data.name}
			data-type={data.type}
			className={cn(
				"group flex items-center gap-1.5 py-1 pr-2 cursor-pointer px-2 rounded-md mx-1",
				node.isSelected
					? "text-foreground font-medium bg-accent/50"
					: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
				node.willReceiveDrop && "bg-sidebar-accent ring-1 ring-primary/20",
			)}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			onDoubleClick={(e) => {
				e.stopPropagation()
				node.edit()
			}}
		>
			{isFolder ? (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation()
						node.toggle()
					}}
					className="p-0.5 hover:bg-foreground/10 rounded-sm shrink-0 -ml-1"
				>
					{node.isOpen ? (
						<ChevronDown className="size-3.5 opacity-70" />
					) : (
						<ChevronRight className="size-3.5 opacity-70" />
					)}
				</button>
			) : (
				<span className="w-3.5 -ml-1" />
			)}

			<TreeNodeIcon
				type={data.type}
				isOpen={node.isOpen}
				isSelected={node.isSelected}
				hasSelection={hasSelection}
				folderColor={folderColor}
			/>

			{node.isEditing ? (
				<Input
					autoFocus
					defaultValue={data.name}
					className="h-6 text-sm px-1 py-0 flex-1 min-w-0"
					onBlur={() => node.reset()}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							node.submit(e.currentTarget.value)
						} else if (e.key === "Escape") {
							node.reset()
						}
					}}
					onClick={(e) => e.stopPropagation()}
				/>
			) : (
				<span
					className={cn(
						"flex-1 text-sm truncate min-w-0 transition-opacity duration-200 group-hover/panel:opacity-100",
						node.isSelected ? "text-foreground font-medium opacity-100" : "text-muted-foreground",
						hasSelection && !node.isSelected && "opacity-40",
					)}
					title={data.name}
				>
					{data.name}
				</span>
			)}

			{isFolder && node.children && node.children.length > 0 && !node.isEditing && (
				<span className="text-xs opacity-50 group-hover:opacity-100 mr-1">
					{node.children.length}
				</span>
			)}

			{!node.isEditing && (
				<TreeNodeDropdown
					nodeId={data.id}
					isFolder={isFolder}
					onEdit={() => node.edit()}
					onDelete={onDelete}
					onCreateFolder={onCreateFolder}
					onCreateFile={onCreateFile}
				/>
			)}
		</div>
	)
}

export function FileTree({
	workspaceId,
	nodes,
	selectedNodeId,
	onSelectNode,
	onCreateFolder,
	onCreateFile,
	onDeleteNode,
	onRenameNode,
	onMoveNode,
	onToggleCollapsed,
	treeRef: externalTreeRef,
}: FileTreeProps) {
	const treeData = useMemo(() => buildTreeData(nodes), [nodes])
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const internalTreeRef = useRef<any>(null)
	// Use external ref if provided, otherwise use internal ref
	const treeRef = externalTreeRef || internalTreeRef
	const containerRef = useRef<HTMLDivElement>(null)
	const iconTheme = useIconTheme()
	const { currentTheme } = useTheme()

	// Use window height as fallback to ensure tree renders immediately
	const [dimensions, setDimensions] = useState<{
		width: number | string
		height: number
	}>({
		height: typeof window !== "undefined" ? window.innerHeight - 100 : 600,
		width: "100%",
	})

	useEffect(() => {
		const container = containerRef.current
		if (!container) {
			return
		}

		const updateDimensions = () => {
			const rect = container.getBoundingClientRect()
			if (rect.width > 0 && rect.height > 0) {
				setDimensions({ height: rect.height, width: rect.width })
			}
		}

		// Initial measurement
		updateDimensions()

		// Use ResizeObserver for updates
		const observer = new ResizeObserver(updateDimensions)
		observer.observe(container)

		return () => observer.disconnect()
	}, [])

	const handleSelect = useCallback(
		(selectedNodes: NodeApi<TreeData>[]) => {
			if (selectedNodes.length > 0 && selectedNodes[0].data.type !== "folder") {
				onSelectNode(selectedNodes[0].id)
			}
		},
		[onSelectNode],
	)

	const handleRename = useCallback(
		({ id, name }: { id: string; name: string }) => {
			if (name.trim()) {
				onRenameNode(id, name.trim())
			}
		},
		[onRenameNode],
	)

	const handleMove = useCallback(
		({
			dragIds,
			parentId,
			index,
		}: {
			dragIds: string[]
			parentId: string | null
			index: number
		}) => {
			if (dragIds.length > 0) {
				onMoveNode(dragIds[0], parentId, index)
			}
		},
		[onMoveNode],
	)

	const handleToggle = useCallback(
		async (id: string) => {
			const node = nodes.find((n) => n.id === id)
			if (node) {
				onToggleCollapsed(id, !node.collapsed)
			}
		},
		[nodes, onToggleCollapsed],
	)

	const renderNode = useCallback(
		(props: NodeRendererProps<TreeData>) => (
			<TreeNode
				{...props}
				onDelete={onDeleteNode}
				onCreateFolder={onCreateFolder}
				onCreateFile={onCreateFile}
				folderColor={currentTheme?.colors.folderColor}
				hasSelection={!!selectedNodeId}
			/>
		),
		[onDeleteNode, onCreateFolder, onCreateFile, currentTheme?.colors.folderColor, selectedNodeId],
	)

	// No workspace selected
	if (!workspaceId) {
		const FolderIcon = iconTheme.icons.folder.default
		return (
			<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<FolderIcon
					className="size-12 mb-3 opacity-20"
					style={{
						color: currentTheme?.colors.folderColor || "#3b82f6",
					}}
				/>
				<p className="text-sm text-center px-4">Please select a workspace first</p>
			</div>
		)
	}

	return (
		<div className="group/panel flex h-full w-full flex-col" data-testid="file-tree">
			{/* Header */}
			<div className="h-11 flex items-center justify-between px-4 shrink-0 group/header">
				<span className="text-sm font-semibold text-foreground/80 tracking-wide pl-1">
					Explorer
				</span>
				<div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={() => onCreateFolder(null)}
						title="Create new folder"
					>
						<FolderPlus className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={() => onCreateFile(null, "file")}
						title="Create new file"
					>
						<Plus className="size-4" />
					</Button>
				</div>
			</div>

			{/* Tree Content */}
			<div className="flex-1 w-full overflow-hidden pb-6" ref={containerRef}>
				{treeData.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
						{(() => {
							const FileIcon = iconTheme.icons.file.default
							return <FileIcon className="size-12 mb-3 opacity-20" />
						})()}
						<p className="text-sm text-center px-4">No files yet</p>
						<Button
							variant="outline"
							size="sm"
							className="mt-3 text-xs"
							onClick={() => onCreateFile(null, "file")}
						>
							<Plus className="size-3 mr-1" />
							Create File
						</Button>
					</div>
				) : (
					<div className="w-full h-full">
						<Tree
							ref={treeRef}
							data={treeData}
							selection={selectedNodeId ?? undefined}
							onSelect={handleSelect}
							onRename={handleRename}
							onMove={handleMove}
							onToggle={handleToggle}
							indent={12}
							rowHeight={30}
							overscanCount={5}
							openByDefault={false}
							disableMultiSelection
							className="outline-none"
							width={dimensions.width}
							height={dimensions.height}
						>
							{renderNode}
						</Tree>
					</div>
				)}
			</div>
		</div>
	)
}
