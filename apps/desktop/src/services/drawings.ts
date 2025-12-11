import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/curd";
import logger from "@/log/index";
import type { DrawingInterface } from "@/db/schema";

// 清理绘图数据中的异常值，防止 "Canvas exceeds max size" 错误
export function sanitizeDrawingContent(content: string): string {
	if (!content) {
		return JSON.stringify({ elements: [], appState: {}, files: {} });
	}

	try {
		const parsed = JSON.parse(content);
		
		// 清理 elements
		const MAX_COORD = 50000;
		const MAX_SIZE = 10000;
		
		const sanitizedElements = Array.isArray(parsed.elements) 
			? parsed.elements.filter((el: any) => {
				if (!el || typeof el !== "object") return false;
				const x = el.x ?? 0;
				const y = el.y ?? 0;
				const width = el.width ?? 0;
				const height = el.height ?? 0;
				
				// 过滤掉坐标或尺寸异常的元素
				if (!Number.isFinite(x) || Math.abs(x) > MAX_COORD) return false;
				if (!Number.isFinite(y) || Math.abs(y) > MAX_COORD) return false;
				if (!Number.isFinite(width) || width < 0 || width > MAX_SIZE) return false;
				if (!Number.isFinite(height) || height < 0 || height > MAX_SIZE) return false;
				
				return true;
			}).map((el: any) => ({
				...el,
				x: Number.isFinite(el.x) ? Math.max(-MAX_COORD, Math.min(MAX_COORD, el.x)) : 0,
				y: Number.isFinite(el.y) ? Math.max(-MAX_COORD, Math.min(MAX_COORD, el.y)) : 0,
				width: Number.isFinite(el.width) ? Math.min(el.width, MAX_SIZE) : 100,
				height: Number.isFinite(el.height) ? Math.min(el.height, MAX_SIZE) : 100,
			}))
			: [];

		// 清理 appState - 只保留安全的属性
		const sanitizedAppState: any = {};
		if (parsed.appState?.viewBackgroundColor && typeof parsed.appState.viewBackgroundColor === "string") {
			sanitizedAppState.viewBackgroundColor = parsed.appState.viewBackgroundColor;
		}
		if (typeof parsed.appState?.gridSize === "number" && Number.isFinite(parsed.appState.gridSize) && parsed.appState.gridSize > 0) {
			sanitizedAppState.gridSize = parsed.appState.gridSize;
		}
		// 不保留 zoom、scrollX、scrollY 等可能导致问题的属性

		return JSON.stringify({
			elements: sanitizedElements,
			appState: sanitizedAppState,
			files: parsed.files || {},
		});
	} catch (error) {
		logger.error("Failed to sanitize drawing content:", error);
		return JSON.stringify({ elements: [], appState: {}, files: {} });
	}
}

