import { describe, expect, it } from "vitest"
import {
	getLegacyThemeByKey,
	getThemeByKey,
	getThemeByName,
	resolveConfiguredTheme,
} from "./theme-lookup.pipe"

const selection = {
	themeKey: "Adventure",
	mode: "system" as const,
	lightThemeKey: "GitHub",
	darkThemeKey: "0x96f",
}

describe("exact offline theme lookup", () => {
	it("resolves real upstream names without dark/light name heuristics", () => {
		expect(getThemeByName("GitHub")?.type).toBe("light")
		expect(getThemeByName("0x96f")?.type).toBe("dark")
		expect(getThemeByName("Adventure")?.terminalPalette?.background).toBe("#040404")
		expect(getThemeByKey("Adventure")).toBe(getThemeByName("Adventure"))
	})

	it("does not introduce case folding, old key aliases, or unknown-name fallback", () => {
		expect(getThemeByName("github")).toBeUndefined()
		expect(getThemeByName("not an upstream theme")).toBeUndefined()
		expect(getThemeByKey("default-dark")).toBeUndefined()
		expect(getLegacyThemeByKey("default-dark")?.name).toBe("Default Dark")
	})

	it("selects only the configured pair in system mode", () => {
		expect(resolveConfiguredTheme(selection, "light")?.name).toBe("GitHub")
		expect(resolveConfiguredTheme(selection, "dark")?.name).toBe("0x96f")
		expect(selection.themeKey).toBe("Adventure")
	})

	it("never replaces an unrelated fixed selection when the OS mode changes", () => {
		const fixed = { ...selection, mode: "dark" as const }
		expect(resolveConfiguredTheme(fixed, "light")?.name).toBe("Adventure")
		expect(resolveConfiguredTheme(fixed, "dark")?.name).toBe("Adventure")
	})

	it("does not silently substitute defaults for an invalid configured pair", () => {
		expect(resolveConfiguredTheme({ ...selection, lightThemeKey: "missing" }, "light")).toBeUndefined()
	})
})
