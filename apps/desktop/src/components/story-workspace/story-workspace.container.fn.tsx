/**
 * StoryWorkspace - 简化版工作空间
 * 基于新的 Node 结构，移除旧的 chapter/scene 依赖
 *
 * 路由编排层：连接数据和展示组件
 *
 * @see Requirements 1.4, 3.1, 4.1, 6.4
 */

import { type MentionEntry, MultiEditorContainer } from "@grain/editor";
import * as E from "fp-ts/Either";
import type { SerializedEditorState } from "lexical";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WikiHoverPreviewConnected } from "@/components/blocks/wiki-hover-preview-connected";
import { EditorTabs } from "@/components/editor-tabs";
import { ExcalidrawEditorContainer } from "@/components/excalidraw-editor";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { SaveStatusIndicator } from "@/components/save-status-indicator";
import { StoryRightSidebar } from "@/components/story-right-sidebar";
import { ThemeSelector } from "@/components/theme-selector";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { WordCountBadge } from "@/components/word-count-badge";
import { getContentByNodeId } from "@/db";
import { saveService } from "@/fn/save";
import { countWordsFromLexicalState } from "@/fn/word-count";
import { useManualSave } from "@/hooks/use-save";
import { useSettings } from "@/hooks/use-settings";
import { useWikiFiles } from "@/hooks/use-wiki";
import { useWikiHoverPreview } from "@/hooks/use-wiki-hover-preview";
import logger from "@/log";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSaveStore } from "@/stores/save.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useUIStore } from "@/stores/ui.store";
import type { StoryWorkspaceContainerProps } from "./story-workspace.types";

const DEFAULT_AUTO_SAVE_MS = 800;

