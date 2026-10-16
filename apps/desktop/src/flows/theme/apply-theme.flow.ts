import { applyThemeWithTransition, getSystemTheme } from "@/io/dom/theme.dom"
import {
	resolveConfiguredTheme,
	type ConfiguredThemeSelection,
} from "@/pipes/theme/theme-lookup.pipe"
import type { Theme } from "@/types/theme/theme.types"

export { getThemeByKey, getThemeByName, themeNames } from "@/pipes/theme/theme-lookup.pipe"

/** Applies exactly the configured palette; mode changes never invent replacements. */
export function applyConfiguredThemeFlow(
	selection: ConfiguredThemeSelection,
	enableTransition: boolean,
): Theme | undefined {
	const theme = resolveConfiguredTheme(selection, getSystemTheme())
	if (theme) {
		applyThemeWithTransition(theme, enableTransition)
	}
	return theme
}
