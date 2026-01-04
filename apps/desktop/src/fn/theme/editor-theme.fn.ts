/**
 * @file editor-theme.fn.ts
 * @description 编辑器主题颜色提取函数
 *
 * 从应用主题中提取编辑器组件需要的颜色配置。
 */

import type { EditorThemeColors } from "@grain/editor-monaco";
import type { Theme } from "@/lib/themes";

/**
 * 从应用主题中提取编辑器主题颜色
 *
 * @param theme - 应用主题配置
 * @returns 编辑器主题颜色配置
 */
export const getEditorThemeColors = (
	theme: Theme | undefined,
): EditorThemeColors | undefined => {
	if (!theme) return undefined;

	const { colors } = theme;

	return {
		background: colors.background,
		foreground: colors.foreground,
		selection: colors.editorSelection,
		lineHighlight: colors.editorLineHighlight,
		cursor: colors.editorCursor,
		lineNumber: colors.mutedForeground,
		lineNumberActive: colors.foreground,
	};
};
