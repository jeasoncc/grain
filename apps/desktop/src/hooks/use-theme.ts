import { useEffect } from "react"
import { getThemeByKey } from "@/flows/theme"
import { initThemeFlow } from "@/flows/theme/init-theme.flow"
import {
	useEffectiveTheme,
	useEnableTransition,
	useIsThemeInitialized,
	useSystemTheme,
	useThemeKey,
	useThemeMode,
	useThemeStore,
} from "@/state/theme.state"

/** Read-only presentation state; preferences come only from the native config. */
export function useTheme() {
	const themeKey = useThemeKey()
	const mode = useThemeMode()
	const systemTheme = useSystemTheme()
	const effectiveTheme = useEffectiveTheme()
	const enableTransition = useEnableTransition()
	const isInitialized = useIsThemeInitialized()
	const selectedKey = useThemeStore((state) => state.mode === "system"
		? state.systemTheme === "dark" ? state.darkThemeKey : state.lightThemeKey
		: state.themeKey)

	return {
		currentTheme: getThemeByKey(selectedKey),
		effectiveTheme,
		enableTransition,
		isDark: effectiveTheme === "dark",
		isInitialized,
		isSystem: mode === "system",
		mode,
		systemTheme,
		theme: themeKey,
	}
}

/** The effect owns its subscriptions for its entire mount, including StrictMode. */
export function useThemeInitialization(): void {
	useEffect(() => initThemeFlow(), [])
}

export const useIsDarkTheme = (): boolean => useEffectiveTheme() === "dark"
export const useIsSystemMode = (): boolean => useThemeMode() === "system"

export {
	useEffectiveTheme,
	useEnableTransition,
	useSystemTheme,
	useThemeKey,
	useThemeMode,
} from "@/state/theme.state"
export type { ThemeMode } from "@/types/theme"
