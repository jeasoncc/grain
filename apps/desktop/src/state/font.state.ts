/**
 * @file stores/font.store.ts
 * @description Font 状态管理
 *
 * Manages font settings state including editor fonts, UI fonts, and typography.
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { FontActions, FontState } from "@/types/font";
import {
	DEFAULT_FONT_CONFIG,
	DEFAULT_FONT_STATE,
	FONT_CONSTRAINTS,
} from "@/types/font";

// ==============================
// Utility Functions
// ==============================

/**
 * Clamp a value between min and max bounds.
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

// ==============================
// Store Type
// ==============================

type FontStore = FontState & FontActions;

// ==============================
// Store Implementation
// ==============================

export const useFontStore = create<FontStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_FONT_STATE,

			// ==============================
			// Actions
			// ==============================

			setFontFamily: (fontFamily: string) => {
				set((state) => {
					state.fontFamily = fontFamily;
				});
			},

			setFontSize: (fontSize: number) => {
				set((state) => {
					state.fontSize = clamp(
						fontSize,
						FONT_CONSTRAINTS.fontSize.min,
						FONT_CONSTRAINTS.fontSize.max,
					);
				});
			},

			setLineHeight: (lineHeight: number) => {
				set((state) => {
					state.lineHeight = clamp(
						lineHeight,
						FONT_CONSTRAINTS.lineHeight.min,
						FONT_CONSTRAINTS.lineHeight.max,
					);
				});
			},

			setLetterSpacing: (letterSpacing: number) => {
				set((state) => {
					state.letterSpacing = clamp(
						letterSpacing,
						FONT_CONSTRAINTS.letterSpacing.min,
						FONT_CONSTRAINTS.letterSpacing.max,
					);
				});
			},

			setUiFontFamily: (uiFontFamily: string) => {
				set((state) => {
					state.uiFontFamily = uiFontFamily;
				});
			},

			setUiFontSize: (uiFontSize: number) => {
				set((state) => {
					state.uiFontSize = clamp(
						uiFontSize,
						FONT_CONSTRAINTS.uiFontSize.min,
						FONT_CONSTRAINTS.uiFontSize.max,
					);
				});
			},

			setUiScale: (uiScale: string) => {
				set((state) => {
					state.uiScale = uiScale;
				});
			},

			setCardSize: (cardSize: string) => {
				set((state) => {
					state.cardSize = cardSize;
				});
			},

			setCardBorderRadius: (cardBorderRadius: number) => {
				set((state) => {
					state.cardBorderRadius = clamp(
						cardBorderRadius,
						FONT_CONSTRAINTS.cardBorderRadius.min,
						FONT_CONSTRAINTS.cardBorderRadius.max,
					);
				});
			},

			setParagraphSpacing: (paragraphSpacing: number) => {
				set((state) => {
					state.paragraphSpacing = clamp(
						paragraphSpacing,
						FONT_CONSTRAINTS.paragraphSpacing.min,
						FONT_CONSTRAINTS.paragraphSpacing.max,
					);
				});
			},

			setFirstLineIndent: (firstLineIndent: number) => {
				set((state) => {
					state.firstLineIndent = clamp(
						firstLineIndent,
						FONT_CONSTRAINTS.firstLineIndent.min,
						FONT_CONSTRAINTS.firstLineIndent.max,
					);
				});
			},

			reset: () => {
				set((state) => {
					state.fontFamily = DEFAULT_FONT_STATE.fontFamily;
					state.fontSize = DEFAULT_FONT_STATE.fontSize;
					state.lineHeight = DEFAULT_FONT_STATE.lineHeight;
					state.letterSpacing = DEFAULT_FONT_STATE.letterSpacing;
					state.uiFontFamily = DEFAULT_FONT_STATE.uiFontFamily;
					state.uiFontSize = DEFAULT_FONT_STATE.uiFontSize;
					state.uiScale = DEFAULT_FONT_STATE.uiScale;
					state.cardSize = DEFAULT_FONT_STATE.cardSize;
					state.cardBorderRadius = DEFAULT_FONT_STATE.cardBorderRadius;
					state.paragraphSpacing = DEFAULT_FONT_STATE.paragraphSpacing;
					state.firstLineIndent = DEFAULT_FONT_STATE.firstLineIndent;
				});
			},
		})),
		{
			name: DEFAULT_FONT_CONFIG.storageKey,
		},
	),
);

// ==============================
// Selector Hooks
// ==============================

/**
 * Get the current editor font family.
 */
export const useFontFamily = (): string => {
	return useFontStore((state) => state.fontFamily);
};

/**
 * Get the current editor font size.
 */
export const useFontSize = (): number => {
	return useFontStore((state) => state.fontSize);
};

/**
 * Get the current editor line height.
 */
export const useLineHeight = (): number => {
	return useFontStore((state) => state.lineHeight);
};

/**
 * Get the current editor letter spacing.
 */
export const useLetterSpacing = (): number => {
	return useFontStore((state) => state.letterSpacing);
};

/**
 * Get the current UI font family.
 */
export const useUiFontFamily = (): string => {
	return useFontStore((state) => state.uiFontFamily);
};

/**
 * Get the current UI font size.
 */
export const useUiFontSize = (): number => {
	return useFontStore((state) => state.uiFontSize);
};

/**
 * Get the current UI scale preset.
 */
export const useUiScale = (): string => {
	return useFontStore((state) => state.uiScale);
};

/**
 * Get the current card size preset.
 */
export const useCardSize = (): string => {
	return useFontStore((state) => state.cardSize);
};

/**
 * Get the current card border radius.
 */
export const useCardBorderRadius = (): number => {
	return useFontStore((state) => state.cardBorderRadius);
};

/**
 * Get the current paragraph spacing.
 */
export const useParagraphSpacing = (): number => {
	return useFontStore((state) => state.paragraphSpacing);
};

/**
 * Get the current first line indent.
 */
export const useFirstLineIndent = (): number => {
	return useFontStore((state) => state.firstLineIndent);
};

// ==============================
// Convenience Hook
// ==============================

/**
 * Convenience hook providing all font-related state and actions.
 * Maintains backward compatibility with useFontSettings.
 */
export function useFontSettings() {
	return useFontStore();
}
