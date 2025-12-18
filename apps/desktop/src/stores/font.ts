// Font Settings Store
import { create } from "zustand";
import { persist } from "zustand/middleware";

// 默认字体配置（VSCode 风格，逗号分隔，按优先级排列）
export const DEFAULT_EDITOR_FONT = "'FiraCode Nerd Font', 'Hack Nerd Font', 'JetBrainsMono Nerd Font', 'Noto Sans Mono CJK SC', monospace";
export const DEFAULT_UI_FONT = "'Noto Sans CJK SC', 'Noto Sans', system-ui, sans-serif";

// 常用 Nerd Font 列表（方便用户快速选择）
export const POPULAR_FONTS = [
	"FiraCode Nerd Font",
	"Hack Nerd Font", 
	"JetBrainsMono Nerd Font",
	"Hurmit Nerd Font",
	"3270 Nerd Font",
	"Noto Sans CJK SC",
	"Noto Serif CJK SC",
	"Noto Sans Mono CJK SC",
];

// UI Scale options
export const UI_SCALE_OPTIONS = [
	{ value: "compact", label: "Compact", scale: 0.875, description: "Dense layout" },
	{ value: "default", label: "Default", scale: 1, description: "Standard size" },
	{ value: "comfortable", label: "Comfortable", scale: 1.125, description: "Spacious layout" },
	{ value: "large", label: "Large", scale: 1.25, description: "Extra large" },
] as const;

// Card Size options
export const CARD_SIZE_OPTIONS = [
	{ value: "compact", label: "Compact", padding: "0.75rem", description: "Minimal padding" },
	{ value: "default", label: "Default", padding: "1rem", description: "Standard padding" },
	{ value: "comfortable", label: "Comfortable", padding: "1.5rem", description: "Generous padding" },
	{ value: "spacious", label: "Spacious", padding: "2rem", description: "Maximum padding" },
] as const;

interface FontSettings {
	// Editor Font (VSCode style - comma separated font list)
	fontFamily: string;
	fontSize: number;
	lineHeight: number;
	letterSpacing: number;

	// UI Font
	uiFontFamily: string;
	uiFontSize: number;
	uiScale: string;

	// Card Settings
	cardSize: string;
	cardBorderRadius: number;

	// Paragraph
	paragraphSpacing: number;
	firstLineIndent: number;

	// Actions
	setFontFamily: (family: string) => void;
	setFontSize: (size: number) => void;
	setLineHeight: (height: number) => void;
	setLetterSpacing: (spacing: number) => void;
	setUiFontFamily: (family: string) => void;
	setUiFontSize: (size: number) => void;
	setUiScale: (scale: string) => void;
	setCardSize: (size: string) => void;
	setCardBorderRadius: (radius: number) => void;
	setParagraphSpacing: (spacing: number) => void;
	setFirstLineIndent: (indent: number) => void;
	reset: () => void;
}

const DEFAULT_SETTINGS = {
	fontFamily: DEFAULT_EDITOR_FONT,
	fontSize: 16,
	lineHeight: 1.6,
	letterSpacing: 0,
	uiFontFamily: DEFAULT_UI_FONT,
	uiFontSize: 14,
	uiScale: "default",
	cardSize: "default",
	cardBorderRadius: 8,
	paragraphSpacing: 0.5,
	firstLineIndent: 0,
};

export const useFontSettings = create<FontSettings>()(
	persist(
		(set) => ({
			...DEFAULT_SETTINGS,
			setFontFamily: (fontFamily) => set({ fontFamily }),
			setFontSize: (fontSize) =>
				set({ fontSize: Math.max(12, Math.min(32, fontSize)) }),
			setLineHeight: (lineHeight) =>
				set({ lineHeight: Math.max(1.2, Math.min(2.5, lineHeight)) }),
			setLetterSpacing: (letterSpacing) =>
				set({ letterSpacing: Math.max(-0.05, Math.min(0.2, letterSpacing)) }),
			setUiFontFamily: (uiFontFamily) => set({ uiFontFamily }),
			setUiFontSize: (uiFontSize) =>
				set({ uiFontSize: Math.max(12, Math.min(18, uiFontSize)) }),
			setUiScale: (uiScale) => set({ uiScale }),
			setCardSize: (cardSize) => set({ cardSize }),
			setCardBorderRadius: (cardBorderRadius) =>
				set({ cardBorderRadius: Math.max(0, Math.min(16, cardBorderRadius)) }),
			setParagraphSpacing: (paragraphSpacing) =>
				set({ paragraphSpacing: Math.max(0, Math.min(2.5, paragraphSpacing)) }),
			setFirstLineIndent: (firstLineIndent) =>
				set({ firstLineIndent: Math.max(0, Math.min(4, firstLineIndent)) }),
			reset: () => set(DEFAULT_SETTINGS),
		}),
		{
			name: "grain-font-settings",
		},
	),
);
