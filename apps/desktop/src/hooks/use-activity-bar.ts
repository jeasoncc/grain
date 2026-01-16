/**
 * @file use-activity-bar.ts
 * @description ActivityBar 业务逻辑 Hook
 *
 * 职责：封装 ActivityBar 的所有业务逻辑，让容器组件保持声明式
 * 依赖：flows/, state/, types/
 */

import { useQueryClient } from "@tanstack/react-query"
import { useLocation, useRouter } from "@tanstack/react-router"
import dayjs from "dayjs"
import { orderBy } from "es-toolkit"
import * as E from "fp-ts/Either"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { clearAllData } from "@/flows"
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
import { createWorkspace } from "@/flows/workspace/create-workspace.flow"
import { touchWorkspace } from "@/flows/workspace/update-workspace.flow"
import { useCreateTemplate } from "@/hooks/use-create-template"
import { useIconTheme } from "@/hooks/use-icon-theme"
import { useAllWorkspaces } from "@/hooks/use-workspace"
import { queryKeys } from "@/hooks/queries/query-keys"
import { error as logError } from "@/io/log/logger.api"
import type { FileRouteTypes } from "@/routeTree.gen"
import { useSelectionStore } from "@/state/selection.state"
import { useSidebarStore } from "@/state/sidebar.state"
import { useConfirm } from "@/views/ui/confirm"

// ==============================
// Types
// ==============================

type RoutePath = FileRouteTypes["to"]

const VALID_ROUTES: readonly RoutePath[] = [
	"/",
	"/settings",
	"/settings/about",
	"/settings/data",
	"/settings/design",
	"/settings/diagrams",
	"/settings/editor",
	"/settings/export",
	"/settings/general",
	"/settings/icons",
	"/settings/logs",
	"/settings/typography",
]

const isValidRoute = (path: string): path is RoutePath => VALID_ROUTES.includes(path as RoutePath)

// ==============================
// Hook
// ==============================

