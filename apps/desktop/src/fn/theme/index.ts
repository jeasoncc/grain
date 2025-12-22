/**
 * @file fn/theme/index.ts
 * @description Theme 纯函数模块统一导出
 *
 * 导出所有主题相关的纯函数。
 * 这些函数无副作用，可组合，可测试。
 *
 * 注意：有副作用的函数（DOM 操作、系统检测）在 hooks/use-theme-dom.ts 中
 */

export {
	getDefaultThemeKey,
	getEffectiveThemeType,
	// Mode Calculations
	getNextMode,
	// Theme Validation
	isThemeTypeMatch,
} from "./theme.fn";
