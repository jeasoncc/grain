import debounce from "lodash/debounce";
import {
	ArrowDown,
	ArrowUp,
	Flame,
	Layers,
	Notebook,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SerializedEditorState } from "lexical";

import { Editor } from "@/components/blocks/editor-x/editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/db/curd";
import type {
	ChapterInterface,
	ProjectInterface,
	SceneInterface,
} from "@/db/schema";
import { toast } from "sonner";

interface StoryWorkspaceProps {
	projects: ProjectInterface[];
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	activeProjectId?: string;
	onCreateProject?: () => void;
}

const SCENE_AUTO_SAVE_MS = 800;

export function StoryWorkspace({
	projects,
	chapters,
	scenes,
	activeProjectId,
	onCreateProject,
}: StoryWorkspaceProps) {
	const initialProjectId = activeProjectId ?? projects[0]?.id ?? null;
	const [selectedProjectId, setSelectedProjectId] =
		useState<string | null>(initialProjectId);
	const [selectedChapterId, setSelectedChapterId] =
		useState<string | null>(null);
	const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

	const [chapterEditId, setChapterEditId] = useState<string | null>(null);
	const [chapterEditTitle, setChapterEditTitle] = useState("");
	const [sceneEditId, setSceneEditId] = useState<string | null>(null);
	const [sceneEditTitle, setSceneEditTitle] = useState("");

	const [editorInitialState, setEditorInitialState] =
		useState<SerializedEditorState>();
	const [sceneWordCount, setSceneWordCount] = useState(0);
	const [isSaving, setIsSaving] = useState(false);

	// Context menu state for right-click actions on Chapters/Scenes panels
	const [ctxMenu, setCtxMenu] = useState<
		| { visible: true; x: number; y: number; type: "chapters" | "scenes" }
		| { visible: false }
	>({ visible: false });

	const [confirm, setConfirm] = useState<
		| { open: true; type: "chapter" | "scene"; id: string; name: string }
		| { open: false }
	>({ open: false });

	// keep project selection in sync with external changes
	useEffect(() => {
		if (activeProjectId && activeProjectId !== selectedProjectId) {
			setSelectedProjectId(activeProjectId);
		}
	}, [activeProjectId, selectedProjectId]);

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
	}, [projects, selectedProjectId]);

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
	}, [projectChapters, selectedChapterId]);

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
	}, [chapterScenes, selectedSceneId]);

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
		setSceneWordCount(countWordsFromSerialized(initial));
	}, [activeScene?.id]);

	const debouncedSave = useMemo(
		() =>
			debounce(
				async (sceneId: string, serialized: SerializedEditorState) => {
					setIsSaving(true);
					try {
						await db.updateScene(sceneId, {
							content: JSON.stringify(serialized),
						});
					} catch (error) {
						loggerError("Failed to save scene", error);
						toast.error("保存场景内容失败");
					} finally {
						setIsSaving(false);
					}
				},
				SCENE_AUTO_SAVE_MS,
			),
		[],
	);

	useEffect(
		() => () => {
			debouncedSave.cancel();
		},
		[debouncedSave],
	);

	const handleSerializedChange = useCallback(
		(serialized: SerializedEditorState) => {
			if (!activeScene) return;
			setSceneWordCount(countWordsFromSerialized(serialized));
			debouncedSave(activeScene.id, serialized);
		},
		[activeScene, debouncedSave],
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
				(a, b) => new Date(b.lastEdit).getTime() - new Date(a.lastEdit).getTime(),
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
	}, [projectChapters, selectedProjectId]);

	const handleDeleteChapter = useCallback(
		async (chapterId: string) => {
			const target = projectChapters.find((chapter) => chapter.id === chapterId);
			if (!target) return;
			setConfirm({ open: true, type: "chapter", id: chapterId, name: target.title });
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

	const proceedDeletion = useCallback(async () => {
		if (!('open' in confirm) || !confirm.open) return;
		const current = confirm;
		setConfirm({ open: false });
		try {
			if (current.type === 'chapter') {
				await db.deleteChapter(current.id);
				toast.success('章节已删除');
			} else {
				await db.deleteScene(current.id);
				toast.success('场景已删除');
			}
		} catch (error) {
			loggerError('Failed to delete', error);
			toast.error('删除失败');
		}
	}, [confirm]);

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
	}, [chapterScenes, selectedChapterId, selectedProjectId]);

	const handleDeleteScene = useCallback(
		async (sceneId: string) => {
			const target = chapterScenes.find((scene) => scene.id === sceneId);
			if (!target) return;
			setConfirm({ open: true, type: "scene", id: sceneId, name: target.title });
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

	return (
		<TooltipProvider>
			<div className="relative flex h-screen bg-background text-foreground" onClick={() => ctxMenu.visible && setCtxMenu({visible:false})}>
				<aside className="hidden w-72 flex-col border-r bg-background lg:flex">
					<div className="border-b px-5 py-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs uppercase tracking-wide text-muted-foreground">
									Story projects
								</p>
								<h1 className="text-lg font-semibold">
									Project hub
								</h1>
							</div>
							<Button
								size="sm"
								variant="secondary"
								onClick={onCreateProject}
							>
								<Plus className="mr-1.5 size-4" />
								New
							</Button>
						</div>
					</div>
					<ScrollArea className="flex-1">
						<div className="space-y-4 px-4 py-5">
							<ul className="space-y-2">
								{projects.map((project) => {
									const isActive = project.id === selectedProjectId;
									const projectSceneCount = scenes.filter(
										(scene) => scene.project === project.id,
									).length;
									const projectChapterCount = chapters.filter(
										(chapter) => chapter.project === project.id,
									).length;
									return (
										<li key={project.id}>
											<button
												type="button"
												onClick={() => setSelectedProjectId(project.id)}
												className={`w-full rounded-xl border px-3 py-2 text-left transition ${
													isActive
														? "bg-accent/30"
														: "hover:bg-muted"
												}`}
											>
												<div className="flex items-center justify-between">
													<div>
														<p className="text-sm font-semibold">
															{project.title}
														</p>
														<p className="text-xs text-muted-foreground">
															{projectChapterCount} chapters · {projectSceneCount} scenes
														</p>
													</div>
													<Badge variant={isActive ? "success" : "outline"}>
														{formatRelativeTime(project.lastOpen)}
													</Badge>
												</div>
											</button>
										</li>
									);
								})}
								{projects.length === 0 ? (
									<li>
										<div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
											暂无项目，点击右上角按钮创建新的作品。
										</div>
									</li>
								) : null}
			{/* Confirm Deletion Modal */}
			{confirm.open ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/40" onClick={() => setConfirm({ open: false })} />
					<div className="relative z-10 w-full max-w-sm rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
						<h4 className="mb-2 text-sm font-semibold">确认删除</h4>
						<p className="mb-4 text-sm text-muted-foreground">
							确认删除{confirm.type === 'chapter' ? '章节' : '场景'} “{('open' in confirm && confirm.open) ? confirm.name : ''}” 吗？此操作不可撤销。
						</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setConfirm({ open: false })}>取消</Button>
							<Button className="bg-red-600 text-white hover:bg-red-700" onClick={proceedDeletion}>删除</Button>
						</div>
					</div>
				</div>
			) : null}
							</ul>
						</div>
					</ScrollArea>
				</aside>
				<main className="flex-1 overflow-hidden">
					<div className="flex h-full flex-col">
						<header className="border-b bg-background px-8 py-5">
							<div className="flex flex-wrap items-center justify-between gap-4">
								<div>
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										{selectedProjectId ? "Project overview" : "No project selected"}
									</p>
									<h2 className="text-2xl font-semibold">
										{projects.find((project) => project.id === selectedProjectId)
											?.title ?? "Select a project"}
									</h2>
								</div>
								<div className="flex items-center gap-3">
									<Button variant="outline" onClick={() => setSelectedSceneId(null)}>
										<Notebook className="mr-2 size-4" />
										Scene list
									</Button>
									<Button>
										<Flame className="mr-2 size-4" />
										Start focus session
									</Button>
								</div>
							</div>
							<div className="mt-6 grid gap-4 md:grid-cols-3">
								<ProjectStatCard
									label="Chapters"
									value={projectStats.chapterCount}
									description="Structured narrative checkpoints"
								/>
								<ProjectStatCard
									label="Scenes"
									value={projectStats.sceneCount}
									description="Drafted and in progress"
								/>
								<ProjectStatCard
									label="Words logged"
									value={projectStats.wordCount.toLocaleString()}
									description={`Last update ${formatRelativeTime(projectStats.lastEdited)}`}
								/>
							</div>
						</header>
						<div className="flex flex-1 overflow-hidden">
							<div className="grid flex-1 gap-4 overflow-hidden px-8 py-6 xl:grid-cols-[300px,320px,1fr]">
								<section
									className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
									onContextMenu={(e) => {
										e.preventDefault();
										setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, type: "chapters" });
									}}
								>
									<div className="flex items-center justify-between border-b px-4 py-3">
										<div>
											<h3 className="text-sm font-semibold">Chapters</h3>
											<p className="text-xs text-muted-foreground">
												双击重命名，使用控制按钮调整顺序
											</p>
										</div>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="text-foreground/70 hover:text-foreground"
													onClick={handleAddChapter}
												>
													<Plus className="size-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>新增章节</TooltipContent>
										</Tooltip>
									</div>
									<ScrollArea className="flex-1">
										<ul className="space-y-1 px-2 py-2">
											{projectChapters.map((chapter) => {
												const isSelected = chapter.id === selectedChapterId;
												const chapterScenesCount = scenes.filter(
													(scene) => scene.chapter === chapter.id,
												).length;
												const chapterWordCount = scenes
													.filter((scene) => scene.chapter === chapter.id)
													.reduce(
														(sum, scene) => sum + countSceneWords(scene),
														0,
													);
												return (
													<li key={chapter.id}>
														<div
															className={`group rounded-xl border px-3 py-2 transition ${
																isSelected ? "bg-accent/30" : "hover:bg-muted"}
															}`}
														>
															<div
																className="flex cursor-pointer items-center justify-between gap-2"
																onClick={() => setSelectedChapterId(chapter.id)}
																onDoubleClick={() => {
																	setChapterEditId(chapter.id);
																	setChapterEditTitle(chapter.title);
																}}
															>
																<div className="flex-1">
																	{chapterEditId === chapter.id ? (
																		<form
																			onSubmit={(event) => {
																				event.preventDefault();
																				commitChapterRename();
																			}}
																		>
																			<Input
																				value={chapterEditTitle}
																				onChange={(event) =>
																					setChapterEditTitle(event.target.value)
																				}
																				onBlur={() => {
																					setChapterEditId(null);
																					setChapterEditTitle("");
																				}}
																				autoFocus
																				className="h-8 text-sm"
																			/>
																		</form>
																	) : (
																		<>
																			<p className="text-sm font-semibold">
																				{chapter.title}
																			</p>
																			<p className="text-xs text-muted-foreground">
																				{chapterScenesCount} scenes ·{" "}
																				{chapterWordCount.toLocaleString()} words
																			</p>
																		</>
																	)}
																</div>
																<div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-foreground/60 hover:text-foreground"
																				disabled={chapter.order === 1}
																				onClick={() =>
																					handleChapterReorder(chapter.id, "up")
																				}
																			>
																				<ArrowUp className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>上移</TooltipContent>
																	</Tooltip>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-foreground/60 hover:text-foreground"
																				disabled={
																					chapter.order ===
																					Math.max(
																						...projectChapters.map(
																							(item) => item.order,
																						),
																					)
																				}
																				onClick={() =>
																					handleChapterReorder(chapter.id, "down")
																				}
																			>
																				<ArrowDown className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>下移</TooltipContent>
																	</Tooltip>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-foreground/60 hover:text-foreground"
																				onClick={() => {
																					setChapterEditId(chapter.id);
																					setChapterEditTitle(chapter.title);
																				}}
																			>
																				<Pencil className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>重命名</TooltipContent>
																	</Tooltip>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-red-500 hover:text-red-600"
																				onClick={() => handleDeleteChapter(chapter.id)}
																			>
																				<Trash2 className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>删除</TooltipContent>
																	</Tooltip>
																</div>
															</div>
														</div>
													</li>
												);
											})}
											{projectChapters.length === 0 ? (
												<li>
													<div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
														暂无章节，点击右上角按钮创建。
													</div>
												</li>
											) : null}
										</ul>
									</ScrollArea>
								</section>
								<section
									className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm"
									onContextMenu={(e) => {
										e.preventDefault();
										setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, type: "scenes" });
									}}
								>
									<div className="flex items-center justify-between border-b px-4 py-3">
										<div>
											<h3 className="text-sm font-semibold">Scenes</h3>
											<p className="text-xs text-muted-foreground">维护场景顺序，双击重命名</p>
										</div>
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="text-foreground/70 hover:text-foreground"
													onClick={handleAddScene}
													disabled={!selectedChapterId}
												>
													<Plus className="size-4" />
												</Button>
											</TooltipTrigger>
											<TooltipContent>新增场景</TooltipContent>
										</Tooltip>
									</div>
									<ScrollArea className="flex-1">
										<ul className="space-y-1 px-2 py-2">
											{chapterScenes.map((scene) => {
												const isActive = scene.id === selectedSceneId;
												const words = countSceneWords(scene);
												return (
													<li key={scene.id}>
														<div
															className={`group rounded-xl border px-3 py-2 transition ${
																isActive ? "bg-accent/30" : "hover:bg-muted"
															}`}
														>
															<div
																className="flex cursor-pointer items-center justify-between gap-2"
																onClick={() => setSelectedSceneId(scene.id)}
																onDoubleClick={() => {
																	setSceneEditId(scene.id);
																	setSceneEditTitle(scene.title);
																}}
															>
																<div className="flex-1">
																	{sceneEditId === scene.id ? (
																		<form
																			onSubmit={(event) => {
																				event.preventDefault();
																				commitSceneRename();
																			}}
																		>
																			<Input
																				value={sceneEditTitle}
																				onChange={(event) =>
																					setSceneEditTitle(event.target.value)
																				}
																				onBlur={() => {
																					setSceneEditId(null);
																					setSceneEditTitle("");
																				}}
																				autoFocus
																				className="h-8 text-sm text-foreground"
																			/>
																		</form>
																	) : (
																		<>
																			<p className="text-sm font-semibold text-foreground">
																				{scene.title}
																			</p>
																			<p className="text-xs text-muted-foreground">
																				{words.toLocaleString()} words ·{" "}
																				{formatRelativeTime(scene.lastEdit)}
																			</p>
																		</>
																	)}
																</div>
																<div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-foreground/60 hover:text-foreground"
																				disabled={scene.order === 1}
																				onClick={() => handleSceneReorder(scene.id, "up")}
																			>
																				<ArrowUp className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>上移</TooltipContent>
																	</Tooltip>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-foreground/60 hover:text-foreground"
																				disabled={
																					scene.order ===
																					Math.max(
																						...chapterScenes.map(
																							(item) => item.order,
																						),
																					)
																				}
																				onClick={() => handleSceneReorder(scene.id, "down")}
																			>
																				<ArrowDown className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>下移</TooltipContent>
																	</Tooltip>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-foreground/60 hover:text-foreground"
																				onClick={() => {
																					setSceneEditId(scene.id);
																					setSceneEditTitle(scene.title);
																				}}
																			>
																				<Pencil className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>重命名</TooltipContent>
																	</Tooltip>
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				variant="ghost"
																				size="icon"
																				className="text-red-500 hover:text-red-600"
																				onClick={() => handleDeleteScene(scene.id)}
																			>
																				<Trash2 className="size-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>删除</TooltipContent>
																	</Tooltip>
																</div>
															</div>
														</div>
													</li>
												);
											})}
											{chapterScenes.length === 0 ? (
												<li>
													<div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
														暂无场景，点击右上角新增。
													</div>
												</li>
											) : null}
										</ul>
									</ScrollArea>
								</section>
								<section className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
									<div className="flex flex-1 flex-col overflow-hidden">
										{editorInitialState && selectedSceneId ? (
											<Editor
												key={selectedSceneId}
												editorSerializedState={editorInitialState}
												onSerializedChange={handleSerializedChange}
											/>
										) : (
											<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
												请选择一个场景开始创作。
											</div>
										)}
									</div>
								</section>
							</div>
						</div>
					</div>
				</main>
			{/* Right-click Context Menu */}
			{ctxMenu.visible ? (
				<div
					className="absolute z-50 min-w-40 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
					style={{ left: ctxMenu.x, top: ctxMenu.y }}
					onClick={(e) => e.stopPropagation()}
				>
					{ctxMenu.type === "chapters" ? (
						<button
							className="w-full select-none rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
							onClick={() => {
								setCtxMenu({ visible: false });
								handleAddChapter();
							}}
						>
							创建章节
						</button>
					) : null}
					{ctxMenu.type === "scenes" ? (
						<button
							className="w-full select-none rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
							disabled={!selectedChapterId}
							onClick={() => {
								setCtxMenu({ visible: false });
								handleAddScene();
							}}
						>
							创建 Scene
						</button>
					) : null}
				</div>
			) : null}
		</div>
		</TooltipProvider>
	);
}

