/**
 * Drawing List - Sidebar component for managing book-level drawings
 */

import { PenTool, Plus, Search } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DrawingInterface } from "@/db/schema";
import { useDrawingsByWorkspace } from "@/hooks/use-drawing";
import logger from "@/log";
import { createDrawing, deleteDrawing } from "@/actions";

interface DrawingListProps {
	workspaceId: string | null;
	onSelectDrawing?: (drawing: DrawingInterface) => void;
	selectedDrawingId?: string | null;
}

export function DrawingList({
	workspaceId,
	onSelectDrawing,
	selectedDrawingId,
}: DrawingListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const drawings = useDrawingsByWorkspace(workspaceId);

	// Filter drawings based on search
	const filteredDrawings = (drawings ?? []).filter((drawing) =>
		drawing.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Create new drawing
	const handleCreateDrawing = useCallback(async () => {
		if (!workspaceId) {
			toast.error("No workspace selected");
			return;
		}

		try {
			const result = await createDrawing({
				workspaceId,
				name: `Drawing ${drawings?.length ?? 0 + 1}`,
			})();

			if (result._tag === "Right") {
				onSelectDrawing?.(result.right);
				toast.success("New drawing created");
			} else {
				logger.error("Failed to create drawing:", result.left);
				toast.error("Failed to create drawing");
			}
		} catch (error) {
			logger.error("Failed to create drawing:", error);
			toast.error("Failed to create drawing");
		}
	}, [workspaceId, drawings?.length, onSelectDrawing]);

	// Delete drawing
	const handleDeleteDrawing = useCallback(async (drawingId: string) => {
		try {
			const result = await deleteDrawing(drawingId)();

			if (result._tag === "Right") {
				toast.success("Drawing deleted");
			} else {
				logger.error("Failed to delete drawing:", result.left);
				toast.error("Failed to delete drawing");
			}
		} catch (error) {
			logger.error("Failed to delete drawing:", error);
			toast.error("Failed to delete drawing");
		}
	}, []);

	if (!workspaceId) {
		return (
			<div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
				<PenTool className="size-8 mb-2" />
				<span className="text-sm">Select a workspace to view drawings</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b">
				<h3 className="font-medium text-sm">Drawings</h3>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={handleCreateDrawing}
					title="Create new drawing"
				>
					<Plus className="size-4" />
				</Button>
			</div>

			{/* Search */}
			<div className="p-3 border-b">
				<div className="relative">
					<Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="Search drawings..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8 h-8"
					/>
				</div>
			</div>

			{/* Drawing list */}
			<ScrollArea className="flex-1">
				<div className="p-2">
					{filteredDrawings.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
							<PenTool className="size-8 mb-2" />
							<span className="text-sm text-center">
								{searchQuery
									? "No drawings match your search"
									: "No drawings yet. Create your first drawing!"}
							</span>
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
						<div className="space-y-1">
							{filteredDrawings.map((drawing) => (
								<DrawingListItem
									key={drawing.id}
									drawing={drawing}
									isSelected={selectedDrawingId === drawing.id}
									onSelect={() => onSelectDrawing?.(drawing)}
									onDelete={() => handleDeleteDrawing(drawing.id)}
								/>
							))}
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
			if (window.confirm(`Delete "${drawing.name}"?`)) {
				onDelete();
			}
		},
		[drawing.name, onDelete],
	);

	return (
		<div
			className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
				isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
			}`}
			onClick={onSelect}
		>
			<div className="flex items-center gap-2 min-w-0 flex-1">
				<PenTool className="size-4 shrink-0 text-blue-500" />
				<div className="min-w-0 flex-1">
					<div className="font-medium text-sm truncate">{drawing.name}</div>
					<div className="text-xs text-muted-foreground">
						{new Date(drawing.updatedAt).toLocaleDateString()}
					</div>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon"
				className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
				onClick={handleDelete}
				title="Delete drawing"
			>
				<span className="text-xs">×</span>
			</Button>
		</div>
	);
}
