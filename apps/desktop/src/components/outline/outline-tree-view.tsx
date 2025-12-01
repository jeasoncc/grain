// 树形大纲视图组件 - 支持拖拽重排

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Circle,
	Edit3,
	FileText,
	Folder,
	GripVertical,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import { countWords, extractTextFromSerialized } from "@/lib/statistics";
import { cn } from "@/lib/utils";

interface OutlineTreeViewProps {
	project: ProjectInterface;
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	showWordCount?: boolean;
	showStatus?: boolean;
	onNavigateToScene?: (sceneId: string) => void;
	onAddScene?: (chapterId: string) => void;
	onRenameChapter?: (chapterId: string, newTitle: string) => void;
	onRenameScene?: (sceneId: string, newTitle: string) => void;
	onDeleteChapter?: (chapterId: string, title: string) => void;
	onDeleteScene?: (sceneId: string, title: string) => void;
	onReorderChapters?: (activeId: string, overId: string) => void;
	onReorderScenes?: (
		activeId: string,
		overId: string,
		targetChapterId?: string,
	) => void;
}

export function OutlineTreeView({
	chapters,
	scenes,
	showWordCount = true,
	showStatus = true,
	onNavigateToScene,
	onAddScene,
	onRenameChapter,
	onRenameScene,
	onDeleteChapter,
	onDeleteScene,
	onReorderChapters,
	onReorderScenes,
}: OutlineTreeViewProps) {
	const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
		new Set(chapters.map((ch) => ch.id)),
	);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeType, setActiveType] = useState<"chapter" | "scene" | null>(
		null,
	);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const toggleChapter = (chapterId: string) => {
		setExpandedChapters((prev) => {
			const next = new Set(prev);
			if (next.has(chapterId)) {
				next.delete(chapterId);
			} else {
				next.add(chapterId);
			}
			return next;
		});
	};

	const sortedChapters = useMemo(
		() => [...chapters].sort((a, b) => a.order - b.order),
		[chapters],
	);

	const chapterIds = useMemo(
		() => sortedChapters.map((ch) => `chapter-${ch.id}`),
		[sortedChapters],
	);

	const handleDragStart = (event: DragStartEvent) => {
		const id = String(event.active.id);
		if (id.startsWith("chapter-")) {
			setActiveId(id.replace("chapter-", ""));
			setActiveType("chapter");
		} else if (id.startsWith("scene-")) {
			setActiveId(id.replace("scene-", ""));
			setActiveType("scene");
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		setActiveType(null);

		if (!over || active.id === over.id) return;

		const activeIdStr = String(active.id);
		const overIdStr = String(over.id);

		// 章节拖拽
		if (
			activeIdStr.startsWith("chapter-") &&
			overIdStr.startsWith("chapter-")
		) {
			const activeChapterId = activeIdStr.replace("chapter-", "");
			const overChapterId = overIdStr.replace("chapter-", "");
			onReorderChapters?.(activeChapterId, overChapterId);
		}
		// 场景拖拽
		else if (
			activeIdStr.startsWith("scene-") &&
			overIdStr.startsWith("scene-")
		) {
			const activeSceneId = activeIdStr.replace("scene-", "");
			const overSceneId = overIdStr.replace("scene-", "");
			onReorderScenes?.(activeSceneId, overSceneId);
		}
	};

	const activeChapter =
		activeType === "chapter" && activeId
			? chapters.find((ch) => ch.id === activeId)
			: null;
	const activeScene =
		activeType === "scene" && activeId
			? scenes.find((sc) => sc.id === activeId)
			: null;

	if (chapters.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 text-center">
				<Folder className="size-12 text-muted-foreground/30 mb-4" />
				<p className="text-muted-foreground">暂无章节</p>
				<p className="text-sm text-muted-foreground/70 mt-1">
					点击上方"添加章节"按钮创建第一个章节
				</p>
			</div>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={chapterIds}
				strategy={verticalListSortingStrategy}
			>
				<div className="space-y-1">
					{sortedChapters.map((chapter) => {
						const chapterScenes = scenes
							.filter((s) => s.chapter === chapter.id)
							.sort((a, b) => a.order - b.order);
						const isExpanded = expandedChapters.has(chapter.id);

						return (
							<SortableChapterNode
								key={chapter.id}
								chapter={chapter}
								scenes={chapterScenes}
								isExpanded={isExpanded}
								onToggle={() => toggleChapter(chapter.id)}
								showWordCount={showWordCount}
								showStatus={showStatus}
								onNavigateToScene={onNavigateToScene}
								onAddScene={onAddScene}
								onRenameChapter={onRenameChapter}
								onRenameScene={onRenameScene}
								onDeleteChapter={onDeleteChapter}
								onDeleteScene={onDeleteScene}
								onReorderScenes={onReorderScenes}
							/>
						);
					})}
				</div>
			</SortableContext>

			<DragOverlay>
				{activeChapter && (
					<div className="bg-card border rounded-lg p-2 shadow-lg opacity-90">
						<div className="font-medium">{activeChapter.title}</div>
					</div>
				)}
				{activeScene && (
					<div className="bg-card border rounded-lg p-2 shadow-lg opacity-90">
						<div className="text-sm flex items-center gap-2">
							<FileText className="size-4" />
							{activeScene.title}
						</div>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}

interface SortableChapterNodeProps {
	chapter: ChapterInterface;
	scenes: SceneInterface[];
	isExpanded: boolean;
	onToggle: () => void;
	showWordCount?: boolean;
	showStatus?: boolean;
	onNavigateToScene?: (sceneId: string) => void;
	onAddScene?: (chapterId: string) => void;
	onRenameChapter?: (chapterId: string, newTitle: string) => void;
	onRenameScene?: (sceneId: string, newTitle: string) => void;
	onDeleteChapter?: (chapterId: string, title: string) => void;
	onDeleteScene?: (sceneId: string, title: string) => void;
	onReorderScenes?: (
		activeId: string,
		overId: string,
		targetChapterId?: string,
	) => void;
}

function SortableChapterNode({
	chapter,
	scenes,
	isExpanded,
	onToggle,
	showWordCount,
	onNavigateToScene,
	onAddScene,
	onRenameChapter,
	onRenameScene,
	onDeleteChapter,
	onDeleteScene,
	onReorderScenes,
}: SortableChapterNodeProps) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(chapter.title);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: `chapter-${chapter.id}` });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const chapterWordCount = useMemo(() => {
		return scenes.reduce((sum, scene) => {
			try {
				const content =
					typeof scene.content === "string"
						? JSON.parse(scene.content)
						: scene.content;
				const text = extractTextFromSerialized(content);
				return sum + countWords(text);
			} catch {
				return sum;
			}
		}, 0);
	}, [scenes]);

	const handleStartRename = useCallback(() => {
		setRenameValue(chapter.title);
		setIsRenaming(true);
	}, [chapter.title]);

	const handleConfirmRename = useCallback(() => {
		if (renameValue.trim() && renameValue !== chapter.title) {
			onRenameChapter?.(chapter.id, renameValue.trim());
		}
		setIsRenaming(false);
	}, [renameValue, chapter.id, chapter.title, onRenameChapter]);

	const handleCancelRename = useCallback(() => {
		setRenameValue(chapter.title);
		setIsRenaming(false);
	}, [chapter.title]);

	const sceneIds = useMemo(
		() => scenes.map((sc) => `scene-${sc.id}`),
		[scenes],
	);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn("group/chapter", isDragging && "opacity-50")}
		>
			{/* 章节行 */}
			<div
				className={cn(
					"flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 transition-colors",
					"border border-transparent hover:border-border",
				)}
			>
				{/* 拖拽手柄 */}
				<div
					{...attributes}
					{...listeners}
					className="opacity-0 group-hover/chapter:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
				>
					<GripVertical className="size-4 text-muted-foreground" />
				</div>

				{/* 展开/折叠按钮 */}
				<Button
					variant="ghost"
					size="icon"
					className="size-6 shrink-0"
					onClick={onToggle}
				>
					{isExpanded ? (
						<ChevronDown className="size-4" />
					) : (
						<ChevronRight className="size-4" />
					)}
				</Button>

				{/* 章节标题 */}
				<div className="flex-1 min-w-0">
					{isRenaming ? (
						<Input
							autoFocus
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							onBlur={handleConfirmRename}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleConfirmRename();
								if (e.key === "Escape") handleCancelRename();
							}}
							className="h-7 text-sm"
						/>
					) : (
						<>
							<div
								className="font-medium truncate cursor-pointer"
								onDoubleClick={handleStartRename}
							>
								{chapter.title}
							</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
								<span>{scenes.length} 场景</span>
								{showWordCount && (
									<>
										<span>·</span>
										<span>{chapterWordCount.toLocaleString()} 字</span>
									</>
								)}
							</div>
						</>
					)}
				</div>

				{/* 操作菜单 */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="size-6 opacity-0 group-hover/chapter:opacity-100 transition-opacity"
						>
							<MoreVertical className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onAddScene?.(chapter.id)}>
							<Plus className="size-4 mr-2" />
							添加场景
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleStartRename}>
							<Edit3 className="size-4 mr-2" />
							重命名
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="text-destructive"
							onClick={() => onDeleteChapter?.(chapter.id, chapter.title)}
						>
							<Trash2 className="size-4 mr-2" />
							删除章节
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* 场景列表 */}
			{isExpanded && scenes.length > 0 && (
				<SortableContext
					items={sceneIds}
					strategy={verticalListSortingStrategy}
				>
					<div className="ml-8 mt-1 space-y-1">
						{scenes.map((scene) => (
							<SortableSceneNode
								key={scene.id}
								scene={scene}
								showWordCount={showWordCount}
								onNavigate={onNavigateToScene}
								onRename={onRenameScene}
								onDelete={onDeleteScene}
							/>
						))}
					</div>
				</SortableContext>
			)}

			{/* 空章节提示 */}
			{isExpanded && scenes.length === 0 && (
				<div className="ml-8 mt-1 p-3 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
					<p>暂无场景</p>
					<Button
						variant="link"
						size="sm"
						className="mt-1"
						onClick={() => onAddScene?.(chapter.id)}
					>
						添加第一个场景
					</Button>
				</div>
			)}
		</div>
	);
}

