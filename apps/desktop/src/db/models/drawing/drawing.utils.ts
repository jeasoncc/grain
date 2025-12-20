/**
 * Drawing Utils - Pure Functions
 *
 * Sanitization and validation functions for Excalidraw drawings.
 * All functions are pure - no side effects, no database access.
 */

import logger from "@/log/index";

// ============================================================================
// Constants
// ============================================================================

/** Maximum coordinate value for drawing elements */
export const MAX_COORD = 50000;

/** Maximum size (width/height) for drawing elements */
export const MAX_ELEMENT_SIZE = 10000;

/** Default drawing dimensions */
export const DEFAULT_DRAWING_WIDTH = 800;
export const DEFAULT_DRAWING_HEIGHT = 600;

/** Empty drawing content template */
export const EMPTY_DRAWING_CONTENT = JSON.stringify({
	elements: [],
	appState: {},
	files: {},
});

// ============================================================================
// Sanitization Functions
// ============================================================================

/**
 * Sanitize drawing content to prevent "Canvas exceeds max size" errors
 * Filters out elements with invalid coordinates or sizes
 *
 * @param content - Raw drawing content JSON string
 * @returns Sanitized drawing content JSON string
 */
export function sanitizeDrawingContent(content: string): string {
	if (!content) {
		return EMPTY_DRAWING_CONTENT;
	}

	try {
		const parsed = JSON.parse(content);

		// Sanitize elements
		const sanitizedElements = Array.isArray(parsed.elements)
			? parsed.elements
					.filter((el: unknown) => isValidElement(el))
					.map((el: Record<string, unknown>) => clampElementCoordinates(el))
			: [];

		// Sanitize appState - only keep safe properties
		const sanitizedAppState: Record<string, unknown> = {};
		if (
			parsed.appState?.viewBackgroundColor &&
			typeof parsed.appState.viewBackgroundColor === "string"
		) {
			sanitizedAppState.viewBackgroundColor =
				parsed.appState.viewBackgroundColor;
		}
		if (
			typeof parsed.appState?.gridSize === "number" &&
			Number.isFinite(parsed.appState.gridSize) &&
			parsed.appState.gridSize > 0
		) {
			sanitizedAppState.gridSize = parsed.appState.gridSize;
		}
		// Don't preserve zoom, scrollX, scrollY as they can cause issues

		return JSON.stringify({
			elements: sanitizedElements,
			appState: sanitizedAppState,
			files: parsed.files || {},
		});
	} catch (error) {
		logger.error("Failed to sanitize drawing content:", error);
		return EMPTY_DRAWING_CONTENT;
	}
}

/**
 * Check if an element has valid coordinates and dimensions
 */
function isValidElement(el: unknown): boolean {
	if (!el || typeof el !== "object") return false;

	const element = el as Record<string, unknown>;
	const x = (element.x as number) ?? 0;
	const y = (element.y as number) ?? 0;
	const width = (element.width as number) ?? 0;
	const height = (element.height as number) ?? 0;

	// Filter out elements with invalid coordinates or sizes
	if (!Number.isFinite(x) || Math.abs(x) > MAX_COORD) return false;
	if (!Number.isFinite(y) || Math.abs(y) > MAX_COORD) return false;
	if (!Number.isFinite(width) || width < 0 || width > MAX_ELEMENT_SIZE)
		return false;
	if (!Number.isFinite(height) || height < 0 || height > MAX_ELEMENT_SIZE)
		return false;

	return true;
}

/**
 * Clamp element coordinates to valid ranges
 */
function clampElementCoordinates(
	el: Record<string, unknown>,
): Record<string, unknown> {
	return {
		...el,
		x: Number.isFinite(el.x)
			? Math.max(-MAX_COORD, Math.min(MAX_COORD, el.x as number))
			: 0,
		y: Number.isFinite(el.y)
			? Math.max(-MAX_COORD, Math.min(MAX_COORD, el.y as number))
			: 0,
		width: Number.isFinite(el.width)
			? Math.min(el.width as number, MAX_ELEMENT_SIZE)
			: 100,
		height: Number.isFinite(el.height)
			? Math.min(el.height as number, MAX_ELEMENT_SIZE)
			: 100,
	};
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if drawing dimensions are valid
 *
 * @param width - Drawing width
 * @param height - Drawing height
 * @param devicePixelRatio - Device pixel ratio (default 1)
 * @returns True if dimensions are valid
 */
export function isValidDrawingSize(
	width: number,
	height: number,
	devicePixelRatio = 1,
): boolean {
	const maxSafeSize = Math.floor(4096 / devicePixelRatio);
	return (
		width >= 100 &&
		width <= maxSafeSize &&
		height >= 100 &&
		height <= maxSafeSize
	);
}

/**
 * Get safe drawing dimensions
 *
 * @param width - Requested width
 * @param height - Requested height
 * @param devicePixelRatio - Device pixel ratio (default 1)
 * @returns Safe dimensions object
 */
export function getSafeDrawingDimensions(
	width: number | undefined,
	height: number | undefined,
	devicePixelRatio = 1,
): { width: number; height: number } {
	const maxSafeSize = Math.floor(4096 / devicePixelRatio);

	return {
		width:
			width && width >= 100 && width <= maxSafeSize
				? width
				: DEFAULT_DRAWING_WIDTH,
		height:
			height && height >= 100 && height <= maxSafeSize
				? height
				: DEFAULT_DRAWING_HEIGHT,
	};
}

/**
 * Check if appState contains invalid values
 *
 * @param appState - Excalidraw appState object
 * @param maxSafeSize - Maximum safe canvas size
 * @returns True if appState has invalid values
 */
export function hasInvalidAppState(
	appState: Record<string, unknown> | undefined,
	maxSafeSize: number,
): boolean {
	if (!appState) return false;

	const { width, height, scrollX, scrollY, zoom } = appState as {
		width?: number;
		height?: number;
		scrollX?: number;
		scrollY?: number;
		zoom?: { value?: number };
	};

	if ((width && width > maxSafeSize) || (height && height > maxSafeSize)) {
		return true;
	}
	if (
		(scrollX && Math.abs(scrollX) > 10000) ||
		(scrollY && Math.abs(scrollY) > 10000)
	) {
		return true;
	}
	if (zoom?.value && (zoom.value > 10 || zoom.value < 0.1)) {
		return true;
	}

	return false;
}
