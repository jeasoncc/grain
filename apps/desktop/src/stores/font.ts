// 字体设置 Store
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const AVAILABLE_FONTS = [
	{
		value: "system",
		label: "系统默认",
		family: "system-ui, -apple-system, sans-serif",
	},
	{
		value: "songti",
		label: "思源宋体",
		family: '"Source Han Serif SC", "Noto Serif CJK SC", "SimSun", serif',
	},
	{
		value: "kaiti",
		label: "霞鹜文楷",
		family: '"LXGW WenKai", "STKaiti", "KaiTi", serif',
	},
	{
		value: "sarasa",
		label: "更纱黑体",
		family: '"Sarasa Gothic SC", "PingFang SC", "Microsoft YaHei", sans-serif',
	},
	{
		value: "hack",
		label: "Hack (等宽)",
		family: '"Hack", "Fira Code", "Consolas", monospace',
	},
	{
		value: "jetbrains",
		label: "JetBrains Mono",
		family: '"JetBrains Mono", "Fira Code", monospace',
	},
] as const;

interface FontSettings {
	// 字体
	fontFamily: string;
	fontSize: number; // 14-24
	lineHeight: number; // 1.5-2.5
	letterSpacing: number; // -0.05 - 0.1

	// 段落
	paragraphSpacing: number; // 0-2 (em)
	firstLineIndent: number; // 0-4 (em)

	// 操作
	setFontFamily: (family: string) => void;
	setFontSize: (size: number) => void;
	setLineHeight: (height: number) => void;
	setLetterSpacing: (spacing: number) => void;
	setParagraphSpacing: (spacing: number) => void;
	setFirstLineIndent: (indent: number) => void;
	reset: () => void;
}

const DEFAULT_SETTINGS = {
	fontFamily: "songti",
	fontSize: 15, // 减小默认字体
	lineHeight: 1.75, // 稍微紧凑的行高
	letterSpacing: 0,
	paragraphSpacing: 0.4, // 减小段落间距
	firstLineIndent: 2,
};

export const useFontSettings = create<FontSettings>()(
	persist(
		(set) => ({
			...DEFAULT_SETTINGS,
			setFontFamily: (fontFamily) => set({ fontFamily }),
			setFontSize: (fontSize) =>
				set({ fontSize: Math.max(14, Math.min(24, fontSize)) }),
			setLineHeight: (lineHeight) =>
				set({ lineHeight: Math.max(1.5, Math.min(2.5, lineHeight)) }),
			setLetterSpacing: (letterSpacing) =>
				set({ letterSpacing: Math.max(-0.05, Math.min(0.1, letterSpacing)) }),
			setParagraphSpacing: (paragraphSpacing) =>
				set({ paragraphSpacing: Math.max(0, Math.min(2, paragraphSpacing)) }),
			setFirstLineIndent: (firstLineIndent) =>
				set({ firstLineIndent: Math.max(0, Math.min(4, firstLineIndent)) }),
			reset: () => set(DEFAULT_SETTINGS),
		}),
		{
			name: "novel-editor-font-settings",
		},
	),
);
