/**
 * @file hooks/use-tree-node.ts
 * @description TreeNode hook - 封装树节点的所有逻辑
 *
 * 职责：
 * - 处理节点点击、键盘事件
 * - 计算节点状态（是否文件夹、是否编辑中等）
 * - 提供所有事件处理器
 *
 * 依赖：types/
 */

import type { NodeApi } from "react-arborist"
import type { NodeType } from "@/types/node"
import { cn } from "@/utils/cn.util"
import type { TreeData } from "@/views/file-tree/file-tree.types"

// ============================================================================
// Types
// ============================================================================

export interface UseTreeNodeParams {
	readonly node: NodeApi<TreeData>
	readonly onDelete: (nodeId: string) => void
	readonly onCreateFolder: (parentId: string | null) => void
	readonly onCreateFile: (parentId: string | null, type: NodeType) => void
	readonly folderColor?: string
	readonly hasSelection: boolean
}

export interface UseTreeNodeReturn {
	/** 节点数据 */
	readonly data: TreeData
	/** 是否是文件夹 */
	readonly isFolder: boolean
	/** 是否正在编辑 */
	readonly isEditing: boolean
	/** 是否打开（文件夹） */
	readonly isOpen: boolean
	/** 是否选中 */
	readonly isSelected: boolean
	/** 是否将接收拖拽 */
	readonly willReceiveDrop: boolean
	/** 子节点数量 */
	readonly childrenCount: number
	/** 容器样式类名 */
	readonly containerClassName: string
	/** 标题样式类名 */
	readonly titleClassName: string
	/** 事件处理器 */
	readonly handlers: {
		readonly onClick: (e: React.MouseEvent) => void
		readonly onKeyDown: (e: React.KeyboardEvent) => void
		readonly onDoubleClick: (e: React.MouseEvent) => void
		readonly onChevronClick: (e: React.MouseEvent) => void
		readonly onInputBlur: () => void
		readonly onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
		readonly onInputClick: (e: React.MouseEvent) => void
		readonly onEdit: () => void
	}
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for TreeNode component logic
 *
 * 封装所有树节点逻辑：
 * - 节点状态计算
 * - 事件处理
 * - 样式类名计算
 *
 * @returns TreeNode state and handlers
 */
export function useTreeNode(params: UseTreeNodeParams): UseTreeNodeReturn {
	const { node, hasSelection } = params

	// ============================================================================
	// Computed State
	// ============================================================================

	const data = node.data
	const isFolder = data.type === "folder"
	const isEditing = node.isEditing
	const isOpen = node.isOpen
	const isSelected = node.isSelected
	const willReceiveDrop = node.willReceiveDrop
	const childrenCount = node.children?.length ?? 0

	// ============================================================================
	// Computed Styles
	// ============================================================================

	const containerClassName = cn(
		"group flex items-center gap-1.5 py-1 pr-2 cursor-pointer px-2 rounded-md mx-1",
		isSelected
			? "text-foreground font-medium bg-accent/50"
			: "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
		willReceiveDrop && "bg-sidebar-accent ring-1 ring-primary/20",
	)

	const titleClassName = cn(
		"flex-1 text-sm truncate min-w-0 transition-opacity duration-200 group-hover/panel:opacity-100",
		isSelected ? "text-foreground font-medium opacity-100" : "text-muted-foreground",
		hasSelection && !isSelected && "opacity-40",
	)

	// ============================================================================
	// Event Handlers
	// ============================================================================

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

	const handleDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		node.edit()
	}

	const handleChevronClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		node.toggle()
	}

	const handleInputBlur = () => {
		node.reset()
	}

	const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			node.submit(e.currentTarget.value)
		} else if (e.key === "Escape") {
			node.reset()
		}
	}

	const handleInputClick = (e: React.MouseEvent) => {
		e.stopPropagation()
	}

	const handleEdit = () => {
		node.edit()
	}

	// ============================================================================
	// Return
	// ============================================================================

	return {
		data,
		isFolder,
		isEditing,
		isOpen,
		isSelected,
		willReceiveDrop,
		childrenCount,
		containerClassName,
		titleClassName,
		handlers: {
			onClick: handleClick,
			onKeyDown: handleKeyDown,
			onDoubleClick: handleDoubleClick,
			onChevronClick: handleChevronClick,
			onInputBlur: handleInputBlur,
			onInputKeyDown: handleInputKeyDown,
			onInputClick: handleInputClick,
			onEdit: handleEdit,
		},
	}
}
