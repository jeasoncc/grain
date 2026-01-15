import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Theme } from "@/utils/themes.util"
import { ThemeSelectorContainer } from "./theme-selector.container.fn"

// Mock hooks and libs
vi.mock("@/hooks/use-theme", () => ({
	useTheme: vi.fn(() => ({
		currentTheme: {
			colors: {
				accent: "#f5f5f5",
				accentForeground: "#000000",
				background: "#ffffff",
				border: "#e5e5e5",
				card: "#f5f5f5",
				cardForeground: "#000000",
				editorSelection: "#0066cc33",
				folderColor: "#0066cc",
				foreground: "#000000",
				input: "#e5e5e5",
				muted: "#f5f5f5",
				mutedForeground: "#666666",
				popover: "#ffffff",
				popoverForeground: "#000000",
				primary: "#0066cc",
				primaryForeground: "#ffffff",
				ring: "#0066cc",
				secondary: "#f5f5f5",
				secondaryForeground: "#000000",
				sidebar: "#f5f5f5",
				sidebarAccent: "#f5f5f5",
				sidebarAccentForeground: "#000000",
				sidebarBorder: "#e5e5e5",
				sidebarForeground: "#000000",
				sidebarPrimary: "#0066cc",
				sidebarPrimaryForeground: "#ffffff",
			},
			description: "Default light theme",
			key: "light-default",
			name: "Light Default",
			type: "light",
		} as Theme,
		enableTransition: true,
		mode: "light" as const,
		setEnableTransition: vi.fn(),
		setMode: vi.fn(),
		setTheme: vi.fn(),
		theme: "light-default",
	})),
}))

vi.mock("@/lib/themes", () => ({
	getDarkThemes: vi.fn(() => [
		{
			colors: {
				accent: "#252525",
				accentForeground: "#ffffff",
				background: "#1e1e1e",
				border: "#333333",
				card: "#252525",
				cardForeground: "#ffffff",
				editorSelection: "#0066cc33",
				folderColor: "#0066cc",
				foreground: "#ffffff",
				input: "#333333",
				muted: "#252525",
				mutedForeground: "#999999",
				popover: "#1e1e1e",
				popoverForeground: "#ffffff",
				primary: "#0066cc",
				primaryForeground: "#ffffff",
				ring: "#0066cc",
				secondary: "#252525",
				secondaryForeground: "#ffffff",
				sidebar: "#252525",
				sidebarAccent: "#252525",
				sidebarAccentForeground: "#ffffff",
				sidebarBorder: "#333333",
				sidebarForeground: "#ffffff",
				sidebarPrimary: "#0066cc",
				sidebarPrimaryForeground: "#ffffff",
			},
			description: "Default dark theme",
			key: "dark-default",
			name: "Dark Default",
			type: "dark",
		},
	]),
	getLightThemes: vi.fn(() => [
		{
			colors: {
				accent: "#f5f5f5",
				accentForeground: "#000000",
				background: "#ffffff",
				border: "#e5e5e5",
				card: "#f5f5f5",
				cardForeground: "#000000",
				editorSelection: "#0066cc33",
				folderColor: "#0066cc",
				foreground: "#000000",
				input: "#e5e5e5",
				muted: "#f5f5f5",
				mutedForeground: "#666666",
				popover: "#ffffff",
				popoverForeground: "#000000",
				primary: "#0066cc",
				primaryForeground: "#ffffff",
				ring: "#0066cc",
				secondary: "#f5f5f5",
				secondaryForeground: "#000000",
				sidebar: "#f5f5f5",
				sidebarAccent: "#f5f5f5",
				sidebarAccentForeground: "#000000",
				sidebarBorder: "#e5e5e5",
				sidebarForeground: "#000000",
				sidebarPrimary: "#0066cc",
				sidebarPrimaryForeground: "#ffffff",
			},
			description: "Default light theme",
			key: "light-default",
			name: "Light Default",
			type: "light",
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
