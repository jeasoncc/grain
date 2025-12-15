import { Link, useLocation } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { Trash2, Plus, Check } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { useIconTheme } from "@/hooks/use-icon-theme";
import { cn } from "@/lib/utils";
import { importFromJson, readFileAsText } from "@/services/projects";
import { createDiaryInFileTree } from "@/services/diary-v2";
import { useSelectionStore } from "@/stores/selection";
import { useUnifiedSidebarStore } from "@/stores/unified-sidebar";
import { useEditorTabsStore } from "@/stores/editor-tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ActivityBar(): React.ReactElement {
	const location = useLocation();
	const projects = useLiveQuery(() => db.getAllProjects(), []) || [];
	const selectedProjectId = useSelectionStore((s) => s.selectedProjectId);
	const setSelectedProjectId = useSelectionStore((s) => s.setSelectedProjectId);
	const setSelectedNodeId = useSelectionStore((s) => s.setSelectedNodeId);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const confirm = useConfirm();
	const [exportDialogOpen, setExportDialogOpen] = useState(false);
	const [showNewWorkspace, setShowNewWorkspace] = useState(false);
	const [newWorkspaceName, setNewWorkspaceName] = useState("");
	const {
		activePanel,
		isOpen: unifiedSidebarOpen,
		setActivePanel,
		toggleSidebar,
	} = useUnifiedSidebarStore();

	// Auto-create default workspace if none exists
	const hasAutoCreatedRef = useRef(false);
	useEffect(() => {
		const autoCreateDefaultWorkspace = async () => {
			// Only run once and when projects are loaded (not undefined)
			if (hasAutoCreatedRef.current || projects === undefined) return;
			
			// Check if no workspaces exist - only create default if truly empty
			if (projects.length === 0) {
				hasAutoCreatedRef.current = true;
				try {
					const newProject = await db.addProject({
						title: "My Workspace",
						author: "",
						description: "",
						language: "zh",
					});
					setSelectedProjectId(newProject.id);
					// Open file tree panel
					setActivePanel("files");
				} catch (error) {
					console.error("Failed to create default workspace:", error);
				}
			} else {
				// Workspaces exist - validate and restore selection
				const isSelectedValid = selectedProjectId && projects.some(p => p.id === selectedProjectId);
				if (!isSelectedValid) {
					// Selected workspace doesn't exist or none selected - select first one
					setSelectedProjectId(projects[0].id);
				}
				hasAutoCreatedRef.current = true;
			}
		};
		autoCreateDefaultWorkspace();
	}, [projects, selectedProjectId, setSelectedProjectId, setActivePanel]);

	// 图标主题
	const iconTheme = useIconTheme();

	// Editor tabs store for opening diary
	const openTab = useEditorTabsStore((s) => s.openTab);

	// 获取图标
	// 顺序: Files → Wiki → Search → Calendar → Outline → Statistics → Settings
	const FilesIcon = iconTheme.icons.activityBar.files;
	const WikiIcon = iconTheme.icons.activityBar.wiki;
	const SearchIcon = iconTheme.icons.activityBar.search;
	const DiaryIcon = iconTheme.icons.activityBar.diary;
	const OutlineIcon = iconTheme.icons.activityBar.outline;
	const StatisticsIcon = iconTheme.icons.activityBar.statistics;
	const SettingsIcon = iconTheme.icons.activityBar.settings;
	const TagsIcon = iconTheme.icons.activityBar.tags;
	const ImportIcon = iconTheme.icons.activityBar.import;
	const ExportIcon = iconTheme.icons.activityBar.export;
	const MoreIcon = iconTheme.icons.activityBar.more;
	const FolderIcon = iconTheme.icons.activityBar.library; // Reuse for workspace

	const handleImportClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	// Get updateEditorState for pre-loading content
	const updateEditorState = useEditorTabsStore((s) => s.updateEditorState);

	// Handle diary creation from Calendar icon
	const handleCreateDiary = useCallback(async () => {
		if (!selectedProjectId) {
			toast.error("Please select a workspace first");
			return;
		}
		try {
			const diaryNode = await createDiaryInFileTree(selectedProjectId);
			
			// Pre-load the diary content into editorStates BEFORE opening the tab
			// This ensures the editor is initialized with the template content
			const { getNodeContent } = await import("@/services/nodes");
			const content = await getNodeContent(diaryNode.id);
			if (content) {
				try {
					const parsed = JSON.parse(content);
					updateEditorState(diaryNode.id, { serializedState: parsed });
				} catch {
					// Ignore parse errors
				}
			}
			
			// Open the created diary in the editor
			openTab({
				projectId: selectedProjectId,
				nodeId: diaryNode.id,
				title: diaryNode.title,
				type: "diary",
			});
			// Open file tree panel and highlight the new diary
			setActivePanel("files");
			setSelectedNodeId(diaryNode.id);
			toast.success("Diary created");
		} catch (error) {
			toast.error("Failed to create diary");
			console.error("Diary creation error:", error);
		}
	}, [selectedProjectId, openTab, setActivePanel, setSelectedNodeId, updateEditorState]);

	const handleImportFile = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			try {
				const text = await readFileAsText(file);
				await importFromJson(text, { keepIds: false });
				toast.success("Import successful");
			} catch {
				toast.error("Import failed");
			} finally {
				if (fileInputRef.current) fileInputRef.current.value = "";
			}
		},
		[],
	);



	const handleDeleteAllBooks = useCallback(async () => {
		const ok = await confirm({
			title: "Delete all data?",
			description: "This action cannot be undone. All workspaces, files, and data will be deleted.",
			confirmText: "Delete",
			cancelText: "Cancel",
		});
		if (!ok) return;
		try {
			await Promise.all([
				db.attachments.clear(),
				db.nodes.clear(),
				db.wikiEntries.clear(),
				db.drawings.clear(),
				db.projects.clear(),
			]);
			// Reset selection state
			setSelectedProjectId(null);
			setSelectedNodeId(null);
			// Reset auto-create flag so a new workspace will be created
			hasAutoCreatedRef.current = false;
			toast.success("All data deleted");
		} catch {
			toast.error("Delete failed");
		}
	}, [confirm, setSelectedProjectId, setSelectedNodeId]);

	// Handle workspace selection
	const handleSelectWorkspace = useCallback((projectId: string) => {
		setSelectedProjectId(projectId);
		toast.success("Workspace selected");
	}, [setSelectedProjectId]);

	// Handle new workspace creation
	const handleCreateWorkspace = useCallback(async () => {
		if (!newWorkspaceName.trim()) {
			toast.error("Please enter a workspace name");
			return;
		}
		try {
			const newProject = await db.addProject({
				title: newWorkspaceName.trim(),
				author: "",
				description: "",
				language: "zh",
			});
			setSelectedProjectId(newProject.id);
			setNewWorkspaceName("");
			setShowNewWorkspace(false);
			toast.success("Workspace created");
		} catch {
			toast.error("Failed to create workspace");
		}
	}, [newWorkspaceName, setSelectedProjectId]);

	// 检查当前路由是否匹配
	const isActive = (path: string) =>
		location.pathname === path || location.pathname.startsWith(path + "/");

	return (
		<aside className="activity-bar z-10 flex w-12 shrink-0 flex-col items-center border-r border-border/30 bg-muted/50 pb-2">
			<TooltipProvider>
				{/* 主导航 - 侧边栏面板切换 */}
				{/* 顺序: Files → Wiki → Search → Calendar → Outline → Statistics → Settings */}
				{/* Library 和 Diary 面板按钮已移除，日记功能整合到文件树中，但保留日历图标用于快速创建 */}
				<nav className="flex flex-col items-center w-full">
					{/* 1st: Files (Node-based File Tree) */}
					<ActionButton
						icon={<FilesIcon className="size-6" />}
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
						icon={<DiaryIcon className="size-6" />}
						label="New Diary"
						onClick={handleCreateDiary}
					/>
					{/* 3rd: Wiki */}
					<ActionButton
						icon={<WikiIcon className="size-6" />}
						label="Wiki"
						active={activePanel === "wiki" && unifiedSidebarOpen}
						onClick={() => {
							if (activePanel === "wiki" && unifiedSidebarOpen) {
								toggleSidebar();
							} else {
								setActivePanel("wiki");
							}
						}}
					/>
					{/* 4th: Search */}
					<ActionButton
						icon={<SearchIcon className="size-6" />}
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
										<MoreIcon className="size-6" />
									</button>
								</PopoverTrigger>
							</TooltipTrigger>
							<TooltipContent side="right">More</TooltipContent>
						</Tooltip>
						<PopoverContent side="right" align="end" className="w-56 p-1">
							<div className="grid gap-1">
								{/* Workspace Selection */}
								<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
									Workspaces
								</div>
								{projects.length > 0 ? (
									<div className="max-h-32 overflow-y-auto">
										{projects.map((project) => {
											const isSelected = selectedProjectId === project.id;
											return (
												<button
													key={project.id}
													onClick={() => handleSelectWorkspace(project.id)}
													className={cn(
														"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
														isSelected && "bg-primary/10 text-primary border-l-2 border-l-primary"
													)}
												>
													<FolderIcon className={cn("size-4", isSelected && "text-primary")} />
													<span className="flex-1 truncate text-left">{project.title}</span>
													{isSelected && (
														<Check className="size-4 text-primary" />
													)}
												</button>
											);
										})}
									</div>
								) : (
									<div className="px-2 py-1.5 text-sm text-muted-foreground">
										No workspaces
									</div>
								)}
								
								{/* New Workspace */}
								{showNewWorkspace ? (
									<div className="flex items-center gap-1 px-2 py-1">
										<Input
											value={newWorkspaceName}
											onChange={(e) => setNewWorkspaceName(e.target.value)}
											placeholder="Workspace name"
											className="h-7 text-sm"
											autoFocus
											onKeyDown={(e) => {
												if (e.key === "Enter") handleCreateWorkspace();
												if (e.key === "Escape") {
													setShowNewWorkspace(false);
													setNewWorkspaceName("");
												}
											}}
										/>
										<Button size="sm" className="h-7 px-2" onClick={handleCreateWorkspace}>
											<Plus className="size-4" />
										</Button>
									</div>
								) : (
									<button
										onClick={() => setShowNewWorkspace(true)}
										className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
									>
										<Plus className="size-4" /> New Workspace
									</button>
								)}
								
								<div className="h-px bg-border my-1" />
								
								<button
									onClick={handleImportClick}
									className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
								>
									<ImportIcon className="size-4" /> Import
								</button>
								<button
									onClick={() => setExportDialogOpen(true)}
									className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
								>
									<ExportIcon className="size-4" /> Export
								</button>
								<div className="h-px bg-border my-1" />
								<button
									onClick={handleDeleteAllBooks}
									className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
									disabled={projects.length === 0}
								>
									<Trash2 className="size-4" /> Delete All
								</button>
							</div>
						</PopoverContent>
					</Popover>

					<NavItem
						to="/settings/design"
						icon={<SettingsIcon className="size-6" />}
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


