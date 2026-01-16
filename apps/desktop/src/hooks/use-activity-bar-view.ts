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

		// Handlers
		handleImportClick,
		handleFileInputChange,
		handleCreateWorkspace,
		handleNewWorkspaceKeyDown,
		isActive,
		handleFilesClick,
		handleSearchClick,
		openNewWorkspaceInput,
		closeNewWorkspaceInput,
	}
}
