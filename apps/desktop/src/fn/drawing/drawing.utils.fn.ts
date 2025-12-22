/**
 * @file drawing.utils.fn.ts
 * @description Drawing 纯函数工具
 *
 * 提供绘图相关的纯函数，包括：
 * - 内容清理和验证
 * - 尺寸计算
 * - 状态检查
 *
 * @requirements 3.1, 3.2, 3.3
 */

/**
 * 空绘图内容的默认值
 */
export const EMPTY_DRAWING_CONTENT = JSON.stringify({
	elements: [],
	appState: {},
	files: {},
});

/**
 * 默认绘图尺寸
 */
export const DEFAULT_DRAWING_WIDTH = 800;
export const DEFAULT_DRAWING_HEIGHT = 600;

/**
 * 最大安全坐标值
 */
const MAX_SAFE_COORD = 50000;

/**
 * 获取安全的绘图尺寸
 *
 * @param width - 原始宽度
 * @param height - 原始高度
 * @param dpr - 设备像素比
 * @returns 安全的尺寸对象
 */
export function getSafeDrawingDimensions(
	width: number | undefined,
	height: number | undefined,
	dpr: number = 1,
): { width: number; height: number } {
	const maxSafeSize = Math.floor(4096 / dpr);

	const safeWidth = Math.min(
		Math.max(width || DEFAULT_DRAWING_WIDTH, 100),
		maxSafeSize,
	);
	const safeHeight = Math.min(
		Math.max(height || DEFAULT_DRAWING_HEIGHT, 100),
		maxSafeSize,
	);

	return { width: safeWidth, height: safeHeight };
}

/**
 * 检查 appState 是否包含无效值
 *
 * @param appState - Excalidraw appState 对象
 * @param maxSafeSize - 最大安全尺寸
 * @returns 是否包含无效值
 */
export function hasInvalidAppState(
	appState: Record<string, unknown> | undefined,
	maxSafeSize: number,
): boolean {
	if (!appState) return false;

	// 检查滚动位置
	if (
		typeof appState.scrollX === "number" &&
		Math.abs(appState.scrollX) > MAX_SAFE_COORD
	) {
		return true;
	}
	if (
		typeof appState.scrollY === "number" &&
		Math.abs(appState.scrollY) > MAX_SAFE_COORD
	) {
		return true;
	}

	// 检查尺寸
	if (typeof appState.width === "number" && appState.width > maxSafeSize) {
		return true;
	}
	if (typeof appState.height === "number" && appState.height > maxSafeSize) {
		return true;
	}

	return false;
}

/**
 * 清理绘图内容中的异常值
 *
 * @param content - 原始内容字符串
 * @returns 清理后的内容字符串
 */
export function sanitizeDrawingContent(content: string): string {
	if (!content) return EMPTY_DRAWING_CONTENT;

	try {
		const data = JSON.parse(content);

		// 清理 elements 中的异常坐标
		if (data.elements && Array.isArray(data.elements)) {
			for (const element of data.elements) {
				if (
					typeof element.x === "number" &&
					Math.abs(element.x) > MAX_SAFE_COORD
				) {
					element.x = 0;
				}
				if (
					typeof element.y === "number" &&
					Math.abs(element.y) > MAX_SAFE_COORD
				) {
					element.y = 0;
				}
				if (
					typeof element.width === "number" &&
					Math.abs(element.width) > MAX_SAFE_COORD
				) {
					element.width = 100;
				}
				if (
					typeof element.height === "number" &&
					Math.abs(element.height) > MAX_SAFE_COORD
				) {
					element.height = 100;
				}
			}
		}

		// 清理 appState 中的异常值
		if (data.appState) {
			if (
				typeof data.appState.scrollX === "number" &&
				Math.abs(data.appState.scrollX) > MAX_SAFE_COORD
			) {
				data.appState.scrollX = 0;
			}
			if (
				typeof data.appState.scrollY === "number" &&
				Math.abs(data.appState.scrollY) > MAX_SAFE_COORD
			) {
				data.appState.scrollY = 0;
			}
		}

		return JSON.stringify(data);
	} catch {
		return EMPTY_DRAWING_CONTENT;
	}
}
