// 大纲视图主组件

import { FolderPlus, LayoutGrid, LayoutList, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import type { OutlineViewConfig } from "@/db/schema-outline";
import {
	createChapter,
	deleteChapter,
	renameChapter,
	reorderChapters,
} from "@/services/chapters";
import {
	createScene,
	deleteScene,
	renameScene,
	reorderScenes,
} from "@/services/scenes";
import { OutlineCardsView } from "./outline-cards-view";
import { OutlineTreeView } from "./outline-tree-view";

interface OutlineViewProps {
	projects: ProjectInterface[];
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	selectedProjectId: string | null;
	onProjectChange: (projectId: string) => void;
	onNavigateToScene?: (sceneId: string) => void;
}

export function OutlineView({
	projects,
	chapters,
	scenes,
	selectedProjectId,
	onProjectChange,
	onNavigateToScene,
}: OutlineViewProps) {
	const confirm = useConfirm();
	const [viewMode, setViewMode] =
		useState<OutlineViewConfig["viewMode"]>("tree");
	const [searchQuery, setSearchQuery] = useState("");
	const [showWordCount] = useState(true);
	const [showStatus] = useState(true);

	const currentProject = useMemo(
		() => projects.find((p) => p.id === selectedProjectId) ?? projects[0],
		[projects, selectedProjectId],
	);

	const projectChapters = useMemo(
		() => chapters.filter((ch) => ch.project === currentProject?.id),
		[chapters, currentProject?.id],
	);

	const projectScenes = useMemo(
		() => scenes.filter((sc) => sc.project === currentProject?.id),
		[scenes, currentProject?.id],
	);

	// 过滤数据
	const filteredChapters = useMemo(() => {
		if (!searchQuery) return projectChapters;
		const query = searchQuery.toLowerCase();
		return projectChapters.filter((ch) =>
			ch.title.toLowerCase().includes(query),
		);
	}, [projectChapters, searchQuery]);

	const filteredScenes = useMemo(() => {
		if (!searchQuery) return projectScenes;
		const query = searchQuery.toLowerCase();
		return projectScenes.filter((sc) => sc.title.toLowerCase().includes(query));
	}, [projectScenes, searchQuery]);

	// 操作处理函数
	const handleAddChapter = useCallback(async () => {
		if (!currentProject) {
			toast.error("请先选择项目");
			return;
		}
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
				});
				toast.success("场景已创建");
			} catch {
				toast.error("创建场景失败");
			}
		},
		[currentProject, projectScenes],
	);

	const handleRenameChapter = useCallback(
		async (chapterId: string, newTitle: string) => {
			if (!newTitle.trim()) {
				toast.error("标题不能为空");
				return;
			}
			try {
				await renameChapter(chapterId, newTitle.trim());
				toast.success("章节已重命名");
			} catch {
				toast.error("重命名失败");
			}
		},
		[],
	);

	const handleRenameScene = useCallback(
		async (sceneId: string, newTitle: string) => {
			if (!newTitle.trim()) {
				toast.error("标题不能为空");
				return;
			}
			try {
				await renameScene(sceneId, newTitle.trim());
				toast.success("场景已重命名");
			} catch {
				toast.error("重命名失败");
			}
		},
		[],
	);

	const handleDeleteChapter = useCallback(
		async (chapterId: string, title: string) => {
			const ok = await confirm({
				title: "删除章节？",
				description: `确认删除章节 "${title}" 吗？该操作不可撤销，章节下的所有场景也将被删除。`,
				confirmText: "删除",
				cancelText: "取消",
			});
			if (!ok) return;
			try {
				await deleteChapter(chapterId);
				toast.success("章节已删除");
			} catch {
				toast.error("删除失败");
			}
		},
		[confirm],
	);

	const handleDeleteScene = useCallback(
		async (sceneId: string, title: string) => {
			const ok = await confirm({
				title: "删除场景？",
				description: `确认删除场景 "${title}" 吗？该操作不可撤销。`,
				confirmText: "删除",
				cancelText: "取消",
			});
			if (!ok) return;
			try {
				await deleteScene(sceneId);
				toast.success("场景已删除");
			} catch {
				toast.error("删除失败");
			}
		},
		[confirm],
	);

	// 章节重排
	const handleReorderChapters = useCallback(
		async (activeId: string, overId: string) => {
			const activeChapter = projectChapters.find((c) => c.id === activeId);
			const overChapter = projectChapters.find((c) => c.id === overId);
			if (!activeChapter || !overChapter) return;

			try {
				await reorderChapters(
					activeId,
					activeChapter.order,
					overId,
					overChapter.order,
				);
				toast.success("章节顺序已更新");
			} catch {
				toast.error("更新顺序失败");
			}
		},
		[projectChapters],
	);

	// 场景重排
	const handleReorderScenes = useCallback(
		async (activeId: string, overId: string) => {
			const activeScene = projectScenes.find((s) => s.id === activeId);
			const overScene = projectScenes.find((s) => s.id === overId);
			if (!activeScene || !overScene) return;

			try {
				await reorderScenes(
					activeId,
					activeScene.order,
					overId,
					overScene.order,
				);
				toast.success("场景顺序已更新");
			} catch {
				toast.error("更新顺序失败");
			}
		},
		[projectScenes],
	);

	if (!currentProject) {
		return (
			<div className="flex h-full items-center justify-center">
				<div className="text-center">
					<h2 className="text-xl font-semibold mb-2">暂无项目</h2>
					<p className="text-muted-foreground">请先创建一个项目</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* 顶部工具栏 */}
			<div className="flex items-center gap-2 p-4 border-b">
				<h2 className="text-lg font-semibold">大纲视图</h2>

				<div className="flex-1" />

				{/* 项目选择器 */}
				{projects.length > 1 && (
					<Select value={currentProject.id} onValueChange={onProjectChange}>
						<SelectTrigger className="w-[180px] h-8">
							<SelectValue placeholder="选择项目" />
						</SelectTrigger>
						<SelectContent>
							{projects.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				{/* 视图切换 */}
				<Tabs
					value={viewMode}
					onValueChange={(v) => setViewMode(v as typeof viewMode)}
				>
					<TabsList className="grid grid-cols-2 w-[160px] h-8">
						<TabsTrigger value="tree" className="gap-1.5 text-xs">
							<LayoutList className="size-3.5" />
							<span>树形</span>
						</TabsTrigger>
						<TabsTrigger value="cards" className="gap-1.5 text-xs">
							<LayoutGrid className="size-3.5" />
							<span>卡片</span>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{/* 搜索栏和添加按钮 */}
			<div className="flex items-center gap-2 p-4 border-b">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="搜索章节、场景..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9 h-8"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleAddChapter}
					className="gap-1.5"
				>
					<FolderPlus className="size-4" />
					添加章节
				</Button>
			</div>

			{/* 视图内容 */}
			<ScrollArea className="flex-1">
				<div className="p-4">
					{viewMode === "tree" && (
						<OutlineTreeView
							project={currentProject}
							chapters={filteredChapters}
							scenes={filteredScenes}
							showWordCount={showWordCount}
							showStatus={showStatus}
							onNavigateToScene={onNavigateToScene}
							onAddScene={handleAddScene}
							onRenameChapter={handleRenameChapter}
							onRenameScene={handleRenameScene}
							onDeleteChapter={handleDeleteChapter}
							onDeleteScene={handleDeleteScene}
							onReorderChapters={handleReorderChapters}
							onReorderScenes={handleReorderScenes}
						/>
					)}
					{viewMode === "cards" && (
						<OutlineCardsView
							project={currentProject}
							chapters={filteredChapters}
							scenes={filteredScenes}
							onNavigateToScene={onNavigateToScene}
							onAddScene={handleAddScene}
							onRenameScene={handleRenameScene}
							onDeleteScene={handleDeleteScene}
						/>
					)}
				</div>
			</ScrollArea>

			{/* 底部统计 */}
			<div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
				<span>
					共 {projectChapters.length} 章节 · {projectScenes.length} 场景
				</span>
				<span>总字数: {calculateTotalWords(projectScenes)}</span>
			</div>
		</div>
	);
}

function calculateTotalWords(scenes: SceneInterface[]): string {
	const total = scenes.reduce((sum, scene) => {
		if (typeof scene.content === "string") {
			try {
				const parsed = JSON.parse(scene.content);
				if (parsed?.root) {
					const {
						extractTextFromSerialized,
						countWords,
					} = require("@/lib/statistics");
					const text = extractTextFromSerialized(parsed);
					return sum + countWords(text);
				}
			} catch {
				return sum + scene.content.length;
			}
		}
		return sum;
	}, 0);
	return total.toLocaleString();
}
