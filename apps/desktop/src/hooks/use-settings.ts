import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CountMode } from "@/fn/word-count";

interface SettingsState {
	// General
	language: "zh" | "en";
	autoSave: boolean;
	autoSaveInterval: number; // in seconds
	spellCheck: boolean;

	// Word Count
	wordCountMode: CountMode;
	showWordCountBadge: boolean;

	// Editor
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
	paragraphSpacing: number;

	// Actions
	setLanguage: (lang: "zh" | "en") => void;
	setAutoSave: (enable: boolean) => void;
	setAutoSaveInterval: (interval: number) => void;
	setSpellCheck: (enable: boolean) => void;
	setWordCountMode: (mode: CountMode) => void;
	setShowWordCountBadge: (show: boolean) => void;
	setFontFamily: (font: string) => void;
	setFontSize: (size: number) => void;
	setLineHeight: (height: number) => void;
	setParagraphSpacing: (spacing: number) => void;
}

export const useSettings = create<SettingsState>()(
	persist(
		(set) => ({
			// Defaults
			language: "en",
			autoSave: false,
			autoSaveInterval: 3, // 3秒更合理（之前是60秒太长）
			spellCheck: false,

			// Word Count
			wordCountMode: "chinese" as CountMode,
			showWordCountBadge: true,

			fontFamily: "Merriweather",
			fontSize: 16,
			lineHeight: 1.6,
			paragraphSpacing: 1.2,

			// Setters
			setLanguage: (language) => set({ language }),
			setAutoSave: (autoSave) => set({ autoSave }),
			setAutoSaveInterval: (interval) => {
				// 范围限制：1-60 秒
				const validated = Math.max(1, Math.min(60, interval));
				set({ autoSaveInterval: validated });
			},
			setSpellCheck: (spellCheck) => set({ spellCheck }),
			setWordCountMode: (wordCountMode) => set({ wordCountMode }),
			setShowWordCountBadge: (showWordCountBadge) =>
				set({ showWordCountBadge }),

			setFontFamily: (fontFamily) => set({ fontFamily }),
			setFontSize: (fontSize) => set({ fontSize }),
			setLineHeight: (lineHeight) => set({ lineHeight }),
			setParagraphSpacing: (paragraphSpacing) => set({ paragraphSpacing }),
		}),
		{
			name: "grain-settings",
		},
	),
);
