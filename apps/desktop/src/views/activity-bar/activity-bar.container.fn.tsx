/**
 * @file activity-bar.container.fn.tsx
 * @description ActivityBar 容器组件（编排层）
 *
 * 负责数据获取、状态管理和业务逻辑。
 * 将数据通过 props 传递给纯展示组件 ActivityBarView。
 */

import { useLocation, useNavigate } from "@tanstack/react-router"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import type * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { clearAllData, openFile } from "@/flows"
import { createCode } from "@/flows/templated/create-code.flow"
import {
	createDiary,
	createLedger,
	createNote,
	createTodo,
	createWiki,
} from "@/flows/templated/create-date-template.flow"
import { createExcalidraw } from "@/flows/templated/create-excalidraw.flow"
import { createMermaid } from "@/flows/templated/create-mermaid.flow"
import { createPlantUML } from "@/flows/templated/create-plantuml.flow"
import type { TemplatedFileResult } from "@/flows/templated/create-templated-file.flow"
import { createWorkspace } from "@/flows/workspace/create-workspace.flow"
import { touchWorkspace } from "@/flows/workspace/update-workspace.flow"
import { useIconTheme } from "@/hooks/use-icon-theme"
import { useNodesByWorkspace } from "@/hooks/use-node"
import { useAllWorkspaces } from "@/hooks/use-workspace"
import { error } from "@/io/log/logger.api"
import { calculateExpandedFoldersForNode } from "@/pipes/node"
import { useSelectionStore } from "@/state/selection.state"
import { useSidebarStore } from "@/state/sidebar.state"
import type { TabType } from "@/types/editor-tab"
import type { AppError } from "@/types/error"
import type { WorkspaceInterface } from "@/types/workspace"
import { ExportDialog } from "@/views/export-dialog"
import { useConfirm } from "@/views/ui/confirm"

import { ActivityBarView } from "./activity-bar.view.fn"

// ==============================
// Types
// ==============================

/**
 * 模板文件创建函数类型（TaskEither 版本）
 *
 * 接收工作区 ID 和日期，返回 TaskEither
 */
type TemplateCreator = (params: {
	readonly workspaceId: string
	readonly templateParams: { readonly date: Date }
}) => TE.TaskEither<AppError, TemplatedFileResult>

/**
 * 创建模板文件的选项
 */
interface CreateTemplateOptions {
	/** 模板创建函数（TaskEither 版本） */
	readonly creator: TemplateCreator
	/** 成功消息 */
	readonly successMessage: string
	/** 错误消息 */
	readonly errorMessage: string
}

/**
 * ActivityBar 容器组件
 */
