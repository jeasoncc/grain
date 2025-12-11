/**
 * ChaptersPanel - 统一侧边栏中的章节管理面板
 * 用于管理书籍的章节和场景结构
 */

import {
	BookOpen,
	ChevronDown,
	ChevronRight,
	FileText,
	Folder,
	FolderPlus,
	MoreHorizontal,
	Pencil,
	PenTool,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	createChapter,
	deleteChapter,
	moveChapter,
	renameChapter,
	useChaptersByProject,
} from "@/services/chapters";
import {
	deleteScene,
	moveScene,
	renameScene,
	useScenesByProject,
} from "@/services/scenes";
import { useAllProjects } from "@/services/projects";
import { useSceneCreation } from "@/hooks/use-scene-creation";
import { useSceneCreationStore } from "@/stores/scene-creation";
import type { ChapterInterface, SceneInterface } from "@/db/schema";
import { useUnifiedSidebarStore } from "@/stores/unified-sidebar";
import { useSelectionStore } from "@/stores/selection";

export function ChaptersPanel() {
	const navigate = useNavigate();
	const confirm = useConfirm();
	
	// Global selection state
	const globalSelectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const setGlobalSelectedProjectId = useSelectionStore((s) => s.setSelectedProjectId);
	const setGlobalSelectedChapterId = useSelectionStore((s) => s.setSelectedChapterId);
	const setGlobalSelectedSceneId = useSelectionStore((s) => s.setSelectedSceneId);
	
	// Chapters panel state from unified sidebar store
	const {
		chaptersState,
		setChaptersSelectedProjectId,
		setChaptersExpandedChapters,
		setChaptersSelectedChapterId,
		setChaptersSelectedSceneId,
	} = useUnifiedSidebarStore();

	const [searchQuery, setSearchQuery] = useState("");
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [openPopovers, setOpenPopovers] = useState<Record<string, boolean>>({});
	
	// Drag and Drop State
	const [dragState, setDragState] = useState<{
		draggedId: string;
		draggedType: "chapter" | "scene";
		targetId: string | null;
		position: "before" | "after" | "inside" | null;
	}>({ draggedId: "", draggedType: "chapter", targetId: null, position: null });

	// Data
	const projects = useAllProjects();
	const chapters = useChaptersByProject(globalSelectedProjectId);
	const scenes = useScenesByProject(globalSelectedProjectId);

	// Sync project selection with global state
	useEffect(() => {
		if (globalSelectedProjectId && globalSelectedProjectId !== chaptersState.selectedProjectId) {
			setChaptersSelectedProjectId(globalSelectedProjectId);
		}
	}, [globalSelectedProjectId, chaptersState.selectedProjectId, setChaptersSelectedProjectId]);

	// Auto-select first project if none selected
	useEffect(() => {
		if (!globalSelectedProjectId && projects.length > 0) {
			setGlobalSelectedProjectId(projects[0].id);
		}
	}, [projects, globalSelectedProjectId, setGlobalSelectedProjectId]);

	// Handle project change
	const handleProjectChange = useCallback((projectId: string) => {
		setGlobalSelectedProjectId(projectId);
		setChaptersSelectedProjectId(projectId);
		// Reset chapter/scene selection when project changes
		setChaptersSelectedChapterId(null);
		setChaptersSelectedSceneId(null);
	}, [setGlobalSelectedProjectId, setChaptersSelectedProjectId, setChaptersSelectedChapterId, setChaptersSelectedSceneId]);

	// Toggle chapter expansion
	const toggleChapter = useCallback((chapterId: string) => {
		setChaptersExpandedChapters({
			...chaptersState.expandedChapters,
			[chapterId]: !chaptersState.expandedChapters[chapterId],
		});
	}, [chaptersState.expandedChapters, setChaptersExpandedChapters]);

	// Handle chapter selection
	const handleSelectChapter = useCallback((chapter: ChapterInterface) => {
		setChaptersSelectedChapterId(chapter.id);
		setChaptersSelectedSceneId(null);
		setGlobalSelectedChapterId(chapter.id);
		// Expand the chapter when selected
		if (!chaptersState.expandedChapters[chapter.id]) {
			toggleChapter(chapter.id);
		}
	}, [setChaptersSelectedChapterId, setChaptersSelectedSceneId, setGlobalSelectedChapterId, chaptersState.expandedChapters, toggleChapter]);

	// Handle scene selection
	const handleSelectScene = useCallback((scene: SceneInterface) => {
		setChaptersSelectedSceneId(scene.id);
		setChaptersSelectedChapterId(scene.chapter);
		setGlobalSelectedSceneId(scene.id);
		setGlobalSelectedChapterId(scene.chapter);
		
		// Navigate to canvas for canvas scenes, or home for text scenes
		if (scene.type === "canvas") {
			navigate({ to: "/canvas" });
		} else {
			// Text scenes are edited on the main page
			navigate({ to: "/" });
		}
	}, [setChaptersSelectedSceneId, setChaptersSelectedChapterId, setGlobalSelectedSceneId, setGlobalSelectedChapterId, navigate]);

	// Create new chapter with auto-rename
	const handleCreateChapter = useCallback(async () => {
		if (!globalSelectedProjectId) {
			toast.error("Please select a project first");
			return;
		}

		try {
			const nextOrder = chapters.length
				? Math.max(...chapters.map((c) => c.order)) + 1
				: 1;
			const newChapter = await createChapter({
				projectId: globalSelectedProjectId,
				title: `Chapter ${nextOrder}`,
				order: nextOrder,
			});
			setChaptersSelectedChapterId(newChapter.id);
			setGlobalSelectedChapterId(newChapter.id);
			setChaptersExpandedChapters({
				...chaptersState.expandedChapters,
				[newChapter.id]: true,
			});
			toast.success("Chapter created");
			// Auto start renaming after a short delay
			setTimeout(() => setRenamingId(newChapter.id), 100);
		} catch (error) {
			console.error("Failed to create chapter:", error);
			toast.error("Failed to create chapter");
		}
	}, [globalSelectedProjectId, chapters, setChaptersSelectedChapterId, setGlobalSelectedChapterId, setChaptersExpandedChapters, chaptersState.expandedChapters]);

	// Rename chapter
	const handleRenameChapter = useCallback(async (chapterId: string, newTitle: string) => {
		if (!newTitle.trim()) {
			setRenamingId(null);
			return;
		}
		try {
			await renameChapter(chapterId, newTitle.trim());
		} catch (error) {
			console.error("Failed to rename chapter:", error);
			toast.error("Failed to rename chapter");
		}
		setRenamingId(null);
	}, []);

	// Delete chapter with confirmation
	const handleDeleteChapter = useCallback(async (chapter: ChapterInterface) => {
		// Close popover first
		setOpenPopovers((prev) => ({ ...prev, [chapter.id]: false }));
		
		const ok = await confirm({
			title: "Delete chapter?",
			description: `Are you sure you want to delete "${chapter.title}"? This will also delete all scenes in this chapter. This cannot be undone.`,
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;

		try {
			await deleteChapter(chapter.id);
			// Clear selection if deleted chapter was selected
			if (chaptersState.selectedChapterId === chapter.id) {
				setChaptersSelectedChapterId(null);
				setChaptersSelectedSceneId(null);
				setGlobalSelectedChapterId(null);
				setGlobalSelectedSceneId(null);
			}
			toast.success("Chapter deleted");
		} catch (error) {
			console.error("Failed to delete chapter:", error);
			toast.error("Failed to delete chapter");
		}
	}, [confirm, chaptersState.selectedChapterId, setChaptersSelectedChapterId, setChaptersSelectedSceneId, setGlobalSelectedChapterId, setGlobalSelectedSceneId]);

	// Start renaming a chapter or scene
	const handleStartRename = useCallback((id: string) => {
		setOpenPopovers((prev) => ({ ...prev, [id]: false }));
		setRenamingId(id);
	}, []);

	// Scene creation management
	const { createTextScene, createCanvasScene } = useSceneCreation({
		selectedProjectId: globalSelectedProjectId,
		scenesOfProject: scenes,
		onSceneCreated: (sceneId, chapterId) => {
			setChaptersSelectedSceneId(sceneId);
			setChaptersSelectedChapterId(chapterId);
			setGlobalSelectedSceneId(sceneId);
			setGlobalSelectedChapterId(chapterId);
			if (!chaptersState.expandedChapters[chapterId]) {
				toggleChapter(chapterId);
			}
			// Delay renaming to ensure UI has updated
			setTimeout(() => setRenamingId(sceneId), 150);
		},
		onError: (error, chapterId) => {
			console.error(`Scene creation error for chapter ${chapterId}:`, error);
		},
	});

	// Get reactive creation states for all chapters
	const creationStates = useSceneCreationStore((state) => state.creationStates);

	// Create text scene
	const handleAddScene = useCallback(async (chapterId: string) => {
		// Close the popover first
		setOpenPopovers((prev) => ({ ...prev, [chapterId]: false }));
		await createTextScene(chapterId);
	}, [createTextScene]);

	// Create canvas scene
	const handleAddCanvasScene = useCallback(async (chapterId: string) => {
		// Close the popover first
		setOpenPopovers((prev) => ({ ...prev, [chapterId]: false }));
		await createCanvasScene(chapterId);
	}, [createCanvasScene]);

	// Rename scene
	const handleRenameScene = useCallback(async (sceneId: string, newTitle: string) => {
		if (!newTitle.trim()) {
			setRenamingId(null);
			return;
		}
		try {
			await renameScene(sceneId, newTitle.trim());
		} catch (error) {
			console.error("Failed to rename scene:", error);
			toast.error("Failed to rename scene");
		}
		setRenamingId(null);
	}, []);

	// Delete scene with confirmation
	const handleDeleteScene = useCallback(async (scene: SceneInterface) => {
		// Close popover first
		setOpenPopovers((prev) => ({ ...prev, [scene.id]: false }));
		
		const ok = await confirm({
			title: "Delete scene?",
			description: `Are you sure you want to delete "${scene.title}"? This cannot be undone.`,
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;

		try {
			await deleteScene(scene.id);
			// Clear selection if deleted scene was selected
			if (chaptersState.selectedSceneId === scene.id) {
				setChaptersSelectedSceneId(null);
				setGlobalSelectedSceneId(null);
			}
			toast.success("Scene deleted");
		} catch (error) {
			console.error("Failed to delete scene:", error);
			toast.error("Failed to delete scene");
		}
	}, [confirm, chaptersState.selectedSceneId, setChaptersSelectedSceneId, setGlobalSelectedSceneId]);

	// --- Drag and Drop Logic ---
	const handleDragStart = useCallback((
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
	}, []);

	const handleDragOver = useCallback((
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
	}, [dragState.draggedId, dragState.draggedType]);

	const handleDragEnd = useCallback(() => {
		setDragState({
			draggedId: "",
			draggedType: "chapter",
			targetId: null,
			position: null,
		});
	}, []);

	const handleDrop = useCallback(async (
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
		if (!globalSelectedProjectId) return;

		// Perform Move
		try {
			if (draggedType === "chapter" && targetType === "chapter") {
				// Move Chapter
				const allChapters = [...chapters].sort((a, b) => a.order - b.order);
				let targetIndex = allChapters.findIndex((c) => c.id === targetId);

				// If dropping after, increment index
				if (position === "after") targetIndex++;

				await moveChapter(globalSelectedProjectId, draggedId, targetIndex);
				toast.success("Chapter moved");
			} else if (draggedType === "scene") {
				// Move Scene
				const draggedScene = scenes.find((s) => s.id === draggedId);
				if (!draggedScene) return;

				let targetChapterId = "";
				let newIndex = 0;

				if (targetType === "chapter") {
					// Dropped on chapter header -> append to end
					targetChapterId = targetId;
					const targetScenes = scenes.filter((s) => s.chapter === targetChapterId);
					newIndex = targetScenes.length;
					
					// Expand the target chapter
					if (!chaptersState.expandedChapters[targetChapterId]) {
						toggleChapter(targetChapterId);
					}
				} else {
					// Dropped on scene
					const targetScene = scenes.find((s) => s.id === targetId);
					if (!targetScene) return;
					targetChapterId = targetScene.chapter;

					// Get scenes of that chapter to find index
					const siblings = scenes
						.filter((s) => s.chapter === targetChapterId)
						.sort((a, b) => a.order - b.order);
					const targetSceneIndex = siblings.findIndex((s) => s.id === targetId);

					newIndex = position === "before" ? targetSceneIndex : targetSceneIndex + 1;
				}

				await moveScene(globalSelectedProjectId, draggedId, targetChapterId, newIndex);
				toast.success("Scene moved");
			}
		} catch (error) {
			console.error("Failed to move item:", error);
			toast.error("Failed to move item");
		}
	}, [dragState, globalSelectedProjectId, chapters, scenes, chaptersState.expandedChapters, toggleChapter]);

	// Filter data based on search query
	const filteredData = useMemo(() => {
		const query = searchQuery.toLowerCase();

		const matchingScenes = query
			? scenes.filter((s) => s.title.toLowerCase().includes(query))
			: scenes;
		const matchingChapters = query
			? chapters.filter(
					(c) =>
						c.title.toLowerCase().includes(query) ||
						matchingScenes.some((s) => s.chapter === c.id)
				)
			: chapters;

		return {
			chapters: matchingChapters.sort((a, b) => a.order - b.order),
			scenes: matchingScenes,
		};
	}, [chapters, scenes, searchQuery]);

	// Get scenes for a specific chapter
	const getScenesForChapter = useCallback((chapterId: string) => {
		return filteredData.scenes
			.filter((s) => s.chapter === chapterId)
			.sort((a, b) => a.order - b.order);
	}, [filteredData.scenes]);

	return (
		<div className="flex h-full flex-col">
			{/* Header with project selector */}
			<div className="h-12 flex items-center justify-between px-4 border-b border-sidebar-border/20">
				<div className="flex items-center gap-2 font-semibold text-foreground/80">
					<BookOpen className="size-5" />
					<span>Chapters</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={handleCreateChapter}
					title="Create new chapter"
					disabled={!globalSelectedProjectId}
				>
					<FolderPlus className="size-4" />
				</Button>
			</div>

			{/* Project Selector */}
			<div className="px-3 py-2 border-b border-sidebar-border/20">
				<Select
					value={globalSelectedProjectId ?? ""}
					onValueChange={handleProjectChange}
				>
					<SelectTrigger className="h-8 w-full">
						<SelectValue placeholder="Select a book..." />
					</SelectTrigger>
					<SelectContent>
						{projects.map((project) => (
							<SelectItem key={project.id} value={project.id}>
								{project.title}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Search */}
			<div className="p-3 border-b border-sidebar-border/20">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search chapters & scenes..."
						className="pl-9 h-8"
						disabled={!globalSelectedProjectId}
					/>
				</div>
			</div>

			<Separator className="opacity-30" />

			{/* Content Area - Chapter/Scene Tree */}
			<ScrollArea className="flex-1">
				<div className="px-2 py-4">
					{!globalSelectedProjectId ? (
						// No project selected
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<BookOpen className="size-12 mb-3 opacity-20" />
							<p className="text-sm text-center">
								Select a book to view chapters
							</p>
						</div>
					) : filteredData.chapters.length === 0 ? (
						// No chapters
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<Folder className="size-12 mb-3 opacity-20" />
							<p className="text-sm text-center">
								{searchQuery
									? "No chapters match your search"
									: "No chapters yet"}
							</p>
							{!searchQuery && (
								<Button
									variant="outline"
									size="sm"
									className="mt-3"
									onClick={handleCreateChapter}
								>
									<Plus className="size-4 mr-1" />
									Create Chapter
								</Button>
							)}
						</div>
					) : (
						// Chapter/Scene tree
						<div className="space-y-1">
							{/* List header */}
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
								Chapters ({filteredData.chapters.length})
							</div>

							{filteredData.chapters.map((chapter) => {
								const chapterScenes = getScenesForChapter(chapter.id);
								const isExpanded = chaptersState.expandedChapters[chapter.id] || !!searchQuery;
								const isSelected = chaptersState.selectedChapterId === chapter.id && !chaptersState.selectedSceneId;
								const isDragging = dragState.draggedId === chapter.id;
								const isDropTarget = dragState.targetId === chapter.id;

								return (
									<div key={chapter.id}>
										{/* Chapter Item */}
										<ChapterListItem
											chapter={chapter}
											isSelected={isSelected}
											isExpanded={isExpanded}
											sceneCount={chapterScenes.length}
											isRenaming={renamingId === chapter.id}
											isPopoverOpen={openPopovers[chapter.id] || false}
											isCreatingScene={creationStates[chapter.id]?.isCreating || false}
											isDragging={isDragging}
											isDropTarget={isDropTarget}
											dropPosition={isDropTarget ? dragState.position : null}
											onSelect={() => handleSelectChapter(chapter)}
											onToggle={() => toggleChapter(chapter.id)}
											onRename={(newTitle) => handleRenameChapter(chapter.id, newTitle)}
											onStartRename={() => handleStartRename(chapter.id)}
											onCancelRename={() => setRenamingId(null)}
											onDelete={() => handleDeleteChapter(chapter)}
											onPopoverChange={(open) => setOpenPopovers((prev) => ({ ...prev, [chapter.id]: open }))}
											onAddScene={() => handleAddScene(chapter.id)}
											onAddCanvasScene={() => handleAddCanvasScene(chapter.id)}
											onDragStart={(e) => handleDragStart(e, chapter.id, "chapter")}
											onDragOver={(e) => handleDragOver(e, chapter.id, "chapter")}
											onDragEnd={handleDragEnd}
											onDrop={(e) => handleDrop(e, chapter.id, "chapter")}
										/>

										{/* Scenes List */}
										{isExpanded && chapterScenes.length > 0 && (
											<div className="ml-3 pl-3 border-l border-border/40 mt-0.5 space-y-0.5">
												{chapterScenes.map((scene) => {
													const isSceneDragging = dragState.draggedId === scene.id;
													const isSceneDropTarget = dragState.targetId === scene.id;
													
													return (
														<SceneListItem
															key={scene.id}
															scene={scene}
															isSelected={chaptersState.selectedSceneId === scene.id}
															isRenaming={renamingId === scene.id}
															isPopoverOpen={openPopovers[scene.id] || false}
															isDragging={isSceneDragging}
															isDropTarget={isSceneDropTarget}
															dropPosition={isSceneDropTarget ? dragState.position : null}
															onSelect={() => handleSelectScene(scene)}
															onRename={(newTitle) => handleRenameScene(scene.id, newTitle)}
															onStartRename={() => handleStartRename(scene.id)}
															onCancelRename={() => setRenamingId(null)}
															onDelete={() => handleDeleteScene(scene)}
															onPopoverChange={(open) => setOpenPopovers((prev) => ({ ...prev, [scene.id]: open }))}
															onDragStart={(e) => handleDragStart(e, scene.id, "scene")}
															onDragOver={(e) => handleDragOver(e, scene.id, "scene")}
															onDragEnd={handleDragEnd}
															onDrop={(e) => handleDrop(e, scene.id, "scene")}
														/>
													);
												})}
											</div>
										)}
									</div>
								);
							})}

							{/* Create new chapter button */}
							<button
								className="w-full mt-2 text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 justify-center group py-3 px-3 rounded-md flex items-center gap-2 transition-all"
								onClick={handleCreateChapter}
							>
								<Plus className="size-4 group-hover:scale-110 transition-transform" />
								<span>Create New Chapter</span>
							</button>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}


interface ChapterListItemProps {
	chapter: ChapterInterface;
	isSelected: boolean;
	isExpanded: boolean;
	sceneCount: number;
	isRenaming: boolean;
	isPopoverOpen: boolean;
	isCreatingScene: boolean;
	isDragging: boolean;
	isDropTarget: boolean;
	dropPosition: "before" | "after" | "inside" | null;
	onSelect: () => void;
	onToggle: () => void;
	onRename: (newTitle: string) => void;
	onStartRename: () => void;
	onCancelRename: () => void;
	onDelete: () => void;
	onPopoverChange: (open: boolean) => void;
	onAddScene: () => void;
	onAddCanvasScene: () => void;
	onDragStart: (e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent) => void;
}

function ChapterListItem({
	chapter,
	isSelected,
	isExpanded,
	sceneCount,
	isRenaming,
	isPopoverOpen,
	isCreatingScene,
	isDragging,
	isDropTarget,
	dropPosition,
	onSelect,
	onToggle,
	onRename,
	onStartRename,
	onCancelRename,
	onDelete,
	onPopoverChange,
	onAddScene,
	onAddCanvasScene,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: ChapterListItemProps) {
	const handleToggle = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onToggle();
		},
		[onToggle]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				onRename(e.currentTarget.value);
			} else if (e.key === "Escape") {
				onCancelRename();
			}
		},
		[onRename, onCancelRename]
	);

	return (
		<div
			className={cn(
				"transition-all duration-200",
				isDragging && "opacity-30",
			)}
			draggable={!isRenaming}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
			onDrop={onDrop}
		>
			{/* Drop Indicator Before */}
			{isDropTarget && dropPosition === "before" && (
				<div className="h-0.5 bg-primary my-1 rounded-full" />
			)}
			
			<div
				className={cn(
					"group flex items-center gap-2 py-2 px-2 rounded-md cursor-pointer transition-all",
					isSelected
						? "bg-primary/10 text-primary"
						: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					isDropTarget && dropPosition === "inside" && "bg-sidebar-accent ring-1 ring-primary/20"
				)}
				onClick={onSelect}
			>
			<button
				onClick={handleToggle}
				className="p-0.5 hover:bg-black/5 rounded shrink-0"
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
					isSelected ? "text-blue-500" : "text-blue-500/70"
				)}
			/>

			{isRenaming ? (
				<Input
					autoFocus
					defaultValue={chapter.title}
					className="h-6 text-sm px-1 py-0 flex-1"
					onBlur={(e) => onRename(e.target.value)}
					onKeyDown={handleKeyDown}
					onClick={(e) => e.stopPropagation()}
				/>
			) : (
				<span
					className="flex-1 text-sm font-medium truncate"
					onDoubleClick={(e) => {
						e.stopPropagation();
						onStartRename();
					}}
				>
					{chapter.title}
				</span>
			)}

			{!isRenaming && (
				<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
					{sceneCount > 0 && (
						<span className="text-xs text-muted-foreground/70 shrink-0 mr-1">
							{sceneCount}
						</span>
					)}
					<Popover open={isPopoverOpen} onOpenChange={onPopoverChange}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 text-muted-foreground"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreHorizontal className="size-3.5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-40 p-1">
							<div className="grid gap-0.5">
								<button
									onClick={(e) => {
										e.stopPropagation();
										onAddScene();
									}}
									disabled={isCreatingScene}
									className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Plus className="size-3" />
									{isCreatingScene ? "Creating..." : "Add Scene"}
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onAddCanvasScene();
									}}
									disabled={isCreatingScene}
									className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<PenTool className="size-3" />
									{isCreatingScene ? "Creating..." : "Add Canvas"}
								</button>
								<div className="h-px bg-border my-1" />
								<button
									onClick={(e) => {
										e.stopPropagation();
										onStartRename();
									}}
									className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left"
								>
									<Pencil className="size-3" /> Rename
								</button>
								<div className="h-px bg-border my-1" />
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDelete();
									}}
									className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"
								>
									<Trash2 className="size-3" /> Delete
								</button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			)}
			</div>
			
			{/* Drop Indicator After */}
			{isDropTarget && dropPosition === "after" && (
				<div className="h-0.5 bg-primary my-1 rounded-full" />
			)}
		</div>
	);
}

