import { getSystemTheme } from "@/io/dom/theme.dom"
import { useThemeStore } from "@/state/theme.state"
import { applyConfiguredThemeFlow } from "./apply-theme.flow"

/**
 * One mount owns one system listener and one store subscription. Configuration
 * reloads reapply the latest selection without mutating its configured names.
 */
export function initThemeFlow(): () => void {
	useThemeStore.setState({ systemTheme: getSystemTheme() })

	const applySelection = (enableTransition: boolean): void => {
		const store = useThemeStore.getState()
		const theme = applyConfiguredThemeFlow(store, enableTransition)
		if (theme && store.effectiveTheme !== theme.type) {
			useThemeStore.setState({ effectiveTheme: theme.type })
		}
	}

	applySelection(false)
	useThemeStore.setState({ _initialized: true })

	const unsubscribe = useThemeStore.subscribe((state, previous) => {
		if (
			state.themeKey !== previous.themeKey ||
			state.mode !== previous.mode ||
			state.lightThemeKey !== previous.lightThemeKey ||
			state.darkThemeKey !== previous.darkThemeKey ||
			(state.mode === "system" && state.systemTheme !== previous.systemTheme) ||
			state.enableTransition !== previous.enableTransition
		) {
			applySelection(state.enableTransition)
		}
	})

	const mediaQuery = typeof window === "undefined"
		? undefined
		: window.matchMedia("(prefers-color-scheme: dark)")
	const handleSystemChange = (event: MediaQueryListEvent): void => {
		useThemeStore.setState({ systemTheme: event.matches ? "dark" : "light" })
	}
	mediaQuery?.addEventListener("change", handleSystemChange)

	return () => {
		unsubscribe()
		mediaQuery?.removeEventListener("change", handleSystemChange)
		useThemeStore.setState({ _initialized: false })
	}
}
