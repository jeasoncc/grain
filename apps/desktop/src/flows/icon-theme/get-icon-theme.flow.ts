/**
 * @file flows/icon-theme/get-icon-theme.flow.ts
 * @description 图标主题获取 flow
 *
 * 封装图标主题的获取逻辑，供 hooks 层使用
 */

import { getIconThemeOrDefault } from "@/pipes/icon-theme"
import { useIconThemeStore } from "@/state/icon-theme.state"
import type { IconTheme } from "@/types/icon-theme"

/**
 * 获取当前选中的图标主题
 * 从 store 读取当前主题键，然后获取对应的主题配置
 *
 * @returns 当前图标主题
 */
export const getCurrentIconTheme = (): IconTheme => {
	const currentKey = useIconThemeStore.getState().currentThemeKey
	return getIconThemeOrDefault(currentKey)
}

/**
 * 根据主题键获取图标主题
 *
 * @param themeKey - 主题键
 * @returns 图标主题
 */
export const getIconThemeByKey = (themeKey: string): IconTheme => {
	return getIconThemeOrDefault(themeKey)
}
