import { useEffect, useState } from "react";
import { getCurrentIconTheme } from "@/flows/icon-theme";
import type { IconTheme } from "@/types/icon-theme";

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

// 重导出 getCurrentIconTheme 供外部使用
export { getCurrentIconTheme } from "@/flows/icon-theme";
