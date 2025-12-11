/**
 * Drawing Manager - Main component for managing book-level drawings
 */

import { useState } from "react";
import { DrawingList } from "./drawing-list";
import { DrawingWorkspace } from "./drawing-workspace";
import type { DrawingInterface } from "@/db/schema";

interface DrawingManagerProps {
	projectId: string | null;
	className?: string;
}

export function DrawingManager({ projectId, className }: DrawingManagerProps) {
	const [selectedDrawing, setSelectedDrawing] = useState<DrawingInterface | null>(null);

	const handleSelectDrawing = (drawing: DrawingInterface) => {
		setSelectedDrawing(drawing);
	};

	const handleDeleteDrawing = (drawingId: string) => {
		if (selectedDrawing?.id === drawingId) {
			setSelectedDrawing(null);
		}
	};

	const handleRenameDrawing = (drawingId: string, newName: string) => {
		if (selectedDrawing?.id === drawingId) {
			setSelectedDrawing(prev => prev ? { ...prev, name: newName } : null);
		}
	};

	return (
		<div className={`flex h-full ${className}`}>
			{/* Sidebar with drawing list */}
			<div className="w-80 border-r bg-muted/30">
				<DrawingList
					projectId={projectId}
					onSelectDrawing={handleSelectDrawing}
					selectedDrawingId={selectedDrawing?.id}
				/>
			</div>

			{/* Main drawing workspace */}
			<div className="flex-1 p-4 overflow-auto">
				{selectedDrawing ? (
					<DrawingWorkspace
						drawing={selectedDrawing}
						onDelete={handleDeleteDrawing}
						onRename={handleRenameDrawing}
						className="mx-auto"
					/>
				) : (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
						<div className="text-center">
							<h3 className="text-lg font-medium mb-2">No Drawing Selected</h3>
							<p className="text-sm">
								Select a drawing from the sidebar or create a new one to get started.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}