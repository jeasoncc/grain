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
 *
 * 依赖：views/, types/
 */

import { ChevronDown, ChevronRight } from "lucide-react"
import { memo, useCallback } from "react"
import type { FlatTreeNode, NodeType } from "@/types/node"
import { useIconTheme } from "@/hooks/use-icon-theme"
import { Button } from "@/views/ui/button"
import { cn } from "@/utils/cn.util"

// ============================================================================
// Types
// ============================================================================

export interface TreeNodeRowProps {
	readonly node: FlatTreeNode
	readonly isSelected: boolean
	readonly onToggle: (nodeId: string) => void
	readonly onSelect: (nodeId: string) => void
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
 *
 * Performance:
 * - Memoized to prevent unnecessary re-renders
 * - Uses inline styles for position (from virtualizer)
 */
export const TreeNodeRow = memo(({ node, isSelected, onToggle, onSelect, style }: TreeNodeRowProps) => {
	const iconTheme = useIconTheme()

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

	return (
		<div
			style={style}
			className={cn(
				"flex items-center h-[30px] px-2 cursor-pointer select-none",
				"hover:bg-sidebar-accent/50 transition-colors",
				isSelected && "bg-sidebar-accent",
			)}
			onClick={handleSelect}
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
					{node.isExpanded ? (
						<ChevronDown className="size-3" />
					) : (
						<ChevronRight className="size-3" />
					)}
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
		</div>
	)
})

TreeNodeRow.displayName = "TreeNodeRow"
