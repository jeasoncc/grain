import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CountMode } from "@/types/word-count"

interface SettingsState {
	// General
	readonly language: "zh" | "en"
	readonly autoSave: boolean
	readonly autoSaveInterval: number // in seconds
	readonly spellCheck: boolean

	// Word Count
	readonly wordCountMode: CountMode
	readonly showWordCountBadge: boolean

	// Editor
	readonly fontFamily: string
	readonly fontSize: number
	readonly lineHeight: number
	readonly paragraphSpacing: number
	readonly orgCaptureConfigurationJson: string
	readonly orgKeymapConfigurationJson: string
	readonly orgBehaviorConfigurationJson: string
	readonly orgAgendaConfigurationJson: string
	readonly applicationPopupConfigurationJson: string

	// Actions
	readonly setLanguage: (lang: "zh" | "en") => void
	readonly setAutoSave: (enable: boolean) => void
	readonly setAutoSaveInterval: (interval: number) => void
	readonly setSpellCheck: (enable: boolean) => void
	readonly setWordCountMode: (mode: CountMode) => void
	readonly setShowWordCountBadge: (show: boolean) => void
	readonly setFontFamily: (font: string) => void
	readonly setFontSize: (size: number) => void
	readonly setLineHeight: (height: number) => void
	readonly setParagraphSpacing: (spacing: number) => void
	readonly setOrgCaptureConfigurationJson: (raw: string) => void
	readonly setOrgKeymapConfigurationJson: (raw: string) => void
	readonly setOrgBehaviorConfigurationJson: (raw: string) => void
	readonly setOrgAgendaConfigurationJson: (raw: string) => void
	readonly setApplicationPopupConfigurationJson: (raw: string) => void
}

export const useSettings = create<SettingsState>()(
	persist(
		(set, get) => ({
			autoSave: false,
			autoSaveInterval: 3, // 3秒更合理（之前是60秒太长）

			fontFamily: "Merriweather",
			fontSize: 16,
			// Defaults
			language: "en",
			lineHeight: 1.6,
			paragraphSpacing: 1.2,
			orgCaptureConfigurationJson: "",
			orgKeymapConfigurationJson: "",
			orgBehaviorConfigurationJson: "",
			orgAgendaConfigurationJson: "",
			applicationPopupConfigurationJson: "",
			setAutoSave: (autoSave) => set({ autoSave }),
			setAutoSaveInterval: (interval) => {
				// 范围限制：1-60 秒
				const validated = Math.max(1, Math.min(60, interval))
				set({ autoSaveInterval: validated })
			},

			setFontFamily: (fontFamily) => set({ fontFamily }),
			setFontSize: (fontSize) => set({ fontSize }),

			// Setters
			setLanguage: (language) => set({ language }),
			setLineHeight: (lineHeight) => set({ lineHeight }),
			setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
			setOrgCaptureConfigurationJson: (orgCaptureConfigurationJson) => {
				const previous = get().orgCaptureConfigurationJson
				try {
					set({ orgCaptureConfigurationJson })
				} catch (error) {
					// Persist publishes state before writing; restore permission if storage rejects the write.
					try {
						set({ orgCaptureConfigurationJson: previous })
					} catch {
						// The previous in-memory value is restored even if storage remains unavailable.
					}
					throw error
				}
			},
			setOrgKeymapConfigurationJson: (orgKeymapConfigurationJson) => {
				const previous = get().orgKeymapConfigurationJson
				try {
					set({ orgKeymapConfigurationJson })
				} catch (error) {
					try { set({ orgKeymapConfigurationJson: previous }) } catch {
						// Restore memory even when persistence remains unavailable; never retry the requested write.
					}
					throw error
				}
			},
			setOrgBehaviorConfigurationJson: (orgBehaviorConfigurationJson) => {
				const previous = get().orgBehaviorConfigurationJson
				try {
					set({ orgBehaviorConfigurationJson })
				} catch (error) {
					try { set({ orgBehaviorConfigurationJson: previous }) } catch {
						// Restore memory even when persistence remains unavailable; never retry the requested write.
					}
					throw error
				}
			},
			setOrgAgendaConfigurationJson: (orgAgendaConfigurationJson) => {
				const previous = get().orgAgendaConfigurationJson
				try {
					set({ orgAgendaConfigurationJson })
				} catch (error) {
					try { set({ orgAgendaConfigurationJson: previous }) } catch {
						// Restore memory even when persistence remains unavailable; never retry the requested write.
					}
					throw error
				}
			},
			setApplicationPopupConfigurationJson: (applicationPopupConfigurationJson) => {
				const previous = get().applicationPopupConfigurationJson
				try {
					set({ applicationPopupConfigurationJson })
				} catch (error) {
					try { set({ applicationPopupConfigurationJson: previous }) } catch {
						// Restore memory even when persistence remains unavailable; never retry the requested write.
					}
					throw error
				}
			},
			setShowWordCountBadge: (showWordCountBadge) => set({ showWordCountBadge }),
			setSpellCheck: (spellCheck) => set({ spellCheck }),
			setWordCountMode: (wordCountMode) => set({ wordCountMode }),
			showWordCountBadge: true,
			spellCheck: false,

			// Word Count
			wordCountMode: "chinese" as CountMode,
		}),
		{
			name: "grain-settings",
		},
	),
)
