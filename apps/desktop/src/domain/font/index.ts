/**
 * Font Domain - Module Entry Point
 *
 * Unified exports for font settings state management.
 */

// ==============================
// Types & Interfaces
// ==============================

export type {
	CardSizeOption,
	FontActions,
	FontConfig,
	FontState,
	UIScaleOption,
} from "./font.interface";

// ==============================
// Constants
// ==============================

export {
	CARD_SIZE_OPTIONS,
	DEFAULT_EDITOR_FONT,
	DEFAULT_FONT_CONFIG,
	DEFAULT_FONT_STATE,
	DEFAULT_UI_FONT,
	FONT_CONSTRAINTS,
	POPULAR_FONTS,
	UI_SCALE_OPTIONS,
} from "./font.interface";

// ==============================
// Store & Hooks
// ==============================

export {
	useCardBorderRadius,
	useCardSize,
	useFirstLineIndent,
	useFontFamily,
	useFontSettings,
	useFontSize,
	useFontStore,
	useLetterSpacing,
	useLineHeight,
	useParagraphSpacing,
	useUiFontFamily,
	useUiFontSize,
	useUiScale,
} from "./font.store";
