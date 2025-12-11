// 增强的大纲视图主组件

import {
	BarChart,
	FolderPlus,
	LayoutGrid,
	LayoutList,
	PanelRight,
	PanelRightClose,
	Search,
} from "lucide-react";
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
	reorderChapters,
} from "@/services/chapters";
import { useWikiEntriesByProject } from "@/services/wiki";
import { createScene, deleteScene, reorderScenes } from "@/services/scenes";
import { DiagramViewRedesigned } from "./diagram-view-redesigned";
import { OutlineCardsView } from "./outline-cards-view";
import { OutlineDetailPanel } from "./outline-detail-panel";
import { OutlineTreeView } from "./outline-tree-view";

interface OutlineViewProps {
	projects: ProjectInterface[];
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	selectedProjectId: string | null;
	onProjectChange: (projectId: string) => void;
	onNavigateToScene?: (sceneId: string) => void;
}

export function OutlineViewEnhanced({
	projects,
	chapters,
	scenes,
	selectedProjectId,
	onProjectChange,
	onNavigateToScene,
}: OutlineViewProps) {
	const confirm = useConfirm();
	const [viewMode, setViewMode] = useState<"tree" | "cards" | "diagram">(
		"tree",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedNode, setSelectedNode] = useState<
		| (ChapterInterface & { type: "chapter" })
		| (SceneInterface & { type: "scene" })
		| null
	>(null);
	const [showDetailPanel, setShowDetailPanel] = useState(false);

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

	// 获取 Wiki 数据用于图表
	const wikiEntries = useWikiEntriesByProject(currentProject?.id || null);

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
				if (selectedNode?.id === chapterId) {
					setSelectedNode(null);
				}
				toast.success("章节已删除");
			} catch {
				toast.error("删除失败");
			}
		},
		[confirm, selectedNode],
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
				if (selectedNode?.id === sceneId) {
					setSelectedNode(null);
				}
				toast.success("场景已删除");
			} catch {
				toast.error("删除失败");
			}
		},
		[confirm, selectedNode],
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

	// 选择节点
	const handleSelectChapter = useCallback((chapter: ChapterInterface) => {
		setSelectedNode({ ...chapter, type: "chapter" });
		setShowDetailPanel(true);
	}, []);

	const handleSelectScene = useCallback((scene: SceneInterface) => {
		setSelectedNode({ ...scene, type: "scene" } as any);
		setShowDetailPanel(true);
	}, []);

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
		<div className="flex h-full outline-view">
			{/* 主内容区 */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* 顶部工具栏 */}
				<div className="flex items-center gap-2 px-6 py-3 border-b border-border/30 bg-muted/5">
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
						<TabsList className="grid grid-cols-3 w-[240px] h-8">
							<TabsTrigger value="tree" className="gap-1.5 text-xs">
								<LayoutList className="size-3.5" />
								<span>树形</span>
							</TabsTrigger>
							<TabsTrigger value="cards" className="gap-1.5 text-xs">
								<LayoutGrid className="size-3.5" />
								<span>卡片</span>
							</TabsTrigger>
							<TabsTrigger value="diagram" className="gap-1.5 text-xs">
								<BarChart className="size-3.5" />
								<span>图表</span>
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* 详情面板切换 */}
					<Button
						size="icon"
						variant="ghost"
						onClick={() => setShowDetailPanel(!showDetailPanel)}
						className="h-8 w-8"
					>
						{showDetailPanel ? (
							<PanelRightClose className="size-4" />
						) : (
							<PanelRight className="size-4" />
						)}
					</Button>
				</div>

				{/* 搜索栏和添加按钮 */}
				<div className="flex items-center gap-2 px-6 py-3 border-b border-border/30 bg-muted/5">
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
				{viewMode === "diagram" ? (
					<DiagramViewRedesigned
						chapters={filteredChapters}
						scenes={filteredScenes}
						characters={wikiEntries as any}
					/>
				) : (
					<ScrollArea className="flex-1">
						<div className="p-4">
							{viewMode === "tree" && (
								<OutlineTreeView
									project={currentProject}
									chapters={filteredChapters}
									scenes={filteredScenes}
									showWordCount={true}
									showStatus={true}
									onNavigateToScene={onNavigateToScene}
									onAddScene={handleAddScene}
									onSelectChapter={handleSelectChapter}
									onSelectScene={handleSelectScene}
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
									onSelectScene={handleSelectScene}
									onDeleteScene={handleDeleteScene}
								/>
							)}
						</div>
					</ScrollArea>
				)}

				{/* 底部统计 */}
				<div className="flex items-center justify-between px-6 py-3 border-t border-border/30 bg-muted/5 text-sm text-muted-foreground">
					<span>
						共 {projectChapters.length} 章节 · {projectScenes.length} 场景
					</span>
					<span>总字数: {calculateTotalWords(projectScenes)}</span>
				</div>
			</div>

			{/* 详情面板 */}
			{showDetailPanel && selectedNode && (
				<div className="w-[400px] shrink-0 border-l border-border/30 bg-muted/5">
					<OutlineDetailPanel
						node={selectedNode}
						onClose={() => setShowDetailPanel(false)}
						onUpdate={() => {
							// 触发数据刷新
						}}
					/>
				</div>
			)}
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
