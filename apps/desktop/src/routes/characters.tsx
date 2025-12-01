import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { useAllProjects } from "@/services/projects";
import {
	createRole,
	deleteRole,
	updateRole,
	useRolesByProject,
} from "@/services/roles";
import { type SelectionState, useSelectionStore } from "@/stores/selection";

export const Route = createFileRoute("/characters")({
	component: CharactersPage,
});

function CharactersPage() {
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

	const roles = useRolesByProject(activeProjectId ?? null);

	const [newName, setNewName] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState("");

	async function handleCreate() {
		if (!activeProjectId) {
			toast.error("请先创建或选择一本书");
			return;
		}
		const name = newName.trim() || "New Character";
		try {
			await createRole({ projectId: activeProjectId, name });
			setNewName("");
			toast.success("角色已创建");
		} catch {
			toast.error("创建角色失败");
		}
	}

	async function handleSaveEdit() {
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
	}

	async function handleDelete(id: string) {
		const target = roles.find((r) => r.id === id);
		if (!target) return;
		const ok = await confirm({
			title: "删除角色？",
			description: `确认删除角色 “${target.name}” 吗？该操作不可撤销。`,
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
	}

	return (
		<div className="flex min-h-svh flex-col">
			<div className="border-b px-4 py-3 flex items-center justify-between gap-4">
				<div>
					<h1 className="text-lg font-semibold">Characters</h1>
					<p className="text-sm text-muted-foreground">
						管理当前书籍的角色档案（名称、别名等基础信息）。
					</p>
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
						placeholder="新角色名称"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								void handleCreate();
							}
						}}
					/>
					<Button size="sm" onClick={() => void handleCreate()}>
						<Plus className="mr-1 size-4" /> 新建角色
					</Button>
				</div>

				<div className="rounded-lg border bg-card/40">
					<div className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px] items-center border-b px-4 py-2 text-xs font-medium text-muted-foreground">
						<span>名称</span>
						<span>别名（数量）</span>
						<span className="text-right">操作</span>
					</div>
					{roles.length === 0 ? (
						<div className="px-4 py-6 text-sm text-muted-foreground">
							当前书籍还没有角色。使用上方输入框创建你的第一个角色。
						</div>
					) : (
						<ul className="divide-y">
							{roles.map((role) => (
								<li
									key={role.id}
									className="grid grid-cols-[minmax(0,2fr)_minmax(0,2fr)_120px] items-center px-4 py-2 text-sm gap-2"
								>
									<div>
										{editingId === role.id ? (
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
											<span className="font-medium">{role.name}</span>
										)}
									</div>
									<div className="text-xs text-muted-foreground">
										{role.alias?.length ? `${role.alias.length} 个别名` : "无"}
									</div>
									<div className="flex items-center justify-end gap-2">
										{editingId === role.id ? (
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
													setEditingId(role.id);
													setEditingName(role.name);
												}}
												aria-label="重命名角色"
											>
												<Pencil className="size-4" />
											</Button>
										)}
										<Button
											size="icon-sm"
											variant="ghost"
											aria-label="删除角色"
											onClick={() => void handleDelete(role.id)}
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
