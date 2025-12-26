/**
 * 主题选择器 Container
 *
 * 连接 useTheme hook 和主题数据
 */
import { memo } from "react";
import { useTheme } from "@/hooks/use-theme";
import { getDarkThemes, getLightThemes } from "@/lib/themes";
import { ThemeSelectorView } from "./theme-selector.view.fn";

export const ThemeSelectorContainer = memo(() => {
	const {
		theme,
		setTheme,
		currentTheme,
		mode,
		setMode,
		enableTransition,
		setEnableTransition,
	} = useTheme();

	const lightThemes = getLightThemes();
	const darkThemes = getDarkThemes();

	return (
		<ThemeSelectorView
			theme={theme}
			setTheme={setTheme}
			currentTheme={currentTheme}
			mode={mode}
			setMode={setMode}
			enableTransition={enableTransition}
			setEnableTransition={setEnableTransition}
			lightThemes={lightThemes}
			darkThemes={darkThemes}
		/>
	);
});

ThemeSelectorContainer.displayName = "ThemeSelectorContainer";
