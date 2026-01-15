/**
 * @file fn/icon-theme/icon-theme.fn.ts
 * @description Icon Theme 纯函数
 *
 * 图标主题相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 */

import type { LucideIcon } from "lucide-react"
import type { IconTheme } from "@/types/icon-theme"
import { iconThemes } from "@/types/icon-theme/icon-theme.config"

// ============================================================================
// 主题查询函数（纯函数）
// ============================================================================

/**
 * 根据 key 获取图标主题
 *
 * @param key - 主题键
 * @returns 匹配的图标主题，未找到返回 undefined
 */
export const getIconThemeByKey = (key: string): IconTheme | undefined => {
	return iconThemes.find((theme) => theme.key === key)
}

/**
 * 获取默认图标主题
 *
 * @returns 默认图标主题（第一个主题）
 */
export const getDefaultIconTheme = (): IconTheme => {
	return iconThemes[0]
}

/**
 * 获取所有可用的图标主题
 *
 * @returns 所有图标主题数组
 */
export const getAllIconThemes = (): IconTheme[] => {
	return iconThemes
}

/**
 * 获取图标主题数量
 *
 * @returns 主题数量
 */
export const getIconThemeCount = (): number => {
	return iconThemes.length
}

// ============================================================================
// 图标获取函数（纯函数）
// ============================================================================

/**
 * 根据类型和状态从指定主题获取图标
 *
 * @param theme - 图标主题
 * @param type - 图标类型
 * @param state - 图标状态（默认或打开）
 * @returns 对应的 Lucide 图标组件
 */
export const getIconForTypeFromTheme = (
	theme: IconTheme,
	type: "project" | "character" | "world" | "folder" | "file",
	state: "default" | "open" = "default",
): LucideIcon => {
	const iconConfig = theme.icons[type]

	if (state === "open" && "open" in iconConfig && iconConfig.open) {
		return iconConfig.open
	}

	return iconConfig.default
}

/**
 * 从指定主题获取 ActivityBar 图标
 *
 * @param theme - 图标主题
 * @param type - ActivityBar 图标类型
 * @returns 对应的 Lucide 图标组件
 */
export const getActivityBarIconFromTheme = (
	theme: IconTheme,
	type: keyof IconTheme["icons"]["activityBar"],
): LucideIcon => {
	return theme.icons.activityBar[type]
}

/**
 * 从指定主题获取 SettingsPage 图标
 *
 * @param theme - 图标主题
 * @param type - SettingsPage 图标类型
 * @returns 对应的 Lucide 图标组件
 */
export const getSettingsPageIconFromTheme = (
	theme: IconTheme,
	type: keyof IconTheme["icons"]["settingsPage"],
): LucideIcon => {
	return theme.icons.settingsPage[type]
}

// ============================================================================
// 主题验证函数（纯函数）
// ============================================================================

/**
 * 验证主题键是否有效
 *
 * @param key - 要验证的主题键
 * @returns 主题键是否有效
 */
export const isValidIconThemeKey = (key: string): boolean => {
	return iconThemes.some((theme) => theme.key === key)
}

/**
 * 获取主题键，如果无效则返回默认主题键
 *
 * @param key - 要验证的主题键
 * @returns 有效的主题键
 */
export const getValidIconThemeKey = (key: string): string => {
	return isValidIconThemeKey(key) ? key : getDefaultIconTheme().key
}

/**
 * 根据主题键获取图标主题，如果无效则返回默认主题
 * 纯函数版本，需要传入主题键
 *
 * @param themeKey - 主题键
 * @returns 图标主题
 */
export const getIconThemeOrDefault = (themeKey: string): IconTheme => {
	return getIconThemeByKey(themeKey) ?? getDefaultIconTheme()
}
