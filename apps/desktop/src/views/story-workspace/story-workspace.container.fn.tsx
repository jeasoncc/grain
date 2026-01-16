/**
 * StoryWorkspace - 简化版工作空间
 *
 * 路由编排层：连接数据和展示组件
 * 纯声明式组合 hooks 和 views，不包含业务逻辑
 *
 * @see Requirements 1.4, 3.1, 4.1, 6.4
 */

import { MultiEditorContainer } from "@grain/editor-lexical"
import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { memo } from "react"
import { useStoryWorkspace } from "@/hooks/use-story-workspace"
import { WikiHoverPreviewConnected } from "@/views/blocks/wiki-hover-preview-connected"
import { EditorTabs } from "@/views/editor-tabs"
import { ExcalidrawEditorContainer } from "@/views/excalidraw-editor"
import { KeyboardShortcutsHelp } from "@/views/keyboard-shortcuts-help"
import { SaveStatusIndicator } from "@/views/save-status-indicator"
import { StoryRightSidebar } from "@/views/story-right-sidebar"
import { ThemeSelector } from "@/views/theme-selector"
import { Button } from "@/views/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/views/ui/tooltip"
import { WordCountBadge } from "@/views/word-count-badge"
import { EmptyState } from "./empty-state.view.fn"
import type { StoryWorkspaceContainerProps } from "./story-workspace.types"

export const StoryWorkspaceContainer = memo(function StoryWorkspaceContainer({
	workspaces,
	activeWorkspaceId,
}: StoryWorkspaceContainerProps) {
	const {
		selectedWorkspaceId,
		tabs,
		activeTabId,
		activeTab,
		editorStates,
		lexicalTabs,
		mentionEntries,
		wikiFiles,
		isExcalidrawTab,
		foldIconStyle,
		rightSidebarOpen,
		toggleRightSidebar,
		tabPosition,
		wordCountResult,
		wordCountMode,
		wordCountDisplayText,
		showWordCount,
		handleScrollChange,
		handleMultiEditorContentChange,
		useWikiHoverPreview,
	} = useStoryWorkspace({ workspaces, activeWorkspaceId })

	return (
		<TooltipProvider>
			<div className="flex h-full w-full flex-row overflow-hidden bg-background">
				<div className="flex flex-1 flex-col min-w-0 overflow-hidden">
					{/* 顶部工具栏 */}
					<div className="flex h-12 items-center justify-between px-4 shrink-0">
						<div className="flex items-center gap-2">
							<SaveStatusIndicator />
						</div>

						<div className="flex items-center gap-1">
							<ThemeSelector />

							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" onClick={toggleRightSidebar}>
										{rightSidebarOpen ? (
											<PanelRightClose className="size-4" />
										) : (
											<PanelRightOpen className="size-4" />
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{rightSidebarOpen ? "Close sidebar" : "Open sidebar"}
								</TooltipContent>
							</Tooltip>

							<KeyboardShortcutsHelp />
						</div>
					</div>

					{/* 编辑器区域 */}
					<div className="flex flex-1 flex-col overflow-hidden min-h-0">
						{tabPosition === "top" && tabs.length > 0 && (
							<EditorTabs workspaceId={selectedWorkspaceId} />
						)}

						{!activeTab ? (
							<EmptyState hasFiles={wikiFiles.length > 0} />
						) : isExcalidrawTab ? (
							<ExcalidrawEditorContainer
								key={activeTab.id}
								nodeId={activeTab.nodeId || ""}
								className="flex-1 min-h-0"
							/>
						) : (
							<div className="flex-1 overflow-hidden">
								<MultiEditorContainer
									tabs={lexicalTabs}
									activeTabId={activeTabId}
									editorStates={editorStates}
									onContentChange={handleMultiEditorContentChange}
									onScrollChange={handleScrollChange}
									placeholder="Start writing..."
									mentionEntries={mentionEntries}
									useWikiHoverPreview={useWikiHoverPreview}
									WikiHoverPreview={WikiHoverPreviewConnected}
									foldIconStyle={foldIconStyle}
								/>
							</div>
						)}
					</div>
				</div>

				{rightSidebarOpen && <StoryRightSidebar workspaceId={selectedWorkspaceId} />}

				<WordCountBadge
					wordCountResult={wordCountResult}
					countMode={wordCountMode}
					show={showWordCount}
					showDetail={wordCountMode === "mixed"}
					displayText={wordCountDisplayText}
				/>
			</div>
		</TooltipProvider>
	)
})
