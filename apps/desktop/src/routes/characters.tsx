import { createFileRoute } from "@tanstack/react-router";
import type { SerializedEditorState } from "lexical";
import { Plus, Trash2, User, X, BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MinimalEditor } from "@/components/blocks/rich-editor/minimal-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAllProjects } from "@/services/projects";
import {
	createWikiEntry,
	deleteWikiEntry,
	updateWikiEntry,
	useWikiEntriesByProject,
	migrateRolesToWiki,
} from "@/services/wiki";
import { db } from "@/db/curd";
import { type SelectionState, useSelectionStore } from "@/stores/selection";

export const Route = createFileRoute("/characters")({
	component: WikiPage,
});

function WikiPage() {
	const projects = useAllProjects();
	const confirm = useConfirm();
	const selectedProjectId = useSelectionStore(
		(s: SelectionState) => s.selectedProjectId,
	);
	const setSelectedProjectId = useSelectionStore(
		(s: SelectionState) => s.setSelectedProjectId,
	);

	const activeProjectId = useMemo(() => {
		if (selectedProjectId && projects.some((p) => p.id === selectedProjectId)) {
			return selectedProjectId;
		}
		return projects[0]?.id ?? null;
	}, [projects, selectedProjectId]);

	const wikiEntries = useWikiEntriesByProject(activeProjectId ?? null);

	const [newName, setNewName] = useState("");
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
	const [aliasInput, setAliasInput] = useState("");
	const [tagInput, setTagInput] = useState("");
	const [editorKey, setEditorKey] = useState(0);
	const [needsMigration, setNeedsMigration] = useState(false);

	const selectedEntry = useMemo(
		() => wikiEntries.find((e) => e.id === selectedEntryId) ?? null,
		[wikiEntries, selectedEntryId],
	);

	// 检查是否需要迁移
	useEffect(() => {
		if (activeProjectId) {
			// 检查是否有旧的角色数据需要迁移
			db.getRolesByProject(activeProjectId).then(roles => {
				setNeedsMigration(roles.length > 0 && wikiEntries.length === 0);
			});
		}
	}, [activeProjectId, wikiEntries.length]);

	// 自动选择第一个条目
	useEffect(() => {
		if (wikiEntries.length > 0 && !selectedEntryId) {
			setSelectedEntryId(wikiEntries[0].id);
		} else if (wikiEntries.length === 0) {
			setSelectedEntryId(null);
		} else if (selectedEntryId && !wikiEntries.find((e) => e.id === selectedEntryId)) {
			setSelectedEntryId(wikiEntries[0].id);
		}
	}, [wikiEntries, selectedEntryId]);

	// 切换条目时强制刷新编辑器
	useEffect(() => {
		setEditorKey((k) => k + 1);
		setAliasInput("");
		setTagInput("");
	}, [selectedEntryId]);

	// 获取当前条目的内容状态
	const contentState = useMemo(() => {
		if (!selectedEntry?.content) return undefined;
		try {
			return JSON.parse(selectedEntry.content) as SerializedEditorState;
		} catch {
			return undefined;
		}
	}, [selectedEntry?.content]);

	async function handleMigration() {
		if (!activeProjectId) return;
		try {
			await migrateRolesToWiki(activeProjectId);
			setNeedsMigration(false);
			toast.success("数据迁移完成");
		} catch {
			toast.error("迁移失败");
		}
	}

	async function handleCreate() {
		if (!activeProjectId) {
			toast.error("请先选择一本书");
			return;
		}
		const name = newName.trim() || "新条目";
		try {
			const newEntry = await createWikiEntry({ projectId: activeProjectId, name });
			setNewName("");
			setSelectedEntryId(newEntry.id);
		} catch {
			toast.error("创建失败");
		}
	}

	async function handleAddAlias() {
		if (!selectedEntryId || !aliasInput.trim() || !selectedEntry) return;
		const newAlias = aliasInput.trim();
		const currentAlias = selectedEntry.alias || [];
		if (currentAlias.includes(newAlias)) {
			toast.error("别名已存在");
			return;
		}
		try {
			await updateWikiEntry(selectedEntryId, { alias: [...currentAlias, newAlias] });
			setAliasInput("");
		} catch {
			toast.error("添加失败");
		}
	}

	async function handleRemoveAlias(alias: string) {
		if (!selectedEntryId || !selectedEntry) return;
		const updatedAlias = (selectedEntry.alias || []).filter((a) => a !== alias);
		try {
			await updateWikiEntry(selectedEntryId, { alias: updatedAlias });
		} catch {
			toast.error("删除失败");
		}
	}

	async function handleAddTag() {
		if (!selectedEntryId || !tagInput.trim() || !selectedEntry) return;
		const newTag = tagInput.trim();
		const currentTags = selectedEntry.tags || [];
		if (currentTags.includes(newTag)) {
			toast.error("标签已存在");
			return;
		}
		try {
			await updateWikiEntry(selectedEntryId, { tags: [...currentTags, newTag] });
			setTagInput("");
		} catch {
			toast.error("添加失败");
		}
	}

	async function handleRemoveTag(tag: string) {
		if (!selectedEntryId || !selectedEntry) return;
		const updatedTags = (selectedEntry.tags || []).filter((t) => t !== tag);
		try {
			await updateWikiEntry(selectedEntryId, { tags: updatedTags });
		} catch {
			toast.error("删除失败");
		}
	}

	async function handleSaveContent(state: SerializedEditorState) {
		if (!selectedEntryId) return;
		try {
			await updateWikiEntry(selectedEntryId, { content: JSON.stringify(state) });
		} catch {
			// 静默失败，避免打扰用户
		}
	}

	async function handleDelete() {
		if (!selectedEntry) return;
		const ok = await confirm({
			title: "删除Wiki条目",
			description: `确认删除 "${selectedEntry.name}"？`,
			confirmText: "删除",
			cancelText: "取消",
		});
		if (!ok) return;
		try {
			await deleteWikiEntry(selectedEntry.id);
		} catch {
			toast.error("删除失败");
		}
	}

	return (
		<div className="flex h-svh">
			{/* 左侧：Wiki条目列表 */}
			<div className="w-64 border-r flex flex-col bg-muted/30">
				{/* 迁移提示 */}
				{needsMigration && (
					<div className="p-3 border-b bg-yellow-50 dark:bg-yellow-900/20">
						<div className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
							发现旧的角色数据，是否迁移到Wiki系统？
						</div>
						<Button
							size="sm"
							variant="outline"
							onClick={handleMigration}
							className="h-6 text-xs w-full"
						>
							开始迁移
						</Button>
					</div>
				)}

				<div className="p-3 border-b flex gap-2">
					<Input
						placeholder="条目名"
						value={newName}
						className="h-8"
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
					/>
					<Button
						size="icon"
						className="h-8 w-8 shrink-0"
						onClick={() => handleCreate()}
					>
						<Plus className="size-4" />
					</Button>
				</div>

				<ScrollArea className="flex-1">
					{wikiEntries.length === 0 ? (
						<div className="p-4 text-sm text-muted-foreground text-center">
							暂无Wiki条目
						</div>
					) : (
						<div className="p-2">
							{wikiEntries.map((entry) => (
								<button
									key={entry.id}
									onClick={() => setSelectedEntryId(entry.id)}
									className={cn(
										"w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
										"hover:bg-accent",
										selectedEntryId === entry.id && "bg-accent font-medium",
									)}
								>
									<div className="flex items-center gap-2">
										<BookOpen className="size-3.5 text-muted-foreground shrink-0" />
										<span className="truncate">{entry.name}</span>
									</div>
									{entry.tags.length > 0 && (
										<div className="flex gap-1 mt-1 flex-wrap">
											{entry.tags.slice(0, 2).map((tag) => (
												<Badge key={tag} variant="secondary" className="text-xs h-4 px-1">
													{tag}
												</Badge>
											))}
											{entry.tags.length > 2 && (
												<Badge variant="secondary" className="text-xs h-4 px-1">
													+{entry.tags.length - 2}
												</Badge>
											)}
										</div>
									)}
								</button>
							))}
						</div>
					)}
				</ScrollArea>

				{projects.length > 1 && (
					<div className="p-2 border-t">
						<select
							className="w-full h-8 rounded-md border bg-background px-2 text-xs"
							value={activeProjectId ?? ""}
							onChange={(e) => setSelectedProjectId(e.target.value || null)}
						>
							{projects.map((p) => (
								<option key={p.id} value={p.id}>
									{p.title}
								</option>
							))}
						</select>
					</div>
				)}
			</div>

			{/* 右侧：Wiki条目详情 */}
			<div className="flex-1 flex flex-col overflow-hidden">
				{selectedEntry ? (
					<>
						{/* 顶部信息栏 */}
						<div className="border-b px-4 py-3 flex items-center gap-3">
							<h2 className="text-lg font-semibold flex-1">
								{selectedEntry.name}
							</h2>
							<Button
								size="sm"
								variant="ghost"
								className="text-destructive hover:text-destructive"
								onClick={() => handleDelete()}
							>
								<Trash2 className="size-4" />
							</Button>
						</div>

						{/* 别名区域 */}
						<div className="px-4 py-2 border-b flex items-center gap-2 flex-wrap">
							<span className="text-xs text-muted-foreground">别名:</span>
							{(selectedEntry.alias || []).map((alias) => (
								<Badge
									key={alias}
									variant="secondary"
									className="cursor-pointer text-xs h-6"
									onClick={() => handleRemoveAlias(alias)}
								>
									{alias}
									<X className="ml-1 size-3" />
								</Badge>
							))}
							<Input
								placeholder="+ 添加别名"
								value={aliasInput}
								className="h-6 w-24 text-xs"
								onChange={(e) => setAliasInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAddAlias()}
							/>
						</div>

						{/* 标签区域 */}
						<div className="px-4 py-2 border-b flex items-center gap-2 flex-wrap">
							<span className="text-xs text-muted-foreground">标签:</span>
							{(selectedEntry.tags || []).map((tag) => (
								<Badge
									key={tag}
									variant="outline"
									className="cursor-pointer text-xs h-6"
									onClick={() => handleRemoveTag(tag)}
								>
									{tag}
									<X className="ml-1 size-3" />
								</Badge>
							))}
							<Input
								placeholder="+ 添加标签"
								value={tagInput}
								className="h-6 w-24 text-xs"
								onChange={(e) => setTagInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
							/>
						</div>

						{/* 编辑器区域 */}
						<div className="flex-1 overflow-hidden">
							<MinimalEditor
								key={editorKey}
								editorSerializedState={contentState}
								onSerializedChange={handleSaveContent}
								placeholder="编写Wiki条目的详细内容..."
							/>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="text-center">
							<BookOpen className="size-10 mx-auto mb-2 opacity-30" />
							<p className="text-sm">选择或创建Wiki条目</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