function ProjectStatCard({
	label,
	value,
	description,
}: {
	label: string;
	value: number | string;
	description: string;
}) {
	return (
		<Card className="bg-card text-card-foreground">
			<CardHeader>
				<CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
					{label}
				</CardTitle>
				<CardDescription className="text-xs text-muted-foreground">
					{description}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-2xl font-semibold">{value}</p>
			</CardContent>
		</Card>
	);
}

function loggerError(message: string, error: unknown) {
	if (error instanceof Error) {
		console.error(message, error);
	} else {
		console.error(message);
	}
}

function parseSceneContent(scene: SceneInterface | null): SerializedEditorState {
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

function extractTextFromSerialized(state?: SerializedEditorState): string {
	if (!state?.root) return "";
	const collect = (node: any): string => {
		if (!node) return "";
		if (typeof node.text === "string") {
			return node.text;
		}
		if (Array.isArray(node.children)) {
			return node.children.map(collect).join(" ");
		}
		return "";
	};
	return collect(state.root);
}

function countWordsFromSerialized(state?: SerializedEditorState): number {
	const text = extractTextFromSerialized(state)
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (!text) return 0;
	return text.split(" ").length;
}

function countSceneWords(scene: SceneInterface): number {
	try {
		return countWordsFromSerialized(parseSceneContent(scene));
	} catch {
		if (typeof scene.content === "string") {
			return scene.content.split(/\s+/).filter(Boolean).length;
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

