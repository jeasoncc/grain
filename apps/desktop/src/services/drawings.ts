/**
 * Drawing Service
 *
 * Business logic for drawing operations including cleanup, creation, and updates.
 * Uses DrawingRepository for all database access.
 *
 * @requirements 1.2, 4.1
 */

import * as E from "fp-ts/Either";
import {
	addDrawing,
	deleteDrawing as deleteDrawingDb,
	getAllDrawings,
	getDrawingById,
	updateDrawing as updateDrawingDb,
} from "@/db";
import { EMPTY_DRAWING_CONTENT, sanitizeDrawingContent } from "@/fn/drawing";
import { useDrawing, useDrawingsByProject } from "@/hooks";
import logger from "@/log/index";
import type { DrawingInterface } from "@/types/drawing";
import { computeDrawingUpdates } from "./drawings.utils";

// Re-export pure function for backward compatibility
export { sanitizeDrawingContent };

/**
 * Cleanup all drawings with invalid data
 * Uses functional approach: map -> filter -> parallel updates
 *
 * @requirements 1.2, 4.1
 */
export async function cleanupAllDrawings(): Promise<number> {
	try {
		const allDrawingsResult = await getAllDrawings()();
		const allDrawings = E.isRight(allDrawingsResult)
			? allDrawingsResult.right
			: [];
		const dpr =
			typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const maxSafeSize = Math.floor(4096 / dpr);

		logger.info(`Cleanup drawings: dpr=${dpr}, maxSize=${maxSafeSize}`);

		// Functional pipeline: compute updates -> filter non-null -> execute
		const drawingsWithUpdates = allDrawings
			.map((drawing) => ({
				id: drawing.id,
				updates: computeDrawingUpdates(drawing, dpr, maxSafeSize),
			}))
			.filter(
				(
					item,
				): item is {
					id: string;
					updates: { width?: number; height?: number; content?: string };
				} => item.updates !== null,
			);

		// Log warnings for each update
		drawingsWithUpdates.forEach(({ id, updates }) => {
			if (updates.width) logger.warn(`Drawing ${id}: fixing dimensions`);
			if (updates.content) logger.warn(`Drawing ${id}: sanitizing content`);
		});

		// Execute all updates in parallel
		await Promise.all(
			drawingsWithUpdates.map(({ id, updates }) =>
				updateDrawingDb(id, updates)(),
			),
		);

		const cleanedCount = drawingsWithUpdates.length;
		if (cleanedCount > 0) {
			logger.success(`Fixed ${cleanedCount} drawings with invalid data`);
		} else {
			logger.info("No drawings needed cleanup");
		}

		return cleanedCount;
	} catch (error) {
		logger.error("Failed to cleanup drawings:", error);
		return 0;
	}
}

/** Cleanup a specific drawing's data */
export async function cleanupDrawing(drawingId: string): Promise<boolean> {
	try {
		const drawingResult = await getDrawingById(drawingId)();
		const drawing = E.isRight(drawingResult) ? drawingResult.right : null;
		if (!drawing) return false;

		const sanitizedContent = sanitizeDrawingContent(drawing.content || "");
		await updateDrawingDb(drawingId, { content: sanitizedContent })();
		logger.info(`Cleaned drawing ${drawingId}`);
		return true;
	} catch (error) {
		logger.error(`Failed to cleanup drawing ${drawingId}:`, error);
		return false;
	}
}

/** Reset drawing to empty state */
export async function resetDrawing(drawingId: string): Promise<boolean> {
	try {
		await updateDrawingDb(drawingId, {
			content: EMPTY_DRAWING_CONTENT,
		})();
		logger.info(`Reset drawing ${drawingId} to empty state`);
		return true;
	} catch (error) {
		logger.error(`Failed to reset drawing ${drawingId}:`, error);
		return false;
	}
}

/**
 * Hook to get a drawing by ID with live updates
 * Re-exports useDrawing from @/hooks for backward compatibility
 *
 * @param drawingId - The drawing ID (can be null)
 * @returns The drawing or null if not found
 */
export function useDrawingById(
	drawingId: string | null,
): DrawingInterface | null {
	const drawing = useDrawing(drawingId);
	return drawing ?? null;
}

/**
 * Hook to get all drawings for a workspace with live updates
 * Re-exports useDrawingsByProject from @/hooks for backward compatibility
 *
 * @param workspaceId - The workspace/project ID (can be null)
 * @returns Array of drawings
 */
export function useDrawingsByWorkspace(
	workspaceId: string | null,
): DrawingInterface[] {
	const drawings = useDrawingsByProject(workspaceId);
	return drawings ?? [];
}

export async function createDrawing(params: {
	workspaceId: string;
	name?: string;
	width?: number;
	height?: number;
}) {
	const result = await addDrawing(
		params.workspaceId,
		params.name || `Drawing ${Date.now()}`,
		{
			width: params.width || 800,
			height: params.height || 600,
			content: JSON.stringify({ elements: [], appState: {}, files: {} }),
		},
	)();
	if (E.isLeft(result)) {
		throw new Error(`Failed to create drawing: ${result.left.message}`);
	}
	return result.right;
}

export async function updateDrawing(
	id: string,
	updates: Partial<DrawingInterface>,
) {
	const result = await updateDrawingDb(id, updates)();
	if (E.isLeft(result)) {
		throw new Error(`Failed to update drawing: ${result.left.message}`);
	}
	return result.right;
}

export async function renameDrawing(id: string, name: string) {
	return updateDrawing(id, { name });
}

export async function deleteDrawing(id: string) {
	const result = await deleteDrawingDb(id)();
	if (E.isLeft(result)) {
		throw new Error(`Failed to delete drawing: ${result.left.message}`);
	}
}

export async function saveDrawingContent(
	id: string,
	content: string,
	width?: number,
	height?: number,
) {
	const updates: { content: string; width?: number; height?: number } = {
		content,
	};
	if (width !== undefined) updates.width = width;
	if (height !== undefined) updates.height = height;
	return updateDrawing(id, updates);
}
