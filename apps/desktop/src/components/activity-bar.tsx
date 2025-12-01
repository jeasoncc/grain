import { Link, useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2 } from "lucide-react";
import type * as React from "react";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { useSidebar, SidebarTrigger } from "@/components/ui/sidebar";
import { openCreateBookDialog } from "@/components/blocks/createBookDialog";
import { ExportDialog } from "@/components/blocks/export-dialog";
import { useConfirm } from "@/components/ui/confirm";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { db } from "@/db/curd";
import { cn } from "@/lib/utils";
import {
	createBook,
	importFromJson,
	readFileAsText,
	exportAllAsZip,
	triggerBlobDownload,
} from "@/services/projects";
import { useSelectionStore } from "@/stores/selection";
import { type BottomDrawerView, useUIStore } from "@/stores/ui";
import { getActivityBarIcon, getCurrentIconTheme } from "@/lib/icon-themes";

export function ActivityBar(): React.ReactElement {
	const location = useLocation();
	const projects = useLiveQuery(() => db.getAllProjects(), []) || [];
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const confirm = useConfirm();
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const { open: sidebarOpen } = useSidebar();

	// 底部抽屉状态
	const { bottomDrawerOpen, bottomDrawerView, toggleBottomDrawer } =
		useUIStore();

	// 图标主题
	const [iconTheme, setIconTheme] = useState(getCurrentIconTheme());

	// 监听图标主题变化
	useEffect(() => {
		const handler = () => {
			setIconTheme(getCurrentIconTheme());
		};
		window.addEventListener("icon-theme-changed", handler);
		return () => window.removeEventListener("icon-theme-changed", handler);
	}, []);

	// 获取图标
	const LibraryIcon = iconTheme.icons.activityBar.library;
	const SearchIcon = iconTheme.icons.activityBar.search;
	const OutlineIcon = iconTheme.icons.activityBar.outline;
	const CharactersIcon = iconTheme.icons.activityBar.characters;
	const WorldIcon = iconTheme.icons.activityBar.world;
	const CanvasIcon = iconTheme.icons.activityBar.canvas;
	const StatisticsIcon = iconTheme.icons.activityBar.statistics;
	const SettingsIcon = iconTheme.icons.activityBar.settings;
	const CreateIcon = iconTheme.icons.activityBar.create;
	const ImportIcon = iconTheme.icons.activityBar.import;
	const ExportIcon = iconTheme.icons.activityBar.export;
	const MoreIcon = iconTheme.icons.activityBar.more;

	const handleQuickCreate = useCallback(async () => {
		const data = await openCreateBookDialog();
		if (!data) return;
		try {
			await createBook({
				title: data.title,
				author: data.author,
				description: data.description ?? "",
			});
			toast.success(`已创建书籍：${data.title}`);
		} catch (e) {}
	}, []);

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleImportFile = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			try {
				const text = await readFileAsText(file);
				await importFromJson(text, { keepIds: false });
				toast.success("导入成功");
			} catch {
				toast.error("导入失败");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[],
	);

	const handleExportZip = useCallback(async () => {
		try {
			toast.loading("正在打包数据...");
			const zipBlob = await exportAllAsZip();
			const filename = `novel-editor-backup-${new Date().toISOString().slice(0, 10)}.zip`;
			triggerBlobDownload(filename, zipBlob);
			toast.success("导出成功");
		} catch (error) {
			console.error("导出失败:", error);
			toast.error("导出失败");
		}
	}, []);

	const handleDeleteAllBooks = useCallback(async () => {
		const ok = await confirm({
			title: "确认删除所有书籍？",
			description: "该操作不可恢复",
			confirmText: "删除",
			cancelText: "取消",
		});
		if (!ok) return;
		try {
			await Promise.all([
				db.attachments.clear(),
				db.roles.clear(),
				db.scenes.clear(),
				db.chapters.clear(),
				db.projects.clear(),
			]);
			toast.success("已删除所有书籍");
		} catch {
			toast.error("删除失败");
		}
	}, [confirm]);

	// 检查当前路由是否匹配
	const isActive = (path: string) =>
		location.pathname === path || location.pathname.startsWith(path + "/");

	return (
		<aside className="activity-bar flex h-screen w-12 shrink-0 flex-col items-center bg-sidebar py-3">
			<TooltipProvider>
				{/* 侧边栏切换按钮 */}
				<div className="mb-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<SidebarTrigger className="size-10" />
						</TooltipTrigger>
						<TooltipContent side="right">
							{sidebarOpen ? "隐藏书库" : "显示书库"} (Ctrl+B)
						</TooltipContent>
					</Tooltip>
				</div>

				<div className="mb-3 h-px w-6 bg-border/20" />

				{/* 主导航 */}
				<nav className="flex flex-col items-center gap-1">
					<NavItem
						to="/"
						icon={<LibraryIcon className="size-5" />}
						label="书库"
						active={
							isActive("/") &&
							!isActive("/outline") &&
							!isActive("/characters") &&
							!isActive("/world") &&
							!isActive("/statistics") &&
							!isActive("/settings") &&
							!isActive("/search")
						}
					/>
					<ActionButton
						icon={<SearchIcon className="size-5" />}
						label="搜索 (Ctrl+Shift+F)"
						onClick={() => window.dispatchEvent(new Event("toggle-search-sidebar"))}
					/>
					<NavItem
						to="/outline"
						icon={<OutlineIcon className="size-5" />}
						label="大纲"
						active={isActive("/outline")}
					/>
					<NavItem
						to="/characters"
						icon={<CharactersIcon className="size-5" />}
						label="角色"
						active={isActive("/characters")}
					/>
					<NavItem
						to="/world"
						icon={<WorldIcon className="size-5" />}
						label="世界观"
						active={isActive("/world")}
					/>
					<NavItem
						to="/canvas"
						icon={<CanvasIcon className="size-5" />}
						label="绘图"
						active={isActive("/canvas")}
					/>
				</nav>

				<div className="my-3 h-px w-6 bg-border/20" />

				{/* 操作按钮 */}
				<div className="flex flex-col items-center gap-1">
					<ActionButton
						icon={<CreateIcon className="size-5" />}
						label="新建书籍"
						onClick={handleQuickCreate}
					/>
					<ActionButton
						icon={<ImportIcon className="size-5" />}
						label="导入"
						onClick={handleImportClick}
					/>

					<ActionButton
						icon={<ExportIcon className="size-5" />}
						label="导出"
						onClick={() => setExportDialogOpen(true)}
					/>

					<NavItem
						to="/statistics"
						icon={<StatisticsIcon className="size-5" />}
						label="统计"
						active={isActive("/statistics")}
					/>
				</div>

				<div className="my-3 h-px w-6 bg-border/20" />

				{/* 底部抽屉快捷按钮 */}
				<div
					className="flex flex-col items-center gap-1"
					data-tour="bottom-drawer"
				>
					<DrawerToggle
						view="outline"
						icon={<OutlineIcon className="size-5" />}
						label="大纲面板"
						active={bottomDrawerOpen && bottomDrawerView === "outline"}
						onClick={() => toggleBottomDrawer("outline")}
					/>
					<DrawerToggle
						view="characters"
						icon={<CharactersIcon className="size-5" />}
						label="角色面板"
						active={bottomDrawerOpen && bottomDrawerView === "characters"}
						onClick={() => toggleBottomDrawer("characters")}
					/>
					<DrawerToggle
						view="world"
						icon={<WorldIcon className="size-5" />}
						label="世界观面板"
						active={bottomDrawerOpen && bottomDrawerView === "world"}
						onClick={() => toggleBottomDrawer("world")}
					/>
				</div>

				{/* 底部 */}
				<div className="mt-auto flex flex-col items-center gap-1">
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<button
										className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground"
										disabled={projects.length === 0}
									>
										<MoreIcon className="size-5" />
									</button>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent side="right">更多</TooltipContent>
						</Tooltip>
						<PopoverContent side="right" align="end" className="w-48 p-1">
							<button
								onClick={handleDeleteAllBooks}
								className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
							>
								<Trash2 className="size-4" /> 删除所有书籍
							</button>
						</PopoverContent>
					</Popover>

					<NavItem
						to="/settings/design"
						icon={<SettingsIcon className="size-5" />}
						label="设置"
						active={isActive("/settings")}
					/>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="application/json"
					className="hidden"
					onChange={handleImportFile}
				/>
			</TooltipProvider>

			<ExportDialog
				open={exportDialogOpen}
				onOpenChange={setExportDialogOpen}
				projectId={selectedProjectId || projects[0]?.id || ""}
				projectTitle={
					projects.find((p) => p.id === (selectedProjectId || projects[0]?.id))
						?.title
				}
			/>
		</aside>
	);
}

// 导航项组件
function NavItem({
	to,
	icon,
	label,
	active,
}: {
	to: string;
	icon: React.ReactNode;
	label: string;
	active: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Link
					to={to}
					className={cn(
						"relative flex size-10 items-center justify-center rounded-lg transition-all",
						active
							? "bg-sidebar-accent text-primary"
							: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
					)}
				>
					{active && (
						<div className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
					)}
					{icon}
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

// 操作按钮组件
function ActionButton({
	icon,
	label,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					onClick={onClick}
					className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-foreground"
				>
					{icon}
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

// 底部抽屉切换按钮
function DrawerToggle({
	icon,
	label,
	active,
	onClick,
}: {
	view: BottomDrawerView;
	icon: React.ReactNode;
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					onClick={onClick}
					className={cn(
						"relative flex size-10 items-center justify-center rounded-lg transition-all",
						active
							? "bg-sidebar-accent text-primary"
							: "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
					)}
				>
					{active && (
						<div className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-t bg-primary" />
					)}
					{icon}
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}
