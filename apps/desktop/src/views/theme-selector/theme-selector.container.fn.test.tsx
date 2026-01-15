import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Theme } from "@/utils/themes.util"
import { ThemeSelectorContainer } from "./theme-selector.container.fn"

// Mock hooks and libs
vi.mock("@/hooks/use-theme", () => ({
	useTheme: vi.fn(() => ({
		theme: "light-default",
		setTheme: vi.fn(),
		currentTheme: {
			key: "light-default",
			name: "Light Default",
			description: "Default light theme",
			type: "light",
			colors: {
				background: "#ffffff",
				foreground: "#000000",
				card: "#f5f5f5",
				cardForeground: "#000000",
				popover: "#ffffff",
				popoverForeground: "#000000",
				primary: "#0066cc",
				primaryForeground: "#ffffff",
				secondary: "#f5f5f5",
				secondaryForeground: "#000000",
				muted: "#f5f5f5",
				mutedForeground: "#666666",
				accent: "#f5f5f5",
				accentForeground: "#000000",
				border: "#e5e5e5",
				input: "#e5e5e5",
				ring: "#0066cc",
				sidebar: "#f5f5f5",
				sidebarForeground: "#000000",
				sidebarPrimary: "#0066cc",
				sidebarPrimaryForeground: "#ffffff",
				sidebarAccent: "#f5f5f5",
				sidebarAccentForeground: "#000000",
				sidebarBorder: "#e5e5e5",
				folderColor: "#0066cc",
				editorSelection: "#0066cc33",
			},
		} as Theme,
		mode: "light" as const,
		setMode: vi.fn(),
		enableTransition: true,
		setEnableTransition: vi.fn(),
	})),
}))

vi.mock("@/lib/themes", () => ({
	getLightThemes: vi.fn(() => [
		{
			key: "light-default",
			name: "Light Default",
			description: "Default light theme",
			type: "light",
			colors: {
				background: "#ffffff",
				foreground: "#000000",
				card: "#f5f5f5",
				cardForeground: "#000000",
				popover: "#ffffff",
				popoverForeground: "#000000",
				primary: "#0066cc",
				primaryForeground: "#ffffff",
				secondary: "#f5f5f5",
				secondaryForeground: "#000000",
				muted: "#f5f5f5",
				mutedForeground: "#666666",
				accent: "#f5f5f5",
				accentForeground: "#000000",
				border: "#e5e5e5",
				input: "#e5e5e5",
				ring: "#0066cc",
				sidebar: "#f5f5f5",
				sidebarForeground: "#000000",
				sidebarPrimary: "#0066cc",
				sidebarPrimaryForeground: "#ffffff",
				sidebarAccent: "#f5f5f5",
				sidebarAccentForeground: "#000000",
				sidebarBorder: "#e5e5e5",
				folderColor: "#0066cc",
				editorSelection: "#0066cc33",
			},
		},
	]),
	getDarkThemes: vi.fn(() => [
		{
			key: "dark-default",
			name: "Dark Default",
			description: "Default dark theme",
			type: "dark",
			colors: {
				background: "#1e1e1e",
				foreground: "#ffffff",
				card: "#252525",
				cardForeground: "#ffffff",
				popover: "#1e1e1e",
				popoverForeground: "#ffffff",
				primary: "#0066cc",
				primaryForeground: "#ffffff",
				secondary: "#252525",
				secondaryForeground: "#ffffff",
				muted: "#252525",
				mutedForeground: "#999999",
				accent: "#252525",
				accentForeground: "#ffffff",
				border: "#333333",
				input: "#333333",
				ring: "#0066cc",
				sidebar: "#252525",
				sidebarForeground: "#ffffff",
				sidebarPrimary: "#0066cc",
				sidebarPrimaryForeground: "#ffffff",
				sidebarAccent: "#252525",
				sidebarAccentForeground: "#ffffff",
				sidebarBorder: "#333333",
				folderColor: "#0066cc",
				editorSelection: "#0066cc33",
			},
		},
	]),
}))

describe("ThemeSelectorContainer", () => {
	it("should render theme selector", () => {
		render(<ThemeSelectorContainer />)
		const button = screen.getByRole("button")
		expect(button).toBeInTheDocument()
	})

	it("should connect to useTheme hook", async () => {
		const { useTheme } = await import("@/hooks/use-theme")
		render(<ThemeSelectorContainer />)
		expect(useTheme).toHaveBeenCalled()
	})

	it("should connect to theme data functions", async () => {
		const { getLightThemes, getDarkThemes } = await import("@/lib/themes")
		render(<ThemeSelectorContainer />)
		expect(getLightThemes).toHaveBeenCalled()
		expect(getDarkThemes).toHaveBeenCalled()
	})
})
