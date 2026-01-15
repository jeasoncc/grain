/**
 * StoryWorkspace - 简化版工作空间
 *
 * 路由编排层：连接数据和展示组件
 *
 * 内容加载已在 openFile action 中处理，此组件只负责渲染。
 *
 * 统一使用 Lexical 编辑器处理所有文本文件。
 * 只有 .excalidraw 文件使用 Excalidraw 绘图编辑器。
 *
 * @see Requirements 1.4, 3.1, 4.1, 6.4
 */

import { type MentionEntry, MultiEditorContainer } from "@grain/editor-lexical"
import type { SerializedEditorState } from "lexical"
import { PanelRightClose, PanelRightOpen } from "lucide-react"
import { memo, useCallback, useEffect, useMemo } from "react"
import { useSettings } from "@/hooks/use-settings"
import { useUnifiedSave } from "@/hooks/use-unified-save"
import { useWikiFiles } from "@/hooks/use-wiki"
import { useWikiHoverPreview } from "@/hooks/use-wiki-hover-preview"
import {
	countWordsFromLexicalState,
	formatWordCount,
	formatWordCountDetail,
} from "@/pipes/word-count"
import { useFoldIconStyle } from "@/state/editor-settings.state"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import { useSelectionStore } from "@/state/selection.state"
import { useUIStore } from "@/state/ui.state"
import { WikiHoverPreviewConnected } from "@/views/blocks/wiki-hover-preview-connected"
import { type EditorType, getEditorTypeByFilename } from "@/views/editor"
import { EditorTabs } from "@/views/editor-tabs"
import { ExcalidrawEditorContainer } from "@/views/excalidraw-editor"
import { KeyboardShortcutsHelp } from "@/views/keyboard-shortcuts-help"
import { SaveStatusIndicator } from "@/views/save-status-indicator"
import { StoryRightSidebar } from "@/views/story-right-sidebar"
import { ThemeSelector } from "@/views/theme-selector"
import { Button } from "@/views/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/views/ui/tooltip"
import { WordCountBadge } from "@/views/word-count-badge"
import type { StoryWorkspaceContainerProps } from "./story-workspace.types"

