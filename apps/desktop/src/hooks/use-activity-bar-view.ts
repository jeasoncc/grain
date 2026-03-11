/**
 * @file use-activity-bar-view.ts
 * @description ActivityBar View 的本地状态和交互逻辑 Hook
 *
 * 职责：封装 ActivityBarView 的本地状态管理和交互逻辑
 */

import type * as React from "react"
import { useCallback, useRef, useState } from "react"
import type { IconTheme } from "@/types/icon-theme"
import type { SidebarPanel } from "@/types/sidebar"

// ==============================
// Types
// ==============================

export interface UseActivityBarViewParams {
	readonly activePanel: SidebarPanel
	readonly isSidebarOpen: boolean
	readonly currentPath: string
	readonly iconTheme: IconTheme
	readonly onToggleSidebar: () => void
	readonly onSetActivePanel: (panel: SidebarPanel) => void
	readonly onCreateWorkspace: (name: string) => Promise<void>
	readonly onImportFile: (file: File) => Promise<void>
	// Template creators
	readonly onCreateDiary: () => void
	readonly onCreateWiki: () => void
	readonly onCreateLedger: () => void
	readonly onCreateTodo: () => void
	readonly onCreateNote: () => void
	readonly onCreateExcalidraw: () => void
	readonly onCreateMermaid: () => void
	readonly onCreatePlantUML: () => void
	readonly onCreateCode: () => void
}

export interface NavItem {
	readonly key: string
	readonly Icon: React.ComponentType<{ className?: string }>
	readonly label: string
	readonly onClick: () => void
	readonly active?: boolean
	readonly testId?: string
}

// ==============================
// Hook
// ==============================

