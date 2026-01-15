/**
 * @file io/dom/theme.dom.ts
 * @description 主题 DOM 操作函数
 *
 * 包含有副作用的主题相关函数：
 * - 系统主题检测（访问 window.matchMedia）
 * - 主题应用（操作 DOM）
 *
 * 这些函数有 IO 副作用，因此放在 io/dom 层
 */

import { DEFAULT_THEME_CONFIG } from "@/types/theme"
import type { Theme, ThemeColors } from "@/types/theme/theme.types"

// ==============================
// System Theme Detection
// ==============================

/**
 * 获取当前系统主题偏好
 * 根据系统的颜色方案返回 "light" 或 "dark"
 *
 * 注意：此函数有副作用（访问 window），不是纯函数
 *
 * @returns 系统主题偏好
 */
export const getSystemTheme = (): "light" | "dark" => {
	if (typeof window === "undefined") return "light"
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

// ==============================
// Theme Application (DOM Operations)
// ==============================

/**
 * 将 camelCase 转换为 kebab-case
 */
function toKebabCase(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
}

/**
 * 生成默认的扩展颜色
 */
function getExtendedColors(colors: ThemeColors, type: "light" | "dark"): Required<ThemeColors> {
	return {
		...colors,
		// 编辑器颜色
		editorCursor: colors.editorCursor || colors.primary,
		editorLineHighlight: colors.editorLineHighlight || (type === "light" ? "#f5f5f5" : "#2a2a2a"),
		editorSelection: colors.editorSelection || colors.accent,
		error: colors.error || (type === "light" ? "#ef4444" : "#f87171"),
		info: colors.info || colors.primary,

		// 状态颜色
		success: colors.success || (type === "light" ? "#22c55e" : "#4ade80"),
		syntaxBold: colors.syntaxBold || (type === "light" ? "#1f2937" : "#f1f5f9"),
		syntaxCode: colors.syntaxCode || (type === "light" ? "#dc2626" : "#f87171"),
		syntaxComment: colors.syntaxComment || colors.mutedForeground,

		// 语法高亮
		syntaxHeading: colors.syntaxHeading || colors.primary,
		syntaxItalic: colors.syntaxItalic || colors.mutedForeground,
		syntaxLink: colors.syntaxLink || colors.primary,
		syntaxQuote: colors.syntaxQuote || colors.mutedForeground,

		// Toast 颜色
		toastBackground: colors.toastBackground || colors.popover,
		toastBorder: colors.toastBorder || colors.border,
		toastForeground: colors.toastForeground || colors.popoverForeground,
		warning: colors.warning || (type === "light" ? "#f59e0b" : "#fbbf24"),
	}
}

/**
 * 应用主题到 DOM
 *
 * 注意：此函数有副作用（操作 DOM），不是纯函数
 *
 * @param theme - 要应用的主题
 */
export function applyTheme(theme: Theme): void {
	const root = document.documentElement

	// 设置主题类型
	root.classList.remove("light", "dark")
	root.classList.add(theme.type)

	// 获取完整的颜色配置（包括默认扩展颜色）
	const fullColors = getExtendedColors(theme.colors, theme.type)

	// 应用所有颜色变量（直接使用十六进制颜色）
	for (const [key, value] of Object.entries(fullColors)) {
		root.style.setProperty(`--${toKebabCase(key)}`, value)
	}
}

/**
 * 应用主题，可选过渡动画
 * 启用过渡时添加 CSS 类实现平滑切换
 *
 * 注意：此函数有副作用（操作 DOM），不是纯函数
 *
 * @param theme - 要应用的主题
 * @param enableTransition - 是否启用过渡动画
 */
export const applyThemeWithTransition = (theme: Theme, enableTransition: boolean): void => {
	const root = document.documentElement

	if (enableTransition) {
		// 添加过渡类
		root.classList.add("theme-transition")

		// 应用主题
		applyTheme(theme)

		// 动画完成后移除过渡类
		setTimeout(() => {
			root.classList.remove("theme-transition")
		}, DEFAULT_THEME_CONFIG.transitionDuration)
	} else {
		applyTheme(theme)
	}
}
