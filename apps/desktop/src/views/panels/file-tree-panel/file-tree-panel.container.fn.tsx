/**
 * FileTreePanel - 文件树面板容器组件
 *
 * 路由编排层：连接数据和展示组件
 * 职责：协调 hooks、flows、state，传递给 FileTree 视图组件
 *
 * 使用 fp-ts 的 pipe + fold 模式处理 TaskEither 结果
 *
 * @see .kiro/steering/architecture.md - views/ 层职责
 */

import { useNavigate } from "@tanstack/react-router"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { memo, useCallback, useEffect, useRef } from "react"
import { toast } from "sonner"

import {
	createDiaryCompatAsync,
	createFile,
	deleteNode,
	moveNode,
	openFile,
	renameNode,
} from "@/flows"
import { useEditorTabs } from "@/hooks/use-editor-tabs"
import { useNodesByWorkspace } from "@/hooks/use-node"
import { useGetNodeById } from "@/hooks/use-node-operations"
import { useOptimisticCollapse } from "@/hooks/use-optimistic-collapse"
import {
	createDocument,
	createHeadingNode,
	createParagraphNode,
	createTextNode,
} from "@/pipes/content"
import { useSelectionStore } from "@/state/selection.state"
import type { NodeType } from "@/types/node"
import { autoExpandAndScrollToNode } from "@/utils/file-tree-navigation.util"
import { FileTree } from "@/views/file-tree"
import { useConfirm } from "@/views/ui/confirm"

import type { FileTreePanelContainerProps } from "./file-tree-panel.types"

// ============================================================================
// Constants
// ============================================================================

const EXCALIDRAW_EMPTY_CONTENT = JSON.stringify({
	appState: {},
	elements: [],
	files: {},
})

// ============================================================================
// Helper Functions (Pure)
// ============================================================================

/**
 * 生成新文件的默认 Lexical 内容
 */
const generateLexicalContent = (title: string): string => {
	const doc = createDocument([
		createHeadingNode(title, "h2"),
		createParagraphNode([createTextNode("")]),
	])
	console.log("coming" + doc)
	return JSON.stringify(doc)
}

/**
 * 根据文件类型生成初始内容
 */
const generateContentByType = (type: NodeType, title: string): string =>
	type === "drawing" ? EXCALIDRAW_EMPTY_CONTENT : generateLexicalContent(title)

/**
 * 根据文件类型获取标题
 */
const getTitleByType = (type: NodeType): string =>
	type === "drawing" ? "New Canvas" : "New File"

/**
 * 根据文件类型获取成功消息
 */
const getSuccessMessage = (type: NodeType): string =>
	type === "drawing" ? "Canvas created" : "File created"

// ============================================================================
// Component
// ============================================================================

