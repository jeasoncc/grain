import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsState {
	// General
	language: "zh" | "en";
	autoSave: boolean;
	autoSaveInterval: number; // in seconds
	spellCheck: boolean;

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
	setFontFamily: (font: string) => void;
	setFontSize: (size: number) => void;
	setLineHeight: (height: number) => void;
	setParagraphSpacing: (spacing: number) => void;
}

export const useSettings = create<SettingsState>()(
	persist(
		(set) => ({
			// Defaults
			language: "zh",
			autoSave: true,
			autoSaveInterval: 3, // 3秒更合理（之前是60秒太长）
			spellCheck: false,

			fontFamily: "Merriweather",
			fontSize: 16,
			lineHeight: 1.6,
			paragraphSpacing: 1.2,

			// Setters
			setLanguage: (language) => set({ language }),
			setAutoSave: (autoSave) => set({ autoSave }),
			setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
			setSpellCheck: (spellCheck) => set({ spellCheck }),

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
