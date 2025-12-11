// 底部抽屉内容组件
import { useLiveQuery } from "dexie-react-hooks";
import {
	ChevronDown,
	ChevronRight,
	FileText,
	Folder,
	FolderOpen,
	Lightbulb,
	MapPin,
	Package,
	Pencil,
	PenTool,
	Plus,
	Search,
	Trash2,
	User,
	Users as UsersIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	RoleInterface,
	SceneInterface,

} from "@/db/schema";
import { countWords, extractTextFromSerialized } from "@/lib/statistics";
import { cn } from "@/lib/utils";
import { createChapter } from "@/services/chapters";
import { createRole, deleteRole, updateRole } from "@/services/roles";
import { createCanvasScene, createScene } from "@/services/scenes";

import { useSelectionStore } from "@/stores/selection";
import { useUIStore } from "@/stores/ui";

export function BottomDrawerContent() {
	const bottomDrawerView = useUIStore((s) => s.bottomDrawerView);

	switch (bottomDrawerView) {
		case "outline":
			return <OutlineContent />;
		case "characters":
			return <CharactersContent />;

		case "statistics":
			return (
				<PlaceholderContent title="统计" description="写作统计功能开发中..." />
			);
		default:
			return null;
	}
}

function PlaceholderContent({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="flex items-center justify-center h-32 text-muted-foreground">
			<div className="text-center">
				<p className="font-medium">{title}</p>
				<p className="text-sm">{description}</p>
			</div>
		</div>
	);
}

