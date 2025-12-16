/**
 * 绘图面板 - 统一侧边栏中的绘图管理功能
 * 基于 DrawingList 组件重构，适配 Unified Sidebar 的样式和布局
 */

import { PenTool, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createDrawing, deleteDrawing, useDrawingsByWorkspace } from "@/services/drawings";
import type { DrawingInterface } from "@/db/schema";
import { useSelectionStore } from "@/stores/selection";

interface DrawingsPanelProps {
	onSelectDrawing?: (drawing: DrawingInterface) => void;
	selectedDrawingId?: string | null;
}

export function DrawingsPanel({
	onSelectDrawing,
	selectedDrawingId,
}: DrawingsPanelProps) {
	const selectedWorkspaceId = useSelectionStore((s) => s.selectedWorkspaceId);
	const [searchQuery, setSearchQuery] = useState("");
	const drawings = useDrawingsByWorkspace(selectedWorkspaceId);

	// Filter drawings based on search
	const filteredDrawings = drawings.filter((drawing) =>
		drawing.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	// Create new drawing
	const handleCreateDrawing = useCallback(async () => {
		if (!selectedWorkspaceId) {
			toast.error("Please select a workspace first");
			return;
		}

		try {
			const newDrawing = await createDrawing({
				workspaceId: selectedWorkspaceId,
				name: `Drawing ${drawings.length + 1}`,
			});
			onSelectDrawing?.(newDrawing);
			toast.success("New drawing created");
		} catch (error) {
			console.error("Failed to create drawing:", error);
			toast.error("Failed to create drawing");
		}
	}, [selectedWorkspaceId, drawings.length, onSelectDrawing]);

	// Delete drawing
	const handleDeleteDrawing = useCallback(async (drawingId: string, drawingName: string) => {
		if (!window.confirm(`Delete "${drawingName}"?`)) {
			return;
		}
		try {
			await deleteDrawing(drawingId);
			toast.success("Drawing deleted");
		} catch (error) {
			console.error("Failed to delete drawing:", error);
			toast.error("Failed to delete drawing");
		}
	}, []);

	return (
		<div className="flex h-full flex-col">
			{/* 头部 */}
			<div className="h-12 flex items-center justify-between px-4 border-b border-sidebar-border/20">
				<div className="flex items-center gap-2 font-semibold text-foreground/80">
					<PenTool className="size-5" />
					<span>Drawings</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={handleCreateDrawing}
					title="Create new drawing"
					disabled={!selectedWorkspaceId}
				>
					<Plus className="size-4" />
				</Button>
			</div>

			{/* 搜索 */}
			<div className="p-3 border-b border-sidebar-border/20">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search drawings..."
						className="pl-9 h-8"
						disabled={!selectedWorkspaceId}
					/>
				</div>
			</div>

			<Separator className="opacity-30" />

			{/* 内容区域 */}
			<ScrollArea className="flex-1">
				<div className="px-2 py-4">
					{!selectedWorkspaceId ? (
						// 未选择工作空间
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<PenTool className="size-12 mb-3 opacity-20" />
							<p className="text-sm text-center">Select a workspace to view drawings</p>
						</div>
					) : filteredDrawings.length === 0 ? (
						// 无绘图
						<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
							<PenTool className="size-12 mb-3 opacity-20" />
							<p className="text-sm text-center">
								{searchQuery
									? "No drawings match your search"
									: "No drawings yet"}
							</p>
							{!searchQuery && (
								<Button
									variant="outline"
									size="sm"
									className="mt-3"
									onClick={handleCreateDrawing}
								>
									<Plus className="size-4 mr-1" />
									Create Drawing
								</Button>
							)}
						</div>
					) : (
						// 绘图列表
						<div className="space-y-1">
							{/* 列表标题 */}
							<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
								Drawings ({filteredDrawings.length})
							</div>

							{filteredDrawings.map((drawing) => (
								<DrawingListItem
									key={drawing.id}
									drawing={drawing}
									isSelected={selectedDrawingId === drawing.id}
									onSelect={() => onSelectDrawing?.(drawing)}
									onDelete={() => handleDeleteDrawing(drawing.id, drawing.name)}
								/>
							))}

							{/* 创建新绘图按钮 */}
							<button
								className="w-full mt-2 text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 justify-center group py-3 px-3 rounded-md flex items-center gap-2 transition-all"
								onClick={handleCreateDrawing}
							>
								<Plus className="size-4 group-hover:scale-110 transition-transform" />
								<span>Create New Drawing</span>
							</button>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

interface DrawingListItemProps {
	drawing: DrawingInterface;
	isSelected: boolean;
	onSelect: () => void;
	onDelete: () => void;
}

function DrawingListItem({
	drawing,
	isSelected,
	onSelect,
	onDelete,
}: DrawingListItemProps) {
	const handleDelete = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onDelete();
		},
		[onDelete]
	);

	return (
		<div
			className={cn(
				"group flex items-start gap-3 h-auto py-3 px-3 rounded-md cursor-pointer transition-all",
				isSelected
					? "bg-primary/10 text-primary"
					: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
			)}
			onClick={onSelect}
		>
			<div className="shrink-0 mt-0.5 text-blue-500">
				<PenTool className="size-4" />
			</div>
			<div className="flex flex-col items-start gap-0.5 overflow-hidden flex-1">
				<span className="text-sm font-medium leading-tight truncate w-full">
					{drawing.name}
				</span>
				<span className="text-xs text-muted-foreground/70 truncate w-full font-light">
					{new Date(drawing.updatedAt).toLocaleDateString()}
				</span>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
				onClick={handleDelete}
				title="Delete drawing"
			>
				<Trash2 className="size-3" />
			</Button>
		</div>
	);
}
