/**
 * Drawing Workspace Hook - Manage drawing workspace state and integration
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createDrawing, useDrawingsByProject } from "@/services/drawings";
import type { DrawingInterface } from "@/db/models";

export function useDrawingWorkspace(projectId: string | null) {
	const [selectedDrawing, setSelectedDrawing] = useState<DrawingInterface | null>(null);
	const drawings = useDrawingsByProject(projectId);

	// Create new drawing
	const createNewDrawing = useCallback(async (name?: string) => {
		if (!projectId) {
			toast.error("No project selected");
			return null;
		}

		try {
			const newDrawing = await createDrawing({
				projectId,
				name: name || `Drawing ${drawings.length + 1}`,
			});
			
			setSelectedDrawing(newDrawing);
			toast.success("New drawing created");
			return newDrawing;
		} catch (error) {
			console.error("Failed to create drawing:", error);
			toast.error("Failed to create drawing");
			return null;
		}
	}, [projectId, drawings.length]);

	// Select drawing
	const selectDrawing = useCallback((drawing: DrawingInterface) => {
		setSelectedDrawing(drawing);
	}, []);

	// Clear selection
	const clearSelection = useCallback(() => {
		setSelectedDrawing(null);
	}, []);

	return {
		drawings,
		selectedDrawing,
		createNewDrawing,
		selectDrawing,
		clearSelection,
	};
}
