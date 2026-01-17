/**
 * @file hooks/use-file-tree.ts
 * @description FileTree hook - 封装所有文件树逻辑（虚拟列表版本）
 *
 * 职责：
 * - 扁平化树形数据结构
 * - 管理虚拟滚动
 * - 处理所有树操作（选择、展开/折叠）
 * - 提供渲染函数
 *
 * 依赖：hooks/, state/, types/
 */

import type React from "react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { FlatTreeNode, NodeInterface, NodeType } from "@/types/node"
import { flattenTree } from "@/pipes/node"
import { useExpandedFolders, useSidebarStore } from "@/state/sidebar.state"
import { useIconTheme } from "./use-icon-theme"
import { useTheme } from "./use-theme"

// ============================================================================
// Types
// ============================================================================

export interface UseFileTreeParams {
	readonly workspaceId: string | null
	readonly nodes: readonly NodeInterface[]
	readonly selectedNodeId: string | null
	readonly onSelectNode: (nodeId: string) => void
	readonly onCreateFolder: (parentId: string | null) => void
	readonly onCreateFile: (parentId: string | null, type: NodeType) => void
	readonly onDeleteNode: (nodeId: string) => void
	readonly onRenameNode: (nodeId: string, newTitle: string) => void
}

export interface UseFileTreeReturn {
	/** 扁平化的树节点数组 */
	readonly flatNodes: readonly FlatTreeNode[]
	/** 虚拟滚动器实例 */
	readonly virtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>
	/** 容器 ref */
	readonly containerRef: React.RefObject<HTMLDivElement>
	/** 图标主题 */
	readonly iconTheme: ReturnType<typeof useIconTheme>
	/** 当前主题 */
	readonly currentTheme: ReturnType<typeof useTheme>["currentTheme"]
	/** 是否有选中节点 */
	readonly hasSelection: boolean
	/** 树操作处理器 */
	readonly handlers: {
		readonly onToggle: (nodeId: string) => void
		readonly onSelect: (nodeId: string) => void
	}
	/** TreeNode 额外 props */
	readonly nodeProps: {
		readonly onDelete: (nodeId: string) => void
		readonly onCreateFolder: (parentId: string | null) => void
		readonly onCreateFile: (parentId: string | null, type: NodeType) => void
		readonly folderColor?: string
		readonly hasSelection: boolean
	}
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for FileTree component logic (Virtual List Version)
 *
 * 封装所有文件树逻辑：
 * - 树形数据扁平化
 * - 虚拟滚动设置
 * - 所有树操作处理
 * - 节点渲染逻辑
 *
 * @returns FileTree state and handlers
 */
export function useFileTree(params: UseFileTreeParams): UseFileTreeReturn {
	const {
		nodes,
		selectedNodeId,
		onSelectNode,
		onCreateFolder,
		onCreateFile,
		onDeleteNode,
	} = params

	// ============================================================================
	// State & Refs
	// ============================================================================

	const containerRef = useRef<HTMLDivElement>(null)
	const iconTheme = useIconTheme()
	const { currentTheme } = useTheme()
	const expandedFolders = useExpandedFolders()

	// ============================================================================
	// Computed Values
	// ============================================================================

	// Flatten tree based on expand state
	const flatNodes = useMemo(
		() => flattenTree(nodes, expandedFolders),
		[nodes, expandedFolders],
	)

	const hasSelection = !!selectedNodeId

	// ============================================================================
	// Virtual Scrolling
	// ============================================================================

	const virtualizer = useVirtualizer({
		count: flatNodes.length,
		getScrollElement: () => containerRef.current,
		estimateSize: () => 30, // 30px per row
		overscan: 5, // Render 5 extra items above/below viewport
	})

	// ============================================================================
	// Handlers
	// ============================================================================

	/**
	 * Handle folder toggle (expand/collapse)
	 * Updates Zustand state directly
	 */
	const handleToggle = useCallback((nodeId: string) => {
		useSidebarStore.getState().toggleFolderExpanded(nodeId)
	}, [])

	/**
	 * Handle node selection
	 * Only select non-folder nodes
	 */
	const handleSelect = useCallback(
		(nodeId: string) => {
			const node = flatNodes.find((n) => n.id === nodeId)
			if (node && node.type !== "folder") {
				onSelectNode(nodeId)
			} else if (node && node.type === "folder") {
				// Toggle folder on click
				handleToggle(nodeId)
			}
		},
		[flatNodes, onSelectNode, handleToggle],
	)

	// ============================================================================
	// Effects
	// ============================================================================

	/**
	 * Scroll to selected node when selection changes
	 */
	useEffect(() => {
		if (selectedNodeId) {
			const index = flatNodes.findIndex((n) => n.id === selectedNodeId)
			if (index !== -1) {
				virtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" })
			}
		}
	}, [selectedNodeId, flatNodes, virtualizer])

	// ============================================================================
	// Node Props
	// ============================================================================

	/**
	 * Props to be spread onto TreeNode component
	 */
	const nodeProps = useMemo(
		() => ({
			onDelete: onDeleteNode,
			onCreateFolder,
			onCreateFile,
			folderColor: currentTheme?.colors.folderColor,
			hasSelection,
		}),
		[onDeleteNode, onCreateFolder, onCreateFile, currentTheme?.colors.folderColor, hasSelection],
	)

	// ============================================================================
	// Return
	// ============================================================================

	return {
		flatNodes,
		virtualizer,
		containerRef,
		iconTheme,
		currentTheme,
		hasSelection,
		handlers: {
			onToggle: handleToggle,
			onSelect: handleSelect,
		},
		nodeProps,
	}
}
