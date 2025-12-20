/**
 * Drawing Service Utilities
 *
 * Pure functions for drawing operations.
 * All functions are pure - no side effects, no database access.
 *
 * @requirements 1.1, 3.1, 3.2, 3.3
 */

import type { DrawingInterface } from "@/db/models";
import {
	getSafeDrawingDimensions,
	hasInvalidAppState,
	sanitizeDrawingContent,
	EMPTY_DRAWING_CONTENT,
} from "@/db/models";

/**
 * Compute required updates for a drawing based on validation rules
 *
 * This is a pure function that:
 * - Takes a drawing and validation parameters
 * - Returns the updates needed or null if no updates required
 * - Does not mutate the input drawing
 * - Has no side effects
 *
 * @param drawing - The drawing to validate
 * @param dpr - Device pixel ratio for calculating max safe size
 * @param maxSafeSize - Maximum safe canvas size
 * @returns Partial updates needed or null if drawing is valid
 *
 * @requirements 3.1, 3.2, 3.3
 */
export function computeDrawingUpdates(
	drawing: DrawingInterface,
	dpr: number,
	maxSafeSize: number,
): Partial<DrawingInterface> | null {
	const updates: Partial<DrawingInterface> = {};
	const safeDimensions = getSafeDrawingDimensions(drawing.width, drawing.height, dpr);

	// Check dimensions
	if (!drawing.width || drawing.width > maxSafeSize || drawing.width < 100) {
		updates.width = safeDimensions.width;
	}
	if (!drawing.height || drawing.height > maxSafeSize || drawing.height < 100) {
		updates.height = safeDimensions.height;
	}

	// Check content - use sanitizeDrawingContent for all validation
	const originalContent = drawing.content || "";
	try {
		const parsed = JSON.parse(originalContent);
		if (hasInvalidAppState(parsed.appState, maxSafeSize)) {
			updates.content = sanitizeDrawingContent(originalContent);
		}
	} catch {
		updates.content = EMPTY_DRAWING_CONTENT;
	}

	return Object.keys(updates).length > 0 ? updates : null;
}
