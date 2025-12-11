import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	FileText,
	Folder,
	FolderPlus,
	ListTree,
	MoreHorizontal,
	Pencil,
	PenTool,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import logger from "@/log";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	Sidebar as UISidebar,
} from "@/components/ui/sidebar";
import { useSceneCreation } from "@/hooks/use-scene-creation";
import { cn } from "@/lib/utils";
import {
	createChapter,
	deleteChapter,
	moveChapter,
	renameChapter,
	useChaptersByProject,
} from "@/services/chapters";
import { useAllProjects } from "@/services/projects";
import {
	createWikiEntry,
	deleteWikiEntry,
	updateWikiEntry,
	useWikiEntriesByProject,
} from "@/services/wiki";
import {
	deleteScene,
	moveScene,
	renameScene,
	useScenesByChapter,
	useScenesByProject,
} from "@/services/scenes";

import { useSceneCreationStore } from "@/stores/scene-creation";
import { type SelectionState, useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";
import { DrawingList } from "./drawing/drawing-list";
import type { DrawingInterface } from "@/db/schema";

interface StoryRightSidebarProps {
	onSelectDrawing?: (drawing: DrawingInterface | null) => void;
	selectedDrawing?: DrawingInterface | null;
}

export function StoryRightSidebar({ 
	onSelectDrawing, 
	selectedDrawing 
}: StoryRightSidebarProps = {}) {
	const confirm = useConfirm();
	const rightPanelView = useUIStore((s) => s.rightPanelView);
	const setRightPanelView = useUIStore((s) => s.setRightPanelView);
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

	const projects = useAllProjects();
	const projectChapters = useChaptersByProject(selectedProjectId);
	const scenesOfProject = useScenesByProject(selectedProjectId);
	const projectWiki = useWikiEntriesByProject(selectedProjectId ?? null);


	const [searchQuery, setSearchQuery] = useState("");
	const [expandedChapters, setExpandedChapters] = useState<
		Record<string, boolean>
	>({});
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});

	// Scene creation management
	const { createTextScene, createCanvasScene: createCanvasSceneHandler } =
		useSceneCreation({
			selectedProjectId,
			scenesOfProject,
			onSceneCreated: (sceneId, chapterId) => {
				setSelectedSceneId(sceneId);
				setSelectedChapterId(chapterId);
				if (!expandedChapters[chapterId]) {
					toggleChapter(chapterId);
				}
				// Delay renaming to ensure UI has updated
				setTimeout(() => setRenamingId(sceneId), 150);
			},
			onError: (error, chapterId) => {
				logger.error(`Scene creation error for chapter ${chapterId}:`, error);
			},
		});

	// Get reactive creation states for all chapters
	const creationStates = useSceneCreationStore((state) => state.creationStates);

	// Drag and Drop State
	const [dragState, setDragState] = useState<{
		draggedId: string;
		draggedType: "chapter" | "scene";
		targetId: string | null;
		position: "before" | "after" | "inside" | null;
	}>({ draggedId: "", draggedType: "chapter", targetId: null, position: null });

	// Ensure project/chapter selection
	useEffect(() => {
		if (!selectedProjectId && projects.length > 0) {
			setSelectedProjectId(projects[0].id);
		}
	}, [projects, selectedProjectId, setSelectedProjectId]);

	useEffect(() => {
		if (selectedProjectId && !selectedChapterId && projectChapters.length > 0) {
			setSelectedChapterId(projectChapters[0].id);
			setExpandedChapters((prev) => ({
				...prev,
				[projectChapters[0].id]: true,
			}));
		}
	}, [
		selectedProjectId,
		selectedChapterId,
		projectChapters,
		setSelectedChapterId,
	]);

	// Expand/Collapse
	const toggleChapter = (id: string) => {
		setExpandedChapters((prev) => ({ ...prev, [id]: !prev[id] }));
	};

	// --- Actions ---

	const handleAddChapter = useCallback(async () => {
		if (!selectedProjectId) return;
		const nextOrder = projectChapters.length
			? Math.max(...projectChapters.map((c) => c.order)) + 1
			: 1;
		try {
			const newChapter = await createChapter({
				projectId: selectedProjectId,
				title: `Chapter ${nextOrder}`,
				order: nextOrder,
			});
			setSelectedChapterId(newChapter.id);
			setExpandedChapters((prev) => ({ ...prev, [newChapter.id]: true }));
			toast.success("Chapter created");
			// Auto start renaming
			setTimeout(() => setRenamingId(newChapter.id), 100);
		} catch {
			toast.error("Failed to create chapter");
		}
	}, [selectedProjectId, projectChapters, setSelectedChapterId]);

	const handleAddScene = useCallback(
		async (chapterId: string) => {
			logger.debug(`[UI] Add Scene clicked for chapter:`, chapterId);
			// Close the popover first
			setOpenPopovers((prev) => ({ ...prev, [chapterId]: false }));
			await createTextScene(chapterId);
		},
		[createTextScene],
	);

	// 创建绘图场景
	const handleAddCanvasScene = useCallback(
		async (chapterId: string) => {
			logger.debug(`[UI] Add Canvas Scene clicked for chapter:`, chapterId);
			// Close the popover first
			setOpenPopovers((prev) => ({ ...prev, [chapterId]: false }));
			await createCanvasSceneHandler(chapterId);
		},
		[createCanvasSceneHandler],
	);

	const handleAddWikiEntry = useCallback(async () => {
		if (!selectedProjectId) return;
		try {
			const newEntry = await createWikiEntry({
				projectId: selectedProjectId,
				name: "新条目",
			});
			toast.success("条目已创建");
			setTimeout(() => setRenamingId(newEntry.id), 100);
		} catch {
			toast.error("创建失败");
		}
	}, [selectedProjectId]);

	const handleRenameWiki = useCallback(async (id: string, newName: string) => {
		if (!newName.trim()) return;
		try {
			await updateWikiEntry(id, { name: newName });
		} catch {
			toast.error("重命名失败");
		}
		setRenamingId(null);
	}, []);

	const handleDeleteWiki = useCallback(async (id: string, name: string) => {
		const ok = await confirm({
			title: "删除条目？",
			description: `确定要删除 "${name}" 吗？此操作无法撤销。`,
			confirmText: "删除",
			cancelText: "取消",
		});
		if (!ok) return;
		try {
			await deleteWikiEntry(id);
			toast.success("条目已删除");
		} catch {
			toast.error("删除失败");
		}
	}, [confirm]);



	const handleAddDrawing = useCallback(async () => {
		if (!selectedProjectId) return;
		try {
			const { createDrawing } = await import("@/services/drawings");
			const newDrawing = await createDrawing({
				projectId: selectedProjectId,
				name: "New Drawing",
			});
			toast.success("Drawing created");
		} catch {
			toast.error("Failed to create drawing");
		}
	}, [selectedProjectId]);

	const handleRename = async (
		id: string,
		type: "chapter" | "scene",
		newName: string,
	) => {
		if (!newName.trim()) return;
		try {
			if (type === "chapter") await renameChapter(id, newName);
			else if (type === "scene") await renameScene(id, newName);
		} catch {
			toast.error("Failed to rename");
		}
		setRenamingId(null);
	};

	const handleDelete = async (
		id: string,
		type: "chapter" | "scene",
		title: string,
	) => {
		const ok = await confirm({
			title: `Delete ${type}?`,
			description: `Are you sure you want to delete "${title}"? This cannot be undone.`,
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;

		try {
			if (type === "chapter") await deleteChapter(id);
			else if (type === "scene") await deleteScene(id);
			toast.success(`${type} deleted`);
		} catch {
			toast.error("Failed to delete");
		}
	};

	// --- Keyboard Shortcuts ---
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only trigger if we have a selection and no inputs are focused
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA"
			)
				return;

			if (e.key === "F2") {
				// Ideally we'd know exactly what is selected.
				// For now, simplistic support for Scene/Chapter if they are selected.
				// Roles/World don't have a "selected ID" in store (yet), but maybe we can infer or just skip.
				if (rightPanelView === "outline" || !rightPanelView) {
					if (selectedSceneId) setRenamingId(selectedSceneId);
					else if (selectedChapterId) setRenamingId(selectedChapterId);
				}
			}
			if (e.key === "Delete") {
				if (rightPanelView === "outline" || !rightPanelView) {
					if (selectedSceneId) {
						const s = scenesOfProject.find((s) => s.id === selectedSceneId);
						if (s) handleDelete(s.id, "scene", s.title);
					} else if (selectedChapterId) {
						const c = projectChapters.find((ch) => ch.id === selectedChapterId);
						if (c) handleDelete(c.id, "chapter", c.title);
					}
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		selectedSceneId,
		selectedChapterId,
		rightPanelView,
		scenesOfProject,
		projectChapters,
	]);

	// --- Drag and Drop Logic ---

	const handleDragStart = (
		e: React.DragEvent,
		id: string,
		type: "chapter" | "scene",
	) => {
		e.dataTransfer.setData("text/plain", id);
		e.dataTransfer.effectAllowed = "move";
		setDragState({
			draggedId: id,
			draggedType: type,
			targetId: null,
			position: null,
		});
	};

	const handleDragOver = (
		e: React.DragEvent,
		id: string,
		type: "chapter" | "scene",
	) => {
		e.preventDefault();
		e.stopPropagation();

		if (dragState.draggedId === id) return; // Can't drag onto self
		// Can't drop chapter into scene
		if (dragState.draggedType === "chapter" && type === "scene") return;

		const rect = e.currentTarget.getBoundingClientRect();
		const y = e.clientY - rect.top;
		const height = rect.height;

		let pos: "before" | "after" | "inside" = "inside";

		// Logic for drop position
		if (type === "scene") {
			// Scene target: only before/after
			if (y < height / 2) pos = "before";
			else pos = "after";
		} else {
			// Chapter target
			if (dragState.draggedType === "scene") {
				// Dragging scene to chapter -> always inside
				pos = "inside";
			} else {
				// Dragging chapter to chapter
				if (y < height * 0.25) pos = "before";
				else if (y > height * 0.75) pos = "after";
				else pos = "inside";
				if (pos === "inside") pos = "after"; // Default to after if middle
			}
		}

		setDragState((prev) => ({ ...prev, targetId: id, position: pos }));
	};

	const handleDrop = async (
		e: React.DragEvent,
		targetId: string,
		targetType: "chapter" | "scene",
	) => {
		e.preventDefault();
		e.stopPropagation();
		const { draggedId, draggedType, position } = dragState;

		setDragState({
			draggedId: "",
			draggedType: "chapter",
			targetId: null,
			position: null,
		});

		if (!draggedId || !position) return;
		if (draggedId === targetId) return;

		// Perform Move
		if (draggedType === "chapter" && targetType === "chapter") {
			// Move Chapter
			const draggedChapter = projectChapters.find((c) => c.id === draggedId);
			if (!draggedChapter) return;

			// Reordering Logic
			const allChapters = [...projectChapters].sort(
				(a, b) => a.order - b.order,
			);
			let targetIndex = allChapters.findIndex((c) => c.id === targetId);

			// If dropping after, increment index
			if (position === "after") targetIndex++;

			await moveChapter(selectedProjectId!, draggedId, targetIndex);
			toast.success("Chapter moved");
		} else if (draggedType === "scene") {
			// Move Scene
			const draggedScene = scenesOfProject.find((s) => s.id === draggedId);
			if (!draggedScene) return;

			let targetChapterId = "";
			let newIndex = 0;

			if (targetType === "chapter") {
				// Dropped on chapter header -> append to end
				targetChapterId = targetId;
				const targetScenes = scenesOfProject.filter(
					(s) => s.chapter === targetChapterId,
				);
				newIndex = targetScenes.length;
			} else {
				// Dropped on scene
				const targetScene = scenesOfProject.find((s) => s.id === targetId);
				if (!targetScene) return;
				targetChapterId = targetScene.chapter;

				// Get scenes of that chapter to find index
				const siblings = scenesOfProject
					.filter((s) => s.chapter === targetChapterId)
					.sort((a, b) => a.order - b.order);
				const targetSceneIndex = siblings.findIndex((s) => s.id === targetId);

				newIndex =
					position === "before" ? targetSceneIndex : targetSceneIndex + 1;
			}

			await moveScene(selectedProjectId!, draggedId, targetChapterId, newIndex);
			toast.success("Scene moved");
			if (targetType === "chapter" && !expandedChapters[targetChapterId]) {
				toggleChapter(targetChapterId);
			}
		}
	};

	// --- Filter Logic ---
	const filteredData = useMemo(() => {
		const query = searchQuery.toLowerCase();

		const matchingScenes = query
			? scenesOfProject.filter((s) => s.title.toLowerCase().includes(query))
			: scenesOfProject;
		const matchingChapters = query
			? projectChapters.filter(
					(c) =>
						c.title.toLowerCase().includes(query) ||
						matchingScenes.some((s) => s.chapter === c.id),
				)
			: projectChapters;
		const matchingWiki = query
			? projectWiki.filter(
					(w) =>
						w.name.toLowerCase().includes(query) ||
						w.alias?.some((a) => a.toLowerCase().includes(query)) ||
						w.tags?.some((t) => t.toLowerCase().includes(query)),
				)
			: projectWiki;

		return {
			chapters: matchingChapters,
			scenes: matchingScenes,
			wiki: matchingWiki,
		};
	}, [
		projectChapters,
		scenesOfProject,
		projectWiki,
		searchQuery,
	]);

	return (
		<UISidebar
			side="right"
			className="border-l border-sidebar-border/30 bg-sidebar/50 backdrop-blur-sm"
		>
			<SidebarHeader className="flex flex-col gap-0 p-0 border-b border-sidebar-border/20">
				{/* 项目选择器 */}
				<div className="h-12 flex items-center justify-between px-4">
					<div className="flex-1 min-w-0">
						<Select
							value={selectedProjectId ?? ""}
							onValueChange={(v) => setSelectedProjectId(v || null)}
						>
							<SelectTrigger className="h-8 w-full border-none bg-transparent shadow-none p-0 hover:bg-sidebar-accent/50 focus:ring-0 font-semibold text-foreground">
								<SelectValue placeholder="Select Book" />
							</SelectTrigger>
							<SelectContent>
								{projects.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.title}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* 添加按钮 */}
					{(!rightPanelView || rightPanelView === "outline") && (
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={handleAddChapter}
							title="Add Chapter"
						>
							<FolderPlus className="size-4 text-muted-foreground" />
						</Button>
					)}
					{rightPanelView === "characters" && (
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={handleAddWikiEntry}
							title="添加 Wiki 条目"
						>
							<Plus className="size-4 text-muted-foreground" />
						</Button>
					)}

					{rightPanelView === "drawings" && (
						<Button
							variant="ghost"
							size="icon"
							className="size-7"
							onClick={handleAddDrawing}
							title="Add Drawing"
						>
							<PenTool className="size-4 text-muted-foreground" />
						</Button>
					)}
				</div>

				{/* 标签页 */}
				<div
					className="flex items-center h-10 px-2 bg-muted/30"
					data-tour="outline-tab"
				>
					<button
						onClick={() => setRightPanelView(null)}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
							!rightPanelView || rightPanelView === "outline"
								? "bg-background text-foreground shadow-sm font-medium"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<ListTree className="size-3.5" />
						<span>大纲</span>
					</button>
					<button
						onClick={() => setRightPanelView("characters")}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
							rightPanelView === "characters"
								? "bg-background text-foreground shadow-sm font-medium"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<BookOpen className="size-3.5" />
						<span>Wiki</span>
					</button>
					<button
						onClick={() => setRightPanelView("drawings")}
						className={cn(
							"flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors",
							rightPanelView === "drawings"
								? "bg-background text-foreground shadow-sm font-medium"
								: "text-muted-foreground hover:text-foreground hover:bg-background/50",
						)}
					>
						<PenTool className="size-3.5" />
						<span>绘图</span>
					</button>
				</div>
			</SidebarHeader>

			<SidebarContent className="px-0">
				{/* Global Search Bar */}
				<div className="px-2 py-2">
					<div className="relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
						<Input
							placeholder={
								rightPanelView === "characters"
									? "Search wiki..."
									: rightPanelView === "drawings"
										? "Search drawings..."
										: "Search outline..."
							}
							className="h-8 pl-8 text-xs bg-background/50 border-transparent focus:border-border focus:bg-background transition-all"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>

				{(!rightPanelView || rightPanelView === "outline") && (
					<SidebarGroup className="px-0 h-full flex flex-col">
						<SidebarGroupContent className="flex-1 flex flex-col min-h-0">
							<div className="flex-1 overflow-auto px-2 pb-4 space-y-1">
								{selectedProjectId &&
								filteredData.chapters.length === 0 &&
								!searchQuery ? (
									<div className="mx-2 my-8 flex flex-col items-center text-center p-6 rounded-lg border border-dashed bg-sidebar-accent/30">
										<BookOpen className="size-8 text-muted-foreground/50 mb-3" />
										<span className="text-sm font-medium">Start Writing</span>
										<Button size="sm" variant="link" onClick={handleAddChapter}>
											Create first chapter
										</Button>
									</div>
								) : (
									filteredData.chapters.map((chapter) => {
										const chapterScenes = filteredData.scenes
											.filter((s) => s.chapter === chapter.id)
											.sort((a, b) => a.order - b.order);

										// Filter logic is already handled in useMemo but let's double check if we need to hide empty chapters if search is strict?
										// Currently logic allows showing chapter if title matches.

										const isExpanded =
											expandedChapters[chapter.id] || !!searchQuery;
										const isDragging = dragState.draggedId === chapter.id;
										const isDropTarget = dragState.targetId === chapter.id;
										const dropPos = dragState.position;

										return (
											<div
												key={chapter.id}
												className={cn(
													"transition-all duration-200",
													isDragging && "opacity-30",
												)}
												draggable
												onDragStart={(e) =>
													handleDragStart(e, chapter.id, "chapter")
												}
												onDragOver={(e) =>
													handleDragOver(e, chapter.id, "chapter")
												}
												onDrop={(e) => handleDrop(e, chapter.id, "chapter")}
											>
												{/* Drop Indicator Before */}
												{isDropTarget && dropPos === "before" && (
													<div className="h-0.5 bg-primary my-1 rounded-full" />
												)}

												<div
													className={cn(
														"group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-sidebar-accent/50",
														selectedChapterId === chapter.id &&
															!selectedSceneId &&
															"bg-sidebar-accent text-sidebar-accent-foreground font-medium",
														isDropTarget &&
															dropPos === "inside" &&
															"bg-sidebar-accent ring-1 ring-primary/20",
													)}
													onClick={() => setSelectedChapterId(chapter.id)}
												>
													<button
														onClick={(e) => {
															e.stopPropagation();
															toggleChapter(chapter.id);
														}}
														className="p-0.5 hover:bg-black/5 rounded"
													>
														{isExpanded ? (
															<ChevronDown className="size-3.5 text-muted-foreground" />
														) : (
															<ChevronRight className="size-3.5 text-muted-foreground" />
														)}
													</button>

													<Folder
														className={cn(
															"size-4 shrink-0",
															selectedChapterId === chapter.id
																? "text-blue-500"
																: "text-blue-500/70",
														)}
													/>

													{renamingId === chapter.id ? (
														<Input
															autoFocus
															defaultValue={chapter.title}
															className="h-6 text-sm px-1 py-0"
															onBlur={(e) =>
																handleRename(
																	chapter.id,
																	"chapter",
																	e.target.value,
																)
															}
															onKeyDown={(e) => {
																if (e.key === "Enter")
																	handleRename(
																		chapter.id,
																		"chapter",
																		e.currentTarget.value,
																	);
																if (e.key === "Escape") setRenamingId(null);
															}}
															onClick={(e) => e.stopPropagation()}
														/>
													) : (
														<span
															className="flex-1 text-sm truncate"
															onDoubleClick={() => setRenamingId(chapter.id)}
														>
															{chapter.title}
														</span>
													)}

													<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
														<Popover
															open={openPopovers[chapter.id] || false}
															onOpenChange={(open) =>
																setOpenPopovers((prev) => ({
																	...prev,
																	[chapter.id]: open,
																}))
															}
														>
															<PopoverTrigger asChild>
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-5 w-5 text-muted-foreground"
																>
																	<MoreHorizontal className="size-3.5" />
																</Button>
															</PopoverTrigger>
															<PopoverContent align="end" className="w-40 p-1">
																<div className="grid gap-0.5">
																	<button
																		onClick={() => handleAddScene(chapter.id)}
																		disabled={
																			creationStates[chapter.id]?.isCreating ||
																			false
																		}
																		className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
																	>
																		<Plus className="size-3" />
																		{creationStates[chapter.id]?.isCreating
																			? "Creating..."
																			: "Add Scene"}
																	</button>
																	<button
																		onClick={() =>
																			handleAddCanvasScene(chapter.id)
																		}
																		disabled={
																			creationStates[chapter.id]?.isCreating ||
																			false
																		}
																		className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
																	>
																		<PenTool className="size-3" />
																		{creationStates[chapter.id]?.isCreating
																			? "Creating..."
																			: "Add Canvas"}
																	</button>
																	<button
																		onClick={() => {
																			setRenamingId(chapter.id);
																			setOpenPopovers((prev) => ({
																				...prev,
																				[chapter.id]: false,
																			}));
																		}}
																		className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left"
																	>
																		<Pencil className="size-3" /> Rename
																	</button>
																	<div className="h-px bg-border my-1" />
																	<button
																		onClick={() => {
																			handleDelete(
																				chapter.id,
																				"chapter",
																				chapter.title,
																			);
																			setOpenPopovers((prev) => ({
																				...prev,
																				[chapter.id]: false,
																			}));
																		}}
																		className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"
																	>
																		<Trash2 className="size-3" /> Delete
																	</button>
																</div>
															</PopoverContent>
														</Popover>
													</div>
												</div>

												{/* Drop Indicator After */}
												{isDropTarget && dropPos === "after" && (
													<div className="h-0.5 bg-primary my-1 rounded-full" />
												)}

												{/* Scenes List */}
												{isExpanded && (
													<div className="ml-3 pl-3 border-l border-border/40 mt-0.5 space-y-0.5">
														{chapterScenes.map((scene) => {
															const isSceneDragging =
																dragState.draggedId === scene.id;
															const isSceneDropTarget =
																dragState.targetId === scene.id;
															const sceneDropPos = dragState.position;

															return (
																<div
																	key={scene.id}
																	className={cn(
																		"transition-all duration-200 relative",
																		isSceneDragging && "opacity-30",
																	)}
																	draggable
																	onDragStart={(e) =>
																		handleDragStart(e, scene.id, "scene")
																	}
																	onDragOver={(e) =>
																		handleDragOver(e, scene.id, "scene")
																	}
																	onDrop={(e) =>
																		handleDrop(e, scene.id, "scene")
																	}
																>
																	{isSceneDropTarget &&
																		sceneDropPos === "before" && (
																			<div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
																		)}

																	<div
																		className={cn(
																			"group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors hover:bg-sidebar-accent/50",
																			selectedSceneId === scene.id &&
																				"bg-sidebar-accent text-sidebar-accent-foreground font-medium",
																			!selectedSceneId &&
																				"text-muted-foreground hover:text-foreground",
																		)}
																		onClick={() => {
																			setSelectedSceneId(scene.id);
																			setSelectedChapterId(chapter.id);
																		}}
																	>
																		{scene.type === "canvas" ? (
																			<PenTool className="size-3.5 shrink-0 opacity-70 text-blue-500" />
																		) : (
																			<FileText className="size-3.5 shrink-0 opacity-70" />
																		)}

																		{renamingId === scene.id ? (
																			<Input
																				autoFocus
																				defaultValue={scene.title}
																				className="h-6 text-sm px-1 py-0"
																				onBlur={(e) =>
																					handleRename(
																						scene.id,
																						"scene",
																						e.target.value,
																					)
																				}
																				onKeyDown={(e) => {
																					if (e.key === "Enter")
																						handleRename(
																							scene.id,
																							"scene",
																							e.currentTarget.value,
																						);
																					if (e.key === "Escape")
																						setRenamingId(null);
																				}}
																				onClick={(e) => e.stopPropagation()}
																			/>
																		) : (
																			<span
																				className="flex-1 truncate"
																				onDoubleClick={() =>
																					setRenamingId(scene.id)
																				}
																			>
																				{scene.title}
																			</span>
																		)}

																		<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
																			<Popover
																				open={openPopovers[scene.id] || false}
																				onOpenChange={(open) =>
																					setOpenPopovers((prev) => ({
																						...prev,
																						[scene.id]: open,
																					}))
																				}
																			>
																				<PopoverTrigger asChild>
																					<Button
																						variant="ghost"
																						size="icon"
																						className="h-5 w-5 text-muted-foreground"
																					>
																						<MoreHorizontal className="size-3.5" />
																					</Button>
																				</PopoverTrigger>
																				<PopoverContent
																					align="end"
																					className="w-36 p-1"
																				>
																					<div className="grid gap-0.5">
																						<button
																							onClick={() => {
																								setRenamingId(scene.id);
																								setOpenPopovers((prev) => ({
																									...prev,
																									[scene.id]: false,
																								}));
																							}}
																							className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left"
																						>
																							<Pencil className="size-3" />{" "}
																							Rename
																						</button>
																						<div className="h-px bg-border my-1" />
																						<button
																							onClick={() => {
																								handleDelete(
																									scene.id,
																									"scene",
																									scene.title,
																								);
																								setOpenPopovers((prev) => ({
																									...prev,
																									[scene.id]: false,
																								}));
																							}}
																							className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"
																						>
																							<Trash2 className="size-3" />{" "}
																							Delete
																						</button>
																					</div>
																				</PopoverContent>
																			</Popover>
																		</div>
																	</div>

																	{isSceneDropTarget &&
																		sceneDropPos === "after" && (
																			<div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
																		)}
																</div>
															);
														})}
													</div>
												)}
											</div>
										);
									})
								)}
							</div>
						</SidebarGroupContent>
					</SidebarGroup>
				)}

				{/* Wiki View */}
				{rightPanelView === "characters" && (
					<SidebarGroup className="px-0">
						<SidebarGroupLabel className="px-4">Wiki 知识库</SidebarGroupLabel>
						<SidebarGroupContent>
							<div className="px-2 pb-4 space-y-1">
								{filteredData.wiki.length === 0 ? (
									<div className="mx-2 my-8 flex flex-col items-center text-center p-6 rounded-lg border border-dashed bg-sidebar-accent/30">
										<BookOpen className="size-8 text-muted-foreground/50 mb-3" />
										<span className="text-sm font-medium">暂无条目</span>
										<Button size="sm" variant="link" onClick={handleAddWikiEntry}>
											创建条目
										</Button>
									</div>
								) : (
									filteredData.wiki.map((entry) => (
										<div
											key={entry.id}
											className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors hover:bg-sidebar-accent/50 text-muted-foreground hover:text-foreground"
										>
											<BookOpen className="size-3.5 shrink-0 opacity-70 text-emerald-500" />

											{renamingId === entry.id ? (
												<Input
													autoFocus
													defaultValue={entry.name}
													className="h-6 text-sm px-1 py-0"
													onBlur={(e) =>
														handleRenameWiki(entry.id, e.target.value)
													}
													onKeyDown={(e) => {
														if (e.key === "Enter")
															handleRenameWiki(entry.id, e.currentTarget.value);
														if (e.key === "Escape") setRenamingId(null);
													}}
													onClick={(e) => e.stopPropagation()}
												/>
											) : (
												<div className="flex-1 min-w-0 flex items-center gap-2">
													<span
														className="truncate font-medium"
														onDoubleClick={() => setRenamingId(entry.id)}
													>
														{entry.name}
													</span>
													{entry.alias && entry.alias.length > 0 && (
														<span className="text-[10px] text-muted-foreground/60 truncate">
															{entry.alias.join(", ")}
														</span>
													)}
												</div>
											)}

											<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
												<Popover>
													<PopoverTrigger asChild>
														<Button
															variant="ghost"
															size="icon"
															className="h-5 w-5 text-muted-foreground"
														>
															<MoreHorizontal className="size-3.5" />
														</Button>
													</PopoverTrigger>
													<PopoverContent align="end" className="w-36 p-1">
														<div className="grid gap-0.5">
															<button
																onClick={() => setRenamingId(entry.id)}
																className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left"
															>
																<Pencil className="size-3" /> 重命名
															</button>
															<div className="h-px bg-border my-1" />
															<button
																onClick={() =>
																	handleDeleteWiki(entry.id, entry.name)
																}
																className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"
															>
																<Trash2 className="size-3" /> 删除
															</button>
														</div>
													</PopoverContent>
												</Popover>
											</div>
										</div>
									))
								)}
							</div>
						</SidebarGroupContent>
					</SidebarGroup>
				)}



				{/* Drawings View */}
				{rightPanelView === "drawings" && (
					<SidebarGroup className="px-0 h-full">
						<SidebarGroupContent className="h-full">
							<DrawingList
								projectId={selectedProjectId}
								onSelectDrawing={onSelectDrawing}
								selectedDrawingId={selectedDrawing?.id}
							/>
						</SidebarGroupContent>
					</SidebarGroup>
				)}
			</SidebarContent>
			<SidebarFooter>
				<div className="w-full p-2 text-center text-[10px] text-muted-foreground/40">
					Novel Editor &copy; 2024
				</div>
			</SidebarFooter>
		</UISidebar>
	);
}