export function ActivityBarContainer(): React.ReactElement {
	const location = useLocation()
	const navigate = useNavigate()
	const confirm = useConfirm()

	// ==============================
	// 数据获取
	// ==============================

	const workspacesRaw = useAllWorkspaces()
	const workspaces = workspacesRaw ?? []

	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
	const setSelectedWorkspaceId = useSelectionStore((s) => s.setSelectedWorkspaceId)
	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId)

	// 获取当前工作区的所有节点（用于计算展开路径）
	const nodes = useNodesByWorkspace(selectedWorkspaceId)

	const {
		activePanel,
		isOpen: isSidebarOpen,
		setActivePanel,
		toggleSidebar,
		setExpandedFolders,
	} = useSidebarStore()

	const iconTheme = useIconTheme()

	// ==============================
	// 初始化逻辑
	// ==============================

	const hasInitializedRef = useRef(false)

	// biome-ignore lint/correctness/useExhaustiveDependencies: 初始化逻辑只在 workspacesRaw 变化时运行一次
	useEffect(() => {
		const initializeWorkspace = async () => {
			if (workspacesRaw === undefined) return
			if (hasInitializedRef.current) return
			hasInitializedRef.current = true

			if (workspaces.length === 0) {
				if (selectedWorkspaceId) {
					setSelectedWorkspaceId(null)
				}
				try {
					const result = await createWorkspace({
						author: "",
						description: "",
						language: "en",
						title: "My Workspace",
					})()
					if (E.isRight(result)) {
						setSelectedWorkspaceId(result.right.id)
						setActivePanel("files")
					}
				} catch (error) {
					console.error("[ActivityBar] 创建默认工作区失败:", error)
				}
				return
			}

			const isSelectedValid =
				selectedWorkspaceId &&
				workspaces.some((w: WorkspaceInterface) => w.id === selectedWorkspaceId)

			if (!isSelectedValid) {
				const sortedByLastOpen = [...workspaces].sort((a, b) => {
					const dateA = new Date(a.lastOpen || a.createDate).getTime()
					const dateB = new Date(b.lastOpen || b.createDate).getTime()
					return dateB - dateA
				})
				setSelectedWorkspaceId(sortedByLastOpen[0].id)
			} else {
				try {
					await touchWorkspace(selectedWorkspaceId)()
				} catch (err) {
					error("[ActivityBar] 更新 lastOpen 失败:", err)
				}
			}
		}
		initializeWorkspace()
	}, [workspacesRaw])

	// ==============================
	// 导出对话框状态
	// ==============================

	const [exportDialogOpen, setExportDialogOpen] = useState(false)

	// ==============================
	// 回调函数
	// ==============================

	const handleSelectWorkspace = useCallback(
		async (workspaceId: string) => {
			setSelectedWorkspaceId(workspaceId)
			try {
				await touchWorkspace(workspaceId)()
			} catch (err) {
				error("[ActivityBar] 更新 lastOpen 失败:", err)
			}
			toast.success("Workspace selected")
		},
		[setSelectedWorkspaceId],
	)

	const handleCreateWorkspace = useCallback(
		async (name: string) => {
			if (!name.trim()) {
				toast.error("Please enter a workspace name")
				return
			}
			try {
				const result = await createWorkspace({
					author: "",
					description: "",
					language: "en",
					title: name.trim(),
				})()
				if (E.isRight(result)) {
					setSelectedWorkspaceId(result.right.id)
					toast.success("Workspace created")
				} else {
					toast.error("Failed to create workspace")
				}
			} catch {
				toast.error("Failed to create workspace")
			}
		},
		[setSelectedWorkspaceId],
	)

	/**
	 * 通用的模板文件创建处理函数（高阶函数）
	 *
	 * 使用 TaskEither + chain 确保时序正确性：
	 * 1. 创建文件 → 成功后
	 * 2. 打开文件 → 成功后
	 * 3. 更新 UI 状态（选中、展开、导航）
	 *
	 * 只有每一步成功，才会执行下一步。
	 */
	const handleCreateTemplate = useCallback(
		(options: CreateTemplateOptions) => {
			if (!selectedWorkspaceId) {
				toast.error("Please select a workspace first")
				return
			}

			const { creator, successMessage, errorMessage } = options

			// 构建 TaskEither 管道
			const task = pipe(
				// 1. 创建模板文件
				creator({
					templateParams: { date: new Date() },
					workspaceId: selectedWorkspaceId,
				}),
				// 2. 成功后，打开文件（通过队列执行）
				TE.chain((result) =>
					pipe(
						openFile({
							nodeId: result.node.id,
							title: result.node.title,
							type: result.node.type as TabType,
							workspaceId: selectedWorkspaceId,
						}),
						// 保留 result 用于后续处理
						TE.map(() => result),
					),
				),
				// 3. 成功后，更新 UI 状态（副作用，不改变值）
				TE.tap((result) => {
					// 在文件树中选中新创建的文件
					setSelectedNodeId(result.node.id)

					// 展开文件路径，关闭其他文件夹
					if (nodes) {
						const expandedFolders = calculateExpandedFoldersForNode(nodes, result.node.id)
						setExpandedFolders(expandedFolders)
					}

					// 导航到主页面（如果当前不在主页面）
					if (location.pathname !== "/") {
						navigate({ to: "/" })
					}

					return TE.right(result)
				}),
				// 4. 最终处理：成功或失败
				TE.fold(
					// 失败分支
					(error) => {
						console.error("[ActivityBar] 创建模板失败:", error)
						toast.error(errorMessage)
						return TE.of(undefined as void)
					},
					// 成功分支
					() => {
						toast.success(successMessage)
						return TE.of(undefined as void)
					},
				),
			)

			// 执行 TaskEither
			task()
		},
		[
			selectedWorkspaceId,
			setSelectedNodeId,
			nodes,
			setExpandedFolders,
			navigate,
			location.pathname,
		],
	)

	const handleCreateDiary = useCallback(
		() =>
			handleCreateTemplate({
				creator: createDiary,
				errorMessage: "Failed to create diary",
				successMessage: "Diary created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateWiki = useCallback(
		() =>
			handleCreateTemplate({
				creator: createWiki,
				errorMessage: "Failed to create wiki",
				successMessage: "Wiki created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateLedger = useCallback(
		() =>
			handleCreateTemplate({
				creator: createLedger,
				errorMessage: "Failed to create ledger",
				successMessage: "Ledger created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateTodo = useCallback(
		() =>
			handleCreateTemplate({
				creator: createTodo,
				errorMessage: "Failed to create todo",
				successMessage: "Todo created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateNote = useCallback(
		() =>
			handleCreateTemplate({
				creator: createNote,
				errorMessage: "Failed to create note",
				successMessage: "Note created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateExcalidraw = useCallback(
		() =>
			handleCreateTemplate({
				creator: createExcalidraw,
				errorMessage: "Failed to create excalidraw",
				successMessage: "Excalidraw created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateMermaid = useCallback(
		() =>
			handleCreateTemplate({
				creator: createMermaid,
				errorMessage: "Failed to create mermaid",
				successMessage: "Mermaid created",
			}),
		[handleCreateTemplate],
	)

	const handleCreatePlantUML = useCallback(
		() =>
			handleCreateTemplate({
				creator: createPlantUML,
				errorMessage: "Failed to create plantuml",
				successMessage: "PlantUML created",
			}),
		[handleCreateTemplate],
	)

	const handleCreateCode = useCallback(
		() =>
			handleCreateTemplate({
				creator: createCode,
				errorMessage: "Failed to create code file",
				successMessage: "Code file created",
			}),
		[handleCreateTemplate],
	)

	const handleImportFile = useCallback(async (_file: File) => {
		try {
			toast.info("Import functionality is being reimplemented")
		} catch {
			toast.error("Import failed")
		}
	}, [])

	const handleOpenExportDialog = useCallback(() => {
		setExportDialogOpen(true)
	}, [])

	const handleDeleteAllData = useCallback(async () => {
		const ok = await confirm({
			cancelText: "Cancel",
			confirmText: "Delete",
			description: "This action cannot be undone. All workspaces, files, and data will be deleted.",
			title: "Delete all data?",
		})
		if (!ok) return
		try {
			await clearAllData()()
			setSelectedWorkspaceId(null)
			setSelectedNodeId(null)
			hasInitializedRef.current = false
			toast.success("All data deleted")
			setTimeout(() => window.location.reload(), 1000)
		} catch {
			toast.error("Delete failed")
		}
	}, [confirm, setSelectedWorkspaceId, setSelectedNodeId])

	const handleNavigate = useCallback(
		(path: string) => {
			navigate({ to: path })
		},
		[navigate],
	)

	// ==============================
	// 渲染
	// ==============================

	return (
		<>
			<ActivityBarView
				workspaces={workspaces}
				selectedWorkspaceId={selectedWorkspaceId}
				activePanel={activePanel}
				isSidebarOpen={isSidebarOpen}
				iconTheme={iconTheme}
				currentPath={location.pathname}
				onSelectWorkspace={handleSelectWorkspace}
				onCreateWorkspace={handleCreateWorkspace}
				onSetActivePanel={setActivePanel}
				onToggleSidebar={toggleSidebar}
				onCreateDiary={handleCreateDiary}
				onCreateWiki={handleCreateWiki}
				onCreateLedger={handleCreateLedger}
				onCreateTodo={handleCreateTodo}
				onCreateNote={handleCreateNote}
				onCreateExcalidraw={handleCreateExcalidraw}
				onCreateMermaid={handleCreateMermaid}
				onCreatePlantUML={handleCreatePlantUML}
				onCreateCode={handleCreateCode}
				onImportFile={handleImportFile}
				onOpenExportDialog={handleOpenExportDialog}
				onDeleteAllData={handleDeleteAllData}
				onNavigate={handleNavigate}
			/>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
				workspaceId={selectedWorkspaceId || workspaces[0]?.id || ""}
				workspaceTitle={
					workspaces.find(
						(w: WorkspaceInterface) => w.id === (selectedWorkspaceId || workspaces[0]?.id),
					)?.title
				}
			/>
		</>
	)
}