export function useActivityBarView({
	activePanel,
	isSidebarOpen,
	currentPath,
	iconTheme,
	onToggleSidebar,
	onSetActivePanel,
	onCreateWorkspace,
	onImportFile,
	onCreateDiary,
	onCreateWiki,
	onCreateLedger,
	onCreateTodo,
	onCreateNote,
	onCreateExcalidraw,
	onCreateMermaid,
	onCreatePlantUML,
	onCreateCode,
}: UseActivityBarViewParams) {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [showNewWorkspace, setShowNewWorkspace] = useState(false)
	const [newWorkspaceName, setNewWorkspaceName] = useState("")

	// ==============================
	// Icons
	// ==============================

	const icons = {
		CodeIcon: iconTheme.icons.activityBar.code,
		DiaryIcon: iconTheme.icons.activityBar.diary,
		ExcalidrawIcon: iconTheme.icons.activityBar.canvas,
		ExportIcon: iconTheme.icons.activityBar.export,
		FilesIcon: iconTheme.icons.activityBar.files,
		FolderIcon: iconTheme.icons.activityBar.library,
		ImportIcon: iconTheme.icons.activityBar.import,
		LedgerIcon: iconTheme.icons.activityBar.ledger,
		MermaidIcon: iconTheme.icons.activityBar.mermaid,
		MoreIcon: iconTheme.icons.activityBar.more,
		NoteIcon: iconTheme.icons.activityBar.note,
		PlantUMLIcon: iconTheme.icons.activityBar.plantuml,
		SearchIcon: iconTheme.icons.activityBar.search,
		SettingsIcon: iconTheme.icons.activityBar.settings,
		TodoIcon: iconTheme.icons.activityBar.todo,
		WikiIcon: iconTheme.icons.activityBar.library,
	}

	// ==============================
	// Handlers
	// ==============================

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click()
	}, [])

	const handleFileInputChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (!file) return
			try {
				await onImportFile(file)
			} finally {
				if (fileInputRef.current) {
					fileInputRef.current.setAttribute("value", "")
				}
			}
		},
		[onImportFile],
	)

	const handleCreateWorkspace = useCallback(async () => {
		if (!newWorkspaceName.trim()) return
		await onCreateWorkspace(newWorkspaceName.trim())
		setNewWorkspaceName("")
		setShowNewWorkspace(false)
	}, [newWorkspaceName, onCreateWorkspace])

	const handleNewWorkspaceKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				handleCreateWorkspace()
			}
			if (e.key === "Escape") {
				setShowNewWorkspace(false)
				setNewWorkspaceName("")
			}
		},
		[handleCreateWorkspace],
	)

	const isActive = useCallback(
		(path: string) => currentPath === path || currentPath.startsWith(`${path}/`),
		[currentPath],
	)

	const handleFilesClick = useCallback(() => {
		if (activePanel === "files" && isSidebarOpen) {
			onToggleSidebar()
		} else {
			onSetActivePanel("files")
		}
	}, [activePanel, isSidebarOpen, onToggleSidebar, onSetActivePanel])

	const handleSearchClick = useCallback(() => {
		if (activePanel === "search" && isSidebarOpen) {
			onToggleSidebar()
		} else {
			onSetActivePanel("search")
		}
	}, [activePanel, isSidebarOpen, onToggleSidebar, onSetActivePanel])

	const openNewWorkspaceInput = useCallback(() => setShowNewWorkspace(true), [])

	const closeNewWorkspaceInput = useCallback(() => {
		setShowNewWorkspace(false)
		setNewWorkspaceName("")
	}, [])

	// ==============================
	// Nav Items Configuration
	// ==============================

	const navItems: readonly NavItem[] = [
		{
			active: activePanel === "files" && isSidebarOpen,
			Icon: icons.FilesIcon,
			key: "files",
			label: "Files",
			onClick: handleFilesClick,
		},
		{
			active: activePanel === "search" && isSidebarOpen,
			Icon: icons.SearchIcon,
			key: "search",
			label: "Search (Ctrl+Shift+F)",
			onClick: handleSearchClick,
		},
		{
			Icon: icons.DiaryIcon,
			key: "diary",
			label: "New Diary",
			onClick: onCreateDiary,
			testId: "btn-new-diary",
		},
		{
			Icon: icons.WikiIcon,
			key: "wiki",
			label: "New Wiki",
			onClick: onCreateWiki,
			testId: "btn-new-wiki",
		},
		{
			Icon: icons.LedgerIcon,
			key: "ledger",
			label: "New Ledger",
			onClick: onCreateLedger,
			testId: "btn-new-ledger",
		},
		{
			Icon: icons.TodoIcon,
			key: "todo",
			label: "New Todo",
			onClick: onCreateTodo,
			testId: "btn-new-todo",
		},
		{
			Icon: icons.NoteIcon,
			key: "note",
			label: "New Note",
			onClick: onCreateNote,
			testId: "btn-new-note",
		},
		{
			Icon: icons.ExcalidrawIcon,
			key: "excalidraw",
			label: "New Excalidraw",
			onClick: onCreateExcalidraw,
			testId: "btn-new-excalidraw",
		},
		{
			Icon: icons.MermaidIcon,
			key: "mermaid",
			label: "New Mermaid",
			onClick: onCreateMermaid,
			testId: "btn-new-mermaid",
		},
		{
			Icon: icons.PlantUMLIcon,
			key: "plantuml",
			label: "New PlantUML",
			onClick: onCreatePlantUML,
			testId: "btn-new-plantuml",
		},
		{
			Icon: icons.CodeIcon,
			key: "code",
			label: "New Code File",
			onClick: onCreateCode,
			testId: "btn-new-code",
		},
	]

	// ==============================
	// Return
	// ==============================

	return {
		closeNewWorkspaceInput,
		// Refs
		fileInputRef,
		handleCreateWorkspace,
		handleFileInputChange,

		// Handlers
		handleImportClick,
		handleNewWorkspaceKeyDown,

		// Icons
		icons,
		isActive,

		// Nav Items
		navItems,
		newWorkspaceName,
		openNewWorkspaceInput,
		setNewWorkspaceName,

		// State
		showNewWorkspace,
	}
}
