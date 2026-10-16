import { create } from "zustand"
import type { IconThemeState } from "@/types/icon-theme"

/** Icon preference projected from config.json, never persisted independently. */
export const useIconThemeStore = create<IconThemeState>(() => ({ currentThemeKey: "default" }))

// ============================================================================
// Selector Hooks
// ============================================================================

export const useCurrentIconThemeKey = () => useIconThemeStore((s) => s.currentThemeKey)
