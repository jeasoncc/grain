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
		FilesIcon: iconTheme.icons.activityBar.files,
		SearchIcon: iconTheme.icons.activityBar.search,
		DiaryIcon: iconTheme.icons.activityBar.diary,
		WikiIcon: iconTheme.icons.activityBar.library,
		LedgerIcon: iconTheme.icons.activityBar.ledger,
		TodoIcon: iconTheme.icons.activityBar.todo,
		NoteIcon: iconTheme.icons.activityBar.note,
		ExcalidrawIcon: iconTheme.icons.activityBar.canvas,
		MermaidIcon: iconTheme.icons.activityBar.mermaid,
		PlantUMLIcon: iconTheme.icons.activityBar.plantuml,
		CodeIcon: iconTheme.icons.activityBar.code,
		SettingsIcon: iconTheme.icons.activityBar.settings,
		ImportIcon: iconTheme.icons.activityBar.import,
		ExportIcon: iconTheme.icons.activityBar.export,
		MoreIcon: iconTheme.icons.activityBar.more,
		FolderIcon: iconTheme.icons.activityBar.library,
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
			key: "files",
			Icon: icons.FilesIcon,
			label: "Files",
			onClick: handleFilesClick,
			active: activePanel === "files" && isSidebarOpen,
		},
		{
			key: "diary",
			Icon: icons.DiaryIcon,
			label: "New Diary",
			onClick: onCreateDiary,
			testId: "btn-new-diary",
		},
		{
			key: "wiki",
			Icon: icons.WikiIcon,
			label: "New Wiki",
			onClick: onCreateWiki,
			testId: "btn-new-wiki",
		},
		{
			key: "ledger",
			Icon: icons.LedgerIcon,
			label: "New Ledger",
			onClick: onCreateLedger,
			testId: "btn-new-ledger",
		},
		{
			key: "todo",
			Icon: icons.TodoIcon,
			label: "New Todo",
			onClick: onCreateTodo,
			testId: "btn-new-todo",
		},
		{
			key: "note",
			Icon: icons.NoteIcon,
			label: "New Note",
			onClick: onCreateNote,
			testId: "btn-new-note",
		},
		{
			key: "excalidraw",
			Icon: icons.ExcalidrawIcon,
			label: "New Excalidraw",
			onClick: onCreateExcalidraw,
			testId: "btn-new-excalidraw",
		},
		{
			key: "mermaid",
			Icon: icons.MermaidIcon,
			label: "New Mermaid",
			onClick: onCreateMermaid,
			testId: "btn-new-mermaid",
		},
		{
			key: "plantuml",
			Icon: icons.PlantUMLIcon,
			label: "New PlantUML",
			onClick: onCreatePlantUML,
			testId: "btn-new-plantuml",
		},
		{
			key: "code",
			Icon: icons.CodeIcon,
			label: "New Code File",
			onClick: onCreateCode,
			testId: "btn-new-code",
		},
		{
			key: "search",
			Icon: icons.SearchIcon,
			label: "Search (Ctrl+Shift+F)",
			onClick: handleSearchClick,
			active: activePanel === "search" && isSidebarOpen,
		},
	]

	// ==============================
	// Return
	// ==============================

	return {
		// Refs
		fileInputRef,

		// State
		showNewWorkspace,
		newWorkspaceName,
		setNewWorkspaceName,

		// Icons
		icons,

		// Nav Items
		navItems,

		// Handlers
		handleImportClick,
		handleFileInputChange,
		handleCreateWorkspace,
		handleNewWorkspaceKeyDown,
		isActive,
		openNewWorkspaceInput,
		closeNewWorkspaceInput,
	}
}
