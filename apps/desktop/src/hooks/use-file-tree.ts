/**
 * @file hooks/use-file-tree.ts
 * @description FileTree hook - 封装所有文件树逻辑
 *
 * 职责：
 * - 构建树形数据结构
 * - 管理树的尺寸（响应式）
 * - 处理所有树操作（选择、重命名、移动、折叠）
 * - 提供渲染函数
 *
 * 依赖：hooks/, state/, types/
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { NodeApi } from "react-arborist"
import { useIconTheme } from "./use-icon-theme"
import { useTheme } from "./use-theme"
import type { NodeInterface, NodeType } from "@/types/node"
import type { TreeData } from "@/views/file-tree/file-tree.types"

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
	readonly onMoveNode: (nodeId: string, newParentId: string | null, newOrder: number) => void
	readonly onToggleCollapsed: (nodeId: string, collapsed: boolean) => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly treeRef?: React.RefObject<any>
}

export interface UseFileTreeReturn {
	/** 树形数据 */
	readonly treeData: readonly TreeData[]
	/** 树的尺寸 */
	readonly dimensions: { width: number | string; height: number }
	/** 容器 ref */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly containerRef: React.RefObject<any>
	/** 树 ref */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	readonly treeRef: React.RefObject<any>
	/** 图标主题 */
	readonly iconTheme: ReturnType<typeof useIconTheme>
	/** 当前主题 */
	readonly currentTheme: ReturnType<typeof useTheme>["currentTheme"]
	/** 是否有选中节点 */
	readonly hasSelection: boolean
	/** 树操作处理器 */
	readonly handlers: {
		readonly onSelect: (selectedNodes: NodeApi<TreeData>[]) => void
		readonly onRename: (args: { id: string; name: string }) => void
		readonly onMove: (args: { dragIds: string[]; parentId: string | null; index: number }) => void
		readonly onToggle: (id: string) => Promise<void>
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
// Helper: Build Tree Data
// ============================================================================

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
// Hook
// ============================================================================

/**
 * Hook for FileTree component logic
 *
 * 封装所有文件树逻辑：
 * - 树形数据构建
 * - 响应式尺寸计算
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
		onRenameNode,
		onMoveNode,
		onToggleCollapsed,
		treeRef: externalTreeRef,
	} = params

	// ============================================================================
	// State & Refs
	// ============================================================================

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const internalTreeRef = useRef<any>(null)
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

	// ============================================================================
	// Computed Values
	// ============================================================================

	const treeData = useMemo(() => buildTreeData(nodes), [nodes])
	const hasSelection = !!selectedNodeId

	// ============================================================================
	// Effects
	// ============================================================================

	/**
	 * Responsive dimensions: Update tree size when container resizes
	 */
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

	// ============================================================================
	// Handlers
	// ============================================================================

	/**
	 * Handle node selection
	 * Only select non-folder nodes
	 */
	const handleSelect = useCallback(
		(selectedNodes: NodeApi<TreeData>[]) => {
			if (selectedNodes.length > 0 && selectedNodes[0].data.type !== "folder") {
				onSelectNode(selectedNodes[0].id)
			}
		},
		[onSelectNode],
	)

	/**
	 * Handle node rename
	 * Trim whitespace and validate
	 */
	const handleRename = useCallback(
		({ id, name }: { id: string; name: string }) => {
			if (name.trim()) {
				onRenameNode(id, name.trim())
			}
		},
		[onRenameNode],
	)

	/**
	 * Handle node move (drag & drop)
	 */
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

	/**
	 * Handle folder toggle (expand/collapse)
	 */
	const handleToggle = useCallback(
		async (id: string) => {
			const node = nodes.find((n) => n.id === id)
			if (node) {
				onToggleCollapsed(id, !node.collapsed)
			}
		},
		[nodes, onToggleCollapsed],
	)

	// ============================================================================
	// Render Node (moved from component)
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
		treeData,
		dimensions,
		containerRef,
		treeRef,
		iconTheme,
		currentTheme,
		hasSelection,
		handlers: {
			onSelect: handleSelect,
			onRename: handleRename,
			onMove: handleMove,
			onToggle: handleToggle,
		},
		nodeProps,
	}
}