export function useActivityBar() {
	const router = useRouter()
	const location = useLocation()
	const confirm = useConfirm()
	const queryClient = useQueryClient()

	// Data
	const workspacesRaw = useAllWorkspaces()
	const workspaces = workspacesRaw ?? []
	const iconTheme = useIconTheme()

	// State
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
	const setSelectedWorkspaceId = useSelectionStore((s) => s.setSelectedWorkspaceId)
	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId)
	const { activePanel, isOpen: isSidebarOpen, setActivePanel, toggleSidebar } = useSidebarStore()

	// Hooks
	const { createTemplate } = useCreateTemplate()

	// Local state
	const [hasInitialized, setHasInitialized] = useState(false)
	const [exportDialogOpen, setExportDialogOpen] = useState(false)

	// ==============================
	// 初始化
	// ==============================

	useEffect(() => {
		const init = async () => {
			if (workspacesRaw === undefined || hasInitialized) {
				return
			}
			setHasInitialized(true)

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
						await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
					}
				} catch (error) {
					logError("[ActivityBar] 创建默认工作区失败", { error })
				}
				return
			}

			const isValid = selectedWorkspaceId && workspaces.some((w) => w.id === selectedWorkspaceId)
			if (!isValid) {
				const sorted = orderBy(
					workspaces,
					[(w) => dayjs(w.lastOpen || w.createDate).valueOf()],
					["desc"],
				)
				setSelectedWorkspaceId(sorted[0].id)
			} else {
				void touchWorkspace(selectedWorkspaceId)()
			}
		}
		init()
	}, [
		workspacesRaw,
		hasInitialized,
		workspaces,
		selectedWorkspaceId,
		setSelectedWorkspaceId,
		setActivePanel,
		queryClient,
	])

	// ==============================
	// Template Handlers
	// ==============================

	const templateHandlers = useMemo(
		() => ({
			onCreateCode: () =>
				createTemplate({
					creator: createCode,
					errorMessage: "Failed to create code file",
					successMessage: "Code file created",
				}),
			onCreateDiary: () =>
				createTemplate({
					creator: createDiary,
					errorMessage: "Failed to create diary",
					successMessage: "Diary created",
				}),
			onCreateExcalidraw: () =>
				createTemplate({
					creator: createExcalidraw,
					errorMessage: "Failed to create excalidraw",
					successMessage: "Excalidraw created",
				}),
			onCreateLedger: () =>
				createTemplate({
					creator: createLedger,
					errorMessage: "Failed to create ledger",
					successMessage: "Ledger created",
				}),
			onCreateMermaid: () =>
				createTemplate({
					creator: createMermaid,
					errorMessage: "Failed to create mermaid",
					successMessage: "Mermaid created",
				}),
			onCreateNote: () =>
				createTemplate({
					creator: createNote,
					errorMessage: "Failed to create note",
					successMessage: "Note created",
				}),
			onCreatePlantUML: () =>
				createTemplate({
					creator: createPlantUML,
					errorMessage: "Failed to create plantuml",
					successMessage: "PlantUML created",
				}),
			onCreateTodo: () =>
				createTemplate({
					creator: createTodo,
					errorMessage: "Failed to create todo",
					successMessage: "Todo created",
				}),
			onCreateWiki: () =>
				createTemplate({
					creator: createWiki,
					errorMessage: "Failed to create wiki",
					successMessage: "Wiki created",
				}),
		}),
		[createTemplate],
	)

	// ==============================
	// Action Handlers
	// ==============================

	const handleSelectWorkspace = useCallback(
		async (workspaceId: string) => {
			setSelectedWorkspaceId(workspaceId)
			void touchWorkspace(workspaceId)()
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
			const result = await createWorkspace({
				author: "",
				description: "",
				language: "en",
				title: name.trim(),
			})()
			if (E.isRight(result)) {
				setSelectedWorkspaceId(result.right.id)
				await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all })
				toast.success("Workspace created")
			} else {
				toast.error("Failed to create workspace")
			}
		},
		[setSelectedWorkspaceId, queryClient],
	)

	const handleDeleteAllData = useCallback(async () => {
		const ok = await confirm({
			cancelText: "Cancel",
			confirmText: "Delete",
			description: "This action cannot be undone. All workspaces, files, and data will be deleted.",
			title: "Delete all data?",
		})
		if (!ok) {
			return
		}
		try {
			await clearAllData()()
			queryClient.clear()
			setSelectedWorkspaceId(null)
			setSelectedNodeId(null)
			setHasInitialized(false)
			toast.success("All data deleted")
		} catch {
			toast.error("Delete failed")
		}
	}, [confirm, setSelectedWorkspaceId, setSelectedNodeId, queryClient])

	const handleNavigate = useCallback(
		(path: string) => {
			if (isValidRoute(path)) {
				router.history.push(path)
			}
		},
		[router],
	)

	const handleImportFile = useCallback(async () => {
		toast.info("Import functionality is being reimplemented")
	}, [])

	const handleOpenExportDialog = useCallback(() => setExportDialogOpen(true), [])

	// ==============================
	// Return
	// ==============================

	return {
		// Data
		workspaces,
		selectedWorkspaceId,
		activePanel,
		isSidebarOpen,
		iconTheme,
		currentPath: location.pathname,
		exportDialogOpen,

		// Actions
		onSelectWorkspace: handleSelectWorkspace,
		onCreateWorkspace: handleCreateWorkspace,
		onSetActivePanel: setActivePanel,
		onToggleSidebar: toggleSidebar,
		onImportFile: handleImportFile,
		onOpenExportDialog: handleOpenExportDialog,
		onDeleteAllData: handleDeleteAllData,
		onNavigate: handleNavigate,
		setExportDialogOpen,

		// Template handlers
		...templateHandlers,
	}
}
