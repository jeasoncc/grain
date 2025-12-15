/**
 * StoryWorkspace - 简化版工作空间
 * 基于新的 Node 结构，移除旧的 chapter/scene 依赖
 *
 * 重构说明：
 * - 移除旧的 rich-editor 导入，使用新的 MultiEditorContainer
 * - 实现 CSS visibility 切换，保留编辑器状态
 * - 集成自动保存逻辑
 *
 * @see Requirements 1.4, 3.1, 4.1, 6.4
 */

import type { SerializedEditorState } from "lexical";
import {
	Download,
	Maximize2,
	PanelRightClose,
	PanelRightOpen,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CanvasEditor } from "@/components/blocks/canvas-editor";
import { FocusMode } from "@/components/blocks/focus-mode";
import { KeyboardShortcutsHelp } from "@/components/blocks/keyboard-shortcuts-help";
import { SaveStatusIndicator } from "@/components/blocks/save-status-indicator";
import { ThemeSelector } from "@/components/blocks/theme-selector";
import { WordCountBadge } from "@/components/blocks/word-count-badge";
import { EditorTabs } from "@/components/editor-tabs";
import { useEditorTabsStore } from "@/stores/editor-tabs";
import { StoryRightSidebar } from "@/components/story-right-sidebar";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkspaceInterface, DrawingInterface } from "@/db/models";
import { useManualSave } from "@/hooks/use-manual-save";
import { useSettings } from "@/hooks/use-settings";
import { exportAll, importFromJson, readFileAsText } from "@/services/projects";
import { useSaveStore } from "@/stores/save";
import { saveService } from "@/services/save";
import { type SelectionState, useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";
import { useWritingStore } from "@/stores/writing";
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { getNodeContent } from "@/services/nodes";
// 新的多编辑器容器组件 - 基于 Lexical Playground 实现
import { MultiEditorContainer, Editor } from "@novel-editor/editor";

// Type alias for backward compatibility
type ProjectInterface = WorkspaceInterface;

interface StoryWorkspaceProps {
	projects: ProjectInterface[];
	activeProjectId?: string;
	onCreateProject?: () => void;
}

/**
 * 默认自动保存延迟（毫秒）
 * @see Requirements 6.4 - 自动保存配置
 */
const DEFAULT_AUTO_SAVE_MS = 800;

export function StoryWorkspace({
	projects,
	activeProjectId,
	onCreateProject,
}: StoryWorkspaceProps) {
	const initialProjectId = activeProjectId ?? projects[0]?.id ?? null;
	const selectedProjectId = useSelectionStore((s: SelectionState) => s.selectedProjectId);
	const setSelectedProjectId = useSelectionStore((s: SelectionState) => s.setSelectedProjectId);

	const { autoSave, autoSaveInterval } = useSettings();
	const autoSaveDelayMs = autoSave ? Math.max(DEFAULT_AUTO_SAVE_MS, autoSaveInterval * 1000) : 0;

	const [editorInitialState, setEditorInitialState] = useState<SerializedEditorState>();
	const [sceneWordCount, setSceneWordCount] = useState(0);
	// 保存状态用于自动保存逻辑
	const [, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

	// 专注模式
	const focusMode = useWritingStore((s) => s.focusMode);
	const setFocusMode = useWritingStore((s) => s.setFocusMode);

	// UI 状态
	const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
	const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
	const tabPosition = useUIStore((s) => s.tabPosition);

	// 绘图状态
	const [selectedDrawing] = useState<DrawingInterface | null>(null);

	// 标签页状态
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	const editorStates = useEditorTabsStore((s) => s.editorStates);
	const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);

	// 保存状态管理
	const { markAsUnsaved, markAsSaved, markAsSaving } = useSaveStore();

	// 获取当前编辑器内容
	const currentContent = useMemo(() => {
		if (!activeTabId) return null;
		const state = editorStates[activeTabId];
		if (state?.serializedState) return state.serializedState;
		return editorInitialState || null;
	}, [activeTabId, editorStates, editorInitialState]);

	// 手动保存 hook（保留以支持快捷键保存）
	useManualSave({
		nodeId: activeTabId,
		currentContent,
		onSaveSuccess: () => setSaveStatus("saved"),
		onSaveError: () => setSaveStatus("error"),
	});

	// 初始化项目选择
	useEffect(() => {
		if (!selectedProjectId && initialProjectId) {
			setSelectedProjectId(initialProjectId);
		}
	}, [selectedProjectId, initialProjectId, setSelectedProjectId]);

	// 当标签切换时，加载节点内容
	useEffect(() => {
		if (!activeTabId) return;
		const activeTab = tabs.find((t) => t.id === activeTabId);
		if (!activeTab) return;

		// 加载节点内容
		if (activeTab.nodeId) {
			getNodeContent(activeTab.nodeId).then((content) => {
				if (content) {
					try {
						const parsed = JSON.parse(content);
						setEditorInitialState(parsed);
					} catch {
						setEditorInitialState(undefined);
					}
				} else {
					setEditorInitialState(undefined);
				}
			});
		}
	}, [activeTabId, tabs]);

	// 自动保存定时器引用
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 导入导出
	const handleExport = useCallback(async () => {
		if (!selectedProjectId) {
			toast.error("请先选择项目");
			return;
		}
		try {
			await exportAll(selectedProjectId);
			toast.success("导出成功");
		} catch (error) {
			toast.error("导出失败");
		}
	}, [selectedProjectId]);

	const handleImport = useCallback(async () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;
			try {
				const text = await readFileAsText(file);
				await importFromJson(text);
				toast.success("导入成功");
			} catch (error) {
				toast.error("导入失败");
			}
		};
		input.click();
	}, []);

	// 获取当前活动标签
	const activeTab = tabs.find((t) => t.id === activeTabId);
	const isCanvasTab = activeTab?.type === "canvas";

	/**
	 * 处理滚动位置变化
	 * @see Requirements 3.3 - 保留滚动位置
	 */
	const handleScrollChange = useCallback(
		(tabId: string, scrollTop: number) => {
			updateEditorState(tabId, { scrollTop });
		},
		[updateEditorState]
	);

	/**
	 * 处理编辑器内容变化（来自 MultiEditorContainer）
	 * @see Requirements 6.4 - 自动保存
	 */
	const handleMultiEditorContentChange = useCallback(
		(tabId: string, state: SerializedEditorState) => {
			// 更新编辑器状态
			updateEditorState(tabId, { serializedState: state });
			markAsUnsaved();

			// 清除之前的定时器
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
			}

			// 设置新的自动保存定时器
			if (autoSaveDelayMs > 0) {
				autoSaveTimerRef.current = setTimeout(async () => {
					const tab = tabs.find(t => t.id === tabId);
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
						console.error("Auto-save failed:", error);
						setSaveStatus("error");
					}
				}, autoSaveDelayMs);
			}
		},
		[autoSaveDelayMs, tabs, updateEditorState, markAsUnsaved, markAsSaving, markAsSaved]
	);

	/**
	 * 过滤出文本编辑器标签（非 canvas 类型）
	 * @see Requirements 3.1, 4.1 - 多编辑器实例管理
	 */
	const textEditorTabs = useMemo(() => {
		return tabs.filter(tab => tab.type !== "canvas");
	}, [tabs]);

	/**
	 * 渲染编辑器内容
	 * 使用 MultiEditorContainer 管理多个编辑器实例
	 * @see Requirements 4.1 - CSS visibility 切换
	 */
	const renderEditorContent = () => {
		if (!activeTab) {
			return (
				<div className="flex-1 flex items-center justify-center text-muted-foreground">
					<p>从左侧文件树选择一个文件开始编辑</p>
				</div>
			);
		}

		// Canvas 编辑器单独处理
		if (isCanvasTab) {
			return (
				<CanvasEditor
					key={activeTab.id}
					nodeId={activeTab.nodeId || ""}
				/>
			);
		}

		// 绘图工作区单独处理
		if (selectedDrawing) {
			return (
				<DrawingWorkspace
					drawing={selectedDrawing}
				/>
			);
		}

		// 使用 MultiEditorContainer 管理文本编辑器
		// 所有编辑器实例同时挂载，通过 CSS visibility 控制显示
		return (
			<div className="flex-1 overflow-hidden">
				<MultiEditorContainer
					tabs={textEditorTabs}
					activeTabId={activeTabId}
					editorStates={editorStates}
					onContentChange={handleMultiEditorContentChange}
					onScrollChange={handleScrollChange}
					placeholder="开始写作..."
				/>
			</div>
		);
	};

	/**
	 * 处理专注模式下的编辑器内容变化
	 * @see Requirements 6.4 - 自动保存
	 */
	const handleFocusModeChange = useCallback(
		(state: SerializedEditorState) => {
			if (!activeTabId) return;
			handleMultiEditorContentChange(activeTabId, state);
		},
		[activeTabId, handleMultiEditorContentChange]
	);

	// 专注模式
	if (focusMode) {
		const state = activeTab ? editorStates[activeTab.id] : undefined;
		// 将 SerializedEditorState 转换为 JSON 字符串供新 Editor 使用
		const editorStateJson = state?.serializedState
			? JSON.stringify(state.serializedState)
			: editorInitialState
				? JSON.stringify(editorInitialState)
				: null;

		return (
			<FocusMode
				wordCount={sceneWordCount}
				onExit={() => setFocusMode(false)}
				sceneTitle={activeTab?.title || ""}
			>
				<Editor
					initialState={editorStateJson}
					onChange={handleFocusModeChange}
					placeholder="开始写作..."
				/>
			</FocusMode>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex h-full w-full flex-col overflow-hidden bg-background">
				{/* 顶部工具栏 */}
				<div className="flex h-12 items-center justify-between border-b px-4">
					<div className="flex items-center gap-2">
						<SaveStatusIndicator />
						<WordCountBadge wordCount={sceneWordCount} />
					</div>

					<div className="flex items-center gap-1">
						<ThemeSelector />
						
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" onClick={() => setFocusMode(true)}>
									<Maximize2 className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>专注模式</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" onClick={handleExport}>
									<Download className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>导出</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="ghost" size="icon" onClick={handleImport}>
									<Upload className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>导入</TooltipContent>
						</Tooltip>

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
							<TooltipContent>{rightSidebarOpen ? "关闭侧边栏" : "打开侧边栏"}</TooltipContent>
						</Tooltip>

						<KeyboardShortcutsHelp />
					</div>
				</div>

				{/* 主内容区 */}
				<div className="flex flex-1 overflow-hidden">
					{/* 编辑器区域 */}
					<div className="flex flex-1 flex-col overflow-hidden">
						{/* 标签栏 - 顶部位置 */}
						{tabPosition === "top" && tabs.length > 0 && (
							<EditorTabs />
						)}

						{/* 编辑器内容 */}
						{renderEditorContent()}
					</div>

					{/* 右侧边栏 */}
					{rightSidebarOpen && (
						<StoryRightSidebar />
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
