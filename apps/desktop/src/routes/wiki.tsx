/**
 * Wiki 知识库页面 - 显示和编辑 Wiki 条目
 * 使用 Unified Sidebar 中的 WikiPanel 进行条目管理
 */
import { createFileRoute } from "@tanstack/react-router";
import {
	BookOpen,
	Calendar,
	Hash,
	Loader2,
	Plus,
	Save,
	Tag,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import logger from "@/log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUnifiedSidebarStore } from "@/stores/unified-sidebar";
import {
	getWikiEntry,
	updateWikiEntry,
	createWikiEntry,
} from "@/services/wiki";
import { useSelectionStore } from "@/stores/selection";
import type { WikiEntryInterface } from "@/db/schema";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/wiki")({
	component: WikiPage,
});

function WikiPage() {
	const { wikiState, setSelectedWikiEntryId } = useUnifiedSidebarStore();
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const [entry, setEntry] = useState<WikiEntryInterface | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editName, setEditName] = useState("");
	const [editAlias, setEditAlias] = useState<string[]>([]);
	const [editTags, setEditTags] = useState<string[]>([]);
	const [editContent, setEditContent] = useState("");
	const [newAlias, setNewAlias] = useState("");
	const [newTag, setNewTag] = useState("");
	const [hasChanges, setHasChanges] = useState(false);
	const contentRef = useRef<HTMLTextAreaElement>(null);

	// Load selected wiki entry
	useEffect(() => {
		async function loadEntry() {
			if (wikiState.selectedEntryId) {
				setIsLoading(true);
				try {
					const data = await getWikiEntry(wikiState.selectedEntryId);
					if (data) {
						setEntry(data);
						setEditName(data.name);
						setEditAlias(data.alias || []);
						setEditTags(data.tags || []);
						setEditContent(data.content || "");
						setHasChanges(false);
					}
				} finally {
					setIsLoading(false);
				}
			} else {
				setEntry(null);
			}
		}
		loadEntry();
	}, [wikiState.selectedEntryId]);

	// Save changes
	const handleSave = useCallback(async () => {
		if (!entry) return;
		setIsSaving(true);
		try {
			await updateWikiEntry(entry.id, {
				name: editName,
				alias: editAlias,
				tags: editTags,
				content: editContent,
			});
			setEntry({
				...entry,
				name: editName,
				alias: editAlias,
				tags: editTags,
				content: editContent,
			});
			setHasChanges(false);
			toast.success("已保存");
		} catch (error) {
			logger.error("Failed to save wiki entry:", error);
			toast.error("保存失败");
		} finally {
			setIsSaving(false);
		}
	}, [entry, editName, editAlias, editTags, editContent]);

	// Keyboard shortcut for save (Ctrl+S)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				if (hasChanges && entry) {
					handleSave();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [hasChanges, entry, handleSave]);

	// Create new entry
	const handleCreateEntry = useCallback(async () => {
		if (!selectedProjectId) {
			toast.error("请先选择一个项目");
			return;
		}
		try {
			const newEntry = await createWikiEntry({
				projectId: selectedProjectId,
				name: "新条目",
			});
			setSelectedWikiEntryId(newEntry.id);
			toast.success("已创建新条目");
		} catch (error) {
			logger.error("Failed to create wiki entry:", error);
			toast.error("创建失败");
		}
	}, [selectedProjectId, setSelectedWikiEntryId]);

	// Add alias
	const handleAddAlias = useCallback(() => {
		if (newAlias.trim() && !editAlias.includes(newAlias.trim())) {
			setEditAlias([...editAlias, newAlias.trim()]);
			setNewAlias("");
			setHasChanges(true);
		}
	}, [newAlias, editAlias]);

	// Remove alias
	const handleRemoveAlias = useCallback(
		(alias: string) => {
			setEditAlias(editAlias.filter((a) => a !== alias));
			setHasChanges(true);
		},
		[editAlias],
	);

	// Add tag
	const handleAddTag = useCallback(() => {
		if (newTag.trim() && !editTags.includes(newTag.trim())) {
			setEditTags([...editTags, newTag.trim()]);
			setNewTag("");
			setHasChanges(true);
		}
	}, [newTag, editTags]);

	// Remove tag
	const handleRemoveTag = useCallback(
		(tag: string) => {
			setEditTags(editTags.filter((t) => t !== tag));
			setHasChanges(true);
		},
		[editTags],
	);

	// Handle content change
	const handleContentChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setEditContent(e.target.value);
			setHasChanges(true);
		},
		[],
	);

	// Handle name change
	const handleNameChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setEditName(e.target.value);
			setHasChanges(true);
		},
		[],
	);

	// Format date
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		if (Number.isNaN(date.getTime())) return dateStr;
		return date.toLocaleDateString("zh-CN", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<TooltipProvider>
			<div className="flex h-screen bg-background text-foreground">
				<main className="flex-1 flex flex-col overflow-hidden">
					{/* Header */}
					<header className="h-11 border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 shrink-0 z-10">
						<div className="flex items-center gap-2 text-sm">
							<BookOpen className="size-4 text-emerald-500" />
							<span className="text-foreground font-medium">Wiki 知识库</span>
							{entry && (
								<>
									<span className="text-muted-foreground/50">/</span>
									<span className="text-muted-foreground truncate max-w-[200px]">
										{entry.name}
									</span>
								</>
							)}
							{hasChanges && (
								<Badge
									variant="outline"
									className="text-orange-500 border-orange-500/30 text-xs ml-2"
								>
									未保存
								</Badge>
							)}
						</div>
						<div className="flex items-center gap-2">
							{entry && (
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											onClick={handleSave}
											disabled={!hasChanges || isSaving}
											className="gap-1.5"
										>
											{isSaving ? (
												<Loader2 className="size-4 animate-spin" />
											) : (
												<Save className="size-4" />
											)}
											<span className="hidden sm:inline">保存</span>
											<kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
												⌘S
											</kbd>
										</Button>
									</TooltipTrigger>
									<TooltipContent>保存更改 (Ctrl+S)</TooltipContent>
								</Tooltip>
							)}
						</div>
					</header>

					{/* Content */}
					<div className="flex-1 overflow-auto">
						{isLoading ? (
							<div className="flex items-center justify-center h-full">
								<Loader2 className="size-8 animate-spin text-muted-foreground" />
							</div>
						) : entry ? (
							<div className="max-w-3xl mx-auto p-6 space-y-6">
								{/* Name */}
								<div>
									<Input
										value={editName}
										onChange={handleNameChange}
										className="text-2xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 placeholder:text-muted-foreground/40"
										placeholder="条目名称"
									/>
								</div>

								{/* Meta info */}
								<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pb-4 border-b">
									{entry.createDate && (
										<div className="flex items-center gap-1.5">
											<Calendar className="size-3.5" />
											<span>创建于 {formatDate(entry.createDate)}</span>
										</div>
									)}
									{entry.updatedAt && entry.updatedAt !== entry.createDate && (
										<div className="flex items-center gap-1.5">
											<Calendar className="size-3.5" />
											<span>更新于 {formatDate(entry.updatedAt)}</span>
										</div>
									)}
								</div>

								{/* Alias and Tags */}
								<div className="grid gap-4 sm:grid-cols-2">
									{/* Alias */}
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
											<Hash className="size-3.5" />
											别名
										</label>
										<div className="flex flex-wrap gap-1.5 min-h-[32px]">
											{editAlias.map((alias) => (
												<Badge
													key={alias}
													variant="secondary"
													className="gap-1 pr-1 text-xs"
												>
													{alias}
													<button
														type="button"
														onClick={() => handleRemoveAlias(alias)}
														className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5"
													>
														<X className="size-3" />
													</button>
												</Badge>
											))}
											<div className="flex gap-1">
												<Input
													value={newAlias}
													onChange={(e) => setNewAlias(e.target.value)}
													placeholder="添加别名..."
													className="h-7 text-xs w-24 min-w-0"
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															handleAddAlias();
														}
													}}
												/>
												{newAlias && (
													<Button
														variant="ghost"
														size="icon"
														className="size-7"
														onClick={handleAddAlias}
													>
														<Plus className="size-3.5" />
													</Button>
												)}
											</div>
										</div>
									</div>

									{/* Tags */}
									<div className="space-y-2">
										<label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
											<Tag className="size-3.5" />
											标签
										</label>
										<div className="flex flex-wrap gap-1.5 min-h-[32px]">
											{editTags.map((tag) => (
												<Badge
													key={tag}
													variant="outline"
													className="gap-1 pr-1 text-xs"
												>
													{tag}
													<button
														type="button"
														onClick={() => handleRemoveTag(tag)}
														className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5"
													>
														<X className="size-3" />
													</button>
												</Badge>
											))}
											<div className="flex gap-1">
												<Input
													value={newTag}
													onChange={(e) => setNewTag(e.target.value)}
													placeholder="添加标签..."
													className="h-7 text-xs w-24 min-w-0"
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															handleAddTag();
														}
													}}
												/>
												{newTag && (
													<Button
														variant="ghost"
														size="icon"
														className="size-7"
														onClick={handleAddTag}
													>
														<Plus className="size-3.5" />
													</Button>
												)}
											</div>
										</div>
									</div>
								</div>

								{/* Content */}
								<div className="space-y-2">
									<label className="text-xs font-medium text-muted-foreground">
										内容
									</label>
									<textarea
										ref={contentRef}
										value={editContent}
										onChange={handleContentChange}
										className={cn(
											"w-full min-h-[400px] p-4 rounded-lg",
											"border border-input bg-background/50",
											"text-sm leading-relaxed resize-y",
											"focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
											"placeholder:text-muted-foreground/40",
										)}
										placeholder="在这里编写条目内容..."
									/>
								</div>
							</div>
						) : (
							<EmptyState
								onCreateEntry={handleCreateEntry}
								hasProject={!!selectedProjectId}
							/>
						)}
					</div>
				</main>
			</div>
		</TooltipProvider>
	);
}

function EmptyState({
	onCreateEntry,
	hasProject,
}: {
	onCreateEntry: () => void;
	hasProject: boolean;
}) {
	return (
		<div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
			<div className="text-center max-w-md">
				<div className="size-20 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
					<BookOpen className="size-10 text-emerald-500/60" />
				</div>
				<h3 className="text-xl font-semibold text-foreground mb-2">
					Wiki 知识库
				</h3>
				<p className="text-sm mb-6 leading-relaxed">
					{hasProject
						? "从左侧边栏选择一个条目进行编辑，或创建一个新的条目来记录你的角色、地点、物品等设定。"
						: "请先在书库中选择一个项目，然后就可以管理该项目的 Wiki 条目了。"}
				</p>
				{hasProject && (
					<Button onClick={onCreateEntry} className="gap-2">
						<Plus className="size-4" />
						创建新条目
					</Button>
				)}
			</div>
		</div>
	);
}
