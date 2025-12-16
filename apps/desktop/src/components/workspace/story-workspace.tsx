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
import { exportAll, importFromJson, readFileAsText } from "@/services/import-export";
import { useSaveStore } from "@/stores/save";
import { saveService } from "@/services/save";
import { type SelectionState, useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { getNodeContent } from "@/services/nodes";
import { useWikiFiles } from "@/services/wiki-files";
import { useTagsByWorkspace } from "@/services/tags";
import { useWikiHoverPreview } from "@/hooks/use-wiki-hover-preview";
import { WikiHoverPreview } from "@/components/blocks/wiki-hover-preview";
import { MultiEditorContainer, type MentionEntry } from "@novel-editor/editor";

interface StoryWorkspaceProps {
	workspaces: WorkspaceInterface[];
	activeWorkspaceId?: string;
}

const DEFAULT_AUTO_SAVE_MS = 800;

export function StoryWorkspace({
	workspaces,
	activeWorkspaceId,
}: StoryWorkspaceProps) {
	const initialWorkspaceId = activeWorkspaceId ?? workspaces[0]?.id ?? null;
	const selectedWorkspaceId = useSelectionStore((s: SelectionState) => s.selectedWorkspaceId);
	const setSelectedWorkspaceId = useSelectionStore((s: SelectionState) => s.setSelectedWorkspaceId);

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
	const wikiFiles = useWikiFiles(selectedWorkspaceId);
	const tags = useTagsByWorkspace(selectedWorkspaceId ?? undefined);

	// Map WikiFileEntry to MentionEntry format for the editor
	const mentionEntries: MentionEntry[] = useMemo(() => 
		wikiFiles.map(file => ({
			id: file.id,
			name: file.name,
			alias: file.alias,
		})),
		[wikiFiles]
	);

	// 标签页状态 - 只获取当前 workspace 的标签
	const allTabs = useEditorTabsStore((s) => s.tabs);
	const tabs = useMemo(() => 
		allTabs.filter(t => t.workspaceId === selectedWorkspaceId),
		[allTabs, selectedWorkspaceId]
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
	}, [activeTabId, allTabs, editorStates, updateEditorState]);

	// 自动保存定时器引用
	const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

	// 导入导出
	const handleExport = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}
		try {
			await exportAll(selectedWorkspaceId);
			toast.success("Export successful");
		} catch {
			toast.error("Export failed");
		}
	}, [selectedWorkspaceId]);

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
				toast.success("Import successful");
			} catch {
				toast.error("Import failed");
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
			// Check if there are any files in the workspace
			const hasFiles = wikiFiles.length > 0;
			
			return (
				<div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
					{hasFiles ? (
						<>
							<p className="text-lg">Select a file from the file tree to start editing</p>
							<p className="text-sm opacity-70">Choose a file from the left sidebar or create a new one</p>
						</>
					) : (
						<>
							<p className="text-lg">Welcome to your workspace!</p>
							<p className="text-sm opacity-70">Create your first file to get started</p>
							<p className="text-xs opacity-50 mt-2">Click the "Create File" button in the file tree on the left</p>
						</>
					)}
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
					placeholder="Start writing..."
					mentionEntries={mentionEntries}
					tags={tags}
					useWikiHoverPreview={useWikiHoverPreview}
					WikiHoverPreview={WikiHoverPreview}
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
								<TooltipContent>Export</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button variant="ghost" size="icon" onClick={handleImport}>
										<Upload className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Import</TooltipContent>
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
								<TooltipContent>{rightSidebarOpen ? "Close sidebar" : "Open sidebar"}</TooltipContent>
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
