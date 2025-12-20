/**
 * Icon Theme Domain - 工具函数
 * 纯函数，用于获取图标
 */
import type { LucideIcon } from "lucide-react";
import type { IconTheme } from "./icon-theme.interface";
import { iconThemes } from "./icon-theme.config";
import { useIconThemeStore } from "./icon-theme.store";

// ============================================================================
// 主题查询函数
// ============================================================================

/**
 * 根据 key 获取图标主题
 */
export function getIconThemeByKey(key: string): IconTheme | undefined {
	return iconThemes.find((theme) => theme.key === key);
}

/**
 * 获取默认图标主题
 */
export function getDefaultIconTheme(): IconTheme {
	return iconThemes[0];
}

/**
 * 获取所有可用的图标主题
 */
export function getAllIconThemes(): IconTheme[] {
	return iconThemes;
}

/**
 * 获取图标主题数量
 */
export function getIconThemeCount(): number {
	return iconThemes.length;
}

// ============================================================================
// 当前主题相关函数
// ============================================================================

/**
 * 获取当前图标主题
 */
export function getCurrentIconTheme(): IconTheme {
	const { currentThemeKey } = useIconThemeStore.getState();
	return getIconThemeByKey(currentThemeKey) || getDefaultIconTheme();
}

/**
 * 应用图标主题（设置当前主题）
 */
export function applyIconTheme(themeKey: string): void {
	useIconThemeStore.getState().setTheme(themeKey);
}

// ============================================================================
// 图标获取函数
// ============================================================================

/**
 * 根据类型和状态获取图标
 */
export function getIconForType(
	type: "project" | "character" | "world" | "folder" | "file",
	state: "default" | "open" = "default",
): LucideIcon {
	const theme = getCurrentIconTheme();
	const iconConfig = theme.icons[type];

	if (state === "open" && "open" in iconConfig && iconConfig.open) {
		return iconConfig.open;
	}

	return iconConfig.default;
}

/**
 * 获取 ActivityBar 图标
 */
export function getActivityBarIcon(
	type: keyof IconTheme["icons"]["activityBar"],
): LucideIcon {
	const theme = getCurrentIconTheme();
	return theme.icons.activityBar[type];
}

/**
 * 获取 SettingsPage 图标
 */
export function getSettingsPageIcon(
	type: keyof IconTheme["icons"]["settingsPage"],
): LucideIcon {
	const theme = getCurrentIconTheme();
	return theme.icons.settingsPage[type];
}
