import type { ThemeState } from "@/types/theme"
import type { Theme } from "@/types/theme/theme.types"
import { getThemeByKey } from "@/utils/themes.util"

export {
	getLegacyThemeByKey,
	getThemeByKey,
	getThemeByName,
	themeNames,
} from "@/utils/themes.util"
export type { Theme, ThemeColors } from "@/types/theme/theme.types"

export type ConfiguredThemeSelection = Pick<
	ThemeState,
	"themeKey" | "mode" | "lightThemeKey" | "darkThemeKey"
>

/** System appearance selects only the explicitly configured light/dark pair. */
export function resolveConfiguredTheme(
	selection: ConfiguredThemeSelection,
	systemTheme: "light" | "dark",
): Theme | undefined {
	const key = selection.mode === "system"
		? systemTheme === "dark" ? selection.darkThemeKey : selection.lightThemeKey
		: selection.themeKey
	return getThemeByKey(key)
}
