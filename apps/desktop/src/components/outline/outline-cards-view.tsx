// 卡片视图组件（Scrivener 风格）

import {
	Edit3,
	FileText,
	Folder,
	GripVertical,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

interface OutlineCardsViewProps {
	project: ProjectInterface;
	chapters: ChapterInterface[];
	scenes: SceneInterface[];
	onNavigateToScene?: (sceneId: string) => void;
	onAddScene?: (chapterId: string) => void;
	onRenameScene?: (sceneId: string, newTitle: string) => void;
	onDeleteScene?: (sceneId: string, title: string) => void;
}

export function OutlineCardsView({
	chapters,
	scenes,
	onNavigateToScene,
	onAddScene,
	onRenameScene,
	onDeleteScene,
}: OutlineCardsViewProps) {
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
		<div className="space-y-8">
			{chapters
				.sort((a, b) => a.order - b.order)
				.map((chapter) => {
					const chapterScenes = scenes
						.filter((s) => s.chapter === chapter.id)
						.sort((a, b) => a.order - b.order);

					return (
						<ChapterCardGroup
							key={chapter.id}
							chapter={chapter}
							scenes={chapterScenes}
							onNavigateToScene={onNavigateToScene}
							onAddScene={onAddScene}
							onRenameScene={onRenameScene}
							onDeleteScene={onDeleteScene}
						/>
					);
				})}
		</div>
	);
}

interface ChapterCardGroupProps {
	chapter: ChapterInterface;
	scenes: SceneInterface[];
	onNavigateToScene?: (sceneId: string) => void;
	onAddScene?: (chapterId: string) => void;
	onRenameScene?: (sceneId: string, newTitle: string) => void;
	onDeleteScene?: (sceneId: string, title: string) => void;
}

function ChapterCardGroup({
	chapter,
	scenes,
	onNavigateToScene,
	onAddScene,
	onRenameScene,
	onDeleteScene,
}: ChapterCardGroupProps) {
	return (
		<div>
			{/* 章节标题 */}
			<div className="flex items-center gap-2 mb-4">
				<h3 className="text-lg font-semibold">{chapter.title}</h3>
				<Badge variant="secondary">{scenes.length} 场景</Badge>
				<Button
					variant="ghost"
					size="sm"
					className="ml-auto gap-1"
					onClick={() => onAddScene?.(chapter.id)}
				>
					<Plus className="size-4" />
					添加场景
				</Button>
			</div>

			{/* 场景卡片网格 */}
			{scenes.length > 0 ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{scenes.map((scene) => (
						<SceneCard
							key={scene.id}
							scene={scene}
							onNavigate={onNavigateToScene}
							onRename={onRenameScene}
							onDelete={onDeleteScene}
						/>
					))}
				</div>
			) : (
				<div className="p-6 text-center border border-dashed rounded-lg">
					<p className="text-sm text-muted-foreground mb-2">暂无场景</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onAddScene?.(chapter.id)}
					>
						<Plus className="size-4 mr-1" />
						添加第一个场景
					</Button>
				</div>
			)}
		</div>
	);
}

interface SceneCardProps {
	scene: SceneInterface;
	onNavigate?: (sceneId: string) => void;
	onRename?: (sceneId: string, newTitle: string) => void;
	onDelete?: (sceneId: string, title: string) => void;
}

function SceneCard({ scene, onNavigate, onRename, onDelete }: SceneCardProps) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(scene.title);

	const { wordCount, excerpt } = useMemo(() => {
		try {
			const content =
				typeof scene.content === "string"
					? JSON.parse(scene.content)
					: scene.content;
			const text = extractTextFromSerialized(content);
			return {
				wordCount: countWords(text),
				excerpt: text.slice(0, 100) + (text.length > 100 ? "..." : ""),
			};
		} catch {
			return { wordCount: 0, excerpt: "" };
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
		<Card
			className={cn(
				"group cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
				wordCount === 0 && "border-dashed opacity-60",
			)}
			onClick={handleClick}
		>
			<CardHeader className="pb-3">
				<div className="flex items-start gap-2">
					<div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing mt-1">
						<GripVertical className="size-4 text-muted-foreground" />
					</div>
					<FileText className="size-4 text-muted-foreground mt-1 shrink-0" />
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
								className="h-7 text-sm"
							/>
						) : (
							<>
								<CardTitle className="text-base truncate">
									{scene.title}
								</CardTitle>
								<CardDescription className="text-xs mt-1">
									{wordCount.toLocaleString()} 字
								</CardDescription>
							</>
						)}
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
							<Button
								variant="ghost"
								size="icon"
								className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
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
								删除
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>
			{excerpt && (
				<CardContent>
					<p className="text-xs text-muted-foreground line-clamp-3">
						{excerpt}
					</p>
				</CardContent>
			)}
		</Card>
	);
}
