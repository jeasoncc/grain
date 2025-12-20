/**
 * Font Domain - Module Entry Point
 *
 * Unified exports for font settings state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	FontState,
	FontActions,
	FontConfig,
	UIScaleOption,
	CardSizeOption,
} from "./font.interface";

// ==============================
// Constants
// ==============================

export {
	DEFAULT_EDITOR_FONT,
	DEFAULT_UI_FONT,
	POPULAR_FONTS,
	UI_SCALE_OPTIONS,
	CARD_SIZE_OPTIONS,
	FONT_CONSTRAINTS,
	DEFAULT_FONT_CONFIG,
	DEFAULT_FONT_STATE,
} from "./font.interface";

// ==============================
// Store & Hooks
// ==============================

export {
	useFontStore,
	useFontFamily,
	useFontSize,
	useLineHeight,
	useLetterSpacing,
	useUiFontFamily,
	useUiFontSize,
	useUiScale,
	useCardSize,
	useCardBorderRadius,
	useParagraphSpacing,
	useFirstLineIndent,
	useFontSettings,
} from "./font.store";
