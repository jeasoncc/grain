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
	/** Paragraph spacing multiplier */
	readonly paragraphSpacing: number
	/** First line indent in em units */
	readonly firstLineIndent: number
}


// ==============================
// Configuration Constants
// ==============================

/** Default editor font (VSCode style, comma separated, by priority) */
export const DEFAULT_EDITOR_FONT =
	"'FiraCode Nerd Font', 'Hack Nerd Font', 'JetBrainsMono Nerd Font', 'Noto Sans Mono CJK SC', monospace"

/** Default UI font */
export const DEFAULT_UI_FONT = "'Noto Sans CJK SC', 'Noto Sans', system-ui, sans-serif"


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
		description: "Interface text × 0.875",
		label: "Smaller",
		scale: 0.875,
		value: "compact",
	},
	{
		description: "Interface text × 1",
		label: "Standard",
		scale: 1,
		value: "default",
	},
	{
		description: "Interface text × 1.125",
		label: "Larger",
		scale: 1.125,
		value: "comfortable",
	},
	{ description: "Interface text × 1.25", label: "Largest", scale: 1.25, value: "large" },
] as const


// ==============================
// Value Constraints
// ==============================

/**
 * Constraints for font setting values.
 * Used for clamping values in setters.
 */
export const FONT_CONSTRAINTS = {
	firstLineIndent: { max: 4, min: 0 },
	fontSize: { max: 32, min: 12 },
	letterSpacing: { max: 0.2, min: -0.05 },
	lineHeight: { max: 2.5, min: 1.2 },
	paragraphSpacing: { max: 2.5, min: 0 },
	uiFontSize: { max: 18, min: 12 },
} as const

// ==============================
// Default Values
// ==============================

export const DEFAULT_FONT_STATE: FontState = {
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
