/**
 * 主题 Hook - 使用 Zustand Store
 *
 * 功能：
 * - 主题持久化（Zustand persist）
 * - 系统主题跟随
 * - 平滑过渡动画
 */

export {
	initializeTheme,
	useTheme,
	useThemeStore,
} from "@/stores/theme.store";
export type { ThemeMode } from "@/types/theme";
