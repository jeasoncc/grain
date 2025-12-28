/**
 * FileTreeItem Component
 * Recursive component for rendering individual nodes in the file tree.
 * Supports folders with expand/collapse, files, and drawing types.
 *
 * Requirements: 2.1, 2.2
 */

import {
	ChevronDown,
	ChevronRight,
	FileText,
	Folder,
	FolderOpen,
	FolderPlus,
	MoreHorizontal,
	Pencil,
	PenTool,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { TreeNode } from "@/fn/node";
import { cn } from "@/lib/utils";
import type { DragState, FileTreeItemProps } from "./file-tree.types";

export function FileTreeItem({
	node,
	selectedId,
	renamingId,
	dragState,
	onSelect,
	onToggle,
	onStartRename,
	onRename,
	onCancelRename,
	onDelete,
	onCreateFolder,
	onCreateFile,
	onDragStart,
	onDragOver,
	onDragEnd,
	onDrop,
}: FileTreeItemProps) {
	const isSelected = node.id === selectedId;
	const isRenaming = node.id === renamingId;
	const isDragging = dragState.draggedId === node.id;
	const isDropTarget = dragState.targetId === node.id;
	const dropPosition = isDropTarget ? dragState.position : null;
	const isFolder = node.type === "folder";
	const hasChildren = node.children.length > 0;

	// Get appropriate icon based on node type and state
	const getIcon = () => {
		switch (node.type) {
			case "folder":
				return node.collapsed ? (
					<Folder className="size-4 shrink-0 text-blue-500/70" />
				) : (
					<FolderOpen className="size-4 shrink-0 text-blue-500" />
				);
			case "drawing":
				return <PenTool className="size-4 shrink-0 text-purple-500/70" />;
			case "file":
			default:
				return <FileText className="size-4 shrink-0 text-muted-foreground" />;
		}
	};

	// Handle click on the item
	const handleClick = useCallback(() => {
		if (isFolder) {
			onToggle(node.id, node.collapsed);
		} else {
			onSelect(node.id);
		}
	}, [isFolder, node.id, node.collapsed, onToggle, onSelect]);

	// Handle chevron click (for folders)
	const handleChevronClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onToggle(node.id, node.collapsed);
		},
		[node.id, node.collapsed, onToggle],
	);

	// Handle rename input
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				onRename(node.id, e.currentTarget.value);
			} else if (e.key === "Escape") {
				onCancelRename();
			}
		},
		[node.id, onRename, onCancelRename],
	);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			onRename(node.id, e.target.value);
		},
		[node.id, onRename],
	);

	// Handle double click to start rename
	const handleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onStartRename(node.id);
		},
		[node.id, onStartRename],
	);

	return (
		<div
			className={cn("transition-all duration-200", isDragging && "opacity-30")}
		>
			{/* Drop indicator before */}
			{isDropTarget && dropPosition === "before" && (
				<div className="h-0.5 bg-primary my-0.5 rounded-full" />
			)}

			<div
				role="treeitem"
				tabIndex={0}
				aria-selected={isSelected}
				aria-expanded={isFolder ? !node.collapsed : undefined}
				className={cn(
					"group flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-all",
					isSelected
						? "bg-primary/10 text-primary"
						: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					isDropTarget &&
						dropPosition === "inside" &&
						"bg-sidebar-accent ring-1 ring-primary/20",
				)}
				style={{ paddingLeft: `${node.depth * 8 + 8}px` }}
				onClick={handleClick}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						handleClick();
					}
				}}
				draggable={!isRenaming}
				onDragStart={(e) => onDragStart(e, node.id)}
				onDragOver={(e) => onDragOver(e, node.id, node.type)}
				onDragEnd={onDragEnd}
				onDrop={(e) => onDrop(e, node.id, node.type)}
			>
				{/* Expand/Collapse chevron for folders */}
				{isFolder ? (
					<button
						type="button"
						onClick={handleChevronClick}
						className="p-0.5 hover:bg-black/5 rounded shrink-0"
					>
						{node.collapsed ? (
							<ChevronRight className="size-3.5 text-muted-foreground" />
						) : (
							<ChevronDown className="size-3.5 text-muted-foreground" />
						)}
					</button>
				) : (
					<span className="w-4" /> // Spacer for alignment
				)}

				{/* Node icon */}
				{getIcon()}

				{/* Node title or rename input */}
				{isRenaming ? (
					<Input
						autoFocus
						defaultValue={node.title}
						className="h-6 text-sm px-1 py-0 flex-1"
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						onClick={(e) => e.stopPropagation()}
					/>
				) : (
					<span
						role="textbox"
						tabIndex={-1}
						className="flex-1 text-sm truncate"
						onDoubleClick={handleDoubleClick}
						onKeyDown={(e) => {
							if (e.key === "F2") {
								e.preventDefault();
								onStartRename(node.id);
							}
						}}
					>
						{node.title}
					</span>
				)}

				{/* Child count for folders */}
				{isFolder && hasChildren && !isRenaming && (
					<span className="text-xs text-muted-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity mr-1">
						{node.children.length}
					</span>
				)}

				{/* Action menu button - visible on hover */}
				{!isRenaming && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								onClick={(e) => e.stopPropagation()}
								className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
								title="More actions"
							>
								<MoreHorizontal className="size-3.5 text-muted-foreground hover:text-foreground" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-48">
							{/* Create options - only show for folders */}
							{isFolder && (
								<>
									<DropdownMenuItem onClick={() => onCreateFolder(node.id)}>
										<FolderPlus className="size-4 mr-2" />
										新建文件夹
									</DropdownMenuItem>
									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<Plus className="size-4 mr-2" />
											新建文件
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent>
											<DropdownMenuItem
												onClick={() => onCreateFile(node.id, "file")}
											>
												<FileText className="size-4 mr-2" />
												文本文件
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => onCreateFile(node.id, "drawing")}
											>
												<PenTool className="size-4 mr-2" />
												画布
											</DropdownMenuItem>
										</DropdownMenuSubContent>
									</DropdownMenuSub>
									<DropdownMenuSeparator />
								</>
							)}

							{/* Rename option */}
							<DropdownMenuItem onClick={() => onStartRename(node.id)}>
								<Pencil className="size-4 mr-2" />
								重命名
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{/* Delete option */}
							<DropdownMenuItem
								onClick={() => onDelete(node.id)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="size-4 mr-2" />
								删除
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* Drop indicator after */}
			{isDropTarget && dropPosition === "after" && (
				<div className="h-0.5 bg-primary my-0.5 rounded-full" />
			)}

			{/* Render children recursively for expanded folders */}
			{isFolder && !node.collapsed && hasChildren && (
				<div className="space-y-0.5">
					{node.children.map((child) => (
						<FileTreeItem
							key={child.id}
							node={child}
							selectedId={selectedId}
							renamingId={renamingId}
							dragState={dragState}
							onSelect={onSelect}
							onToggle={onToggle}
							onStartRename={onStartRename}
							onRename={onRename}
							onCancelRename={onCancelRename}
							onDelete={onDelete}
							onCreateFolder={onCreateFolder}
							onCreateFile={onCreateFile}
							onDragStart={onDragStart}
							onDragOver={onDragOver}
							onDragEnd={onDragEnd}
							onDrop={onDrop}
						/>
					))}
				</div>
			)}
		</div>
	);
}
