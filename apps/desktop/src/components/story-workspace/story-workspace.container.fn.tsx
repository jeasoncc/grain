/**
 * StoryWorkspace - 简化版工作空间
 * 基于新的 Node 结构，移除旧的 chapter/scene 依赖
 *
 * 路由编排层：连接数据和展示组件
 *
 * 内容加载已在 openFile action 中处理，此组件只负责渲染。
 *
 * @see Requirements 1.4, 3.1, 4.1, 6.4
 */

import { type MentionEntry, MultiEditorContainer } from "@grain/editor-lexical";
import type { SerializedEditorState } from "lexical";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { memo, useCallback, useEffect, useMemo } from "react";
import { WikiHoverPreviewConnected } from "@/components/blocks/wiki-hover-preview-connected";
import { CodeEditorContainer } from "@/components/code-editor";
import { CodeMirrorEditorContainer } from "@/components/codemirror-editor";
import { DiagramEditorContainer } from "@/components/diagram-editor";
import { EditorTabs } from "@/components/editor-tabs";
import { ExcalidrawEditorContainer } from "@/components/excalidraw-editor";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { SaveStatusIndicator } from "@/components/save-status-indicator";
import { StoryRightSidebar } from "@/components/story-right-sidebar";
import { ThemeSelector } from "@/components/theme-selector";
import { TiptapEditorContainer } from "@/components/tiptap-editor";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { WordCountBadge } from "@/components/word-count-badge";
import {
	type EditorType,
	getDiagramTypeByFilename,
	getEditorTypeByFilename,
} from "@/fn/editor";
import { countWordsFromLexicalState } from "@/fn/word-count";
import { useSettings } from "@/hooks/use-settings";
import { useUnifiedSave } from "@/hooks/use-unified-save";
import { useWikiFiles } from "@/hooks/use-wiki";
import { useWikiHoverPreview } from "@/hooks/use-wiki-hover-preview";
import logger from "@/log";
import { useEditorSettingsStore } from "@/stores/editor-settings.store";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useUIStore } from "@/stores/ui.store";
import type { StoryWorkspaceContainerProps } from "./story-workspace.types";

