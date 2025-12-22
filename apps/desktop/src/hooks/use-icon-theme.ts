import { useEffect, useState } from "react";
import { getIconThemeOrDefault } from "@/fn/icon-theme";
import { useIconThemeStore } from "@/stores/icon-theme.store";
import type { IconTheme } from "@/types/icon-theme";

/**
 * 获取当前选中的图标主题
 * 此函数读取 store 状态，有副作用
 *
 * @returns 当前图标主题
 */
export const getCurrentIconTheme = (): IconTheme => {
	const currentKey = useIconThemeStore.getState().currentThemeKey;
	return getIconThemeOrDefault(currentKey);
};

/**
 * React Hook：订阅图标主题变化
 *
 * @returns 当前图标主题
 */
export function useIconTheme(): IconTheme {
	const [iconTheme, setIconTheme] = useState<IconTheme>(getCurrentIconTheme());

	useEffect(() => {
		const handler = () => {
			setIconTheme(getCurrentIconTheme());
		};
		window.addEventListener("icon-theme-changed", handler);
		return () => window.removeEventListener("icon-theme-changed", handler);
	}, []);

	return iconTheme;
}
