/**
 * Drawing Migration - Migrate canvas scenes to book-level drawings
 */

import logger from "@/log";
import { db } from "@/db/curd";
import { createDrawing } from "./drawings";
import type { SceneInterface } from "@/db/schema";

export async function migrateCanvasScenesToDrawings(projectId: string) {
	try {
		// Get all canvas scenes for the project
		const allScenes = await db.getScenesByProject(projectId);
		const canvasScenes = allScenes.filter(scene => scene.type === "canvas");

		if (canvasScenes.length === 0) {
			logger.info("No canvas scenes to migrate");
			return { migrated: 0, errors: [] };
		}

		const errors: string[] = [];
		let migrated = 0;

		for (const scene of canvasScenes) {
			try {
				// Create a new drawing from the canvas scene
				await createDrawing({
					projectId,
					name: scene.title || `Migrated Drawing ${migrated + 1}`,
					width: 800,
					height: 600,
				});

				// Note: We're creating blank drawings since the old canvas scenes
				// used file paths which we're moving away from
				migrated++;
				logger.info(`Migrated canvas scene: ${scene.title}`);
			} catch (error) {
				logger.error(`Failed to migrate scene ${scene.title}:`, error);
				errors.push(`Failed to migrate "${scene.title}": ${error}`);
			}
		}

		logger.info(`Migration completed: ${migrated} drawings created`);
		return { migrated, errors };
	} catch (error) {
		logger.error("Migration failed:", error);
		throw error;
	}
}

export async function hasCanvasScenes(projectId: string): Promise<boolean> {
	try {
		const allScenes = await db.getScenesByProject(projectId);
		return allScenes.some(scene => scene.type === "canvas");
	} catch (error) {
		logger.error("Failed to check for canvas scenes:", error);
		return false;
	}
}

export async function removeCanvasScenes(projectId: string) {
	try {
		const allScenes = await db.getScenesByProject(projectId);
		const canvasScenes = allScenes.filter(scene => scene.type === "canvas");

		for (const scene of canvasScenes) {
			await db.deleteScene(scene.id);
		}

		logger.info(`Removed ${canvasScenes.length} canvas scenes`);
		return canvasScenes.length;
	} catch (error) {
		logger.error("Failed to remove canvas scenes:", error);
		throw error;
	}
}