// 清理数据库中所有绘图的异常数据
// 检查并修复 width/height 值，以及重置异常内容
export async function cleanupAllDrawings(): Promise<number> {
	try {
		const allDrawings = await db.drawings.toArray();
		let cleanedCount = 0;
		const emptyContent = JSON.stringify({ elements: [], appState: {}, files: {} });
		
		// 安全的最大尺寸 - 考虑 devicePixelRatio
		const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
		const MAX_SAFE_SIZE = Math.floor(4096 / dpr);
		const DEFAULT_WIDTH = 800;
		const DEFAULT_HEIGHT = 600;
		
		logger.info(`Cleanup drawings: dpr=${dpr}, maxSize=${MAX_SAFE_SIZE}`);

		for (const drawing of allDrawings) {
			const updates: Partial<DrawingInterface> = {};
			let needsUpdate = false;
			
			// 检查并修复 width
			if (!drawing.width || drawing.width > MAX_SAFE_SIZE || drawing.width < 100) {
				updates.width = DEFAULT_WIDTH;
				needsUpdate = true;
				logger.warn(`Drawing ${drawing.id}: fixing width from ${drawing.width} to ${DEFAULT_WIDTH}`);
			}
			
			// 检查并修复 height
			if (!drawing.height || drawing.height > MAX_SAFE_SIZE || drawing.height < 100) {
				updates.height = DEFAULT_HEIGHT;
				needsUpdate = true;
				logger.warn(`Drawing ${drawing.id}: fixing height from ${drawing.height} to ${DEFAULT_HEIGHT}`);
			}
			
			// 检查内容
			const originalContent = drawing.content || "";
			try {
				const parsed = JSON.parse(originalContent);
				let contentNeedsReset = false;
				
				// 检查 appState 中是否有异常的尺寸值
				if (parsed.appState) {
					const { width, height, scrollX, scrollY, zoom } = parsed.appState;
					if ((width && width > MAX_SAFE_SIZE) || 
						(height && height > MAX_SAFE_SIZE) ||
						(scrollX && Math.abs(scrollX) > 10000) ||
						(scrollY && Math.abs(scrollY) > 10000) ||
						(zoom?.value && (zoom.value > 10 || zoom.value < 0.1))) {
						contentNeedsReset = true;
						logger.warn(`Drawing ${drawing.id}: invalid appState detected`, parsed.appState);
					}
				}
				
				// 检查 elements 中是否有异常的坐标或尺寸
				if (Array.isArray(parsed.elements)) {
					for (const el of parsed.elements) {
						if (!el || typeof el !== "object") continue;
						const x = el.x ?? 0;
						const y = el.y ?? 0;
						const w = el.width ?? 0;
						const h = el.height ?? 0;
						
						if (!Number.isFinite(x) || Math.abs(x) > 50000 ||
							!Number.isFinite(y) || Math.abs(y) > 50000 ||
							!Number.isFinite(w) || w > 10000 ||
							!Number.isFinite(h) || h > 10000) {
							contentNeedsReset = true;
							logger.warn(`Drawing ${drawing.id}: invalid element detected`, { x, y, w, h });
							break;
						}
					}
				}
				
				if (contentNeedsReset) {
					// 清理 appState，保留 elements
					const cleanedContent = {
						elements: parsed.elements || [],
						appState: {
							viewBackgroundColor: parsed.appState?.viewBackgroundColor,
							gridSize: parsed.appState?.gridSize,
						},
						files: parsed.files || {},
					};
					updates.content = JSON.stringify(cleanedContent);
					needsUpdate = true;
					logger.warn(`Drawing ${drawing.id}: cleaned appState`);
				}
			} catch {
				// 解析失败，重置内容
				updates.content = emptyContent;
				needsUpdate = true;
				logger.warn(`Drawing ${drawing.id}: resetting corrupted content`);
			}
			
			if (needsUpdate) {
				await db.updateDrawing(drawing.id, updates);
				cleanedCount++;
			}
		}

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

// 清理特定绘图的数据
export async function cleanupDrawing(drawingId: string): Promise<boolean> {
	try {
		const drawing = await db.getDrawing(drawingId);
		if (!drawing) return false;

		const sanitizedContent = sanitizeDrawingContent(drawing.content || "");
		await db.updateDrawing(drawingId, { content: sanitizedContent });
		logger.info(`Cleaned drawing ${drawingId}`);
		return true;
	} catch (error) {
		logger.error(`Failed to cleanup drawing ${drawingId}:`, error);
		return false;
	}
}

// 重置绘图为空白状态
export async function resetDrawing(drawingId: string): Promise<boolean> {
	try {
		const emptyContent = JSON.stringify({ elements: [], appState: {}, files: {} });
		await db.updateDrawing(drawingId, { content: emptyContent });
		logger.info(`Reset drawing ${drawingId} to empty state`);
		return true;
	} catch (error) {
		logger.error(`Failed to reset drawing ${drawingId}:`, error);
		return false;
	}
}

export function useDrawingById(drawingId: string | null): DrawingInterface | null {
	const data = useLiveQuery(
		() =>
			drawingId
				? db.getDrawing(drawingId)
				: Promise.resolve(null),
		[drawingId] as const,
	);
	return (data ?? null) as DrawingInterface | null;
}

export function useDrawingsByProject(projectId: string | null): DrawingInterface[] {
	const data = useLiveQuery(
		() =>
			projectId
				? db.getDrawingsByProject(projectId)
				: Promise.resolve([] as DrawingInterface[]),
		[projectId] as const,
	);
	return (data ?? []) as DrawingInterface[];
}

export async function createDrawing(params: {
	projectId: string;
	name?: string;
	width?: number;
	height?: number;
}) {
	return db.addDrawing({
		project: params.projectId,
		name: params.name || `Drawing ${Date.now()}`,
		width: params.width || 800,
		height: params.height || 600,
		content: JSON.stringify({ elements: [], appState: {}, files: {} }),
	});
}

export async function updateDrawing(
	id: string,
	updates: Partial<DrawingInterface>,
) {
	return db.updateDrawing(id, updates);
}

export async function renameDrawing(id: string, name: string) {
	return db.updateDrawing(id, { name });
}

export async function deleteDrawing(id: string) {
	return db.deleteDrawing(id);
}

export async function saveDrawingContent(
	id: string,
	content: string,
	width?: number,
	height?: number,
) {
	const updates: Partial<DrawingInterface> = { content };
	if (width !== undefined) updates.width = width;
	if (height !== undefined) updates.height = height;
	return db.updateDrawing(id, updates);
}