import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Theme } from "@/lib/themes";
import type { ThemeSelectorViewProps } from "./theme-selector.types";
import { ThemeSelectorView } from "./theme-selector.view.fn";

describe("ThemeSelectorView", () => {
	const mockLightTheme: Theme = {
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
	};

	const mockDarkTheme: Theme = {
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
	};

	const defaultProps: ThemeSelectorViewProps = {
		theme: "light-default",
		setTheme: vi.fn(),
		currentTheme: mockLightTheme,
		mode: "light",
		setMode: vi.fn(),
		enableTransition: true,
		setEnableTransition: vi.fn(),
		lightThemes: [mockLightTheme],
		darkThemes: [mockDarkTheme],
	};

	it("should render theme selector button", () => {
		render(<ThemeSelectorView {...defaultProps} />);
		const button = screen.getByRole("button");
		expect(button).toBeInTheDocument();
	});

	it("should display current theme name when popover is open", () => {
		render(<ThemeSelectorView {...defaultProps} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		const themeName = screen.getAllByText("Light Default");
		expect(themeName.length).toBeGreaterThan(0);
	});

	it("should call setMode when mode button is clicked", () => {
		const setMode = vi.fn();
		render(<ThemeSelectorView {...defaultProps} setMode={setMode} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		const darkButton = screen.getByText("Dark");
		fireEvent.click(darkButton);
		expect(setMode).toHaveBeenCalledWith("dark");
	});

	it("should call setTheme when theme card is clicked", () => {
		const setTheme = vi.fn();
		render(<ThemeSelectorView {...defaultProps} setTheme={setTheme} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		const themeCard = screen.getByTitle("Default light theme");
		fireEvent.click(themeCard);
		expect(setTheme).toHaveBeenCalledWith("light-default");
	});

	it("should call setEnableTransition when switch is toggled", () => {
		const setEnableTransition = vi.fn();
		render(
			<ThemeSelectorView
				{...defaultProps}
				setEnableTransition={setEnableTransition}
			/>,
		);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		const switchElement = screen.getByRole("switch");
		fireEvent.click(switchElement);
		expect(setEnableTransition).toHaveBeenCalled();
	});

	it("should show light themes when mode is light", () => {
		render(<ThemeSelectorView {...defaultProps} mode="light" />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(screen.getByText("Light Themes")).toBeInTheDocument();
		expect(screen.queryByText("Dark Themes")).not.toBeInTheDocument();
	});

	it("should show dark themes when mode is dark", () => {
		render(<ThemeSelectorView {...defaultProps} mode="dark" />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(screen.getByText("Dark Themes")).toBeInTheDocument();
		expect(screen.queryByText("Light Themes")).not.toBeInTheDocument();
	});

	it("should show both theme types when mode is system", () => {
		render(<ThemeSelectorView {...defaultProps} mode="system" />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		expect(screen.getByText("Light Themes")).toBeInTheDocument();
		expect(screen.getByText("Dark Themes")).toBeInTheDocument();
	});

	it("should highlight selected theme", () => {
		render(<ThemeSelectorView {...defaultProps} theme="light-default" />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		const themeCard = screen.getByTitle("Default light theme");
		expect(themeCard).toHaveClass("border-primary/50");
	});

	it("should display transition switch in correct state", () => {
		render(<ThemeSelectorView {...defaultProps} enableTransition={true} />);
		const button = screen.getByRole("button");
		fireEvent.click(button);
		const switchElement = screen.getByRole("switch");
		expect(switchElement).toHaveAttribute("data-state", "checked");
	});
});
