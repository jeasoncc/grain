import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import * as E from "fp-ts/Either";
import { Check, Plus, Trash2 } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ExportDialog } from "@/components/blocks/export-dialog";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
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
import { addWorkspace, clearAllData, touchWorkspace } from "@/db";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { useAllWorkspaces } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";
import { useEditorTabsStore } from "@/stores/editor-tabs.store";
import { useSelectionStore } from "@/stores/selection.store";
import { useSidebarStore } from "@/stores/sidebar.store";
import type { WorkspaceInterface } from "@/types/workspace";

export function ActivityBar(): React.ReactElement {
	const location = useLocation();
	const workspacesRaw = useAllWorkspaces(); // undefined = loading, [] = empty
	const workspaces = workspacesRaw ?? []; // 用于渲染，但保留 undefined 状态用于判断
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const setSelectedWorkspaceId = useSelectionStore(
		(s) => s.setSelectedWorkspaceId,
	);
	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const confirm = useConfirm();
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [showNewWorkspace, setShowNewWorkspace] = useState(false);
	const [newWorkspaceName, setNewWorkspaceName] = useState("");
	const [isCreatingDiary, setIsCreatingDiary] = useState(false);
	const {
		activePanel,
		isOpen: unifiedSidebarOpen,
		setActivePanel,
		toggleSidebar,
	} = useSidebarStore();

	// Initialize workspace selection on mount
	// This effect only handles workspace selection, not creation
	// Workspace creation only happens when workspaces.length === 0 AND no selectedWorkspaceId exists
	const hasInitializedRef = useRef(false);

	useEffect(() => {
		const initializeWorkspace = async () => {
			// Wait for workspaces to load (undefined means still loading)
			if (workspacesRaw === undefined) return;

			// Only run once per component mount
			if (hasInitializedRef.current) return;
			hasInitializedRef.current = true;

			// If no workspaces exist, create a default one
			if (workspaces.length === 0) {
				// Clear stale selection if exists
				if (selectedWorkspaceId) {
					setSelectedWorkspaceId(null);
				}
				try {
					const result = await addWorkspace("My Workspace", {
						author: "",
						description: "",
						language: "en",
					})();
					if (E.isRight(result)) {
						setSelectedWorkspaceId(result.right.id);
						setActivePanel("files");
					}
				} catch (error) {
					console.error("Failed to create default workspace:", error);
				}
				return;
			}

			// Workspaces exist - validate and restore selection
			const isSelectedValid =
				selectedWorkspaceId &&
				workspaces.some(
					(w: WorkspaceInterface) => w.id === selectedWorkspaceId,
				);
			console.log(
				"[ActivityBar] workspaces 存在:",
				workspaces.length,
				"个, isSelectedValid:",
				isSelectedValid,
			);
			let workspaceIdToMigrate: string | null = null;

			if (!isSelectedValid) {
				// Selected workspace doesn't exist or none selected
				// Select the most recently opened workspace (by lastOpen field)
				console.log("[ActivityBar] 选择无效，自动选择最近的 workspace");
				const sortedByLastOpen = [...workspaces].sort((a, b) => {
					const dateA = new Date(a.lastOpen || a.createDate).getTime();
					const dateB = new Date(b.lastOpen || b.createDate).getTime();
					return dateB - dateA; // Most recent first
				});
				setSelectedWorkspaceId(sortedByLastOpen[0].id);
				workspaceIdToMigrate = sortedByLastOpen[0].id;
			} else {
				// Valid selection exists - update its lastOpen timestamp
				try {
					await touchWorkspace(selectedWorkspaceId)();
				} catch (error) {
					console.error("Failed to update lastOpen on init:", error);
				}
				workspaceIdToMigrate = selectedWorkspaceId;
			}

			// Wiki migration removed - functionality no longer available
			if (workspaceIdToMigrate) {
				// Migration functionality has been removed
			}
		};
		initializeWorkspace();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [workspacesRaw]); // Depend on workspacesRaw to detect when loading completes (undefined -> [])

	// 图标主题
	const iconTheme = useIconTheme();

	// Editor tabs store for opening diary
	const openTab = useEditorTabsStore((s) => s.openTab);

	// Get icons
	const FilesIcon = iconTheme.icons.activityBar.files;
	const SearchIcon = iconTheme.icons.activityBar.search;
	const DiaryIcon = iconTheme.icons.activityBar.diary;
	const WikiIcon = iconTheme.icons.activityBar.library;
	const SettingsIcon = iconTheme.icons.activityBar.settings;
	const ImportIcon = iconTheme.icons.activityBar.import;
	const ExportIcon = iconTheme.icons.activityBar.export;
	const MoreIcon = iconTheme.icons.activityBar.more;
	const FolderIcon = iconTheme.icons.activityBar.library;

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	// Get updateEditorState for pre-loading content
	const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);

	// Handle diary creation from Calendar icon
	// TODO: Implement diary creation using new architecture
	const handleCreateDiary = useCallback(async () => {
		// Prevent multiple rapid clicks
		if (isCreatingDiary) {
			return;
		}

		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}

		setIsCreatingDiary(true);
		try {
			// Diary creation functionality needs to be reimplemented
			toast.info("Diary creation is being reimplemented");
		} catch (error) {
			toast.error("Failed to create diary");
			console.error("Diary creation error:", error);
		} finally {
			setIsCreatingDiary(false);
		}
	}, [selectedWorkspaceId, isCreatingDiary]);

	// Handle wiki creation from Wiki icon
	// TODO: Implement wiki creation using new architecture
	const handleCreateWiki = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}
		try {
			// Wiki creation functionality needs to be reimplemented
			toast.info("Wiki creation is being reimplemented");
		} catch (error) {
			toast.error("Failed to create wiki entry");
			console.error("Wiki creation error:", error);
		}
	}, [selectedWorkspaceId]);

	// Helper function to read file as text
	const readFileAsText = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsText(file);
		});
	};

	const handleImportFile = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			try {
				const _text = await readFileAsText(file);
				// Import functionality needs to be reimplemented
				toast.info("Import functionality is being reimplemented");
			} catch {
				toast.error("Import failed");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[],
	);

	const handleDeleteAllData = useCallback(async () => {
		const ok = await confirm({
			title: "Delete all data?",
			description:
				"This action cannot be undone. All workspaces, files, and data will be deleted.",
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;
		try {
			await clearAllData()();
			// Reset selection state
			setSelectedWorkspaceId(null);
			setSelectedNodeId(null);
			// Reset initialization flag so a new workspace will be created
			hasInitializedRef.current = false;
			toast.success("All data deleted");
			// Reload page to reinitialize
			setTimeout(() => window.location.reload(), 1000);
		} catch {
			toast.error("Delete failed");
		}
	}, [confirm, setSelectedWorkspaceId, setSelectedNodeId]);

	// Handle workspace selection
	const handleSelectWorkspace = useCallback(
		async (workspaceId: string) => {
			setSelectedWorkspaceId(workspaceId);
			// Update lastOpen timestamp
			try {
				await touchWorkspace(workspaceId)();
			} catch (error) {
				console.error("Failed to update lastOpen:", error);
			}
			toast.success("Workspace selected");
		},
		[setSelectedWorkspaceId],
	);

	// Handle new workspace creation
	const handleCreateWorkspace = useCallback(async () => {
		if (!newWorkspaceName.trim()) {
			toast.error("Please enter a workspace name");
			return;
		}
		try {
			const result = await addWorkspace(newWorkspaceName.trim(), {
				author: "",
				description: "",
				language: "en",
			})();
			if (E.isRight(result)) {
				setSelectedWorkspaceId(result.right.id);
				setNewWorkspaceName("");
				setShowNewWorkspace(false);
				toast.success("Workspace created");
			} else {
				toast.error("Failed to create workspace");
			}
		} catch {
			toast.error("Failed to create workspace");
		}
	}, [newWorkspaceName, setSelectedWorkspaceId]);

	// 检查当前路由是否匹配
	const isActive = (path: string) =>
		location.pathname === path || location.pathname.startsWith(`${path}/`);

	return (
		<aside className="activity-bar z-10 flex w-12 shrink-0 flex-col items-center border-r border-border/30 bg-muted/50 pb-2">
			<TooltipProvider>
				{/* 主导航 - 侧边栏面板切换 */}
				{/* 顺序: Files → Calendar → Wiki → Search → Outline → Statistics → Settings */}
				{/* Library 和 Diary 面板按钮已移除，日记功能整合到文件树中，但保留日历图标用于快速创建 */}
				<nav className="flex flex-col items-center w-full">
					{/* 1st: Files (Node-based File Tree) */}
					<ActionButton
						icon={<FilesIcon className="size-5" />}
						label="Files"
						active={activePanel === "files" && unifiedSidebarOpen}
						onClick={() => {
							if (activePanel === "files" && unifiedSidebarOpen) {
								toggleSidebar();
							} else {
								setActivePanel("files");
							}
						}}
					/>
					{/* 2nd: Calendar - Quick Diary Creation */}
					<ActionButton
						icon={<DiaryIcon className="size-5" />}
						label="New Diary"
						onClick={handleCreateDiary}
					/>
					{/* 3rd: Wiki - Quick Wiki Entry Creation */}
					<ActionButton
						icon={<WikiIcon className="size-5" />}
						label="New Wiki"
						onClick={handleCreateWiki}
					/>
					{/* 4th: Search */}
					<ActionButton
						icon={<SearchIcon className="size-5" />}
						label="Search (Ctrl+Shift+F)"
						active={activePanel === "search" && unifiedSidebarOpen}
						onClick={() => {
							if (activePanel === "search" && unifiedSidebarOpen) {
								toggleSidebar();
							} else {
								setActivePanel("search");
							}
						}}
					/>
				</nav>

				<div className="flex-1" />

				{/* 底部 */}
				<div className="flex flex-col items-center w-full">
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<button className="relative flex w-full aspect-square items-center justify-center text-muted-foreground transition-all hover:text-foreground">
										<MoreIcon className="size-5" />
									</button>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent side="right">More</TooltipContent>
						</Tooltip>
						<PopoverContent
							side="right"
							align="end"
							className="w-56 p-0 overflow-hidden shadow-2xl border border-border/40 bg-popover/95 backdrop-blur-xl rounded-xl"
						>
							<div className="flex flex-col py-1">
								{/* Header */}
								<div className="px-3 py-1.5 flex items-center justify-between border-b border-border/30">
									<span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
										Workspaces
									</span>
									<span className="flex items-center justify-center min-w-[1rem] h-3.5 text-[9px] font-medium rounded-full bg-primary/10 text-primary px-1">
										{workspaces.length}
									</span>
								</div>

								{/* Workspace List */}
								<div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
									{workspaces.length > 0 ? (
										<div className="space-y-0.5">
											{workspaces.map((workspace: WorkspaceInterface) => {
												const isSelected = selectedWorkspaceId === workspace.id;
												return (
													<button
														key={workspace.id}
														onClick={() => handleSelectWorkspace(workspace.id)}
														className={cn(
															"group relative flex w-full items-center gap-2 rounded-lg px-2 py-1 transition-all duration-200 outline-none",
															isSelected
																? "bg-primary/10 text-primary font-medium"
																: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
														)}
													>
														<div
															className={cn(
																"flex items-center justify-center size-6 shrink-0 rounded-full transition-colors border",
																isSelected
																	? "bg-background/50 border-primary/20 text-primary shadow-sm"
																	: "bg-muted/30 border-transparent text-muted-foreground/70 group-hover:text-foreground group-hover:bg-background group-hover:border-border/50",
															)}
														>
															<FolderIcon className="size-3" />
														</div>

														<span className="flex-1 truncate text-left text-xs">
															{workspace.title}
														</span>

														{isSelected && (
															<div className="relative flex items-center justify-center size-3 shrink-0 animate-in zoom-in duration-300">
																<div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
																<Check className="relative size-2 text-primary stroke-[3]" />
															</div>
														)}
													</button>
												);
											})}
										</div>
									) : (
										<div className="px-2 py-4 text-center">
											<div className="size-6 mx-auto mb-1.5 rounded-full bg-muted/30 flex items-center justify-center">
												<FolderIcon className="size-3 text-muted-foreground/40" />
											</div>
											<p className="text-[10px] text-muted-foreground/60 italic">
												No workspaces
											</p>
										</div>
									)}
								</div>

								<div className="h-px bg-border/40 mx-2 my-0.5" />

								{/* Actions Area */}
								<div className="px-1 pb-1 space-y-0.5">
									{/* New Workspace */}
									{showNewWorkspace ? (
										<div className="flex items-center gap-1.5 p-0.5 animate-in fade-in slide-in-from-left-2 duration-200 bg-muted/30 rounded-lg border border-border/40">
											<Input
												value={newWorkspaceName}
												onChange={(e) => setNewWorkspaceName(e.target.value)}
												placeholder="Name..."
												className="h-6 text-xs border-none bg-transparent shadow-none focus-visible:ring-0 px-1.5"
												autoFocus
												onKeyDown={(e) => {
													if (e.key === "Enter") handleCreateWorkspace();
													if (e.key === "Escape") {
														setShowNewWorkspace(false);
														setNewWorkspaceName("");
													}
												}}
											/>
											<Button
												size="icon"
												variant="ghost"
												className="size-6 hover:bg-primary/10 hover:text-primary rounded-full"
												onClick={handleCreateWorkspace}
											>
												<Plus className="size-3" />
											</Button>
										</div>
									) : (
										<button
											onClick={() => setShowNewWorkspace(true)}
											className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
										>
											<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-muted/30">
												<Plus className="size-3" />
											</div>
											<span>New Workspace</span>
										</button>
									)}

									<button
										onClick={handleImportClick}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
									>
										<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-muted/30">
											<ImportIcon className="size-3" />
										</div>
										<span>Import from JSON</span>
									</button>
									<button
										onClick={() => setExportDialogOpen(true)}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
									>
										<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-muted/30">
											<ExportIcon className="size-3" />
										</div>
										<span>Export Data</span>
									</button>

									<div className="h-px bg-border/40 mx-1.5 my-0.5" />

									<button
										onClick={handleDeleteAllData}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all group"
										disabled={workspaces.length === 0}
									>
										<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-destructive/5 group-hover:bg-destructive/10 transition-colors">
											<Trash2 className="size-3" />
										</div>
										<span>Delete All Data</span>
									</button>
								</div>
							</div>
						</PopoverContent>
					</Popover>

					<ToggleNavItem
						to="/settings/design"
						icon={<SettingsIcon className="size-5" />}
						label="Settings"
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
				workspaceId={selectedWorkspaceId || workspaces[0]?.id || ""}
				workspaceTitle={
					workspaces.find(
						(w: WorkspaceInterface) =>
							w.id === (selectedWorkspaceId || workspaces[0]?.id),
					)?.title
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
						"relative flex w-full aspect-square items-center justify-center transition-all",
						active
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{active && (
						<div className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
					)}
					{icon}
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

// Toggle 导航项组件 - 点击一次打开，再点击一次返回
function ToggleNavItem({
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
	const navigate = useNavigate();

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		if (active) {
			// 如果已经在Target页面，返回主页
			navigate({ to: "/" });
		} else {
			// Otherwise Navigate toTarget页面
			navigate({ to });
		}
	};

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					onClick={handleClick}
					className={cn(
						"relative flex w-full aspect-square items-center justify-center transition-all",
						active
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{active && (
						<div className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
					)}
					{icon}
				</button>
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
	active = false,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
	active?: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					onClick={onClick}
					className={cn(
						"relative flex w-full aspect-square items-center justify-center transition-all",
						active
							? "text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{active && (
						<div className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
					)}
					{icon}
				</button>
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}
