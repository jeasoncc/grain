/**
 * @file pipes/theme/theme-lookup.pipe.ts
 * @description Theme lookup pipe - wrapper for theme utilities
 *
 * This pipe wraps theme utility functions to maintain architecture compliance.
 * flows/ should not directly import from utils/, but can import from pipes/.
 *
 * @requirements Architecture compliance (flows → pipes → utils)
 */

import {
	type Theme,
	type ThemeColors,
	getThemeByKey as utilGetThemeByKey,
	themes as utilThemes,
} from "@/utils/themes.util"

/**
 * Get theme by key
 *
 * Looks up a theme configuration by its unique key.
 *
 * @param key - Theme key (e.g., "default-light", "github-dark")
 * @returns Theme configuration or undefined if not found
 */
export const getThemeByKey = (key: string): Theme | undefined => utilGetThemeByKey(key)

/**
 * All available themes
 *
 * Complete list of theme configurations including both light and dark themes.
 */
export const themes: readonly Theme[] = utilThemes

// Re-export types
export type { Theme, ThemeColors }