function OutlineContent() {
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
		new Set(),
	);

	const projects = useLiveQuery(() => db.getAllProjects(), []) ?? [];
	const chapters = useLiveQuery(() => db.getAllChapters(), []) ?? [];
	const scenes = useLiveQuery(() => db.getAllScenes(), []) ?? [];

	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const selectedChapterId = useSelectionStore((s) => s.selectedChapterId);
	const selectedSceneId = useSelectionStore((s) => s.selectedSceneId);
	const setSelectedChapterId = useSelectionStore((s) => s.setSelectedChapterId);
	const setSelectedSceneId = useSelectionStore((s) => s.setSelectedSceneId);

	const currentProject = useMemo(
		() => projects.find((p) => p.id === selectedProjectId) ?? projects[0],
		[projects, selectedProjectId],
	);

	const projectChapters = useMemo(
		() =>
			chapters
				.filter((ch) => ch.project === currentProject?.id)
				.sort((a, b) => a.order - b.order),
		[chapters, currentProject?.id],
	);

	const projectScenes = useMemo(
		() => scenes.filter((sc) => sc.project === currentProject?.id),
		[scenes, currentProject?.id],
	);

	// 过滤
	const filteredChapters = useMemo(() => {
		if (!searchQuery) return projectChapters;
		const query = searchQuery.toLowerCase();
		return projectChapters.filter((ch) =>
			ch.title.toLowerCase().includes(query),
		);
	}, [projectChapters, searchQuery]);

	const toggleChapter = useCallback((chapterId: string) => {
		setExpandedChapters((prev) => {
			const next = new Set(prev);
			if (next.has(chapterId)) {
				next.delete(chapterId);
			} else {
				next.add(chapterId);
			}
			return next;
		});
	}, []);

	const handleAddChapter = useCallback(async () => {
		if (!currentProject) return;
		try {
			const nextOrder =
				projectChapters.length > 0
					? Math.max(...projectChapters.map((c) => c.order)) + 1
					: 1;
			await createChapter({
				projectId: currentProject.id,
				title: `第 ${nextOrder} 章`,
				order: nextOrder,
			});
			toast.success("章节已创建");
		} catch {
			toast.error("创建章节失败");
		}
	}, [currentProject, projectChapters]);

	const handleAddScene = useCallback(
		async (chapterId: string) => {
			if (!currentProject) return;
			try {
				const chapterScenes = projectScenes.filter(
					(s) => s.chapter === chapterId,
				);
				const nextOrder =
					chapterScenes.length > 0
						? Math.max(...chapterScenes.map((s) => s.order)) + 1
						: 1;
				await createScene({
					projectId: currentProject.id,
					chapterId,
					title: `场景 ${nextOrder}`,
					order: nextOrder,
					content: "",
				});
				toast.success("场景已创建");
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "创建场景失败";
				toast.error(errorMessage);
			}
		},
		[currentProject, projectScenes],
	);

	// 创建绘图场景
	const handleAddCanvasScene = useCallback(
		async (chapterId: string) => {
			if (!currentProject) return;
			try {
				const chapterScenes = projectScenes.filter(
					(s) => s.chapter === chapterId,
				);
				const nextOrder =
					chapterScenes.length > 0
						? Math.max(...chapterScenes.map((s) => s.order)) + 1
						: 1;
				await createCanvasScene({
					projectId: currentProject.id,
					chapterId,
					title: `画布 ${nextOrder}`,
					order: nextOrder,
				});
				toast.success("绘图场景已创建");
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "创建绘图场景失败";
				toast.error(errorMessage);
			}
		},
		[currentProject, projectScenes],
	);

	const handleSelectScene = useCallback(
		(scene: SceneInterface) => {
			setSelectedChapterId(scene.chapter);
			setSelectedSceneId(scene.id);
		},
		[setSelectedChapterId, setSelectedSceneId],
	);

	const getSceneWordCount = useCallback((scene: SceneInterface) => {
		try {
			if (typeof scene.content === "string") {
				const parsed = JSON.parse(scene.content);
				if (parsed?.root) {
					const text = extractTextFromSerialized(parsed);
					return countWords(text);
				}
			}
		} catch {}
		return 0;
	}, []);

	if (!currentProject) {
		return (
			<div className="flex items-center justify-center h-32 text-muted-foreground">
				<p>暂无项目</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* 工具栏 */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-xs">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
					<Input
						placeholder="搜索章节..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-7 pl-8 text-xs"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs gap-1"
					onClick={handleAddChapter}
				>
					<Plus className="size-3" />
					添加章节
				</Button>
				<div className="ml-auto text-xs text-muted-foreground">
					{projectChapters.length} 章节 · {projectScenes.length} 场景
				</div>
			</div>

			{/* 章节列表 - 横向布局 */}
			<div className="flex gap-3 overflow-x-auto pb-2">
				{filteredChapters.map((chapter) => {
					const chapterScenes = projectScenes
						.filter((s) => s.chapter === chapter.id)
						.sort((a, b) => a.order - b.order);
					const isExpanded = expandedChapters.has(chapter.id);
					const chapterWordCount = chapterScenes.reduce(
						(sum, s) => sum + getSceneWordCount(s),
						0,
					);

					return (
						<div
							key={chapter.id}
							className={cn(
								"flex-shrink-0 w-56 rounded-lg border bg-card",
								selectedChapterId === chapter.id && "ring-1 ring-primary",
							)}
						>
							{/* 章节头 */}
							<button
								onClick={() => toggleChapter(chapter.id)}
								className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
							>
								{isExpanded ? (
									<ChevronDown className="size-3.5 text-muted-foreground" />
								) : (
									<ChevronRight className="size-3.5 text-muted-foreground" />
								)}
								{isExpanded ? (
									<FolderOpen className="size-3.5 text-amber-500" />
								) : (
									<Folder className="size-3.5 text-amber-500" />
								)}
								<span className="flex-1 text-sm font-medium truncate">
									{chapter.title}
								</span>
								<Badge variant="secondary" className="text-[10px] h-4 px-1.5">
									{chapterWordCount.toLocaleString()}
								</Badge>
							</button>

							{/* 场景列表 */}
							{isExpanded && (
								<div className="border-t">
									{chapterScenes.length === 0 ? (
										<div className="p-2 text-xs text-muted-foreground text-center">
											暂无场景
										</div>
									) : (
										<div className="max-h-32 overflow-y-auto">
											{chapterScenes.map((scene) => (
												<button
													key={scene.id}
													onClick={() => handleSelectScene(scene)}
													className={cn(
														"w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/50 transition-colors",
														selectedSceneId === scene.id &&
															"bg-primary/10 text-primary",
													)}
												>
													{scene.type === "canvas" ? (
														<PenTool className="size-3 text-blue-500" />
													) : (
														<FileText className="size-3 text-muted-foreground" />
													)}
													<span className="flex-1 truncate">{scene.title}</span>
													{scene.type !== "canvas" && (
														<span className="text-[10px] text-muted-foreground tabular-nums">
															{getSceneWordCount(scene).toLocaleString()}
														</span>
													)}
												</button>
											))}
										</div>
									)}
									<div className="flex border-t">
										<button
											onClick={() => handleAddScene(chapter.id)}
											className="flex-1 flex items-center justify-center gap-1 p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
										>
											<Plus className="size-3" />
											添加场景
										</button>
										<button
											onClick={() => handleAddCanvasScene(chapter.id)}
											className="flex-1 flex items-center justify-center gap-1 p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l transition-colors"
											title="添加绘图场景"
										>
											<PenTool className="size-3" />
											添加画布
										</button>
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

// ============================================
// 角色面板
// ============================================

function CharactersContent() {
	const [searchQuery, setSearchQuery] = useState("");
	const [newName, setNewName] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const confirm = useConfirm();

	const projects = useLiveQuery(() => db.getAllProjects(), []) ?? [];
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);

	const currentProject = useMemo(
		() => projects.find((p) => p.id === selectedProjectId) ?? projects[0],
		[projects, selectedProjectId],
	);

	const roles =
		useLiveQuery(
			() =>
				currentProject
					? db.getRolesByProject(currentProject.id)
					: Promise.resolve([]),
			[currentProject?.id],
		) ?? [];

	const filteredRoles = useMemo(() => {
		if (!searchQuery) return roles;
		const query = searchQuery.toLowerCase();
		return roles.filter((r) => r.name.toLowerCase().includes(query));
	}, [roles, searchQuery]);

	const handleCreate = useCallback(async () => {
		if (!currentProject) return;
		const name = newName.trim() || "新角色";
		try {
			await createRole({ projectId: currentProject.id, name });
			setNewName("");
			toast.success("角色已创建");
		} catch {
			toast.error("创建角色失败");
		}
	}, [currentProject, newName]);

	const handleSaveEdit = useCallback(async () => {
		if (!editingId) return;
		const name = editingName.trim();
		if (!name) {
			toast.error("角色名称不能为空");
			return;
		}
		try {
			await updateRole(editingId, { name });
			setEditingId(null);
			setEditingName("");
			toast.success("角色已更新");
		} catch {
			toast.error("更新角色失败");
		}
	}, [editingId, editingName]);

	const handleDelete = useCallback(
		async (id: string, name: string) => {
			const ok = await confirm({
				title: "删除角色？",
				description: `确认删除角色 "${name}" 吗？该操作不可撤销。`,
				confirmText: "删除",
				cancelText: "取消",
			});
			if (!ok) return;
			try {
				await deleteRole(id);
				toast.success("角色已删除");
			} catch {
				toast.error("删除角色失败");
			}
		},
		[confirm],
	);

	if (!currentProject) {
		return (
			<div className="flex items-center justify-center h-32 text-muted-foreground">
				<p>暂无项目</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* 工具栏 */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-xs">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
					<Input
						placeholder="搜索角色..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-7 pl-8 text-xs"
					/>
				</div>
				<Input
					placeholder="新角色名称"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleCreate()}
					className="h-7 text-xs w-40"
				/>
				<Button
					variant="outline"
					size="sm"
					className="h-7 text-xs gap-1"
					onClick={handleCreate}
				>
					<Plus className="size-3" />
					添加角色
				</Button>
				<div className="ml-auto text-xs text-muted-foreground">
					{roles.length} 个角色
				</div>
			</div>

			{/* 角色列表 - 卡片布局 */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
				{filteredRoles.map((role) => (
					<div
						key={role.id}
						className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow"
					>
						<div className="flex items-start gap-2">
							<div className="flex-shrink-0 size-8 rounded-full bg-primary/10 flex items-center justify-center">
								<User className="size-4 text-primary" />
							</div>
							<div className="flex-1 min-w-0">
								{editingId === role.id ? (
									<Input
										value={editingName}
										onChange={(e) => setEditingName(e.target.value)}
										onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
										onBlur={handleSaveEdit}
										className="h-6 text-xs"
										autoFocus
									/>
								) : (
									<p className="text-sm font-medium truncate">{role.name}</p>
								)}
								{role.alias && role.alias.length > 0 && (
									<p className="text-xs text-muted-foreground truncate">
										{role.alias.length} 个别名
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-1 justify-end">
							{editingId !== role.id && (
								<>
									<Button
										variant="ghost"
										size="icon"
										className="size-6"
										onClick={() => {
											setEditingId(role.id);
											setEditingName(role.name);
										}}
									>
										<Pencil className="size-3" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-6 text-destructive"
										onClick={() => handleDelete(role.id, role.name)}
									>
										<Trash2 className="size-3" />
									</Button>
								</>
							)}
						</div>
					</div>
				))}
			</div>

			{filteredRoles.length === 0 && (
				<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
					{searchQuery ? "未找到匹配的角色" : "暂无角色，使用上方输入框创建"}
				</div>
			)}
		</div>
	);
}
