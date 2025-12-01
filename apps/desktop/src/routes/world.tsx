import { createFileRoute } from "@tanstack/react-router";
import { Globe2, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { useAllProjects } from "@/services/projects";
import {
	createWorldEntry,
	deleteWorldEntry,
	updateWorldEntry,
	useWorldEntriesByProject,
} from "@/services/world";
import { type SelectionState, useSelectionStore } from "@/stores/selection";

export const Route = createFileRoute("/world")({
	component: WorldPage,
});

function WorldPage() {
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

	const entries = useWorldEntriesByProject(activeProjectId ?? null);

	const [newName, setNewName] = useState("");
	const [newCategory, setNewCategory] = useState("location");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");
	const [editingCategory, setEditingCategory] = useState("location");

	async function handleCreate() {
		if (!activeProjectId) {
			toast.error("请先创建或选择一本书");
			return;
		}
		const name = newName.trim() || "New Entry";
		try {
			await createWorldEntry({
				projectId: activeProjectId,
				name,
				category: newCategory,
			});
			setNewName("");
			toast.success("世界观条目已创建");
		} catch {
			toast.error("创建世界观条目失败");
		}
	}

	async function handleSaveEdit() {
		if (!editingId) return;
		const name = editingName.trim();
		if (!name) {
			toast.error("名称不能为空");
			return;
		}
		try {
			await updateWorldEntry(editingId, {
				name,
				category: editingCategory,
			});
			setEditingId(null);
			setEditingName("");
			toast.success("世界观条目已更新");
		} catch {
			toast.error("更新世界观条目失败");
		}
	}

	async function handleDelete(id: string) {
		const target = entries.find((e) => e.id === id);
		if (!target) return;
		const ok = await confirm({
			title: "删除世界观条目？",
			description: `确认删除 “${target.name}” 吗？该操作不可撤销。`,
			confirmText: "删除",
			cancelText: "取消",
		});
		if (!ok) return;
		try {
			await deleteWorldEntry(id);
			toast.success("世界观条目已删除");
		} catch {
			toast.error("删除世界观条目失败");
		}
	}

	return (
		<div className="flex min-h-svh flex-col">
			<div className="border-b px-4 py-3 flex items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<Globe2 className="size-5" />
					<div>
						<h1 className="text-lg font-semibold">World</h1>
						<p className="text-sm text-muted-foreground">
							管理当前书籍的地点、势力、物品等世界观设定。
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<select
						className="h-8 rounded-md border bg-background px-2 text-sm"
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
			</div>
			<div className="flex-1 p-4 space-y-4">
				<div className="flex flex-wrap items-center gap-2">
					<Input
						className="w-64"
						placeholder="新世界观名称，如：王都、骑士团"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								void handleCreate();
							}
						}}
					/>
					<select
						className="h-8 rounded-md border bg-background px-2 text-sm"
						value={newCategory}
						onChange={(e) => setNewCategory(e.target.value)}
					>
						<option value="location">地点</option>
						<option value="faction">势力/组织</option>
						<option value="item">物品</option>
						<option value="concept">概念/设定</option>
					</select>
					<Button size="sm" onClick={() => void handleCreate()}>
						<Plus className="mr-1 size-4" /> 新建条目
					</Button>
				</div>

				<div className="rounded-lg border bg-card/40">
					<div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px] items-center border-b px-4 py-2 text-xs font-medium text-muted-foreground">
						<span>名称</span>
						<span>分类</span>
						<span className="text-right">操作</span>
					</div>
					{entries.length === 0 ? (
						<div className="px-4 py-6 text-sm text-muted-foreground">
							当前书籍还没有世界观条目。试着为关键地点或势力创建一个设定。
						</div>
					) : (
						<ul className="divide-y">
							{entries.map((entry) => (
								<li
									key={entry.id}
									className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_120px] items-center px-4 py-2 text-sm gap-2"
								>
									<div>
										{editingId === entry.id ? (
											<Input
												className="h-8"
												value={editingName}
												onChange={(e) => setEditingName(e.target.value)}
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														void handleSaveEdit();
													}
												}}
												autoFocus
											/>
										) : (
											<span className="font-medium">{entry.name}</span>
										)}
									</div>
									<div className="text-xs text-muted-foreground">
										{editingId === entry.id ? (
											<select
												className="h-8 rounded-md border bg-background px-2 text-xs"
												value={editingCategory}
												onChange={(e) => setEditingCategory(e.target.value)}
											>
												<option value="location">地点</option>
												<option value="faction">势力/组织</option>
												<option value="item">物品</option>
												<option value="concept">概念/设定</option>
											</select>
										) : (
											<span>
												{entry.category === "location"
													? "地点"
													: entry.category === "faction"
														? "势力/组织"
														: entry.category === "item"
															? "物品"
															: "概念/设定"}
											</span>
										)}
									</div>
									<div className="flex items-center justify-end gap-2">
										{editingId === entry.id ? (
											<Button
												size="sm"
												variant="outline"
												onClick={() => void handleSaveEdit()}
											>
												保存
											</Button>
										) : (
											<Button
												size="icon-sm"
												variant="ghost"
												onClick={() => {
													setEditingId(entry.id);
													setEditingName(entry.name);
													setEditingCategory(entry.category);
												}}
												aria-label="编辑条目"
											>
												<Pencil className="size-4" />
											</Button>
										)}
										<Button
											size="icon-sm"
											variant="ghost"
											aria-label="删除条目"
											onClick={() => void handleDelete(entry.id)}
										>
											<Trash2 className="size-4 text-destructive" />
										</Button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
