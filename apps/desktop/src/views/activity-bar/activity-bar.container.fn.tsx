/**
 * @file activity-bar.container.fn.tsx
 * @description ActivityBar 容器组件
 *
 * 职责：连接 hooks 和 views，不包含业务逻辑
 */

import { useLocation, useRouter } from "@tanstack/react-router"
import dayjs from "dayjs"
import { orderBy } from "es-toolkit"
import * as E from "fp-ts/Either"
import type * as React from "react"
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
import { error as logError } from "@/io/log/logger.api"
import type { FileRouteTypes } from "@/routeTree.gen"
import { useSelectionStore } from "@/state/selection.state"
import { useSidebarStore } from "@/state/sidebar.state"

import { ExportDialog } from "@/views/export-dialog"
import { useConfirm } from "@/views/ui/confirm"
import { ActivityBarView } from "./activity-bar.view.fn"

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

const isValidRoute = (path: string): path is RoutePath =>
	VALID_ROUTES.includes(path as RoutePath)

// ==============================
// Component
// ==============================

export function ActivityBarContainer(): React.ReactElement {
	const router = useRouter()
	const location = useLocation()
	const confirm = useConfirm()

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
			if (workspacesRaw === undefined || hasInitialized) return
			setHasInitialized(true)

			if (workspaces.length === 0) {
				if (selectedWorkspaceId) setSelectedWorkspaceId(null)
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
					logError("[ActivityBar] 创建默认工作区失败", { error })
				}
				return
			}

			const isValid = selectedWorkspaceId && workspaces.some((w) => w.id === selectedWorkspaceId)
			if (!isValid) {
				const sorted = orderBy(workspaces, [(w) => dayjs(w.lastOpen || w.createDate).valueOf()], ["desc"])
				setSelectedWorkspaceId(sorted[0].id)
			} else {
				void touchWorkspace(selectedWorkspaceId)()
			}
		}
		init()
	}, [workspacesRaw, hasInitialized, workspaces, selectedWorkspaceId, setSelectedWorkspaceId, setActivePanel])

	// ==============================
	// Handlers (使用 useMemo 批量创建)
	// ==============================

	const templateHandlers = useMemo(
		() => ({
			onCreateDiary: () =>
				createTemplate({ creator: createDiary, errorMessage: "Failed to create diary", successMessage: "Diary created" }),
			onCreateWiki: () =>
				createTemplate({ creator: createWiki, errorMessage: "Failed to create wiki", successMessage: "Wiki created" }),
			onCreateLedger: () =>
				createTemplate({ creator: createLedger, errorMessage: "Failed to create ledger", successMessage: "Ledger created" }),
			onCreateTodo: () =>
				createTemplate({ creator: createTodo, errorMessage: "Failed to create todo", successMessage: "Todo created" }),
			onCreateNote: () =>
				createTemplate({ creator: createNote, errorMessage: "Failed to create note", successMessage: "Note created" }),
			onCreateExcalidraw: () =>
				createTemplate({ creator: createExcalidraw, errorMessage: "Failed to create excalidraw", successMessage: "Excalidraw created" }),
			onCreateMermaid: () =>
				createTemplate({ creator: createMermaid, errorMessage: "Failed to create mermaid", successMessage: "Mermaid created" }),
			onCreatePlantUML: () =>
				createTemplate({ creator: createPlantUML, errorMessage: "Failed to create plantuml", successMessage: "PlantUML created" }),
			onCreateCode: () =>
				createTemplate({ creator: createCode, errorMessage: "Failed to create code file", successMessage: "Code file created" }),
		}),
		[createTemplate],
	)

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
				toast.success("Workspace created")
			} else {
				toast.error("Failed to create workspace")
			}
		},
		[setSelectedWorkspaceId],
	)

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
			setHasInitialized(false)
			toast.success("All data deleted")
		} catch {
			toast.error("Delete failed")
		}
	}, [confirm, setSelectedWorkspaceId, setSelectedNodeId])

	const handleNavigate = useCallback(
		(path: string) => {
			if (isValidRoute(path)) router.history.push(path)
		},
		[router],
	)

	const handleImportFile = useCallback(async () => {
		toast.info("Import functionality is being reimplemented")
	}, [])

	// ==============================
	// Render
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
				onImportFile={handleImportFile}
				onOpenExportDialog={() => setExportDialogOpen(true)}
				onDeleteAllData={handleDeleteAllData}
				onNavigate={handleNavigate}
				{...templateHandlers}
			/>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
				workspaceId={selectedWorkspaceId || workspaces[0]?.id || ""}
				workspaceTitle={workspaces.find((w) => w.id === (selectedWorkspaceId || workspaces[0]?.id))?.title}
			/>
		</>
	)
}