interface SortableSceneNodeProps {
	scene: SceneInterface;
	showWordCount?: boolean;
	onNavigate?: (sceneId: string) => void;
	onRename?: (sceneId: string, newTitle: string) => void;
	onDelete?: (sceneId: string, title: string) => void;
}

function SortableSceneNode({
	scene,
	showWordCount,
	onNavigate,
	onRename,
	onDelete,
}: SortableSceneNodeProps) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(scene.title);

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: `scene-${scene.id}` });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const sceneWordCount = useMemo(() => {
		try {
			const content =
				typeof scene.content === "string"
					? JSON.parse(scene.content)
					: scene.content;
			const text = extractTextFromSerialized(content);
			return countWords(text);
		} catch {
			return 0;
		}
	}, [scene.content]);

	const handleClick = () => {
		if (!isRenaming && onNavigate) {
			onNavigate(scene.id);
		}
	};

	const handleStartRename = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			setRenameValue(scene.title);
			setIsRenaming(true);
		},
		[scene.title],
	);

	const handleConfirmRename = useCallback(() => {
		if (renameValue.trim() && renameValue !== scene.title) {
			onRename?.(scene.id, renameValue.trim());
		}
		setIsRenaming(false);
	}, [renameValue, scene.id, scene.title, onRename]);

	const handleCancelRename = useCallback(() => {
		setRenameValue(scene.title);
		setIsRenaming(false);
	}, [scene.title]);

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"group/scene flex items-center gap-2 p-2 pl-4 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer",
				"border border-transparent hover:border-border",
				isDragging && "opacity-50",
			)}
			onClick={handleClick}
		>
			{/* 拖拽手柄 */}
			<div
				{...attributes}
				{...listeners}
				className="opacity-0 group-hover/scene:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
				onClick={(e) => e.stopPropagation()}
			>
				<GripVertical className="size-4 text-muted-foreground" />
			</div>

			{/* 场景图标 */}
			<FileText className="size-4 text-muted-foreground shrink-0" />

			{/* 场景标题 */}
			<div className="flex-1 min-w-0">
				{isRenaming ? (
					<Input
						autoFocus
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onBlur={handleConfirmRename}
						onKeyDown={(e) => {
							e.stopPropagation();
							if (e.key === "Enter") handleConfirmRename();
							if (e.key === "Escape") handleCancelRename();
						}}
						onClick={(e) => e.stopPropagation()}
						className="h-6 text-sm"
					/>
				) : (
					<>
						<div className="text-sm truncate">{scene.title}</div>
						{showWordCount && (
							<div className="text-xs text-muted-foreground mt-0.5">
								{sceneWordCount.toLocaleString()} 字
							</div>
						)}
					</>
				)}
			</div>

			{/* 状态图标 */}
			<div className="opacity-0 group-hover/scene:opacity-100 transition-opacity">
				{sceneWordCount === 0 ? (
					<Circle className="size-4 text-muted-foreground" />
				) : (
					<CheckCircle2 className="size-4 text-green-500" />
				)}
			</div>

			{/* 操作菜单 */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
					<Button
						variant="ghost"
						size="icon"
						className="size-6 opacity-0 group-hover/scene:opacity-100 transition-opacity"
					>
						<MoreVertical className="size-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={handleStartRename}>
						<Edit3 className="size-4 mr-2" />
						重命名
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						className="text-destructive"
						onClick={(e) => {
							e.stopPropagation();
							onDelete?.(scene.id, scene.title);
						}}
					>
						<Trash2 className="size-4 mr-2" />
						删除场景
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
