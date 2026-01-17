/**
 * FileTree Component using @tanstack/react-virtual (纯声明式)
 * Displays a hierarchical tree structure with VS Code-like experience.
 * Features: virtual scrolling, keyboard navigation, expand/collapse.
 *
 * 纯展示组件：所有逻辑封装在 use-file-tree.ts hook 中
 * 组件只负责渲染，像 HTML 一样声明式
 */

import { ChevronsDownUp, ChevronsUpDown, FolderPlus, Plus } from "lucide-react"
import type React from "react"
import { useCallback, useRef, useEffect } from "react"
import { useFileTree } from "@/hooks/use-file-tree"
import { Button } from "@/views/ui/button"
import type { FileTreeProps } from "./file-tree.types"
import { TreeNodeRow } from "./tree-node-row.view.fn"

/**
 * FileTree Props 接口
 *
 * 纯展示组件：所有数据和回调通过 props 传入
 */
export type { FileTreeProps } from "./file-tree.types"

// ============================================================================
// 主组件（纯声明式）
// ============================================================================

/**
 * FileTree - 文件树组件（虚拟列表版本）
 *
 * 数据流：
 *   props → useFileTree hook → 虚拟列表 → 渲染
 *
 * 职责：
 * - 纯 UI 渲染
 * - 所有逻辑在 useFileTree hook 中
 */
export function FileTree(props: FileTreeProps) {
	const {
		workspaceId,
		nodes,
		selectedNodeId,
		onSelectNode,
		onCreateFolder,
		onCreateFile,
		onDeleteNode,
		onRenameNode,
	} = props

	const {
		flatNodes,
		virtualizer,
		containerRef,
		iconTheme,
		currentTheme,
		hasAnyFolders,
		handlers,
	} = useFileTree({
		workspaceId,
		nodes,
		selectedNodeId,
		onSelectNode,
		onCreateFolder,
		onCreateFile,
		onDeleteNode,
		onRenameNode,
	})

	// Keyboard navigation state
	const focusedIndexRef = useRef<number>(-1)
	const treeContainerRef = useRef<HTMLDivElement>(null)

	// Update focused index when selection changes
	useEffect(() => {
		if (selectedNodeId) {
			const index = flatNodes.findIndex((n) => n.id === selectedNodeId)
			if (index !== -1) {
				focusedIndexRef.current = index
			}
		}
	}, [selectedNodeId, flatNodes])

	// Keyboard navigation handler
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (flatNodes.length === 0) return

			const currentIndex = focusedIndexRef.current
			let newIndex = currentIndex

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault()
					newIndex = Math.min(currentIndex + 1, flatNodes.length - 1)
					if (newIndex !== currentIndex) {
						focusedIndexRef.current = newIndex
						const node = flatNodes[newIndex]
						if (node.type !== "folder") {
							onSelectNode(node.id)
						}
						virtualizer.scrollToIndex(newIndex, { align: "auto" })
					}
					break

				case "ArrowUp":
					e.preventDefault()
					newIndex = Math.max(currentIndex - 1, 0)
					if (newIndex !== currentIndex) {
						focusedIndexRef.current = newIndex
						const node = flatNodes[newIndex]
						if (node.type !== "folder") {
							onSelectNode(node.id)
						}
						virtualizer.scrollToIndex(newIndex, { align: "auto" })
					}
					break

				case "ArrowRight": {
					e.preventDefault()
					const node = flatNodes[currentIndex]
					if (node && node.type === "folder" && !node.isExpanded) {
						handlers.onToggle(node.id)
					}
					break
				}

				case "ArrowLeft": {
					e.preventDefault()
					const node = flatNodes[currentIndex]
					if (node && node.type === "folder" && node.isExpanded) {
						handlers.onToggle(node.id)
					}
					break
				}

				case "Enter": {
					e.preventDefault()
					const node = flatNodes[currentIndex]
					if (node) {
						handlers.onSelect(node.id)
					}
					break
				}

				case " ": {
					e.preventDefault()
					const node = flatNodes[currentIndex]
					if (node && node.type === "folder") {
						handlers.onToggle(node.id)
					}
					break
				}
			}
		},
		[flatNodes, handlers, onSelectNode, virtualizer],
	)

	// No workspace selected
	if (!workspaceId) {
		const FolderIcon = iconTheme.icons.folder.default
		return (
			<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
				<FolderIcon
					className="size-12 mb-3 opacity-20"
					style={{ color: currentTheme?.colors.folderColor || "#3b82f6" }}
				/>
				<p className="text-sm text-center px-4">Please select a workspace first</p>
			</div>
		)
	}

	return (
		<div 
			ref={treeContainerRef}
			className="group/panel flex h-full w-full flex-col" 
			data-testid="file-tree"
			tabIndex={0}
			onKeyDown={handleKeyDown}
		>
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
						onClick={handlers.onExpandAll}
						disabled={!hasAnyFolders}
						title="全部展开 / Expand All"
					>
						<ChevronsUpDown className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 hover:bg-sidebar-accent rounded-sm"
						onClick={handlers.onCollapseAll}
						disabled={!hasAnyFolders}
						title="全部折叠 / Collapse All"
					>
						<ChevronsDownUp className="size-4" />
					</Button>
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
			<div className="flex-1 w-full overflow-hidden pb-6">
				{flatNodes.length === 0 ? (
					/* Empty State */
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
					/* Virtual List */
					<div
						ref={containerRef}
						className="h-full w-full overflow-auto"
						style={{ contain: "strict" }}
					>
						<div
							style={{
								height: `${virtualizer.getTotalSize()}px`,
								width: "100%",
								position: "relative",
							}}
						>
							{virtualizer.getVirtualItems().map((virtualItem) => {
								const node = flatNodes[virtualItem.index]
								return (
									<TreeNodeRow
										key={node.id}
										node={node}
										isSelected={node.id === selectedNodeId}
										onToggle={handlers.onToggle}
										onSelect={handlers.onSelect}
										onCreateFile={node.type === "folder" ? () => onCreateFile(node.id, "file") : undefined}
										onCreateFolder={node.type === "folder" ? () => onCreateFolder(node.id) : undefined}
										onRename={() => {
											// TODO: 实现重命名对话框
											// 暂时使用 prompt 作为临时方案
											const newTitle = prompt("Enter new name:", node.title)
											if (newTitle && newTitle !== node.title) {
												onRenameNode(node.id, newTitle)
											}
										}}
										onDelete={() => onDeleteNode(node.id)}
										style={{
											position: "absolute",
											top: 0,
											left: 0,
											width: "100%",
											transform: `translateY(${virtualItem.start}px)`,
										}}
									/>
								)
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
