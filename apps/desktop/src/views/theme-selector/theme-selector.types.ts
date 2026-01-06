import type { ThemeMode } from "@/hooks/use-theme";
import type { Theme } from "@/lib/themes";

/**
 * ThemeSelector View 组件的 Props
 */
export interface ThemeSelectorViewProps {
	readonly theme: string;
	readonly setTheme: (theme: string) => void;
	readonly currentTheme: Theme | undefined;
	readonly mode: ThemeMode;
	readonly setMode: (mode: ThemeMode) => void;
	readonly enableTransition: boolean;
	readonly setEnableTransition: (enabled: boolean) => void;
	readonly lightThemes: Theme[];
	readonly darkThemes: Theme[];
}

/**
 * ThemeCard 组件的 Props
 */
export interface ThemeCardProps {
	readonly theme: Theme;
	readonly isSelected: boolean;
	readonly onSelect: () => void;
}
