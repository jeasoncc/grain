/**
 * @file views/file-tree/tree-node-row.view.fn.tsx
 * @description Single tree node row component for virtual list
 *
 * 职责：
 * - 渲染单个树节点行
 * - 处理缩进（基于 depth）
 * - 显示展开/折叠图标
 * - 显示文件/文件夹图标
 * - 处理选中状态
 * - 处理点击事件
 * - 显示 hover 操作菜单
 *
 * 依赖：views/, types/
 */

import { ChevronDown, ChevronRight, MoreHorizontal, FilePlus, FolderPlus, Trash2 } from "lucide-react"
import { memo, useCallback, useState } from "react"
import type { FlatTreeNode } from "@/types/node"
import { useIconTheme } from "@/hooks/use-icon-theme"
import { Button } from "@/views/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/views/ui/popover"
import { cn } from "@/utils/cn.util"

// ============================================================================
// Types
// ============================================================================

export interface TreeNodeRowProps {
	readonly node: FlatTreeNode
	readonly isSelected: boolean
	readonly onToggle: (nodeId: string) => void
	readonly onSelect: (nodeId: string) => void
	readonly onCreateFile?: (parentId: string) => void
	readonly onCreateFolder?: (parentId: string) => void
	readonly onDelete?: (nodeId: string) => void
	readonly style?: React.CSSProperties
}

// ============================================================================
// Component
// ============================================================================

/**
 * TreeNodeRow - Single row in virtual file tree
 *
 * Features:
 * - Indentation based on depth (12px per level)
 * - Chevron for folders (expand/collapse)
 * - Icon based on file type
 * - Selection highlight
 * - Hover state
 * - Hover action menu (⋯ button)
 *
 * Performance:
 * - Memoized to prevent unnecessary re-renders
 * - Uses inline styles for position (from virtualizer)
 */
export const TreeNodeRow = memo(
	({
		node,
		isSelected,
		onToggle,
		onSelect,
		onCreateFile,
		onCreateFolder,
		onDelete,
		style,
	}: TreeNodeRowProps) => {
		const iconTheme = useIconTheme()
		const [isHovered, setIsHovered] = useState(false)
		const [isMenuOpen, setIsMenuOpen] = useState(false)

		// ============================================================================
		// Handlers
		// ============================================================================

		const handleToggle = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation()
				onToggle(node.id)
			},
			[node.id, onToggle],
		)

		const handleSelect = useCallback(() => {
			onSelect(node.id)
		}, [node.id, onSelect])

		const handleCreateFile = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation()
				onCreateFile?.(node.id)
				setIsMenuOpen(false)
			},
			[node.id, onCreateFile],
		)

		const handleCreateFolder = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation()
				onCreateFolder?.(node.id)
				setIsMenuOpen(false)
			},
			[node.id, onCreateFolder],
		)

		const handleDelete = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation()
				onDelete?.(node.id)
				setIsMenuOpen(false)
			},
			[node.id, onDelete],
		)

	// ============================================================================
	// Icon Selection
	// ============================================================================

	const isFolder = node.type === "folder"

	// Get appropriate icon
	const Icon = isFolder
		? node.isExpanded
			? iconTheme.icons.folder.open || iconTheme.icons.folder.default
			: iconTheme.icons.folder.default
		: node.type === "drawing"
			? iconTheme.icons.activityBar.canvas
			: iconTheme.icons.file.default

		// ============================================================================
		// Render
		// ============================================================================

		const showActionButton = isHovered || isSelected || isMenuOpen

		return (
			<div
				style={style}
				className={cn(
					"group flex items-center h-[30px] px-2 cursor-pointer select-none",
					"hover:bg-sidebar-accent/50 transition-colors",
					isSelected && "bg-sidebar-accent",
				)}
				onClick={handleSelect}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				role="treeitem"
				aria-selected={isSelected}
				aria-expanded={isFolder ? node.isExpanded : undefined}
				aria-level={node.depth + 1}
			>
				{/* Indentation */}
				<div style={{ width: node.depth * 12 }} className="shrink-0" />

				{/* Chevron (folders only) */}
				{isFolder ? (
					<Button
						variant="ghost"
						size="icon"
						className="size-4 p-0 hover:bg-transparent shrink-0 mr-1"
						onClick={handleToggle}
						aria-label={node.isExpanded ? "Collapse folder" : "Expand folder"}
					>
						{node.isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
					</Button>
				) : (
					<div className="size-4 shrink-0 mr-1" />
				)}

				{/* Icon */}
				<div className="size-4 shrink-0 mr-2 flex items-center justify-center">
					<Icon className="size-4" />
				</div>

				{/* Title */}
				<span className="text-sm truncate flex-1">{node.title}</span>

				{/* Action Menu */}
				{showActionButton && (
					<Popover open={isMenuOpen} onOpenChange={setIsMenuOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="size-5 p-0 shrink-0 ml-1 opacity-70 hover:opacity-100"
								onClick={(e) => e.stopPropagation()}
								aria-label="More actions"
							>
								<MoreHorizontal className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							className="w-48 p-1"
							align="end"
							side="right"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex flex-col gap-0.5">
								{/* Create File (folders only) */}
								{isFolder && onCreateFile && (
									<Button
										variant="ghost"
										size="sm"
										className="justify-start h-8 px-2"
										onClick={handleCreateFile}
									>
										<FilePlus className="size-4 mr-2" />
										<span className="text-sm">New File</span>
									</Button>
								)}

								{/* Create Folder (folders only) */}
								{isFolder && onCreateFolder && (
									<Button
										variant="ghost"
										size="sm"
										className="justify-start h-8 px-2"
										onClick={handleCreateFolder}
									>
										<FolderPlus className="size-4 mr-2" />
										<span className="text-sm">New Folder</span>
									</Button>
								)}

								{/* Delete */}
								{onDelete && (
									<Button
										variant="ghost"
										size="sm"
										className="justify-start h-8 px-2 text-destructive hover:text-destructive"
										onClick={handleDelete}
									>
										<Trash2 className="size-4 mr-2" />
										<span className="text-sm">Delete</span>
									</Button>
								)}
							</div>
						</PopoverContent>
					</Popover>
				)}
			</div>
		)
	},
)

TreeNodeRow.displayName = "TreeNodeRow"
