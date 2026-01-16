/**
 * @file activity-bar.view.fn.tsx
 * @description ActivityBar 纯展示组件
 *
 * 纯展示组件，只通过 props 接收数据和回调函数。
 * 不直接访问 Store 或 DB，遵循函数式架构原则。
 */

import { Check, Plus, Trash2 } from "lucide-react"
import type * as React from "react"
import { memo } from "react"
import { useActivityBarView } from "@/hooks/use-activity-bar-view"
import { cn } from "@/utils/cn.util"
import { Button } from "@/views/ui/button"
import { Input } from "@/views/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/views/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/views/ui/tooltip"

import type {
	ActionButtonProps,
	ActivityBarProps,
	ToggleNavItemProps,
	WorkspaceItemProps,
} from "./activity-bar.types"

// ==============================
// 子组件
// ==============================

const WorkspaceItem = memo(function WorkspaceItem({
	workspace,
	isSelected,
	FolderIcon,
	onClick,
}: WorkspaceItemProps) {
	return (
		<button
			type="button"
			onClick={onClick}
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
			<span className="flex-1 truncate text-left text-xs">{workspace.title}</span>
			{isSelected && (
				<div className="relative flex items-center justify-center size-3 shrink-0 animate-in zoom-in duration-300">
					<div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
					<Check className="relative size-2 text-primary stroke-[3]" />
				</div>
			)}
		</button>
	)
})

const ActionButton = memo(function ActionButton({
	icon,
	label,
	onClick,
	active = false,
	testId,
}: ActionButtonProps & { readonly testId?: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					data-testid={testId}
					className={cn(
						"relative flex w-full aspect-square items-center justify-center transition-all",
						active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
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
	)
})

const ToggleNavItem = memo(function ToggleNavItem({
	to,
	icon,
	label,
	active,
	onNavigate,
}: ToggleNavItemProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={() => onNavigate(active ? "/" : to)}
					className={cn(
						"relative flex w-full aspect-square items-center justify-center transition-all",
						active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
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
	)
})

// ==============================
// 主组件
// ==============================

export const ActivityBarView = memo(function ActivityBarView({
	workspaces,
	selectedWorkspaceId,
	activePanel,
	isSidebarOpen,
	iconTheme,
	currentPath,
	onSelectWorkspace,
	onCreateWorkspace,
	onSetActivePanel,
	onToggleSidebar,
	onCreateDiary,
	onCreateWiki,
	onCreateLedger,
	onCreateTodo,
	onCreateNote,
	onCreateExcalidraw,
	onCreateMermaid,
	onCreatePlantUML,
	onCreateCode,
	onImportFile,
	onOpenExportDialog,
	onDeleteAllData,
	onNavigate,
}: ActivityBarProps): React.ReactElement {
	const {
		fileInputRef,
		showNewWorkspace,
		newWorkspaceName,
		setNewWorkspaceName,
		icons,
		navItems,
		handleImportClick,
		handleFileInputChange,
		handleCreateWorkspace,
		handleNewWorkspaceKeyDown,
		isActive,
		openNewWorkspaceInput,
	} = useActivityBarView({
		activePanel,
		isSidebarOpen,
		currentPath,
		iconTheme,
		onToggleSidebar,
		onSetActivePanel,
		onCreateWorkspace,
		onImportFile,
		onCreateDiary,
		onCreateWiki,
		onCreateLedger,
		onCreateTodo,
		onCreateNote,
		onCreateExcalidraw,
		onCreateMermaid,
		onCreatePlantUML,
		onCreateCode,
	})

	return (
		<aside
			data-testid="activity-bar"
			className="activity-bar z-10 flex w-12 shrink-0 flex-col items-center border-r border-border/30 bg-muted/50 pb-2"
		>
			<TooltipProvider>
				<nav className="flex flex-col items-center w-full">
					{navItems.map(({ key, Icon, label, onClick, active, testId }) => (
						<ActionButton
							key={key}
							icon={<Icon className="size-5" />}
							label={label}
							onClick={onClick}
							active={active}
							testId={testId}
						/>
					))}
				</nav>

				<div className="flex-1" />

				<div className="flex flex-col items-center w-full">
					<Popover>
						<Tooltip>
							<TooltipTrigger asChild>
								<PopoverTrigger asChild>
									<button
										type="button"
										className="relative flex w-full aspect-square items-center justify-center text-muted-foreground transition-all hover:text-foreground"
									>
										<icons.MoreIcon className="size-5" />
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
								<div className="px-3 py-1.5 flex items-center justify-between border-b border-border/30">
									<span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
										Workspaces
									</span>
									<span className="flex items-center justify-center min-w-[1rem] h-3.5 text-[9px] font-medium rounded-full bg-primary/10 text-primary px-1">
										{workspaces.length}
									</span>
								</div>

								<div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
									{workspaces.length > 0 ? (
										<div className="space-y-0.5">
											{workspaces.map((workspace) => (
												<WorkspaceItem
													key={workspace.id}
													workspace={workspace}
													isSelected={selectedWorkspaceId === workspace.id}
													FolderIcon={icons.FolderIcon}
													onClick={() => onSelectWorkspace(workspace.id)}
												/>
											))}
										</div>
									) : (
										<div className="px-2 py-4 text-center">
											<div className="size-6 mx-auto mb-1.5 rounded-full bg-muted/30 flex items-center justify-center">
												<icons.FolderIcon className="size-3 text-muted-foreground/40" />
											</div>
											<p className="text-[10px] text-muted-foreground/60 italic">No workspaces</p>
										</div>
									)}
								</div>

								<div className="h-px bg-border/40 mx-2 my-0.5" />

								<div className="px-1 pb-1 space-y-0.5">
									{showNewWorkspace ? (
										<div className="flex items-center gap-1.5 p-0.5 animate-in fade-in slide-in-from-left-2 duration-200 bg-muted/30 rounded-lg border border-border/40">
											<Input
												value={newWorkspaceName}
												onChange={(e) => setNewWorkspaceName(e.target.value)}
												placeholder="Name..."
												className="h-6 text-xs border-none bg-transparent shadow-none focus-visible:ring-0 px-1.5"
												autoFocus
												onKeyDown={handleNewWorkspaceKeyDown}
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
											type="button"
											onClick={openNewWorkspaceInput}
											className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
										>
											<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-muted/30">
												<Plus className="size-3" />
											</div>
											<span>New Workspace</span>
										</button>
									)}

									<button
										type="button"
										onClick={handleImportClick}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
									>
										<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-muted/30">
											<icons.ImportIcon className="size-3" />
										</div>
										<span>Import from JSON</span>
									</button>
									<button
										type="button"
										onClick={onOpenExportDialog}
										className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
									>
										<div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-muted/30">
											<icons.ExportIcon className="size-3" />
										</div>
										<span>Export Data</span>
									</button>

									<div className="h-px bg-border/40 mx-1.5 my-0.5" />

									<button
										type="button"
										onClick={onDeleteAllData}
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
						icon={<icons.SettingsIcon className="size-5" />}
						label="Settings"
						active={isActive("/settings")}
						onNavigate={onNavigate}
					/>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="application/json"
					className="hidden"
					onChange={handleFileInputChange}
				/>
			</TooltipProvider>
		</aside>
	)
})
