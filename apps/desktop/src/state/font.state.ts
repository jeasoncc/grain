/**
 * @file stores/font.store.ts
 * @description Font 状态管理
 *
 * Manages font settings state including editor fonts, UI fonts, and typography.
 * Uses Zustand + Immer for immutable state management.
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import type { FontActions, FontState } from "@/types/font"
import { DEFAULT_FONT_CONFIG, DEFAULT_FONT_STATE, FONT_CONSTRAINTS } from "@/types/font"

// ==============================
// Utility Functions
// ==============================

/**
 * Clamp a value between min and max bounds.
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value))
}

// ==============================
// Store Type
// ==============================

type FontStore = FontState & FontActions

// ==============================
// Store Implementation
// ==============================

export const useFontStore = create<FontStore>()(
	persist(
		immer((set) => ({
			// Initial State
			...DEFAULT_FONT_STATE,

			reset: () => {
				set((state) => {
					return {
						...state,
						cardBorderRadius: DEFAULT_FONT_STATE.cardBorderRadius,
						cardSize: DEFAULT_FONT_STATE.cardSize,
						firstLineIndent: DEFAULT_FONT_STATE.firstLineIndent,
						fontFamily: DEFAULT_FONT_STATE.fontFamily,
						fontSize: DEFAULT_FONT_STATE.fontSize,
						letterSpacing: DEFAULT_FONT_STATE.letterSpacing,
						lineHeight: DEFAULT_FONT_STATE.lineHeight,
						paragraphSpacing: DEFAULT_FONT_STATE.paragraphSpacing,
						uiFontFamily: DEFAULT_FONT_STATE.uiFontFamily,
						uiFontSize: DEFAULT_FONT_STATE.uiFontSize,
						uiScale: DEFAULT_FONT_STATE.uiScale,
					}
				})
			},

			setCardBorderRadius: (cardBorderRadius: number) => {
				set((state) => {
					const clampedRadius = clamp(
						cardBorderRadius,
						FONT_CONSTRAINTS.cardBorderRadius.min,
						FONT_CONSTRAINTS.cardBorderRadius.max,
					)
					return { ...state, cardBorderRadius: clampedRadius }
				})
			},

			setCardSize: (cardSize: string) => {
				set((state) => {
					return { ...state, cardSize }
				})
			},

			setFirstLineIndent: (firstLineIndent: number) => {
				set((state) => {
					const clampedIndent = clamp(
						firstLineIndent,
						FONT_CONSTRAINTS.firstLineIndent.min,
						FONT_CONSTRAINTS.firstLineIndent.max,
					)
					return { ...state, firstLineIndent: clampedIndent }
				})
			},

			// ==============================
			// Actions
			// ==============================

			setFontFamily: (fontFamily: string) => {
				set((state) => {
					return { ...state, fontFamily }
				})
			},

			setFontSize: (fontSize: number) => {
				set((state) => {
					const clampedSize = clamp(
						fontSize,
						FONT_CONSTRAINTS.fontSize.min,
						FONT_CONSTRAINTS.fontSize.max,
					)
					return { ...state, fontSize: clampedSize }
				})
			},

			setLetterSpacing: (letterSpacing: number) => {
				set((state) => {
					const clampedSpacing = clamp(
						letterSpacing,
						FONT_CONSTRAINTS.letterSpacing.min,
						FONT_CONSTRAINTS.letterSpacing.max,
					)
					return { ...state, letterSpacing: clampedSpacing }
				})
			},

			setLineHeight: (lineHeight: number) => {
				set((state) => {
					const clampedHeight = clamp(
						lineHeight,
						FONT_CONSTRAINTS.lineHeight.min,
						FONT_CONSTRAINTS.lineHeight.max,
					)
					return { ...state, lineHeight: clampedHeight }
				})
			},

			setParagraphSpacing: (paragraphSpacing: number) => {
				set((state) => {
					const clampedSpacing = clamp(
						paragraphSpacing,
						FONT_CONSTRAINTS.paragraphSpacing.min,
						FONT_CONSTRAINTS.paragraphSpacing.max,
					)
					return { ...state, paragraphSpacing: clampedSpacing }
				})
			},

			setUiFontFamily: (uiFontFamily: string) => {
				set((state) => {
					return { ...state, uiFontFamily }
				})
			},

			setUiFontSize: (uiFontSize: number) => {
				set((state) => {
					const clampedSize = clamp(
						uiFontSize,
						FONT_CONSTRAINTS.uiFontSize.min,
						FONT_CONSTRAINTS.uiFontSize.max,
					)
					return { ...state, uiFontSize: clampedSize }
				})
			},

			setUiScale: (uiScale: string) => {
				set((state) => {
					return { ...state, uiScale }
				})
			},
		})),
		{
			name: DEFAULT_FONT_CONFIG.storageKey,
		},
	),
)

// ==============================
// Selector Hooks
// ==============================

/**
 * Get the current editor font family.
 */
export const useFontFamily = (): string => {
	return useFontStore((state) => state.fontFamily)
}

/**
 * Get the current editor font size.
 */
export const useFontSize = (): number => {
	return useFontStore((state) => state.fontSize)
}

/**
 * Get the current editor line height.
 */
export const useLineHeight = (): number => {
	return useFontStore((state) => state.lineHeight)
}

/**
 * Get the current editor letter spacing.
 */
export const useLetterSpacing = (): number => {
	return useFontStore((state) => state.letterSpacing)
}

/**
 * Get the current UI font family.
 */
export const useUiFontFamily = (): string => {
	return useFontStore((state) => state.uiFontFamily)
}

/**
 * Get the current UI font size.
 */
export const useUiFontSize = (): number => {
	return useFontStore((state) => state.uiFontSize)
}

/**
 * Get the current UI scale preset.
 */
export const useUiScale = (): string => {
	return useFontStore((state) => state.uiScale)
}

/**
 * Get the current card size preset.
 */
export const useCardSize = (): string => {
	return useFontStore((state) => state.cardSize)
}

/**
 * Get the current card border radius.
 */
export const useCardBorderRadius = (): number => {
	return useFontStore((state) => state.cardBorderRadius)
}

/**
 * Get the current paragraph spacing.
 */
export const useParagraphSpacing = (): number => {
	return useFontStore((state) => state.paragraphSpacing)
}

/**
 * Get the current first line indent.
 */
export const useFirstLineIndent = (): number => {
	return useFontStore((state) => state.firstLineIndent)
}

// ==============================
// Convenience Hook
// ==============================

/**
 * Convenience hook providing all font-related state and actions.
 * Maintains backward compatibility with useFontSettings.
 */
export function useFontSettings() {
	return useFontStore()
}
