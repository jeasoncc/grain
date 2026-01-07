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

import { applyTheme, type Theme } from "@/utils/themes.util";
import { DEFAULT_THEME_CONFIG } from "@/types/theme";

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
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
};

// ==============================
// Theme Application
// ==============================

/**
 * 应用主题，可选过渡动画
 * 启用过渡时添加 CSS 类实现平滑切换
 *
 * 注意：此函数有副作用（操作 DOM），不是纯函数
 *
 * @param theme - 要应用的主题
 * @param enableTransition - 是否启用过渡动画
 */
export const applyThemeWithTransition = (
	theme: Theme,
	enableTransition: boolean,
): void => {
	const root = document.documentElement;

	if (enableTransition) {
		// 添加过渡类
		root.classList.add("theme-transition");

		// 应用主题
		applyTheme(theme);

		// 动画完成后移除过渡类
		setTimeout(() => {
			root.classList.remove("theme-transition");
		}, DEFAULT_THEME_CONFIG.transitionDuration);
	} else {
		applyTheme(theme);
	}
};
