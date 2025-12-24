/**
 * @file index.ts
 * @description Settings Actions 统一导出
 *
 * 功能说明：
 * - 导出所有主题设置 Action
 * - 导出所有字体设置 Action
 * - 提供统一的导入入口
 */

// ============================================================================
// Theme Actions
// ============================================================================

export {
	toggleThemeMode,
	type UpdateThemeModeParams,
	type UpdateThemeParams,
	type UpdateTransitionParams,
	updateTheme,
	updateThemeMode,
	updateThemeTransition,
} from "./update-theme.action";

// ============================================================================
// Font Actions
// ============================================================================

export {
	getFontSettings,
	resetFontSettings,
	type UpdateEditorFontParams,
	type UpdateTypographyParams,
	type UpdateUiFontParams,
	updateEditorFont,
	updateTypography,
	updateUiFont,
} from "./update-font.action";
