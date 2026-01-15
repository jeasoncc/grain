/**
 * @file fn/drawing/index.ts
 * @description Drawing 纯函数模块统一导出
 *
 * 导出所有绘图相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * @requirements 3.1, 3.2, 3.3
 */

export {
	DEFAULT_DRAWING_HEIGHT,
	DEFAULT_DRAWING_WIDTH,
	EMPTY_DRAWING_CONTENT,
	getSafeDrawingDimensions,
	hasInvalidAppState,
	sanitizeDrawingContent,
} from "./drawing.utils.fn"
