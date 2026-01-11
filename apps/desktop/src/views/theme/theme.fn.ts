/**
 * @file fn/theme/theme.fn.ts
 * @description Theme 纯函数
 *
 * 所有主题管理相关的纯函数：
 * - 无副作用
 * - 相同输入 → 相同输出
 * - 不修改输入参数
 *
 * 注意：有副作用的函数（DOM 操作、系统检测）已移至 hooks/use-theme-dom.ts
 */

import type { ThemeMode } from "@/types/theme";
import type { Theme } from "@/utils/themes.util";

// ==============================
// Mode Calculations
// ==============================

/**
 * 计算切换循环中的下一个模式
 * 循环顺序: light → dark → system → light
 *
 * @param currentMode - 当前主题模式
 * @returns 循环中的下一个主题模式
 */
export const getNextMode = (currentMode: ThemeMode): ThemeMode => {
	switch (currentMode) {
		case "light":
			return "dark";
		case "dark":
			return "system";
		case "system":
			return "light";
		default:
			return "light";
	}
};

/**
 * 根据模式获取有效的主题类型
 * 对于 "system" 模式，需要传入系统偏好
 *
 * @param mode - 主题模式
 * @param systemPreference - 系统主题偏好（当 mode 为 "system" 时使用）
 * @returns 有效的主题类型 ("light" 或 "dark")
 */
export const getEffectiveThemeType = (
	mode: ThemeMode,
	systemPreference: "light" | "dark" = "light",
): "light" | "dark" => {
	if (mode === "system") {
		return systemPreference;
	}
	return mode;
};

/**
 * 获取给定主题类型的默认主题键
 *
 * @param type - 主题类型 ("light" 或 "dark")
 * @returns 该类型的默认主题键
 */
export const getDefaultThemeKey = (type: "light" | "dark"): string => {
	return type === "dark" ? "default-dark" : "default-light";
};

/**
 * 检查主题是否匹配预期类型
 *
 * @param theme - 要检查的主题
 * @param expectedType - 预期的主题类型
 * @returns 主题是否匹配预期类型
 */
export const isThemeTypeMatch = (
	theme: Theme,
	expectedType: "light" | "dark",
): boolean => {
	return theme.type === expectedType;
};