export const StoryWorkspaceContainer = memo(
	({ workspaces, activeWorkspaceId }: StoryWorkspaceContainerProps) => {
		const initialWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id ?? null;
		const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
		const setSelectedWorkspaceId = useSelectionStore(
			(s) => s.setSelectedWorkspaceId,
		);

		const { wordCountMode, showWordCountBadge } = useSettings();

		// 编辑器设置
		const foldIconStyle = useEditorSettingsStore((s) => s.foldIconStyle);
		const documentEditorType = useEditorSettingsStore(
			(s) => s.documentEditorType,
		);
		const codeEditorType = useEditorSettingsStore((s) => s.codeEditorType);
		const diagramEditorType = useEditorSettingsStore((s) => s.diagramEditorType);

		// 日志：编辑器设置
		useEffect(() => {
			logger.info("[StoryWorkspace] 编辑器设置:", {
				documentEditorType,
				codeEditorType,
				diagramEditorType,
				foldIconStyle,
			});
		}, [documentEditorType, codeEditorType, diagramEditorType, foldIconStyle]);

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

		// 获取当前活动标签（提前定义，供 useUnifiedSave 使用）
		const activeTab = tabs.find((t) => t.id === activeTabId);

		// ==============================
		// 统一保存逻辑（使用 useUnifiedSave hook）
		// 自动保存和手动保存（Ctrl+S）都通过同一个 hook 处理
		// ==============================

		const { updateContent } = useUnifiedSave({
			nodeId: activeTab?.nodeId ?? "",
			contentType: "lexical",
			tabId: activeTabId ?? undefined,
			onSaveSuccess: () => {
				logger.success("[StoryWorkspace] 内容保存成功");
			},
			onSaveError: (error) => {
				logger.error("[StoryWorkspace] 保存失败:", error);
			},
		});

		// 初始化工作空间选择
		useEffect(() => {
			if (!selectedWorkspaceId && initialWorkspaceId) {
				setSelectedWorkspaceId(initialWorkspaceId);
			}
		}, [selectedWorkspaceId, initialWorkspaceId, setSelectedWorkspaceId]);

		// 注意：内容加载已在 openFile action 中处理
		// 当用户点击文件时，openFile 会：
		// 1. 从 DB 加载内容
		// 2. 创建 tab
		// 3. 设置 editorState
		// 因此这里不需要额外的内容加载逻辑

		// 根据文件名扩展名确定编辑器类型
		const editorType: EditorType = useMemo(() => {
			if (!activeTab?.title) return "lexical";
			return getEditorTypeByFilename(activeTab.title);
		}, [activeTab?.title]);

		// 获取图表类型（仅对 diagram 编辑器有效）
		const diagramType = useMemo(() => {
			if (!activeTab?.title) return null;
			return getDiagramTypeByFilename(activeTab.title);
		}, [activeTab?.title]);

		// 编辑器类型判断
		const isExcalidrawTab = editorType === "excalidraw";
		const isDiagramTab = editorType === "diagram";
		const isCodeTab = editorType === "code";

		const handleScrollChange = useCallback(
			(tabId: string, scrollTop: number) => {
				updateEditorState(tabId, { scrollTop });
			},
			[updateEditorState],
		);

		const handleMultiEditorContentChange = useCallback(
			(tabId: string, state: SerializedEditorState) => {
				// 更新编辑器状态
				updateEditorState(tabId, { serializedState: state });

				// 只有当前活动标签页才触发保存
				if (tabId === activeTabId) {
					// 序列化并通过 hook 更新内容（触发防抖保存）
					const serialized = JSON.stringify(state);
					updateContent(serialized);
				}
			},
			[activeTabId, updateEditorState, updateContent],
		);

		const textEditorTabs = useMemo(() => {
			// 过滤出使用 Lexical 编辑器的标签页
			return tabs.filter((tab) => {
				const tabEditorType = getEditorTypeByFilename(tab.title);
				return tabEditorType === "lexical";
			});
		}, [tabs]);

		// 计算当前编辑器的字数（仅对 Lexical 编辑器有效）
		const wordCountResult = useMemo(() => {
			if (!activeTabId || isExcalidrawTab || isDiagramTab || isCodeTab) {
				return { chineseChars: 0, englishWords: 0, total: 0, characters: 0 };
			}
			const state = editorStates[activeTabId];
			if (!state?.serializedState) {
				return { chineseChars: 0, englishWords: 0, total: 0, characters: 0 };
			}
			return countWordsFromLexicalState(state.serializedState, wordCountMode);
		}, [
			activeTabId,
			editorStates,
			isExcalidrawTab,
			isDiagramTab,
			isCodeTab,
			wordCountMode,
		]);

		const renderEditorContent = () => {
			// 日志：当前编辑器状态
			logger.info("[StoryWorkspace] renderEditorContent:", {
				activeTab: activeTab
					? { id: activeTab.id, title: activeTab.title, nodeId: activeTab.nodeId }
					: null,
				editorType,
				isExcalidrawTab,
				isDiagramTab,
				isCodeTab,
				diagramType,
				// 用户选择的编辑器类型
				userSettings: {
					documentEditorType,
					codeEditorType,
					diagramEditorType,
				},
			});

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

			// 处理 Excalidraw 类型节点（drawing）
			if (isExcalidrawTab) {
				return (
					<ExcalidrawEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						className="flex-1 min-h-0"
					/>
				);
			}

			// 处理 Mermaid/PlantUML 类型节点（基于扩展名）
			if (isDiagramTab && diagramType) {
				logger.info("[StoryWorkspace] 渲染图表编辑器:", { diagramEditorType });
				// 目前图表编辑器只支持 Monaco，其他类型暂不支持
				// TODO: 实现 CodeMirror 图表编辑器
				return (
					<DiagramEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						diagramType={diagramType}
						className="flex-1 min-h-0"
					/>
				);
			}

			// 处理 Code 类型节点（基于扩展名）
			if (isCodeTab) {
				logger.info("[StoryWorkspace] 渲染代码编辑器:", { codeEditorType });
				// 目前代码编辑器只支持 Monaco，其他类型暂不支持
				// TODO: 实现 CodeMirror 代码编辑器
				return (
					<CodeEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						className="flex-1 min-h-0"
					/>
				);
			}

			// 处理文档类型节点（.grain 文件）
			// 根据用户设置选择编辑器
			logger.info("[StoryWorkspace] 渲染文档编辑器:", { documentEditorType });

			if (documentEditorType === "tiptap") {
				return (
					<TiptapEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						className="flex-1 min-h-0"
					/>
				);
			}

			if (documentEditorType === "codemirror") {
				return (
					<CodeMirrorEditorContainer
						key={activeTab.id}
						nodeId={activeTab.nodeId || ""}
						className="flex-1 min-h-0"
					/>
				);
			}

			// 默认使用 Lexical 编辑器
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
						foldIconStyle={foldIconStyle}
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
								<SaveStatusIndicator />
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

					{/* 字数统计徽章（仅对 Lexical 编辑器显示） */}
					<WordCountBadge
						wordCountResult={wordCountResult}
						countMode={wordCountMode}
						show={
							showWordCountBadge &&
							!isExcalidrawTab &&
							!isDiagramTab &&
							!isCodeTab &&
							!!activeTab
						}
						showDetail={wordCountMode === "mixed"}
					/>
				</div>
			</TooltipProvider>
		);
	},
);

StoryWorkspaceContainer.displayName = "StoryWorkspaceContainer";
