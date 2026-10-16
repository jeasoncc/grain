import type { IconTheme } from "@/types/icon-theme"
import { useCurrentIconThemeKey } from "@/state/icon-theme.state"
import { getIconThemeOrDefault } from "@/pipes/icon-theme"

/**
 * React Hook：订阅图标主题变化
 *
 * @returns 当前图标主题
 */
export function useIconTheme(): IconTheme {
	return getIconThemeOrDefault(useCurrentIconThemeKey())
}

// 重导出 getCurrentIconTheme 供外部使用
export { getCurrentIconTheme } from "@/flows/icon-theme"
