/**
 * 主题状态管理 - Zustand Store
 *
 * 功能：
 * - 主题持久化（Zustand persist + localStorage）
 * - 系统主题跟随（自动监听系统深色/浅色模式变化）
 * - 平滑过渡动画（切换时 300ms 过渡效果）
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyTheme, getThemeByKey, type Theme, themes } from "@/lib/themes";

// 主题模式类型
export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
	// 当前选择的主题 key
	themeKey: string;
	// 主题模式：light, dark, system
	mode: ThemeMode;
	// 是否启用过渡动画
	enableTransition: boolean;
	// 是否已初始化
	_initialized: boolean;

	// Actions
	setTheme: (key: string) => void;
	setMode: (mode: ThemeMode) => void;
	toggleMode: () => void;
	setEnableTransition: (enable: boolean) => void;
}

// 获取系统主题偏好
function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

// 应用主题并添加过渡动画
function applyThemeWithTransition(theme: Theme, enableTransition: boolean) {
	const root = document.documentElement;

	if (enableTransition) {
		// 添加过渡类
		root.classList.add("theme-transition");

		// 应用主题
		applyTheme(theme);

		// 移除过渡类（动画完成后）
		setTimeout(() => {
			root.classList.remove("theme-transition");
		}, 300);
	} else {
		applyTheme(theme);
	}
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set, get) => ({
			themeKey: "default-light",
			mode: "system",
			enableTransition: true,
			_initialized: false,

			setTheme: (key: string) => {
				const theme = getThemeByKey(key);
				if (!theme) return;

				const { enableTransition } = get();
				set({ themeKey: key });

				// 应用主题并更新模式为主题的类型
				applyThemeWithTransition(theme, enableTransition);
				// 选择具体主题时，退出系统模式
				set({ mode: theme.type });
			},

			setMode: (mode: ThemeMode) => {
				set({ mode });

				const { themeKey, enableTransition } = get();
				const currentTheme = getThemeByKey(themeKey);

				if (mode === "system") {
					// 系统模式：根据系统偏好选择主题
					const systemType = getSystemTheme();
					if (currentTheme && currentTheme.type !== systemType) {
						// 找到同系列的主题或默认主题
						const defaultTheme =
							systemType === "dark" ? "default-dark" : "default-light";
						const newTheme = getThemeByKey(defaultTheme);
						if (newTheme) {
							set({ themeKey: defaultTheme });
							applyThemeWithTransition(newTheme, enableTransition);
						}
					} else if (currentTheme) {
						applyThemeWithTransition(currentTheme, enableTransition);
					}
				} else {
					// 手动模式：如果当前主题类型不匹配，切换到默认主题
					if (currentTheme && currentTheme.type !== mode) {
						const defaultTheme =
							mode === "dark" ? "default-dark" : "default-light";
						const newTheme = getThemeByKey(defaultTheme);
						if (newTheme) {
							set({ themeKey: defaultTheme });
							applyThemeWithTransition(newTheme, enableTransition);
						}
					} else if (currentTheme) {
						applyThemeWithTransition(currentTheme, enableTransition);
					}
				}
			},

			toggleMode: () => {
				const { mode } = get();
				const newMode: ThemeMode =
					mode === "light" ? "dark" : mode === "dark" ? "system" : "light";
				get().setMode(newMode);
			},

			setEnableTransition: (enable: boolean) => {
				set({ enableTransition: enable });
			},
		}),
		{
			name: "novel-editor-theme",
			partialize: (state) => ({
				themeKey: state.themeKey,
				mode: state.mode,
				enableTransition: state.enableTransition,
			}),
		},
	),
);

// 系统主题监听器清理函数
let systemThemeCleanup: (() => void) | null = null;

// 初始化主题（在应用启动时调用）
export function initializeTheme() {
	// 防止重复初始化
	if (useThemeStore.getState()._initialized) {
		return systemThemeCleanup || undefined;
	}

	const { themeKey, mode } = useThemeStore.getState();

	// 根据模式确定实际主题
	let effectiveThemeKey = themeKey;

	if (mode === "system") {
		const systemType = getSystemTheme();
		const currentTheme = getThemeByKey(themeKey);

		// 如果当前主题类型与系统不匹配，使用默认主题
		if (currentTheme && currentTheme.type !== systemType) {
			effectiveThemeKey =
				systemType === "dark" ? "default-dark" : "default-light";
			useThemeStore.setState({ themeKey: effectiveThemeKey });
		}
	}

	const theme = getThemeByKey(effectiveThemeKey);
	if (theme) {
		applyThemeWithTransition(theme, false); // 初始化时不需要动画
	}

	// 标记已初始化
	useThemeStore.setState({ _initialized: true });

	// 监听系统主题变化
	if (typeof window !== "undefined") {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			const { mode, enableTransition } = useThemeStore.getState();

			if (mode === "system") {
				const newType = e.matches ? "dark" : "light";
				const defaultTheme =
					newType === "dark" ? "default-dark" : "default-light";
				const theme = getThemeByKey(defaultTheme);

				if (theme) {
					useThemeStore.setState({ themeKey: defaultTheme });
					applyThemeWithTransition(theme, enableTransition);
				}
			}
		};

		mediaQuery.addEventListener("change", handleChange);

		// 保存清理函数
		systemThemeCleanup = () =>
			mediaQuery.removeEventListener("change", handleChange);

		// 返回清理函数
		return systemThemeCleanup;
	}
}

// 便捷 hook
export function useTheme() {
	const store = useThemeStore();
	const currentTheme = getThemeByKey(store.themeKey);

	return {
		theme: store.themeKey,
		mode: store.mode,
		currentTheme,
		themes,
		isDark: currentTheme?.type === "dark",
		isSystem: store.mode === "system",
		enableTransition: store.enableTransition,
		setTheme: store.setTheme,
		setMode: store.setMode,
		toggleMode: store.toggleMode,
		setEnableTransition: store.setEnableTransition,
	};
}
