/**
 * Font Domain - Interface Definitions
 *
 * Type definitions for font settings state management.
 * Handles editor fonts, UI fonts, and typography settings.
 */

// ==============================
// State Interface
// ==============================

/**
 * Font state representing current font configuration.
 * All properties are readonly to enforce immutability.
 */
export interface FontState {
	/** Editor font family (VSCode style - comma separated font list) */
	readonly fontFamily: string;
	/** Editor font size in pixels */
	readonly fontSize: number;
	/** Editor line height multiplier */
	readonly lineHeight: number;
	/** Editor letter spacing in em units */
	readonly letterSpacing: number;
	/** UI font family */
	readonly uiFontFamily: string;
	/** UI font size in pixels */
	readonly uiFontSize: number;
	/** UI scale preset key */
	readonly uiScale: string;
	/** Card size preset key */
	readonly cardSize: string;
	/** Card border radius in pixels */
	readonly cardBorderRadius: number;
	/** Paragraph spacing multiplier */
	readonly paragraphSpacing: number;
	/** First line indent in em units */
	readonly firstLineIndent: number;
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating font state.
 */
export interface FontActions {
	/** Set editor font family */
	setFontFamily: (family: string) => void;
	/** Set editor font size (clamped to 12-32) */
	setFontSize: (size: number) => void;
	/** Set editor line height (clamped to 1.2-2.5) */
	setLineHeight: (height: number) => void;
	/** Set editor letter spacing (clamped to -0.05-0.2) */
	setLetterSpacing: (spacing: number) => void;
	/** Set UI font family */
	setUiFontFamily: (family: string) => void;
	/** Set UI font size (clamped to 12-18) */
	setUiFontSize: (size: number) => void;
	/** Set UI scale preset */
	setUiScale: (scale: string) => void;
	/** Set card size preset */
	setCardSize: (size: string) => void;
	/** Set card border radius (clamped to 0-16) */
	setCardBorderRadius: (radius: number) => void;
	/** Set paragraph spacing (clamped to 0-2.5) */
	setParagraphSpacing: (spacing: number) => void;
	/** Set first line indent (clamped to 0-4) */
	setFirstLineIndent: (indent: number) => void;
	/** Reset all settings to defaults */
	reset: () => void;
}

// ==============================
// Configuration Constants
// ==============================

/** Default editor font (VSCode style, comma separated, by priority) */
export const DEFAULT_EDITOR_FONT =
	"'FiraCode Nerd Font', 'Hack Nerd Font', 'JetBrainsMono Nerd Font', 'Noto Sans Mono CJK SC', monospace";

/** Default UI font */
export const DEFAULT_UI_FONT =
	"'Noto Sans CJK SC', 'Noto Sans', system-ui, sans-serif";

/** Popular Nerd Font list for quick selection */
export const POPULAR_FONTS = [
	"FiraCode Nerd Font",
	"Hack Nerd Font",
	"JetBrainsMono Nerd Font",
	"Hurmit Nerd Font",
	"3270 Nerd Font",
	"Noto Sans CJK SC",
	"Noto Serif CJK SC",
	"Noto Sans Mono CJK SC",
] as const;

// ==============================
// UI Scale Options
// ==============================

export interface UIScaleOption {
	readonly value: string;
	readonly label: string;
	readonly scale: number;
	readonly description: string;
}

export const UI_SCALE_OPTIONS: readonly UIScaleOption[] = [
	{
		value: "compact",
		label: "Compact",
		scale: 0.875,
		description: "Dense layout",
	},
	{
		value: "default",
		label: "Default",
		scale: 1,
		description: "Standard size",
	},
	{
		value: "comfortable",
		label: "Comfortable",
		scale: 1.125,
		description: "Spacious layout",
	},
	{ value: "large", label: "Large", scale: 1.25, description: "Extra large" },
] as const;

// ==============================
// Card Size Options
// ==============================

export interface CardSizeOption {
	readonly value: string;
	readonly label: string;
	readonly padding: string;
	readonly description: string;
}

export const CARD_SIZE_OPTIONS: readonly CardSizeOption[] = [
	{
		value: "compact",
		label: "Compact",
		padding: "0.75rem",
		description: "Minimal padding",
	},
	{
		value: "default",
		label: "Default",
		padding: "1rem",
		description: "Standard padding",
	},
	{
		value: "comfortable",
		label: "Comfortable",
		padding: "1.5rem",
		description: "Generous padding",
	},
	{
		value: "spacious",
		label: "Spacious",
		padding: "2rem",
		description: "Maximum padding",
	},
] as const;

// ==============================
// Value Constraints
// ==============================

/**
 * Constraints for font setting values.
 * Used for clamping values in setters.
 */
export const FONT_CONSTRAINTS = {
	fontSize: { min: 12, max: 32 },
	lineHeight: { min: 1.2, max: 2.5 },
	letterSpacing: { min: -0.05, max: 0.2 },
	uiFontSize: { min: 12, max: 18 },
	cardBorderRadius: { min: 0, max: 16 },
	paragraphSpacing: { min: 0, max: 2.5 },
	firstLineIndent: { min: 0, max: 4 },
} as const;

// ==============================
// Configuration
// ==============================

/**
 * Configuration for font state persistence.
 */
export interface FontConfig {
	/** Storage key for persistence */
	readonly storageKey: string;
}

export const DEFAULT_FONT_CONFIG: FontConfig = {
	storageKey: "grain-font-settings",
} as const;

// ==============================
// Default Values
// ==============================

export const DEFAULT_FONT_STATE: FontState = {
	fontFamily: DEFAULT_EDITOR_FONT,
	fontSize: 16,
	lineHeight: 1.6,
	letterSpacing: 0,
	uiFontFamily: DEFAULT_UI_FONT,
	uiFontSize: 14,
	uiScale: "default",
	cardSize: "default",
	cardBorderRadius: 8,
	paragraphSpacing: 0.5,
	firstLineIndent: 0,
} as const;
