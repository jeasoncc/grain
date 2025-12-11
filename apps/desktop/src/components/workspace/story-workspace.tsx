//

import type { SerializedEditorState } from "lexical";
import {
	AlignCenter,
	ChevronRight,
	Download,
	FileText,
	Folder,
	Home,
	Maximize2,
	MoreHorizontal,
	PanelRightClose,
	PanelRightOpen,
	Plus,
	Settings,
	Trash2,
	Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CanvasEditor } from "@/components/blocks/canvas-editor";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { FocusMode } from "@/components/blocks/focus-mode";
import { KeyboardShortcutsHelp } from "@/components/blocks/keyboard-shortcuts-help";
import { MinimalEditor } from "@/components/blocks/rich-editor/minimal-editor";
import { NovelEditor } from "@/components/blocks/rich-editor/novel-editor";
import { SaveStatusIndicator } from "@/components/blocks/save-status-indicator";
import { ThemeSelector } from "@/components/blocks/theme-selector";
import { WordCountBadge } from "@/components/blocks/word-count-badge";
import { ExportButton } from "@/components/export/export-button";
import { WritingStatsPanel } from "@/components/blocks/writing-stats-panel";
import { StoryRightSidebar } from "@/components/story-right-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
//
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import { useManualSave } from "@/hooks/use-manual-save";
import { useSettings } from "@/hooks/use-settings";
import {
	createBook,
	exportAll,
	importFromJson,
	readFileAsText,
	triggerDownload,
} from "@/services/projects";
import { useOutlineStore } from "@/stores/outline";
import { useSaveStore } from "@/stores/save";
import { type SelectionState, useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";
import { useWritingStore } from "@/stores/writing";
import { DrawingWorkspace } from "@/components/drawing/drawing-workspace";
import { useDrawingsByProject } from "@/services/drawings";
import type { DrawingInterface } from "@/db/schema";
//

import { countWords, extractTextFromSerialized } from "@/lib/statistics";
import { cn } from "@/lib/utils";

interface StoryWorkspaceProps {
	projects: ProjectInterface[];
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	activeProjectId?: string;
	onCreateProject?: () => void;
}

// 默认自动保存延迟（毫秒）
const DEFAULT_AUTO_SAVE_MS = 800;

export function StoryWorkspace({
	projects,
	chapters,
	scenes,
	activeProjectId,
	onCreateProject,
}: StoryWorkspaceProps) {
	const initialProjectId = activeProjectId ?? projects[0]?.id ?? null;
	const selectedProjectId = useSelectionStore(
		(s: SelectionState) => s.selectedProjectId,
	);
	const setSelectedProjectId = useSelectionStore(
		(s: SelectionState) => s.setSelectedProjectId,
	);
	const selectedChapterId = useSelectionStore(
		(s: SelectionState) => s.selectedChapterId,
	);
	const setSelectedChapterId = useSelectionStore(
		(s: SelectionState) => s.setSelectedChapterId,
	);
	const selectedSceneId = useSelectionStore(
		(s: SelectionState) => s.selectedSceneId,
	);
	const setSelectedSceneId = useSelectionStore(
		(s: SelectionState) => s.setSelectedSceneId,
	);

	// 获取自动保存设置
	const { autoSave, autoSaveInterval } = useSettings();
	// 计算自动保存延迟（设置中是秒，转换为毫秒）
	const autoSaveDelayMs = autoSave
		? Math.max(DEFAULT_AUTO_SAVE_MS, autoSaveInterval * 1000)
		: 0; // 禁用时设为0

	const [chapterEditId, setChapterEditId] = useState<string | null>(null);
	const [chapterEditTitle, setChapterEditTitle] = useState("");
	const [sceneEditId, setSceneEditId] = useState<string | null>(null);
	const [sceneEditTitle, setSceneEditTitle] = useState("");

	const [editorInitialState, setEditorInitialState] =
		useState<SerializedEditorState>();
	const [sceneWordCount, setSceneWordCount] = useState(0);
	const [isSaving, setIsSaving] = useState(false);
	const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
		"saved",
	);
	const confirm = useConfirm();

	// 专注模式和写作状态
	const focusMode = useWritingStore((s) => s.focusMode);
	const setFocusMode = useWritingStore((s) => s.setFocusMode);
	const typewriterMode = useWritingStore((s) => s.typewriterMode);
	const toggleTypewriterMode = useWritingStore((s) => s.toggleTypewriterMode);

	// UI 状态
	const rightSidebarOpen = useUIStore((s) => s.rightSidebarOpen);
	const toggleRightSidebar = useUIStore((s) => s.toggleRightSidebar);
	const rightPanelView = useUIStore((s) => s.rightPanelView);

	// 绘图状态
	const [selectedDrawing, setSelectedDrawing] = useState<DrawingInterface | null>(null);
	const drawings = useDrawingsByProject(selectedProjectId);

	// 保存状态管理
	const { markAsUnsaved, markAsSaved, markAsSaving } = useSaveStore();

	// 手动保存功能
	const { performManualSave } = useManualSave({
		sceneId: selectedSceneId,
		currentContent: editorInitialState || null,
		onSaveSuccess: () => {
			// 手动保存成功后的回调
		},
		onSaveError: (error) => {
			console.error("Manual save failed:", error);
		},
	});

	// bottom dock actions
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const handleExport = useCallback(async () => {
		try {
			const json = await exportAll();
			triggerDownload(
				`novel-editor-backup-${new Date().toISOString().slice(0, 10)}.json`,
				json,
			);
			toast.success("导出成功");
		} catch (err) {
			toast.error("导出失败");
		}
	}, []);

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleImportFile = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			try {
				const text = await readFileAsText(file);
				await importFromJson(text, { keepIds: false });
				toast.success("导入成功");
			} catch (err) {
				toast.error("导入失败");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[],
	);

	const handleQuickCreate = useCallback(async () => {
		const data = await openCreateBookDialog();
		if (!data) return;
		try {
			await createBook({
				title: data.title,
				author: data.author,
				description: data.description ?? "",
			});
			toast.success(`已创建书籍：${data.title}`);
		} catch (e) {
			// createBook 内部包含失败处理
		}
	}, []);

	const handleDeleteAllBooks = useCallback(async () => {
		const ok = await confirm({
			title: "确认删除所有书籍？",
			description: "该操作不可恢复，将清空书籍、章节、场景与附件。",
			confirmText: "删除",
			cancelText: "取消",
		});
		if (!ok) return;
		try {
			await Promise.all([
				db.attachments.clear(),
				db.roles.clear(),
				db.scenes.clear(),
				db.chapters.clear(),
				db.projects.clear(),
			]);
			toast.success("已删除所有书籍");
		} catch (err) {
			toast.error("删除失败，请重试");
		}
	}, []);

	// sync props data into outline store for global consumption
	const setProjectsStore = useOutlineStore((s) => s.setProjects);
	const setChaptersStore = useOutlineStore((s) => s.setChapters);
	const setScenesStore = useOutlineStore((s) => s.setScenes);
	useEffect(() => {
		setProjectsStore(projects);
	}, [projects, setProjectsStore]);
	useEffect(() => {
		setChaptersStore(chapters);
	}, [chapters, setChaptersStore]);
	useEffect(() => {
		setScenesStore(scenes);
	}, [scenes, setScenesStore]);

	// 快捷键: 专注模式 + 打字机模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// 忽略输入框中的快捷键
			const target = e.target as HTMLElement;
			if (
				target.isContentEditable ||
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA"
			) {
				return;
			}

			// F11 进入专注模式
			if (e.key === "F11" && selectedSceneId) {
				e.preventDefault();
				setFocusMode(true);
			}
			// Ctrl/Cmd + Enter 进入专注模式
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && selectedSceneId) {
				e.preventDefault();
				setFocusMode(true);
			}
			// Ctrl/Cmd + T 切换打字机模式
			if ((e.ctrlKey || e.metaKey) && e.key === "t") {
				e.preventDefault();
				toggleTypewriterMode();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedSceneId, setFocusMode, toggleTypewriterMode]);

	// keep project selection in sync with external changes
	useEffect(() => {
		if (!selectedProjectId && initialProjectId) {
			setSelectedProjectId(initialProjectId);
		}
		if (activeProjectId && activeProjectId !== selectedProjectId) {
			setSelectedProjectId(activeProjectId);
		}
	}, [
		activeProjectId,
		selectedProjectId,
		initialProjectId,
		setSelectedProjectId,
	]);

	useEffect(() => {
		if (!selectedProjectId && projects.length) {
			setSelectedProjectId(projects[0].id);
		}
		if (
			selectedProjectId &&
			!projects.some((project) => project.id === selectedProjectId) &&
			projects.length
		) {
			setSelectedProjectId(projects[0].id);
		}
	}, [projects, selectedProjectId, setSelectedProjectId]);

	const projectChapters = useMemo(
		() =>
			chapters
				.filter((chapter) => chapter.project === selectedProjectId)
				.sort((a, b) => a.order - b.order),
		[chapters, selectedProjectId],
	);

	useEffect(() => {
		if (!projectChapters.length) {
			setSelectedChapterId(null);
			return;
		}
		if (
			!selectedChapterId ||
			!projectChapters.some((chapter) => chapter.id === selectedChapterId)
		) {
			setSelectedChapterId(projectChapters[0].id);
		}
	}, [projectChapters, selectedChapterId, setSelectedChapterId]);

	const chapterScenes = useMemo(
		() =>
			scenes
				.filter((scene) => scene.chapter === selectedChapterId)
				.sort((a, b) => a.order - b.order),
		[scenes, selectedChapterId],
	);

	useEffect(() => {
		if (!chapterScenes.length) {
			setSelectedSceneId(null);
			return;
		}
		if (
			!selectedSceneId ||
			!chapterScenes.some((scene) => scene.id === selectedSceneId)
		) {
			setSelectedSceneId(chapterScenes[0].id);
		}
	}, [chapterScenes, selectedSceneId, setSelectedSceneId]);

	const activeScene = useMemo(
		() => chapterScenes.find((scene) => scene.id === selectedSceneId) ?? null,
		[chapterScenes, selectedSceneId],
	);

	useEffect(() => {
		if (!activeScene) {
			setEditorInitialState(undefined);
			setSceneWordCount(0);
			return;
		}
		const initial = parseSceneContent(activeScene);
		setEditorInitialState(initial);
		const text = extractTextFromSerialized(initial);
		setSceneWordCount(countWords(text));
	}, [activeScene?.id]);

	// 使用 ref 存储 debounce 函数，避免依赖变化时重新创建
	const debouncedSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
	const saveTimeoutRef = useRef<number | null>(null);

	// 创建保存函数
	const performSave = useCallback(
		async (sceneId: string, serialized: SerializedEditorState) => {
			if (!autoSave) return;

			setIsSaving(true);
			markAsSaving();

			// 清除之前的超时
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}

			// 设置10秒超时
			saveTimeoutRef.current = window.setTimeout(() => {
				setSaveStatus("error");
				setIsSaving(false);
				toast.error("保存超时，请检查网络连接");
			}, 10000);

			try {
				await db.updateScene(sceneId, {
					content: JSON.stringify(serialized),
					lastEdit: new Date().toISOString(),
				});
				clearTimeout(saveTimeoutRef.current);
				setSaveStatus("saved");
				markAsSaved();

				// 2秒后隐藏"已保存"状态
				setTimeout(() => {
					if (saveStatus === "saved") {
						setSaveStatus("saved");
					}
				}, 2000);
			} catch (error) {
				clearTimeout(saveTimeoutRef.current);
				console.error("Failed to save scene:", error);
				setSaveStatus("error");
				toast.error("保存场景内容失败");
			} finally {
				setIsSaving(false);
			}
		},
		[autoSave, markAsSaving, markAsSaved],
	);

	// 当设置变化时，重新创建 debounce 函数
	useEffect(() => {
		if (autoSaveDelayMs > 0) {
			debouncedSaveRef.current = debounce(performSave, autoSaveDelayMs);
		}

		return () => {
			// 组件卸载或设置变化时，立即执行待处理的保存
			if (debouncedSaveRef.current) {
				// @ts-expect-error - lodash debounce 有 flush 方法但类型定义不完整
				debouncedSaveRef.current.flush?.();
				debouncedSaveRef.current.cancel();
			}
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, [autoSaveDelayMs, performSave]);

	// 场景切换前强制保存
	useEffect(() => {
		return () => {
			if (debouncedSaveRef.current) {
				// @ts-expect-error
				debouncedSaveRef.current.flush?.();
			}
		};
	}, [activeScene?.id]);

	// 页面关闭前保存
	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (debouncedSaveRef.current) {
				// @ts-expect-error
				debouncedSaveRef.current.flush?.();
			}

			if (saveStatus === "saving") {
				e.preventDefault();
				e.returnValue = "有未保存的内容，确定要离开吗？";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [saveStatus]);

	const handleSerializedChange = useCallback(
		(serialized: SerializedEditorState) => {
			if (!activeScene || !debouncedSaveRef.current) return;

			const text = extractTextFromSerialized(serialized);
			setSceneWordCount(countWords(text));

			// 标记为有未保存的更改
			markAsUnsaved();

			// 使用 ref 中的 debounce 函数进行自动保存
			debouncedSaveRef.current(activeScene.id, serialized);
		},
		[activeScene, markAsUnsaved],
	);

	const projectStats = useMemo(() => {
		const targetProject = projects.find(
			(project) => project.id === selectedProjectId,
		);
		if (!targetProject) {
			return {
				chapterCount: 0,
				sceneCount: 0,
				wordCount: 0,
				lastEdited: undefined as string | undefined,
				streak: 0,
			};
		}

		const relatedScenes = scenes
			.filter((scene) => scene.project === targetProject.id)
			.sort(
				(a, b) =>
					new Date(b.lastEdit).getTime() - new Date(a.lastEdit).getTime(),
			);

		return {
			chapterCount: projectChapters.length,
			sceneCount: relatedScenes.length,
			wordCount: relatedScenes.reduce(
				(sum, scene) => sum + countSceneWords(scene),
				0,
			),
			lastEdited: relatedScenes[0]?.lastEdit,
			streak: computeStreak(relatedScenes.map((scene) => scene.lastEdit)),
		};
	}, [projectChapters, projects, scenes, selectedProjectId]);

	const handleAddChapter = useCallback(async () => {
		if (!selectedProjectId) return;
		try {
			const nextOrder =
				projectChapters.length > 0
					? Math.max(...projectChapters.map((chapter) => chapter.order)) + 1
					: 1;
			const newChapter = await db.addChapter({
				project: selectedProjectId,
				title: `Chapter ${nextOrder}`,
				order: nextOrder,
				open: false,
				showEdit: false,
			});
			setSelectedChapterId(newChapter.id);
			toast.success("章节已创建");
		} catch (error) {
			loggerError("Failed to add chapter", error);
			toast.error("创建章节失败");
		}
	}, [projectChapters, selectedProjectId, setSelectedChapterId]);

	const handleDeleteChapter = useCallback(
		async (chapterId: string) => {
			const target = projectChapters.find(
				(chapter) => chapter.id === chapterId,
			);
			if (!target) return;
			const ok = await confirm({
				title: "删除章节？",
				description: `确认删除章节 “${target.title}” 吗？该操作不可撤销。`,
				confirmText: "删除",
				cancelText: "取消",
			});
			if (!ok) return;
			try {
				await db.deleteChapter(chapterId);
				toast.success("章节已删除");
			} catch (error) {
				loggerError("Failed to delete chapter", error);
				toast.error("删除章节失败");
			}
		},
		[projectChapters],
	);

	const handleChapterReorder = useCallback(
		async (chapterId: string, direction: "up" | "down") => {
			const sorted = [...projectChapters];
			const index = sorted.findIndex((chapter) => chapter.id === chapterId);
			if (index === -1) return;
			const swapIndex = direction === "up" ? index - 1 : index + 1;
			if (swapIndex < 0 || swapIndex >= sorted.length) return;

			const current = sorted[index];
			const target = sorted[swapIndex];

			try {
				await Promise.all([
					db.updateChapter(current.id, { order: target.order }),
					db.updateChapter(target.id, { order: current.order }),
				]);
				toast.success("章节顺序已更新");
			} catch (error) {
				loggerError("Failed to reorder chapter", error);
				toast.error("更新章节顺序失败");
			}
		},
		[projectChapters],
	);

	const commitChapterRename = useCallback(async () => {
		if (!chapterEditId) return;
		const title = chapterEditTitle.trim();
		if (!title) {
			toast.error("章节标题不能为空");
			return;
		}
		try {
			await db.updateChapter(chapterEditId, { title });
			toast.success("章节已重命名");
			setChapterEditId(null);
			setChapterEditTitle("");
		} catch (error) {
			loggerError("Failed to rename chapter", error);
			toast.error("章节重命名失败");
		}
	}, [chapterEditId, chapterEditTitle]);

	const handleAddScene = useCallback(async () => {
		if (!selectedChapterId || !selectedProjectId) {
			toast.error("请先选择章节");
			return;
		}
		try {
			const nextOrder =
				chapterScenes.length > 0
					? Math.max(...chapterScenes.map((scene) => scene.order)) + 1
					: 1;
			const newScene = await db.addScene({
				project: selectedProjectId,
				chapter: selectedChapterId,
				title: `Scene ${nextOrder}`,
				order: nextOrder,
				content: JSON.stringify(createLexicalState()),
				showEdit: false,
			});
			setSelectedSceneId(newScene.id);
			toast.success("场景已创建");
		} catch (error) {
			loggerError("Failed to add scene", error);
			toast.error("创建场景失败");
		}
	}, [chapterScenes, selectedChapterId, selectedProjectId, setSelectedSceneId]);

	// 创建绘图场景
	const handleAddCanvasScene = useCallback(async () => {
		if (!selectedChapterId || !selectedProjectId) {
			toast.error("请先选择章节");
			return;
		}
		try {
			const nextOrder =
				chapterScenes.length > 0
					? Math.max(...chapterScenes.map((scene) => scene.order)) + 1
					: 1;
			// 生成文件路径
			const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
			const filePath = `canvas/${selectedProjectId}/${timestamp}.excalidraw`;

			const newScene = await db.addScene({
				project: selectedProjectId,
				chapter: selectedChapterId,
				title: `Canvas ${nextOrder}`,
				order: nextOrder,
				content: JSON.stringify({ elements: [], appState: {}, files: {} }),
				showEdit: false,
				type: "canvas",
				filePath,
			});
			setSelectedSceneId(newScene.id);
			toast.success("绘图场景已创建");
		} catch (error) {
			loggerError("Failed to add canvas scene", error);
			toast.error("创建绘图场景失败");
		}
	}, [chapterScenes, selectedChapterId, selectedProjectId, setSelectedSceneId]);

	// 保存绘图数据
	const handleCanvasSave = useCallback(
		async (sceneId: string, data: string) => {
			try {
				await db.updateScene(sceneId, { content: data });
				setSaveStatus("saved");
			} catch (error) {
				loggerError("Failed to save canvas", error);
				setSaveStatus("error");
				toast.error("保存绘图失败");
			}
		},
		[],
	);

	const handleDeleteScene = useCallback(
		async (sceneId: string) => {
			const target = chapterScenes.find((scene) => scene.id === sceneId);
			if (!target) return;
			const ok = await confirm({
				title: "删除场景？",
				description: `确认删除场景 “${target.title}” 吗？该操作不可撤销。`,
				confirmText: "删除",
				cancelText: "取消",
			});
			if (!ok) return;
			try {
				await db.deleteScene(sceneId);
				toast.success("场景已删除");
			} catch (error) {
				loggerError("Failed to delete scene", error);
				toast.error("删除场景失败");
			}
		},
		[chapterScenes],
	);

	const handleSceneReorder = useCallback(
		async (sceneId: string, direction: "up" | "down") => {
			const sorted = [...chapterScenes];
			const index = sorted.findIndex((scene) => scene.id === sceneId);
			if (index === -1) return;
			const swapIndex = direction === "up" ? index - 1 : index + 1;
			if (swapIndex < 0 || swapIndex >= sorted.length) return;

			const current = sorted[index];
			const target = sorted[swapIndex];

			try {
				await Promise.all([
					db.updateScene(current.id, { order: target.order }),
					db.updateScene(target.id, { order: current.order }),
				]);
				toast.success("场景顺序已更新");
			} catch (error) {
				loggerError("Failed to reorder scene", error);
				toast.error("更新场景顺序失败");
			}
		},
		[chapterScenes],
	);

	const commitSceneRename = useCallback(async () => {
		if (!sceneEditId) return;
		const title = sceneEditTitle.trim();
		if (!title) {
			toast.error("场景标题不能为空");
			return;
		}
		try {
			await db.updateScene(sceneEditId, { title });
			toast.success("场景已重命名");
			setSceneEditId(null);
			setSceneEditTitle("");
		} catch (error) {
			loggerError("Failed to rename scene", error);
			toast.error("场景重命名失败");
		}
	}, [sceneEditId, sceneEditTitle]);

	// Current Context Data for Breadcrumb
	const currentProject = useMemo(
		() => projects.find((p) => p.id === selectedProjectId),
		[projects, selectedProjectId],
	);
	const currentChapter = useMemo(
		() => chapters.find((c) => c.id === selectedChapterId),
		[chapters, selectedChapterId],
	);
	const currentScene = useMemo(
		() => scenes.find((s) => s.id === selectedSceneId),
		[scenes, selectedSceneId],
	);

	// 专注模式渲染 - 使用极简编辑器
	if (focusMode && editorInitialState && selectedSceneId) {
		return (
			<TooltipProvider>
				<FocusMode
					wordCount={sceneWordCount}
					sceneTitle={currentScene?.title}
					chapterTitle={currentChapter?.title}
					onExit={() => setFocusMode(false)}
				>
					<MinimalEditor
						key={`focus-${selectedSceneId}`}
						editorSerializedState={editorInitialState}
						onSerializedChange={handleSerializedChange}
						placeholder="专注写作..."
					/>
				</FocusMode>
			</TooltipProvider>
		);
	}

	return (
		<TooltipProvider>
			<div className="flex h-screen bg-background text-foreground">
				<main
					className={cn(
						"flex-1 flex flex-col overflow-hidden relative transition-all duration-300",
						rightSidebarOpen ? "mr-0" : "mr-0",
					)}
				>
					{/* Top Header / Breadcrumb - 增强版 */}
					<header className="header-bar h-11 flex items-center px-6 bg-background z-10 shrink-0">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							{/* 项目名 */}
							<span className="text-foreground font-medium">
								{currentProject?.title || "未选择项目"}
							</span>

							{/* 章节选择器 */}
							{currentChapter && (
								<>
									<span className="text-muted-foreground/40">/</span>
									<Popover>
										<PopoverTrigger asChild>
											<button className="hover:text-foreground hover:bg-muted/50 px-2 py-0.5 rounded transition-colors">
												{currentChapter.title}
											</button>
										</PopoverTrigger>
										<PopoverContent className="w-64 p-1" align="start">
											<div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
												切换章节
											</div>
											<div className="max-h-64 overflow-y-auto">
												{projectChapters.map((ch) => (
													<button
														key={ch.id}
														onClick={() => setSelectedChapterId(ch.id)}
														className={cn(
															"w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left",
															ch.id === selectedChapterId &&
																"bg-accent font-medium",
														)}
													>
														<Folder className="size-3.5 text-blue-500" />
														<span className="flex-1 truncate">{ch.title}</span>
													</button>
												))}
											</div>
										</PopoverContent>
									</Popover>
								</>
							)}

							{/* 场景选择器 */}
							{currentScene && (
								<>
									<span className="text-muted-foreground/40">/</span>
									<Popover>
										<PopoverTrigger asChild>
											<button className="text-foreground hover:bg-muted/50 px-2 py-0.5 rounded transition-colors">
												{currentScene.title}
											</button>
										</PopoverTrigger>
										<PopoverContent className="w-64 p-1" align="start">
											<div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
												切换场景
											</div>
											<div className="max-h-64 overflow-y-auto">
												{chapterScenes.map((sc) => (
													<button
														key={sc.id}
														onClick={() => setSelectedSceneId(sc.id)}
														className={cn(
															"w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent text-left",
															sc.id === selectedSceneId &&
																"bg-accent font-medium",
														)}
													>
														<FileText className="size-3.5" />
														<span className="flex-1 truncate">{sc.title}</span>
													</button>
												))}
											</div>
										</PopoverContent>
									</Popover>
								</>
							)}
						</div>

						<div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
							{/* 场景导航 */}
							{chapterScenes.length > 1 && selectedSceneId && (
								<div className="flex items-center gap-1">
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="size-7"
												disabled={
													chapterScenes.findIndex(
														(s) => s.id === selectedSceneId,
													) === 0
												}
												onClick={() => {
													const currentIndex = chapterScenes.findIndex(
														(s) => s.id === selectedSceneId,
													);
													if (currentIndex > 0) {
														setSelectedSceneId(
															chapterScenes[currentIndex - 1].id,
														);
													}
												}}
											>
												<ChevronRight className="size-3.5 rotate-180" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>上一个场景</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="size-7"
												disabled={
													chapterScenes.findIndex(
														(s) => s.id === selectedSceneId,
													) ===
													chapterScenes.length - 1
												}
												onClick={() => {
													const currentIndex = chapterScenes.findIndex(
														(s) => s.id === selectedSceneId,
													);
													if (currentIndex < chapterScenes.length - 1) {
														setSelectedSceneId(
															chapterScenes[currentIndex + 1].id,
														);
													}
												}}
											>
												<ChevronRight className="size-3.5" />
											</Button>
										</TooltipTrigger>
										<TooltipContent>下一个场景</TooltipContent>
									</Tooltip>
								</div>
							)}

							{/* 保存状态指示器 */}
							<SaveStatusIndicator />

							{/* 侧边栏切换 */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={toggleRightSidebar}
									>
										{rightSidebarOpen ? (
											<PanelRightClose className="size-3.5" />
										) : (
											<PanelRightOpen className="size-3.5" />
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									{rightSidebarOpen ? "隐藏" : "显示"}侧边栏
								</TooltipContent>
							</Tooltip>

							{/* 打字机模式切换 */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant={typewriterMode ? "secondary" : "ghost"}
										size="icon"
										className="size-7"
										onClick={toggleTypewriterMode}
									>
										<AlignCenter className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>打字机模式</TooltipContent>
							</Tooltip>

							{/* 专注模式按钮 */}
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="size-7"
										onClick={() => setFocusMode(true)}
										disabled={!selectedSceneId}
										data-tour="focus-mode"
									>
										<Maximize2 className="size-3.5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>专注模式 (F11)</TooltipContent>
							</Tooltip>

							{/* 主题选择器 */}
							<ThemeSelector />

							{/* 导出按钮 */}
							{currentProject && (
								<ExportButton
									projectId={currentProject.id}
									projectTitle={currentProject.title}
									variant="ghost"
									size="sm"
									showQuickExport={false}
								/>
							)}

							{/* 快捷键帮助 */}
							<div data-tour="command-palette">
								<KeyboardShortcutsHelp />
							</div>
						</div>
					</header>

					<div className="flex-1 overflow-hidden relative w-full mx-auto">
						<div className="h-full w-full overflow-y-auto scroll-smooth scrollbar-thin">
							{/* Typora-style Editor Container */}
							{/* 根据右侧面板视图决定显示内容 */}
							{rightPanelView === "drawings" && selectedDrawing ? (
								/* 绘图工作区 */
								<div className="h-full flex items-center justify-center p-8">
									<DrawingWorkspace
										drawing={selectedDrawing}
										onDelete={(id) => {
											setSelectedDrawing(null);
										}}
										onRename={(id, newName) => {
											setSelectedDrawing(prev => prev ? { ...prev, name: newName } : null);
										}}
										className="max-w-5xl w-full"
									/>
								</div>
							) : rightPanelView === "drawings" ? (
								/* 绘图视图但未选择绘图 */
								<div className="flex h-full min-h-[400px] items-center justify-center text-sm text-muted-foreground flex-col gap-2">
									<div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
										<FileText className="size-6 text-muted-foreground/40" />
									</div>
									<p className="text-muted-foreground/60">
										从右侧边栏选择一个绘图开始编辑
									</p>
								</div>
							) : (
								/* 文本编辑区域 */
								<article className="editor-container min-h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto px-16 py-12">
									{editorInitialState && selectedSceneId ? (
										<div className="min-h-[600px]">
											<MinimalEditor
												key={selectedSceneId}
												editorSerializedState={editorInitialState}
												onSerializedChange={handleSerializedChange}
												placeholder="开始写作..."
											/>
										</div>
									) : (
										<div className="flex h-full min-h-[400px] items-center justify-center text-sm text-muted-foreground flex-col gap-2">
											<div className="size-12 rounded-full bg-muted/30 flex items-center justify-center">
												<FileText className="size-6 text-muted-foreground/40" />
											</div>
											<p className="text-muted-foreground/60">
												选择一个场景开始写作
											</p>
										</div>
									)}
								</article>
							)}

							{/* 字数统计浮动徽章 */}
							<WordCountBadge
								wordCount={sceneWordCount}
								show={!!selectedSceneId}
							/>
						</div>
					</div>

					{/* 简洁状态栏 - Typora 风格 */}
					<footer className="h-8 border-t border-border/30 bg-background flex items-center justify-between px-4 shrink-0 z-20">
						{/* 左侧：基本字数 */}
						<div className="flex items-center gap-3 text-xs text-muted-foreground">
							<span>
								场景{" "}
								<strong className="text-foreground font-medium tabular-nums">
									{sceneWordCount.toLocaleString()}
								</strong>
							</span>
							<span className="w-px h-3 bg-border/50" />
							<span>
								全书{" "}
								<strong className="text-foreground font-medium tabular-nums">
									{projectStats.wordCount.toLocaleString()}
								</strong>
							</span>
						</div>

						{/* 中间：写作统计面板 */}
						<WritingStatsPanel currentWordCount={sceneWordCount} />

						{/* 右侧：最后编辑时间 */}
						<div className="text-xs text-muted-foreground">
							{projectStats.lastEdited && (
								<span>{formatRelativeTime(projectStats.lastEdited)}</span>
							)}
						</div>
					</footer>
				</main>
				{/* Right-side Sidebar for Chapters & Scenes */}
				{rightSidebarOpen && (
					<StoryRightSidebar 
						onSelectDrawing={setSelectedDrawing}
						selectedDrawing={selectedDrawing}
					/>
				)}
			</div>
		</TooltipProvider>
	);
}

function loggerError(message: string, error: unknown) {
	if (error instanceof Error) {
		console.error(message, error);
	} else {
		console.error(message);
	}
}

function parseSceneContent(
	scene: SceneInterface | null,
): SerializedEditorState {
	if (!scene || !scene.content) {
		return createLexicalState();
	}

	const raw = scene.content;
	if (typeof raw === "object" && raw !== null && "root" in raw) {
		return raw as SerializedEditorState;
	}

	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (!trimmed) {
			return createLexicalState();
		}
		try {
			const parsed = JSON.parse(trimmed);
			if (parsed && typeof parsed === "object" && "root" in parsed) {
				return parsed as SerializedEditorState;
			}
		} catch {
			return createLexicalState(trimmed);
		}
		return createLexicalState(trimmed);
	}

	return createLexicalState(
		typeof raw === "string" ? raw : JSON.stringify(raw ?? ""),
	);
}

function createLexicalState(text = ""): SerializedEditorState {
	const paragraphChildren =
		text.length > 0
			? [
					{
						detail: 0,
						format: 0,
						mode: "normal",
						style: "",
						text,
						type: "text",
						version: 1,
					},
				]
			: [];

	return {
		root: {
			children: [
				{
					children: paragraphChildren,
					direction: "ltr",
					format: "",
					indent: 0,
					type: "paragraph",
					version: 1,
				},
			],
			direction: "ltr",
			format: "",
			indent: 0,
			type: "root",
			version: 1,
		},
	} as unknown as SerializedEditorState;
}

function countSceneWords(scene: SceneInterface): number {
	try {
		const state = parseSceneContent(scene);
		const text = extractTextFromSerialized(state);
		return countWords(text);
	} catch {
		if (typeof scene.content === "string") {
			return countWords(scene.content);
		}
		return 0;
	}
}

function computeStreak(timestamps: string[]): number {
	if (!timestamps.length) return 0;
	const uniqueDays = new Set(
		timestamps
			.map((iso) => {
				const date = new Date(iso);
				return Number.isNaN(date.getTime())
					? null
					: date.toISOString().slice(0, 10);
			})
			.filter(Boolean) as string[],
	);

	let streak = 0;
	const today = new Date();
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const target = new Date(today);
		target.setDate(today.getDate() - streak);
		const key = target.toISOString().slice(0, 10);
		if (uniqueDays.has(key)) {
			streak += 1;
		} else {
			break;
		}
	}
	return streak;
}

function formatRelativeTime(iso?: string): string {
	if (!iso) return "No activity";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "Unknown";
	const diffMs = Date.now() - date.getTime();
	if (diffMs < 0) return "Just now";

	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;
	const month = 30 * day;
	const year = 365 * day;

	if (diffMs < minute) return "Just now";
	if (diffMs < hour) {
		const value = Math.round(diffMs / minute);
		return `${value} minute${value > 1 ? "s" : ""} ago`;
	}
	if (diffMs < day) {
		const value = Math.round(diffMs / hour);
		return `${value} hour${value > 1 ? "s" : ""} ago`;
	}
	if (diffMs < month) {
		const value = Math.round(diffMs / day);
		return `${value} day${value > 1 ? "s" : ""} ago`;
	}
	if (diffMs < year) {
		const value = Math.round(diffMs / month);
		return `${value} month${value > 1 ? "s" : ""} ago`;
	}
	const value = Math.round(diffMs / year);
	return `${value} year${value > 1 ? "s" : ""} ago`;
}

function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number,
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	const debounced = (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};

	debounced.cancel = () => {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}
	};

	return debounced;
}