export const StoryWorkspaceContainer = memo(
	({ workspaces, activeWorkspaceId }: StoryWorkspaceContainerProps) => {
		const initialWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id ?? null
		const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
		const setSelectedWorkspaceId = useSelectionStore((s) => s.setSelectedWorkspaceId)

		const { wordCountMode, showWordCountBadge } = useSettings()

		// 编辑器设置 - 只保留折叠图标风格
		const foldIconStyle = useFoldIconStyle()

		// UI 状态
		const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen)
		const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar)
		const tabPosition = useUIStore((s) => s.tabPosition)

		// Wiki 数据 (用于编辑器插件)
		const wikiFiles = useWikiFiles(selectedWorkspaceId)

		// Map WikiFileEntry to MentionEntry format for the editor
		const mentionEntries: MentionEntry[] = useMemo(
			() =>
				wikiFiles.map((file) => ({
					id: file.id,
					name: file.name,
					alias: file.alias,
				})),
			[wikiFiles],
		)

		// 标签页状态 - 只获取当前 workspace 的标签
		const allTabs = useEditorTabsStore((s) => s.tabs)
		const tabs = useMemo(
			() => allTabs.filter((t) => t.workspaceId === selectedWorkspaceId),
			[allTabs, selectedWorkspaceId],
		)
		const activeTabId = useEditorTabsStore((s) => s.activeTabId)
		const editorStates = useEditorTabsStore((s) => s.editorStates)
		const updateEditorState = useEditorTabsStore((s) => s.updateEditorState)

		// 获取当前活动标签（提前定义，供 useUnifiedSave 使用）
		const activeTab = tabs.find((t) => t.id === activeTabId)

		// ==============================
		// 统一保存逻辑（使用 useUnifiedSave hook）
		// 自动保存和手动保存（Ctrl+S）都通过同一个 hook 处理
		// ==============================

		const { updateContent } = useUnifiedSave({
			nodeId: activeTab?.nodeId ?? "",
			contentType: "lexical",
			tabId: activeTabId ?? undefined,
			onSaveSuccess: () => {
				console.log("[StoryWorkspace] 内容保存成功")
			},
			onSaveError: (error) => {
				console.error("[StoryWorkspace] 保存失败:", error)
			},
		})

		// 初始化工作空间选择
		useEffect(() => {
			if (!selectedWorkspaceId && initialWorkspaceId) {
				setSelectedWorkspaceId(initialWorkspaceId)
			}
		}, [selectedWorkspaceId, initialWorkspaceId, setSelectedWorkspaceId])

		// 注意：内容加载已在 openFile action 中处理
		// 当用户点击文件时，openFile 会：
		// 1. 从 DB 加载内容
		// 2. 创建 tab
		// 3. 设置 editorState
		// 因此这里不需要额外的内容加载逻辑

		// 根据文件名扩展名确定编辑器类型
		// 只有两种类型：lexical 和 excalidraw
		const editorType: EditorType = useMemo(() => {
			if (!activeTab?.title) return "lexical"
			return getEditorTypeByFilename(activeTab.title)
		}, [activeTab?.title])

		// 编辑器类型判断 - 只区分 Excalidraw
		const isExcalidrawTab = editorType === "excalidraw"

		const handleScrollChange = useCallback(
			(tabId: string, scrollTop: number) => {
				updateEditorState(tabId, { scrollTop })
			},
			[updateEditorState],
		)

		const handleMultiEditorContentChange = useCallback(
			(tabId: string, state: SerializedEditorState) => {
				// 更新编辑器状态
				updateEditorState(tabId, { serializedState: state })

				// 只有当前活动标签页才触发保存
				if (tabId === activeTabId) {
					// 序列化并通过 hook 更新内容（触发防抖保存）
					const serialized = JSON.stringify(state)
					updateContent(serialized)
				}
			},
			[activeTabId, updateEditorState, updateContent],
		)

		// 所有非 Excalidraw 标签都使用 Lexical 编辑器
		const lexicalTabs = useMemo(() => {
			return tabs.filter((tab) => {
				const tabEditorType = getEditorTypeByFilename(tab.title)
				return tabEditorType === "lexical"
			})
		}, [tabs])

		// 计算当前编辑器的字数（仅对 Lexical 编辑器有效）
		const wordCountResult = useMemo(() => {
			if (!activeTabId || isExcalidrawTab) {
				return { chineseChars: 0, englishWords: 0, total: 0, characters: 0 }
			}
			const state = editorStates[activeTabId]
			if (!state?.serializedState) {
				return { chineseChars: 0, englishWords: 0, total: 0, characters: 0 }
			}
			return countWordsFromLexicalState(state.serializedState, wordCountMode)
		}, [activeTabId, editorStates, isExcalidrawTab, wordCountMode])

		const renderEditorContent = () => {
			if (!activeTab) {
				// Check if there are any files in the workspace
				const hasFiles = wikiFiles.length > 0

				return (
					<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
						{hasFiles ? (
							<>
								<p className="text-lg">Select a file from the file tree to start editing</p>
								<p className="text-sm opacity-70">
									Choose a file from the left sidebar or create a new one
								</p>
							</>
						) : (
							<>
								<p className="text-lg">Welcome to your workspace!</p>
								<p className="text-sm opacity-70">Create your first file to get started</p>
								<p className="text-xs opacity-50 mt-2">
									Click the "Create File" button in the file tree on the left
								</p>
							</>
						)}
					</div>
				)
			}

			// 处理 Excalidraw 类型节点（drawing）
			if (isExcalidrawTab) {
				return (
					<ExcalidrawEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						className="flex-1 min-h-0"
					/>
				)
			}

			// 所有其他文件类型都使用 Lexical 编辑器
			// 包括：.grain, .mermaid, .plantuml, .js, .ts, .md 等
			return (
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
			)
		}

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
							{renderEditorContent()}
						</div>
					</div>

					{rightSidebarOpen && <StoryRightSidebar workspaceId={selectedWorkspaceId} />}

					{/* 字数统计徽章（仅对 Lexical 编辑器显示） */}
					<WordCountBadge
						wordCountResult={wordCountResult}
						countMode={wordCountMode}
						show={showWordCountBadge && !isExcalidrawTab && !!activeTab}
						showDetail={wordCountMode === "mixed"}
						displayText={
							wordCountMode === "mixed"
								? formatWordCountDetail(wordCountResult, wordCountMode)
								: formatWordCount(wordCountResult.total, wordCountMode)
						}
					/>
				</div>
			</TooltipProvider>
		)
	},
)

StoryWorkspaceContainer.displayName = "StoryWorkspaceContainer"
