/**
 * @file activity-bar.container.fn.tsx
 * @description ActivityBar 容器组件
 *
 * 职责：纯声明式组合 hooks 和 views，不包含任何业务逻辑
 */

import type * as React from "react"
import { useActivityBar } from "@/hooks/use-activity-bar"
import { ExportDialog } from "@/views/export-dialog"
import { ActivityBarView } from "./activity-bar.view.fn"

export function ActivityBarContainer(): React.ReactElement {
	const {
		workspaces,
		selectedWorkspaceId,
		activePanel,
		isSidebarOpen,
		iconTheme,
		currentPath,
		exportDialogOpen,
		setExportDialogOpen,
		onSelectWorkspace,
		onCreateWorkspace,
		onSetActivePanel,
		onToggleSidebar,
		onImportFile,
		onOpenExportDialog,
		onDeleteAllData,
		onNavigate,
		onCreateCode,
		onCreateDiary,
		onCreateExcalidraw,
		onCreateLedger,
		onCreateMermaid,
		onCreateNote,
		onCreatePlantUML,
		onCreateTodo,
		onCreateWiki,
	} = useActivityBar()

	return (
		<>
			<ActivityBarView
				workspaces={workspaces}
				selectedWorkspaceId={selectedWorkspaceId}
				activePanel={activePanel}
				isSidebarOpen={isSidebarOpen}
				iconTheme={iconTheme}
				currentPath={currentPath}
				onSelectWorkspace={onSelectWorkspace}
				onCreateWorkspace={onCreateWorkspace}
				onSetActivePanel={onSetActivePanel}
				onToggleSidebar={onToggleSidebar}
				onImportFile={onImportFile}
				onOpenExportDialog={onOpenExportDialog}
				onDeleteAllData={onDeleteAllData}
				onNavigate={onNavigate}
				onCreateCode={onCreateCode}
				onCreateDiary={onCreateDiary}
				onCreateExcalidraw={onCreateExcalidraw}
				onCreateLedger={onCreateLedger}
				onCreateMermaid={onCreateMermaid}
				onCreateNote={onCreateNote}
				onCreatePlantUML={onCreatePlantUML}
				onCreateTodo={onCreateTodo}
				onCreateWiki={onCreateWiki}
			/>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
				workspaceId={selectedWorkspaceId || workspaces[0]?.id || ""}
				workspaceTitle={
					workspaces.find((w) => w.id === (selectedWorkspaceId || workspaces[0]?.id))?.title
				}
			/>
		</>
	)
}