interface SceneListItemProps {
	scene: SceneInterface;
	isSelected: boolean;
	isRenaming: boolean;
	isPopoverOpen: boolean;
	isDragging: boolean;
	isDropTarget: boolean;
	dropPosition: "before" | "after" | "inside" | null;
	onSelect: () => void;
	onRename: (newTitle: string) => void;
	onStartRename: () => void;
	onCancelRename: () => void;
	onDelete: () => void;
	onPopoverChange: (open: boolean) => void;
	onDragStart: (e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDragEnd: () => void;
	onDrop: (e: React.DragEvent) => void;
}

function SceneListItem({
	scene,
	isSelected,
	isRenaming,
	isPopoverOpen,
	isDragging,
	isDropTarget,
	dropPosition,
	onSelect,
	onRename,
	onStartRename,
	onCancelRename,
	onDelete,
	onPopoverChange,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: SceneListItemProps) {
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				onRename(e.currentTarget.value);
			} else if (e.key === "Escape") {
				onCancelRename();
			}
		},
		[onRename, onCancelRename]
	);

	return (
		<div
			className={cn(
				"transition-all duration-200 relative",
				isDragging && "opacity-30",
			)}
			draggable={!isRenaming}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDragEnd={onDragEnd}
			onDrop={onDrop}
		>
			{/* Drop Indicator Before */}
			{isDropTarget && dropPosition === "before" && (
				<div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
			)}
			
			<div
				className={cn(
					"group flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-all",
					isSelected
						? "bg-primary/10 text-primary"
						: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-muted-foreground"
				)}
				onClick={onSelect}
			>
			{scene.type === "canvas" ? (
				<PenTool className="size-3.5 shrink-0 text-blue-500/70" />
			) : (
				<FileText className="size-3.5 shrink-0 opacity-70" />
			)}

			{isRenaming ? (
				<Input
					autoFocus
					defaultValue={scene.title}
					className="h-5 text-xs px-1 py-0 flex-1"
					onBlur={(e) => onRename(e.target.value)}
					onKeyDown={handleKeyDown}
					onClick={(e) => e.stopPropagation()}
				/>
			) : (
				<span
					className="flex-1 truncate"
					onDoubleClick={(e) => {
						e.stopPropagation();
						onStartRename();
					}}
				>
					{scene.title}
				</span>
			)}

			{!isRenaming && (
				<div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
					<Popover open={isPopoverOpen} onOpenChange={onPopoverChange}>
						<PopoverTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5 text-muted-foreground"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreHorizontal className="size-3" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-36 p-1">
							<div className="grid gap-0.5">
								<button
									onClick={(e) => {
										e.stopPropagation();
										onStartRename();
									}}
									className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent w-full text-left"
								>
									<Pencil className="size-3" /> Rename
								</button>
								<div className="h-px bg-border my-1" />
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDelete();
									}}
									className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-destructive/10 text-destructive w-full text-left"
								>
									<Trash2 className="size-3" /> Delete
								</button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			)}
			</div>
			
			{/* Drop Indicator After */}
			{isDropTarget && dropPosition === "after" && (
				<div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary rounded-full z-10" />
			)}
		</div>
	);
}
