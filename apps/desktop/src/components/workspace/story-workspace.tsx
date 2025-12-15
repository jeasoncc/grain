/**
 * StoryWorkspace - 简化版工作空间
 * 基于新的 Node 结构，移除旧的 chapter/scene 依赖
 *
 * @see Requirements 1.4, 3.1, 4.1, 6.4
 */

import type { SerializedEditorState } from "lexical";
import {
	Download,
	PanelRightClose,
	PanelRightOpen,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CanvasEditor } from "@/components/blocks/canvas-editor";
import { KeyboardShortcutsHelp } from "@/components/blocks/keyboard-shortcuts-help";
import { SaveStatusIndicator } from "@/components/blocks/save-status-indicator";
import { ThemeSelector } from "@/components/blocks/theme-selector";
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
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { getNodeContent } from "@/services/nodes";
import { useWikiEntriesByProject } from "@/services/wiki";
import { useTagsByWorkspace } from "@/services/tags";
import { MultiEditorContainer } from "@novel-editor/editor";

type ProjectInterface = WorkspaceInterface;

interface StoryWorkspaceProps {
	projects: ProjectInterface[];
	activeProjectId?: string;
}

const DEFAULT_AUTO_SAVE_MS = 800;

export function StoryWorkspace({
	projects,
	activeProjectId,
}: StoryWorkspaceProps) {
	const initialProjectId = activeProjectId ?? projects[0]?.id ?? null;
	const selectedProjectId = useSelectionStore((s: SelectionState) => s.selectedProjectId);
	const setSelectedProjectId = useSelectionStore((s: SelectionState) => s.setSelectedProjectId);

	const { autoSave, autoSaveInterval } = useSettings();
	const autoSaveDelayMs = autoSave ? Math.max(DEFAULT_AUTO_SAVE_MS, autoSaveInterval * 1000) : 0;

	const [editorInitialState, setEditorInitialState] = useState<SerializedEditorState>();
	const [, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

	// UI 状态
	const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
	const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
	const tabPosition = useUIStore((s) => s.tabPosition);

	// 绘图状态
	const [selectedDrawing] = useState<DrawingInterface | null>(null);

	// Wiki 和标签数据 (用于编辑器插件)
	const wikiEntries = useWikiEntriesByProject(selectedProjectId);
	const tags = useTagsByWorkspace(selectedProjectId ?? undefined);

	// 标签页状态 - 只获取当前 workspace 的标签
	const allTabs = useEditorTabsStore((s) => s.tabs);
	const tabs = useMemo(() => 
		allTabs.filter(t => t.projectId === selectedProjectId),
		[allTabs, selectedProjectId]
	);
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

	// 手动保存 hook
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

		// 检查是否已经有编辑器状态
		const existingState = editorStates[activeTabId];
		if (existingState?.serializedState) {
			return;
		}

		// 加载节点内容
		if (activeTab.nodeId) {
			getNodeContent(activeTab.nodeId).then((content) => {
				if (content) {
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
	}, [activeTabId, tabs, editorStates, updateEditorState]);

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
		} catch {
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
			} catch {
				toast.error("导入失败");
			}
		};
		input.click();
	}, []);

	// 获取当前活动标签
	const activeTab = tabs.find((t) => t.id === activeTabId);
	const isCanvasTab = activeTab?.type === "canvas";

	const handleScrollChange = useCallback(
		(tabId: string, scrollTop: number) => {
			updateEditorState(tabId, { scrollTop });
		},
		[updateEditorState]
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

	const textEditorTabs = useMemo(() => {
		return tabs.filter(tab => tab.type !== "canvas");
	}, [tabs]);

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

		return (
			<div className="flex-1 overflow-hidden">
				<MultiEditorContainer
					tabs={textEditorTabs}
					activeTabId={activeTabId}
					editorStates={editorStates}
					onContentChange={handleMultiEditorContentChange}
					onScrollChange={handleScrollChange}
					placeholder="开始写作..."
					wikiEntries={wikiEntries}
					tags={tags}
				/>
			</div>
		);
	};

	return (
		<TooltipProvider>
			<div className="flex h-full w-full flex-row overflow-hidden bg-background">
				<div className="flex flex-1 flex-col min-w-0 overflow-hidden">
					{/* 顶部工具栏 */}
					<div className="flex h-12 items-center justify-between border-b px-4 shrink-0">
						<div className="flex items-center gap-2">
							<SaveStatusIndicator />
						</div>

						<div className="flex items-center gap-1">
							<ThemeSelector />

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

					{/* 编辑器区域 */}
					<div className="flex flex-1 flex-col overflow-hidden">
						{tabPosition === "top" && tabs.length > 0 && (
							<EditorTabs />
						)}
						{renderEditorContent()}
					</div>
				</div>

				{rightSidebarOpen && (
					<StoryRightSidebar />
				)}
			</div>
		</TooltipProvider>
	);
}
