/**
 * @file use-story-workspace.ts
 * @description StoryWorkspace 业务逻辑 Hook
 *
 * 职责：封装 StoryWorkspace 的所有业务逻辑
 */

import type { SerializedEditorState } from "lexical"
import type { MentionEntry } from "@/types/mention.interface"
import { useCallback, useEffect, useMemo } from "react"
import { useSettings } from "@/hooks/use-settings"
import { useUnifiedSave } from "@/hooks/use-unified-save"
import { useWikiFiles } from "@/hooks/use-wiki"
import { useWikiHoverPreview } from "@/hooks/use-wiki-hover-preview"
import { type EditorType, getEditorTypeByFilename } from "@/pipes/editor"
import { countWordsFromLexicalState, formatWordCount, formatWordCountDetail } from "@/pipes/word-count"
import { useFoldIconStyle } from "@/state/editor-settings.state"
import { useEditorTabsStore } from "@/state/editor-tabs.state"
import { useSelectionStore } from "@/state/selection.state"
import { useUIStore } from "@/state/ui.state"
import type { WorkspaceInterface } from "@/types/workspace"

export interface UseStoryWorkspaceParams {
	readonly workspaces: readonly WorkspaceInterface[]
	readonly activeWorkspaceId?: string | null
}

export function useStoryWorkspace({ workspaces, activeWorkspaceId }: UseStoryWorkspaceParams) {
	const initialWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id ?? null
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId)
	const setSelectedWorkspaceId = useSelectionStore((s) => s.setSelectedWorkspaceId)

	const { wordCountMode, showWordCountBadge } = useSettings()
	const foldIconStyle = useFoldIconStyle()

	// UI 状态
	const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen)
	const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar)
	const tabPosition = useUIStore((s) => s.tabPosition)

	// Wiki 数据
	const wikiFiles = useWikiFiles(selectedWorkspaceId)

	const mentionEntries: MentionEntry[] = useMemo(
		() =>
			wikiFiles.map((file) => ({
				alias: file.alias,
				id: file.id,
				name: file.name,
			})),
		[wikiFiles],
	)

	// 标签页状态
	const allTabs = useEditorTabsStore((s) => s.tabs)
	const tabs = useMemo(
		() => allTabs.filter((t) => t.workspaceId === selectedWorkspaceId),
		[allTabs, selectedWorkspaceId],
	)
	const activeTabId = useEditorTabsStore((s) => s.activeTabId)
	const editorStates = useEditorTabsStore((s) => s.editorStates)
	const updateEditorState = useEditorTabsStore((s) => s.updateEditorState)

	const activeTab = tabs.find((t) => t.id === activeTabId)

	// 统一保存逻辑
	const { updateContent } = useUnifiedSave({
		contentType: "lexical",
		nodeId: activeTab?.nodeId ?? "",
		onSaveError: (error) => {
			console.error("[StoryWorkspace] 保存失败:", error)
		},
		onSaveSuccess: () => {
			console.log("[StoryWorkspace] 内容保存成功")
		},
		tabId: activeTabId ?? undefined,
	})

	// 初始化工作空间选择
	useEffect(() => {
		if (!selectedWorkspaceId && initialWorkspaceId) {
			setSelectedWorkspaceId(initialWorkspaceId)
		}
	}, [selectedWorkspaceId, initialWorkspaceId, setSelectedWorkspaceId])

	// 编辑器类型
	const editorType: EditorType = useMemo(() => {
		if (!activeTab?.title) return "lexical"
		return getEditorTypeByFilename(activeTab.title)
	}, [activeTab?.title])

	const isExcalidrawTab = editorType === "excalidraw"

	// Handlers
	const handleScrollChange = useCallback(
		(tabId: string, scrollTop: number) => {
			updateEditorState(tabId, { scrollTop })
		},
		[updateEditorState],
	)

	const handleMultiEditorContentChange = useCallback(
		(tabId: string, state: SerializedEditorState) => {
			updateEditorState(tabId, { serializedState: state })
			if (tabId === activeTabId) {
				const serialized = JSON.stringify(state)
				updateContent(serialized)
			}
		},
		[activeTabId, updateEditorState, updateContent],
	)

	// Lexical tabs
	const lexicalTabs = useMemo(() => {
		return tabs.filter((tab) => {
			const tabEditorType = getEditorTypeByFilename(tab.title)
			return tabEditorType === "lexical"
		})
	}, [tabs])

	// 字数统计
	const wordCountResult = useMemo(() => {
		if (!activeTabId || isExcalidrawTab) {
			return { characters: 0, chineseChars: 0, englishWords: 0, total: 0 }
		}
		const state = editorStates[activeTabId]
		if (!state?.serializedState) {
			return { characters: 0, chineseChars: 0, englishWords: 0, total: 0 }
		}
		return countWordsFromLexicalState(state.serializedState, wordCountMode)
	}, [activeTabId, editorStates, isExcalidrawTab, wordCountMode])

	const wordCountDisplayText = useMemo(() => {
		return wordCountMode === "mixed"
			? formatWordCountDetail(wordCountResult, wordCountMode)
			: formatWordCount(wordCountResult.total, wordCountMode)
	}, [wordCountResult, wordCountMode])

	const showWordCount = showWordCountBadge && !isExcalidrawTab && !!activeTab

	return {
		// Data
		selectedWorkspaceId,
		tabs,
		activeTabId,
		activeTab,
		editorStates,
		lexicalTabs,
		mentionEntries,
		wikiFiles,

		// Editor
		editorType,
		isExcalidrawTab,
		foldIconStyle,

		// UI
		rightSidebarOpen,
		toggleRightSidebar,
		tabPosition,

		// Word count
		wordCountResult,
		wordCountMode,
		wordCountDisplayText,
		showWordCount,

		// Handlers
		handleScrollChange,
		handleMultiEditorContentChange,

		// Wiki hover preview (pass through)
		useWikiHoverPreview,
	}
}