export const StoryWorkspaceContainer = memo(
	({ workspaces, activeWorkspaceId }: StoryWorkspaceContainerProps) => {
		const initialWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id ?? null;
		const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
		const setSelectedWorkspaceId = useSelectionStore(
			(s) => s.setSelectedWorkspaceId,
		);

		const { autoSave, autoSaveInterval, wordCountMode, showWordCountBadge } =
			useSettings();
		const autoSaveDelayMs = autoSave
			? Math.max(DEFAULT_AUTO_SAVE_MS, autoSaveInterval * 1000)
			: 0;

		const [editorInitialState, setEditorInitialState] =
			useState<SerializedEditorState>();
		const [, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

		// UI 状态
		const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
		const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
		const tabPosition = useUIStore((s) => s.tabPosition);

		// Wiki 数据 (用于编辑器插件)
		const wikiFiles = useWikiFiles(selectedWorkspaceId);

		// Map WikiFileEntry to MentionEntry format for the editor
		const mentionEntries: MentionEntry[] = useMemo(
			() =>
				wikiFiles.map((file) => ({
					id: file.id,
					name: file.name,
					alias: file.alias,
				})),
			[wikiFiles],
		);

		// 标签页状态 - 只获取当前 workspace 的标签
		const allTabs = useEditorTabsStore((s) => s.tabs);
		const tabs = useMemo(
			() => allTabs.filter((t) => t.workspaceId === selectedWorkspaceId),
			[allTabs, selectedWorkspaceId],
		);
		const activeTabId = useEditorTabsStore((s) => s.activeTabId);
		const editorStates = useEditorTabsStore((s) => s.editorStates);
		const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);

		// 保存状态管理
		const {
			status: saveStatus,
			lastSaveTime,
			errorMessage,
			hasUnsavedChanges,
			isManualSaving,
			markAsUnsaved,
			markAsSaved,
			markAsSaving,
		} = useSaveStore();


		// 获取当前编辑器内容
		const currentContent = useMemo(() => {
			if (!activeTabId) return null;
			const state = editorStates[activeTabId];
			if (state?.serializedState) return state.serializedState;
			return editorInitialState || null;
		}, [activeTabId, editorStates, editorInitialState]);

		// 手动保存 hook
		useManualSave({
			nodeId: activeTabId,
			currentContent,
			onSaveSuccess: () => setSaveStatus("saved"),
			onSaveError: () => setSaveStatus("error"),
		});

		// 初始化工作空间选择
		useEffect(() => {
			if (!selectedWorkspaceId && initialWorkspaceId) {
				setSelectedWorkspaceId(initialWorkspaceId);
			}
		}, [selectedWorkspaceId, initialWorkspaceId, setSelectedWorkspaceId]);

		// 当标签切换时，加载节点内容
		// 使用 allTabs 而不是过滤后的 tabs，确保能找到活动标签
		useEffect(() => {
			if (!activeTabId) return;
			const activeTab = allTabs.find((t) => t.id === activeTabId);
			if (!activeTab) return;

			// 检查是否已经有编辑器状态
			const existingState = editorStates[activeTabId];
			if (existingState?.serializedState) {
				return;
			}

			// 加载节点内容
			if (activeTab.nodeId) {
				getContentByNodeId(activeTab.nodeId)().then((result) => {
					if (E.isRight(result) && result.right) {
						const content = result.right.content;
						try {
							const parsed = JSON.parse(content);
							setEditorInitialState(parsed);
							updateEditorState(activeTabId, { serializedState: parsed });
						} catch {
							setEditorInitialState(undefined);
						}
					} else {
						setEditorInitialState(undefined);
					}
				});
			}
		}, [activeTabId, allTabs, editorStates, updateEditorState]);

		// 自动保存定时器引用
		const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

		// 获取当前活动标签
		const activeTab = tabs.find((t) => t.id === activeTabId);
		const isCanvasTab = activeTab?.type === "canvas";
		const isDrawingTab = activeTab?.type === "drawing";

		const handleScrollChange = useCallback(
			(tabId: string, scrollTop: number) => {
				updateEditorState(tabId, { scrollTop });
			},
			[updateEditorState],
		);

		const handleMultiEditorContentChange = useCallback(
			(tabId: string, state: SerializedEditorState) => {
				updateEditorState(tabId, { serializedState: state });
				markAsUnsaved();

				if (autoSaveTimerRef.current) {
					clearTimeout(autoSaveTimerRef.current);
				}

				if (autoSaveDelayMs > 0) {
					autoSaveTimerRef.current = setTimeout(async () => {
						const tab = tabs.find((t) => t.id === tabId);
						if (!tab) return;

						setSaveStatus("saving");
						markAsSaving();

						try {
							const documentId = tab.nodeId;
							if (documentId) {
								await saveService.saveDocument(documentId, state);
							}
							setSaveStatus("saved");
							markAsSaved();
						} catch (error) {
							logger.error("[StoryWorkspace] 自动保存失败:", error);
							setSaveStatus("error");
						}
					}, autoSaveDelayMs);
				}
			},
			[
				autoSaveDelayMs,
				tabs,
				updateEditorState,
				markAsUnsaved,
				markAsSaving,
				markAsSaved,
			],
		);

		const textEditorTabs = useMemo(() => {
			return tabs.filter(
				(tab) => tab.type !== "canvas" && tab.type !== "drawing",
			);
		}, [tabs]);

		// 计算当前编辑器的字数
		const wordCountResult = useMemo(() => {
			if (!activeTabId || isCanvasTab || isDrawingTab) {
				return { chineseChars: 0, englishWords: 0, total: 0, characters: 0 };
			}
			const state = editorStates[activeTabId];
			if (!state?.serializedState) {
				return { chineseChars: 0, englishWords: 0, total: 0, characters: 0 };
			}
			return countWordsFromLexicalState(state.serializedState, wordCountMode);
		}, [activeTabId, editorStates, isCanvasTab, isDrawingTab, wordCountMode]);

		const renderEditorContent = () => {
			if (!activeTab) {
				// Check if there are any files in the workspace
				const hasFiles = wikiFiles.length > 0;

				return (
					<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
						{hasFiles ? (
							<>
								<p className="text-lg">
									Select a file from the file tree to start editing
								</p>
								<p className="text-sm opacity-70">
									Choose a file from the left sidebar or create a new one
								</p>
							</>
						) : (
							<>
								<p className="text-lg">Welcome to your workspace!</p>
								<p className="text-sm opacity-70">
									Create your first file to get started
								</p>
								<p className="text-xs opacity-50 mt-2">
									Click the "Create File" button in the file tree on the left
								</p>
							</>
						)}
					</div>
				);
			}

			// 处理 canvas 和 drawing 类型节点 - 使用 ExcalidrawEditorContainer
			if (isCanvasTab || activeTab.type === "drawing") {
				return (
					<ExcalidrawEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						className="flex-1 min-h-0"
					/>
				);
			}

			return (
				<div className="flex-1 overflow-hidden">
					<MultiEditorContainer
						tabs={textEditorTabs}
						activeTabId={activeTabId}
						editorStates={editorStates}
						onContentChange={handleMultiEditorContentChange}
						onScrollChange={handleScrollChange}
						placeholder="Start writing..."
						mentionEntries={mentionEntries}
						useWikiHoverPreview={useWikiHoverPreview}
						WikiHoverPreview={WikiHoverPreviewConnected}
					/>
				</div>
			);
		};

		return (
			<TooltipProvider>
				<div className="flex h-full w-full flex-row overflow-hidden bg-background">
					<div className="flex flex-1 flex-col min-w-0 overflow-hidden">
						{/* 顶部工具栏 */}
						<div className="flex h-12 items-center justify-between px-4 shrink-0">
							<div className="flex items-center gap-2">
								<SaveStatusIndicator
									status={saveStatus}
									lastSaveTime={lastSaveTime}
									errorMessage={errorMessage}
									hasUnsavedChanges={hasUnsavedChanges}
									isManualSaving={isManualSaving}
								/>
							</div>

							<div className="flex items-center gap-1">
								<ThemeSelector />

								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											onClick={toggleRightSidebar}
										>
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

					{rightSidebarOpen && (
						<StoryRightSidebar workspaceId={selectedWorkspaceId} />
					)}

					{/* 字数统计徽章 */}
					<WordCountBadge
						wordCountResult={wordCountResult}
						countMode={wordCountMode}
						show={
							showWordCountBadge && !isCanvasTab && !isDrawingTab && !!activeTab
						}
						showDetail={wordCountMode === "mixed"}
					/>
				</div>
			</TooltipProvider>
		);
	},
);

StoryWorkspaceContainer.displayName = "StoryWorkspaceContainer";
