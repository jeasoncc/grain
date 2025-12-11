/**
 * Drawing Workspace Hook - Manage drawing workspace state and integration
 */

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createDrawing, useDrawingsByProject } from "@/services/drawings";
import { migrateCanvasScenesToDrawings, hasCanvasScenes } from "@/services/drawing-migration";
import type { DrawingInterface } from "@/db/schema";

export function useDrawingWorkspace(projectId: string | null) {
	const [selectedDrawing, setSelectedDrawing] = useState<DrawingInterface | null>(null);
	const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
	const drawings = useDrawingsByProject(projectId);

	// Check if migration is needed
	const checkMigrationNeeded = useCallback(async () => {
		if (!projectId) return;
		
		try {
			const needsMigration = await hasCanvasScenes(projectId);
			setShowMigrationPrompt(needsMigration);
		} catch (error) {
			console.error("Failed to check migration status:", error);
		}
	}, [projectId]);

	// Perform migration
	const performMigration = useCallback(async () => {
		if (!projectId) return;

		try {
			const result = await migrateCanvasScenesToDrawings(projectId);
			
			if (result.migrated > 0) {
				toast.success(`Migrated ${result.migrated} canvas scenes to drawings`);
			}
			
			if (result.errors.length > 0) {
				toast.error(`Migration completed with ${result.errors.length} errors`);
				console.error("Migration errors:", result.errors);
			}
			
			setShowMigrationPrompt(false);
		} catch (error) {
			console.error("Migration failed:", error);
			toast.error("Migration failed. Please try again.");
		}
	}, [projectId]);

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
		showMigrationPrompt,
		checkMigrationNeeded,
		performMigration,
		createNewDrawing,
		selectDrawing,
		clearSelection,
		setShowMigrationPrompt,
	};
}