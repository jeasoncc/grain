/**
 * StoryWorkspace - 简化版工作空间
 * 基于新的 Node 结构，移除旧的 chapter/scene 依赖
 */

import type { SerializedEditorState } from "lexical";
import {
	Download,
	Maximize2,
	PanelRightClose,
	PanelRightOpen,
	Settings,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CanvasEditor } from "@/components/blocks/canvas-editor";
import { FocusMode } from "@/components/blocks/focus-mode";
import { KeyboardShortcutsHelp } from "@/components/blocks/keyboard-shortcuts-help";
import { MinimalEditor } from "@/components/blocks/rich-editor/minimal-editor";
import { NovelEditor } from "@/components/blocks/rich-editor/novel-editor";
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
import { db } from "@/db/curd";
import type { ProjectInterface } from "@/db/schema";
import { useManualSave } from "@/hooks/use-manual-save";
import { useSettings } from "@/hooks/use-settings";
import { exportAll, importFromJson, readFileAsText } from "@/services/projects";
import { useSaveStore } from "@/stores/save";
import { saveService } from "@/services/save";
import { type SelectionState, useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";
import { useWritingStore } from "@/stores/writing";
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { useDrawingsByProject } from "@/services/drawings";
import type { DrawingInterface } from "@/db/schema";
import { useUISettingsStore } from "@/stores/ui-settings";
import { MultiEditorWorkspace } from "@/components/workspace/multi-editor-workspace";
import { getNode } from "@/services/nodes";
import { cn } from "@/lib/utils";

interface StoryWorkspaceProps {
	projects: ProjectInterface[];
	activeProjectId?: string;
	onCreateProject?: () => void;
}

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
	const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

	// 专注模式
	const focusMode = useWritingStore((s) => s.focusMode);
	const setFocusMode = useWritingStore((s) => s.setFocusMode);
	const typewriterMode = useWritingStore((s) => s.typewriterMode);

	// UI 状态
	const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
	const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
	const tabPosition = useUISettingsStore((s) => s.tabPosition);

	// 绘图状态
	const [selectedDrawing, setSelectedDrawing] = useState<DrawingInterface | null>(null);
	const drawings = useDrawingsByProject(selectedProjectId);

	// 标签页状态
	const tabs = useEditorTabsStore((s) => s.tabs);
	const activeTabId = useEditorTabsStore((s) => s.activeTabId);
	const editorStates = useEditorTabsStore((s) => s.editorStates);
	const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);

	// 保存状态管理
	const { markAsUnsaved, markAsSaved, markAsSaving } = useSaveStore();

	// 所有标签都是 node 类型
	const activeTabDocumentType = "node" as const;

	// 获取当前编辑器内容
	const currentContent = useMemo(() => {
		if (!activeTabId) return null;
		const state = editorStates[activeTabId];
		if (state?.serializedState) return state.serializedState;
		return editorInitialState || null;
	}, [activeTabId, editorStates, editorInitialState]);

	// 手动保存 hook
	const { performManualSave } = useManualSave({
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
			getNode(activeTab.nodeId).then((node) => {
				if (node?.content) {
					try {
						const parsed = JSON.parse(node.content);
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

	// 自动保存处理
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

	const handleEditorChange = useCallback(
		(state: SerializedEditorState) => {
			if (!activeTabId) return;

			// 更新编辑器状态
			updateEditorState(activeTabId, { serializedState: state });
			markAsUnsaved();

			// 清除之前的定时器
			if (autoSaveTimerRef.current) {
				clearTimeout(autoSaveTimerRef.current);
			}

			// 设置新的自动保存定时器
			if (autoSaveDelayMs > 0) {
				autoSaveTimerRef.current = setTimeout(async () => {
					const activeTab = tabs.find(t => t.id === activeTabId);
					if (!activeTab) return;

					setSaveStatus("saving");
					markAsSaving();

					try {
						const documentId = activeTab.nodeId;
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
		[activeTabId, autoSaveDelayMs, tabs, activeTabDocumentType, updateEditorState, markAsUnsaved, markAsSaving, markAsSaved]
	);

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

	// 渲染编辑器内容
	const renderEditorContent = () => {
		if (!activeTab) {
			return (
				<div className="flex-1 flex items-center justify-center text-muted-foreground">
					<p>从左侧文件树选择一个文件开始编辑</p>
				</div>
			);
		}

		if (isCanvasTab) {
			return (
				<CanvasEditor
					key={activeTab.id}
					nodeId={activeTab.nodeId || ""}
				/>
			);
		}

		if (selectedDrawing) {
			return (
				<DrawingWorkspace
					drawing={selectedDrawing}
				/>
			);
		}

		// 文本编辑器
		const state = editorStates[activeTab.id];
		const editorState = state?.serializedState || editorInitialState;

		return (
			<div className="flex-1 overflow-auto">
				<NovelEditor
					key={activeTab.id}
					editorSerializedState={editorState}
					onSerializedChange={handleEditorChange}
				/>
			</div>
		);
	};

	// 专注模式
	if (focusMode) {
		const state = activeTab ? editorStates[activeTab.id] : undefined;
		const editorState = state?.serializedState || editorInitialState;
		return (
			<FocusMode
				wordCount={sceneWordCount}
				onExit={() => setFocusMode(false)}
				sceneTitle={activeTab?.title || ""}
			>
				<NovelEditor
					editorSerializedState={editorState}
					onSerializedChange={handleEditorChange}
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
