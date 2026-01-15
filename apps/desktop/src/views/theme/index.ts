/**
 * @file views/theme/index.ts
 * @description Theme 模块导出
 *
 * 纯函数已移动到 pipes/theme/，此处重新导出以保持向后兼容
 */

export {
	getDefaultThemeKey,
	getEffectiveThemeType,
	getNextMode,
	isThemeTypeMatch,
} from "@/pipes/theme"
export { getEditorThemeColors } from "./editor-theme.fn"
