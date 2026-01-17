/**
 * @file hooks/use-file-tree-panel.ts
 * @description FileTreePanel hook - 数据绑定层
 *
 * 职责：
 * - 绑定 state 数据到 React 组件
 * - 封装 flows 调用为 React callbacks
 * - 管理 React 特定的状态（refs、effects）
 *
 * 不负责：
 * - 业务逻辑（在 flows 层）
 * - 错误处理（在 flows 层）
 * - 日志记录（在 flows 层）
 * - Toast 提示（在 flows 层）
 *
 * 依赖：hooks/, flows/, state/, types/
 */

import { useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import {
	createDiaryCompatAsync,
	createFile,
	deleteNode,
	openFile,
	renameNode,
} from "@/flows"
import * as nodeFlow from "@/flows/node"
import {
	calculateAncestorPathFlow,
	calculateExpandedAncestorsFlow,
} from "@/flows/file-tree"
import { queryKeys } from "@/hooks/queries/query-keys"
import { useSelectionStore } from "@/state/selection.state"
import { useSidebarStore } from "@/state/sidebar.state"
import { useEditorTabs } from "./use-editor-tabs"
import { useNodesByWorkspace } from "./use-node"
import { useGetNodeById } from "./use-node-operations"
import type { NodeInterface, NodeType } from "@/types/node"

// ============================================================================
// Types
// ============================================================================

export interface UseFileTreePanelParams {
	readonly workspaceId: string | null
}

export interface UseFileTreePanelReturn {
	/** 工作区 ID */
	readonly workspaceId: string | null
	/** 节点列表 */
	readonly nodes: readonly NodeInterface[]
	/** 选中的节点 ID */
	readonly selectedNodeId: string | null
	/** 操作处理器 */
	readonly handlers: {
		readonly onSelectNode: (nodeId: string) => Promise<void>
		readonly onCreateFolder: (parentId: string | null) => Promise<void>
		readonly onCreateFile: (parentId: string | null, type: NodeType) => Promise<void>
		readonly onCreateDiary: () => Promise<void>
		readonly onDeleteNode: (nodeId: string) => Promise<void>
		readonly onRenameNode: (nodeId: string, newTitle: string) => Promise<void>
	}
}

// ============================================================================
// Constants
// ============================================================================

const EXCALIDRAW_EMPTY_CONTENT = JSON.stringify({
	appState: {},
	elements: [],
	files: {},
})

const LEXICAL_EMPTY_CONTENT = (title: string): string =>
	JSON.stringify({
		root: {
			children: [
				{
					children: [{ detail: 0, format: 0, mode: "normal", style: "", text: title, type: "text", version: 1 }],
					direction: "ltr",
					format: "",
					indent: 0,
					tag: "h2",
					type: "heading",
					version: 1,
				},
				{
					children: [{ detail: 0, format: 0, mode: "normal", style: "", text: "", type: "text", version: 1 }],
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	})

const generateContentByType = (type: NodeType, title: string): string =>
	type === "drawing" ? EXCALIDRAW_EMPTY_CONTENT : LEXICAL_EMPTY_CONTENT(title)

const getTitleByType = (type: NodeType): string => (type === "drawing" ? "New Canvas" : "New File")

// ============================================================================
// Hook
// ============================================================================

/**
 * FileTreePanel 数据绑定 Hook
 *
 * 纯粹的数据绑定层，不包含业务逻辑、错误处理、日志记录。
 * 所有业务逻辑、toast 提示、日志记录都在 flows 层完成。
 *
 * @param params - Hook 参数
 * @returns FileTreePanel 状态和处理器
 */
export function useFileTreePanel(params: UseFileTreePanelParams): UseFileTreePanelReturn {
	const { workspaceId: propWorkspaceId } = params

	// ============================================================================
	// State Bindings
	// ============================================================================

	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const globalSelectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
	const selectedNodeId = useSelectionStore((s) => s.selectedNodeId)
	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId)
	const setExpandedFolders = useSidebarStore((s) => s.setExpandedFolders)

	const workspaceId = propWorkspaceId ?? globalSelectedWorkspaceId

	const nodes = useNodesByWorkspace(workspaceId) ?? []
	const { getNode } = useGetNodeById()
	const { closeTab } = useEditorTabs()

	// ============================================================================
	// Refs
	// ============================================================================

	const prevWorkspaceIdRef = useRef(workspaceId)

	// ============================================================================
	// Effects
	// ============================================================================

	/**
	 * 初始化展开状态：从数据库加载的节点初始化 Zustand expandedFolders
	 */
	useEffect(() => {
		if (nodes && nodes.length > 0) {
			const folderNodes = nodes.filter((node) => node.type === "folder")
			const expandedFolders = folderNodes.reduce(
				(acc, folder) => ({
					...acc,
					[folder.id]: !(folder.collapsed ?? true),
				}),
				{} as Record<string, boolean>,
			)

			useSidebarStore.getState().setExpandedFolders(expandedFolders)
		}
	}, [nodes, workspaceId])

	/**
	 * 工作区切换时清除选中状态
	 */
	useEffect(() => {
		if (prevWorkspaceIdRef.current !== workspaceId) {
			setSelectedNodeId(null)
			// eslint-disable-next-line functional/immutable-data
			prevWorkspaceIdRef.current = workspaceId
		}
	}, [workspaceId, setSelectedNodeId])

	// ============================================================================
	// Handlers - 纯粹的 flows 调用绑定
	// ============================================================================

	const handleSelectNode = useCallback(
		async (nodeId: string) => {
			setSelectedNodeId(nodeId)

			const node = await getNode(nodeId)
			if (!node || node.type === "folder") {
				return
			}

			if (workspaceId) {
				await openFile({
					nodeId,
					title: node.title,
					type: node.type,
					workspaceId,
				})()
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				void navigate({ to: "/" } as any)
			}
		},
		[workspaceId, navigate, setSelectedNodeId, getNode],
	)

	const handleCreateFolder = useCallback(
		async (parentId: string | null) => {
			if (!workspaceId) return

			const result = await createFile({
				parentId,
				title: "New Folder",
				type: "folder",
				workspaceId,
			})()

			// 成功时更新选中状态并自动展开祖先
			if (result._tag === "Right" && result.right?.node) {
				const newNodeId = result.right.node.id
				setSelectedNodeId(newNodeId)

				// 刷新节点列表
				await queryClient.invalidateQueries({
					queryKey: queryKeys.nodes.byWorkspace(workspaceId),
				})

				// 等待数据刷新后，只展开到新节点的祖先路径
				// 使用 refetch 获取最新数据
				const refreshedNodes = await queryClient.fetchQuery({
					queryKey: queryKeys.nodes.byWorkspace(workspaceId),
					queryFn: async () => {
						const result = await nodeFlow.getNodesByWorkspace(workspaceId)()
						if (result._tag === "Left") throw result.left
						return result.right
					},
				})

				if (refreshedNodes) {
					const ancestorPath = calculateAncestorPathFlow(refreshedNodes, newNodeId)
					if (ancestorPath.length > 0) {
						// 只展开祖先路径，不保留其他展开状态
						const expandedAncestors = calculateExpandedAncestorsFlow(ancestorPath)
						setExpandedFolders(expandedAncestors)
					} else {
						// 如果是根节点，清空所有展开状态
						setExpandedFolders({})
					}
				}

				// Note: Scroll to new node is handled by useFileTree hook via selectedNodeId effect
			}
		},
		[workspaceId, setSelectedNodeId, queryClient, setExpandedFolders],
	)

	const handleCreateFile = useCallback(
		async (parentId: string | null, type: NodeType) => {
			if (!workspaceId) return

			const title = getTitleByType(type)
			const content = generateContentByType(type, title)

			const result = await createFile({
				content,
				parentId,
				title,
				type,
				workspaceId,
			})()

			// 成功时更新选中状态并导航
			if (result._tag === "Right" && result.right && type !== "folder") {
				const newNodeId = result.right.node.id
				setSelectedNodeId(newNodeId)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				void navigate({ to: "/" } as any)

				// 刷新节点列表
				await queryClient.invalidateQueries({
					queryKey: queryKeys.nodes.byWorkspace(workspaceId),
				})

				// 等待数据刷新后，只展开到新节点的祖先路径
				const refreshedNodes = await queryClient.fetchQuery({
					queryKey: queryKeys.nodes.byWorkspace(workspaceId),
					queryFn: async () => {
						const result = await nodeFlow.getNodesByWorkspace(workspaceId)()
						if (result._tag === "Left") throw result.left
						return result.right
					},
				})

				if (refreshedNodes) {
					const ancestorPath = calculateAncestorPathFlow(refreshedNodes, newNodeId)
					if (ancestorPath.length > 0) {
						// 只展开祖先路径，不保留其他展开状态
						const expandedAncestors = calculateExpandedAncestorsFlow(ancestorPath)
						setExpandedFolders(expandedAncestors)
					} else {
						// 如果是根节点，清空所有展开状态
						setExpandedFolders({})
					}
				}

				// Note: Scroll to new node is handled by useFileTree hook via selectedNodeId effect
			}
		},
		[workspaceId, setSelectedNodeId, navigate, queryClient, setExpandedFolders],
	)

	const handleCreateDiary = useCallback(async () => {
		if (!workspaceId) return

		const result = await createDiaryCompatAsync({ workspaceId })
			.then((res) => ({ success: true as const, data: res }))
			.catch(() => ({ success: false as const }))

		if (result.success) {
			setSelectedNodeId(result.data.node.id)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			void navigate({ to: "/" } as any)
		}
	}, [workspaceId, setSelectedNodeId, navigate])

	const handleDeleteNode = useCallback(
		async (nodeId: string) => {
			const node = await getNode(nodeId)
			if (!node) return

			const isFolder = node.type === "folder"
			const confirmed = window.confirm(
				isFolder
					? `Are you sure you want to delete "${node.title}"? This will also delete all contents inside. This cannot be undone.`
					: `Are you sure you want to delete "${node.title}"? This cannot be undone.`,
			)

			if (!confirmed) return

			const result = await deleteNode(nodeId)()

			// 成功时清理状态并刷新列表
			if (result._tag === "Right") {
				closeTab(nodeId)
				if (selectedNodeId === nodeId) {
					setSelectedNodeId(null)
				}

				// 刷新节点列表
				if (workspaceId) {
					await queryClient.invalidateQueries({
						queryKey: queryKeys.nodes.byWorkspace(workspaceId),
					})
				}
			}
		},
		[workspaceId, selectedNodeId, closeTab, setSelectedNodeId, getNode, queryClient],
	)

	const handleRenameNode = useCallback(
		async (nodeId: string, newTitle: string) => {
			const trimmedTitle = newTitle.trim()
			if (!trimmedTitle) return

			const result = await renameNode({ nodeId, title: trimmedTitle })()

			// 成功时刷新列表
			if (result._tag === "Right" && workspaceId) {
				await queryClient.invalidateQueries({
					queryKey: queryKeys.nodes.byWorkspace(workspaceId),
				})
			}
		},
		[workspaceId, queryClient],
	)

	// ============================================================================
	// Return
	// ============================================================================

	return {
		workspaceId,
		nodes,
		selectedNodeId,
		handlers: {
			onSelectNode: handleSelectNode,
			onCreateFolder: handleCreateFolder,
			onCreateFile: handleCreateFile,
			onCreateDiary: handleCreateDiary,
			onDeleteNode: handleDeleteNode,
			onRenameNode: handleRenameNode,
		},
	}
}
