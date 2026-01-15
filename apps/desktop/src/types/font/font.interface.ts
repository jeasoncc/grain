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
	readonly fontFamily: string
	/** Editor font size in pixels */
	readonly fontSize: number
	/** Editor line height multiplier */
	readonly lineHeight: number
	/** Editor letter spacing in em units */
	readonly letterSpacing: number
	/** UI font family */
	readonly uiFontFamily: string
	/** UI font size in pixels */
	readonly uiFontSize: number
	/** UI scale preset key */
	readonly uiScale: string
	/** Card size preset key */
	readonly cardSize: string
	/** Card border radius in pixels */
	readonly cardBorderRadius: number
	/** Paragraph spacing multiplier */
	readonly paragraphSpacing: number
	/** First line indent in em units */
	readonly firstLineIndent: number
}

// ==============================
// Actions Interface
// ==============================

/**
 * Actions available for mutating font state.
 */
export interface FontActions {
	/** Set editor font family */
	readonly setFontFamily: (family: string) => void
	/** Set editor font size (clamped to 12-32) */
	readonly setFontSize: (size: number) => void
	/** Set editor line height (clamped to 1.2-2.5) */
	readonly setLineHeight: (height: number) => void
	/** Set editor letter spacing (clamped to -0.05-0.2) */
	readonly setLetterSpacing: (spacing: number) => void
	/** Set UI font family */
	readonly setUiFontFamily: (family: string) => void
	/** Set UI font size (clamped to 12-18) */
	readonly setUiFontSize: (size: number) => void
	/** Set UI scale preset */
	readonly setUiScale: (scale: string) => void
	/** Set card size preset */
	readonly setCardSize: (size: string) => void
	/** Set card border radius (clamped to 0-16) */
	readonly setCardBorderRadius: (radius: number) => void
	/** Set paragraph spacing (clamped to 0-2.5) */
	readonly setParagraphSpacing: (spacing: number) => void
	/** Set first line indent (clamped to 0-4) */
	readonly setFirstLineIndent: (indent: number) => void
	/** Reset all settings to defaults */
	readonly reset: () => void
}

// ==============================
// Configuration Constants
// ==============================

/** Default editor font (VSCode style, comma separated, by priority) */
export const DEFAULT_EDITOR_FONT =
	"'FiraCode Nerd Font', 'Hack Nerd Font', 'JetBrainsMono Nerd Font', 'Noto Sans Mono CJK SC', monospace"

/** Default UI font */
export const DEFAULT_UI_FONT = "'Noto Sans CJK SC', 'Noto Sans', system-ui, sans-serif"

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
] as const

// ==============================
// UI Scale Options
// ==============================

export interface UIScaleOption {
	readonly value: string
	readonly label: string
	readonly scale: number
	readonly description: string
}

export const UI_SCALE_OPTIONS: readonly UIScaleOption[] = [
	{
		description: "Dense layout",
		label: "Compact",
		scale: 0.875,
		value: "compact",
	},
	{
		description: "Standard size",
		label: "Default",
		scale: 1,
		value: "default",
	},
	{
		description: "Spacious layout",
		label: "Comfortable",
		scale: 1.125,
		value: "comfortable",
	},
	{ description: "Extra large", label: "Large", scale: 1.25, value: "large" },
] as const

// ==============================
// Card Size Options
// ==============================

export interface CardSizeOption {
	readonly value: string
	readonly label: string
	readonly padding: string
	readonly description: string
}

export const CARD_SIZE_OPTIONS: readonly CardSizeOption[] = [
	{
		description: "Minimal padding",
		label: "Compact",
		padding: "0.75rem",
		value: "compact",
	},
	{
		description: "Standard padding",
		label: "Default",
		padding: "1rem",
		value: "default",
	},
	{
		description: "Generous padding",
		label: "Comfortable",
		padding: "1.5rem",
		value: "comfortable",
	},
	{
		description: "Maximum padding",
		label: "Spacious",
		padding: "2rem",
		value: "spacious",
	},
] as const

// ==============================
// Value Constraints
// ==============================

/**
 * Constraints for font setting values.
 * Used for clamping values in setters.
 */
export const FONT_CONSTRAINTS = {
	cardBorderRadius: { max: 16, min: 0 },
	firstLineIndent: { max: 4, min: 0 },
	fontSize: { max: 32, min: 12 },
	letterSpacing: { max: 0.2, min: -0.05 },
	lineHeight: { max: 2.5, min: 1.2 },
	paragraphSpacing: { max: 2.5, min: 0 },
	uiFontSize: { max: 18, min: 12 },
} as const

// ==============================
// Configuration
// ==============================

/**
 * Configuration for font state persistence.
 */
export interface FontConfig {
	/** Storage key for persistence */
	readonly storageKey: string
}

export const DEFAULT_FONT_CONFIG: FontConfig = {
	storageKey: "grain-font-settings",
} as const

// ==============================
// Default Values
// ==============================

export const DEFAULT_FONT_STATE: FontState = {
	cardBorderRadius: 8,
	cardSize: "default",
	firstLineIndent: 0,
	fontFamily: DEFAULT_EDITOR_FONT,
	fontSize: 16,
	letterSpacing: 0,
	lineHeight: 1.6,
	paragraphSpacing: 0.5,
	uiFontFamily: DEFAULT_UI_FONT,
	uiFontSize: 14,
	uiScale: "default",
} as const
