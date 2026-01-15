import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { Theme } from "@/utils/themes.util"
import type { ThemeSelectorViewProps } from "./theme-selector.types"
import { ThemeSelectorView } from "./theme-selector.view.fn"

describe("ThemeSelectorView", () => {
	const mockLightTheme: Theme = {
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
	}

	const mockDarkTheme: Theme = {
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
	}

	const defaultProps: ThemeSelectorViewProps = {
		currentTheme: mockLightTheme,
		darkThemes: [mockDarkTheme],
		enableTransition: true,
		lightThemes: [mockLightTheme],
		mode: "light",
		setEnableTransition: vi.fn(),
		setMode: vi.fn(),
		setTheme: vi.fn(),
		theme: "light-default",
	}

	it("should render theme selector button", () => {
		render(<ThemeSelectorView {...defaultProps} />)
		const button = screen.getByRole("button")
		expect(button).toBeInTheDocument()
	})

	it("should display current theme name when popover is open", () => {
		render(<ThemeSelectorView {...defaultProps} />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		const themeName = screen.getAllByText("Light Default")
		expect(themeName.length).toBeGreaterThan(0)
	})

	it("should call setMode when mode button is clicked", () => {
		const setMode = vi.fn()
		render(<ThemeSelectorView {...defaultProps} setMode={setMode} />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		const darkButton = screen.getByText("Dark")
		fireEvent.click(darkButton)
		expect(setMode).toHaveBeenCalledWith("dark")
	})

	it("should call setTheme when theme card is clicked", () => {
		const setTheme = vi.fn()
		render(<ThemeSelectorView {...defaultProps} setTheme={setTheme} />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		const themeCard = screen.getByTitle("Default light theme")
		fireEvent.click(themeCard)
		expect(setTheme).toHaveBeenCalledWith("light-default")
	})

	it("should call setEnableTransition when switch is toggled", () => {
		const setEnableTransition = vi.fn()
		render(<ThemeSelectorView {...defaultProps} setEnableTransition={setEnableTransition} />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		const switchElement = screen.getByRole("switch")
		fireEvent.click(switchElement)
		expect(setEnableTransition).toHaveBeenCalled()
	})

	it("should show light themes when mode is light", () => {
		render(<ThemeSelectorView {...defaultProps} mode="light" />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		expect(screen.getByText("Light Themes")).toBeInTheDocument()
		expect(screen.queryByText("Dark Themes")).not.toBeInTheDocument()
	})

	it("should show dark themes when mode is dark", () => {
		render(<ThemeSelectorView {...defaultProps} mode="dark" />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		expect(screen.getByText("Dark Themes")).toBeInTheDocument()
		expect(screen.queryByText("Light Themes")).not.toBeInTheDocument()
	})

	it("should show both theme types when mode is system", () => {
		render(<ThemeSelectorView {...defaultProps} mode="system" />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		expect(screen.getByText("Light Themes")).toBeInTheDocument()
		expect(screen.getByText("Dark Themes")).toBeInTheDocument()
	})

	it("should highlight selected theme", () => {
		render(<ThemeSelectorView {...defaultProps} theme="light-default" />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		const themeCard = screen.getByTitle("Default light theme")
		expect(themeCard).toHaveClass("border-primary/50")
	})

	it("should display transition switch in correct state", () => {
		render(<ThemeSelectorView {...defaultProps} enableTransition={true} />)
		const button = screen.getByRole("button")
		fireEvent.click(button)
		const switchElement = screen.getByRole("switch")
		expect(switchElement).toHaveAttribute("data-state", "checked")
	})
})
