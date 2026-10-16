import { create } from "zustand"
import { DEFAULT_FONT_STATE, type FontState } from "@/types/font"

/** Typography projected from the validated native configuration file. */
export const useFontStore = create<FontState>(() => ({ ...DEFAULT_FONT_STATE }))

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

/** Read typography without exposing preference-editing actions. */
export function useFontSettings() {
	return useFontStore()
}