export const FileTreePanelContainer = memo(
	({ workspaceId: propWorkspaceId }: FileTreePanelContainerProps) => {
		// ========================================
		// Hooks - Navigation & UI
		// ========================================
		const navigate = useNavigate()
		const confirm = useConfirm()

		// ========================================
		// Hooks - State
		// ========================================
		const globalSelectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
		const selectedNodeId = useSelectionStore((s) => s.selectedNodeId)
		const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId)

		const workspaceId = propWorkspaceId ?? globalSelectedWorkspaceId

		// ========================================
		// Hooks - Data
		// ========================================
		const nodes = useNodesByWorkspace(workspaceId) ?? []
		const { getNode } = useGetNodeById()
		const { closeTab } = useEditorTabs()
		const { toggleCollapsed: optimisticToggleCollapsed } = useOptimisticCollapse({ workspaceId })

		// 包装 toggleCollapsed 以兼容 autoExpandAndScrollToNode 的类型要求
		const setCollapsedAsync = useCallback(
			async (nodeId: string, collapsed: boolean): Promise<boolean> => {
				try {
					optimisticToggleCollapsed(nodeId, collapsed)
					return true
				} catch {
					return false
				}
			},
			[optimisticToggleCollapsed],
		)

		// ========================================
		// Refs
		// ========================================
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const treeRef = useRef<any>(null)
		const prevWorkspaceIdRef = useRef(workspaceId)

		// ========================================
		// Effects
		// ========================================

		// 工作区切换时清除选中状态
		useEffect(() => {
			if (prevWorkspaceIdRef.current !== workspaceId) {
				setSelectedNodeId(null)
				prevWorkspaceIdRef.current = workspaceId
			}
		}, [workspaceId, setSelectedNodeId])

		// ========================================
		// Callbacks - Node Operations
		// ========================================

		/**
		 * 选中节点 - 打开文件到编辑器
		 */
		const handleSelectNode = useCallback(
			async (nodeId: string) => {
				setSelectedNodeId(nodeId)

				const node = await getNode(nodeId)
				if (!node || node.type === "folder") return

				if (workspaceId) {
					await pipe(
						openFile({
							nodeId,
							title: node.title,
							type: node.type,
							workspaceId,
						}),
						TE.fold(
							(error) => async () => {
								console.error("[FileTreePanel] Failed to open file:", error.message)
							},
							() => async () => {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								void navigate({ to: "/" } as any)
							},
						),
					)()
				}
			},
			[workspaceId, navigate, setSelectedNodeId, getNode],
		)

		/**
		 * 创建文件夹
		 */
		const handleCreateFolder = useCallback(
			async (parentId: string | null) => {
				if (!workspaceId) {
					toast.error("Please select a workspace first")
					return
				}

				await pipe(
					createFile({
						parentId,
						title: "New Folder",
						type: "folder",
						workspaceId,
					}),
					TE.fold(
						(error) => async () => {
							console.error("[FileTreePanel] Failed to create folder:", error.message)
							toast.error("Failed to create folder")
						},
						(result) => async () => {
							if (result?.node) {
								setSelectedNodeId(result.node.id)
								await autoExpandAndScrollToNode(nodes, result.node.id, setCollapsedAsync, treeRef)
							}
							toast.success("Folder created")
						},
					),
				)()
			},
			[workspaceId, nodes, setCollapsedAsync, setSelectedNodeId],
		)

		/**
		 * 创建文件
		 */
		const handleCreateFile = useCallback(
			async (parentId: string | null, type: NodeType) => {
				if (!workspaceId) {
					toast.error("Please select a workspace first")
					return
				}

				const title = getTitleByType(type)
				const content = generateContentByType(type, title)

				await pipe(
					createFile({
						content,
						parentId,
						title,
						type,
						workspaceId,
					}),
					TE.fold(
						(error) => async () => {
							console.error("[FileTreePanel] Failed to create file:", error.message)
							toast.error("Failed to create file")
						},
						(result) => async () => {
							if (result && type !== "folder") {
								setSelectedNodeId(result.node.id)
								await autoExpandAndScrollToNode(nodes, result.node.id, setCollapsedAsync, treeRef)
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								void navigate({ to: "/" } as any)
							}
							toast.success(getSuccessMessage(type))
						},
					),
				)()
			},
			[workspaceId, setSelectedNodeId, navigate, nodes, setCollapsedAsync],
		)

		/**
		 * 创建日记
		 */
		const handleCreateDiary = useCallback(async () => {
			if (!workspaceId) {
				toast.error("Please select a workspace first")
				return
			}

			try {
				const { node } = await createDiaryCompatAsync({ workspaceId })

				setSelectedNodeId(node.id)
				await autoExpandAndScrollToNode(nodes, node.id, setCollapsedAsync, treeRef)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				void navigate({ to: "/" } as any)

				toast.success("Diary created")
			} catch (error) {
				console.error("[FileTreePanel] Failed to create diary:", error)
				toast.error("Failed to create diary")
			}
		}, [workspaceId, setSelectedNodeId, navigate, nodes, setCollapsedAsync])

		/**
		 * 删除节点
		 */
		const handleDeleteNode = useCallback(
			async (nodeId: string) => {
				const node = await getNode(nodeId)
				if (!node) return

				const isFolder = node.type === "folder"
				const confirmed = await confirm({
					cancelText: "Cancel",
					confirmText: "Delete",
					description: isFolder
						? `Are you sure you want to delete "${node.title}"? This will also delete all contents inside. This cannot be undone.`
						: `Are you sure you want to delete "${node.title}"? This cannot be undone.`,
					title: `Delete ${isFolder ? "folder" : "file"}?`,
				})

				if (!confirmed) return

				await pipe(
					deleteNode(nodeId),
					TE.fold(
						(error) => async () => {
							console.error("[FileTreePanel] Failed to delete node:", error.message)
							toast.error("Failed to delete")
						},
						() => async () => {
							closeTab(nodeId)
							if (selectedNodeId === nodeId) {
								setSelectedNodeId(null)
							}
							toast.success(`${isFolder ? "Folder" : "File"} deleted`)
						},
					),
				)()
			},
			[confirm, selectedNodeId, closeTab, setSelectedNodeId, getNode],
		)

		/**
		 * 重命名节点
		 */
		const handleRenameNode = useCallback(async (nodeId: string, newTitle: string) => {
			const trimmedTitle = newTitle.trim()
			if (!trimmedTitle) return

			await pipe(
				renameNode({ nodeId, title: trimmedTitle }),
				TE.fold(
					(error) => async () => {
						console.error("[FileTreePanel] Failed to rename node:", error.message)
						toast.error("Failed to rename")
					},
					() => async () => {
						// 重命名成功，无需额外操作（TanStack Query 会自动刷新）
					},
				),
			)()
		}, [])

		/**
		 * 移动节点（拖拽）
		 */
		const handleMoveNode = useCallback(
			async (nodeId: string, newParentId: string | null, newIndex: number) => {
				await pipe(
					moveNode({
						newOrder: newIndex,
						newParentId,
						nodeId,
					}),
					TE.fold(
						(error) => async () => {
							console.error("[FileTreePanel] Failed to move node:", error.message)
							if (error.message.includes("descendants")) {
								toast.error("Cannot move a folder into itself")
							} else {
								toast.error("Failed to move")
							}
						},
						() => async () => {
							// 移动成功，无需额外操作
						},
					),
				)()
			},
			[],
		)

		/**
		 * 切换折叠状态
		 */
		const handleToggleCollapsed = useCallback(
			(nodeId: string, collapsed: boolean) => {
				optimisticToggleCollapsed(nodeId, collapsed)
			},
			[optimisticToggleCollapsed],
		)

		// ========================================
		// Render
		// ========================================

		return (
			<FileTree
				workspaceId={workspaceId}
				nodes={nodes}
				selectedNodeId={selectedNodeId}
				onSelectNode={handleSelectNode}
				onCreateFolder={handleCreateFolder}
				onCreateFile={handleCreateFile}
				onDeleteNode={handleDeleteNode}
				onRenameNode={handleRenameNode}
				onMoveNode={handleMoveNode}
				onToggleCollapsed={handleToggleCollapsed}
				onCreateDiary={handleCreateDiary}
				treeRef={treeRef}
			/>
		)
	},
)

FileTreePanelContainer.displayName = "FileTreePanelContainer"
