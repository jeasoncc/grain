/**
 * @file editor-theme.fn.ts
 * @description 编辑器主题颜色提取函数
 *
 * 从应用主题中提取编辑器组件需要的颜色配置。
 */

import type { Theme } from "@/utils/themes.util"

/**
 * 编辑器主题颜色配置
 */
export interface EditorThemeColors {
	/** 背景色 */
	readonly background: string
	/** 前景色 */
	readonly foreground: string
	/** 选中文本背景色 */
	readonly selection: string
	/** 当前行高亮背景色 */
	readonly lineHighlight?: string
	/** 光标颜色 */
	readonly cursor?: string
	/** 行号颜色 */
	readonly lineNumber: string
	/** 活动行号颜色 */
	readonly lineNumberActive: string
}

/**
 * 从应用主题中提取编辑器主题颜色
 *
 * @param theme - 应用主题配置
 * @returns 编辑器主题颜色配置
 */
export const getEditorThemeColors = (theme: Theme | undefined): EditorThemeColors | undefined => {
	if (!theme) {
		return undefined
	}

	const { colors } = theme

	return {
		background: colors.background,
		cursor: colors.editorCursor,
		foreground: colors.foreground,
		lineHighlight: colors.editorLineHighlight,
		lineNumber: colors.mutedForeground,
		lineNumberActive: colors.foreground,
		selection: colors.editorSelection,
	}
}
