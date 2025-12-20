import { useState, useEffect } from "react";
import { getCurrentIconTheme, type IconTheme } from "@/domain/icon-theme";

export function useIconTheme() {
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
