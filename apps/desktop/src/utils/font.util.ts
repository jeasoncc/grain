// Font Configuration Utilities
import { UI_SCALE_OPTIONS } from "@/types/font"

export interface FontConfig {
	readonly fontFamily: string
	readonly fontSize: number
	readonly lineHeight: number
	readonly letterSpacing: number
	readonly uiFontFamily: string
	readonly uiFontSize: number
	readonly uiScale: string
	readonly paragraphSpacing: number
	readonly firstLineIndent: number
}

export const FONT_PRESETS: Record<string, FontConfig> = {
	chinese: {
		firstLineIndent: 2,
		fontFamily: "'Noto Serif CJK SC', 'Source Han Serif SC', serif",
		fontSize: 18,
		letterSpacing: 0.05,
		lineHeight: 1.8,
		paragraphSpacing: 1,
		uiFontFamily: "'Noto Sans CJK SC', 'PingFang SC', sans-serif",
		uiFontSize: 14,
		uiScale: "default",
	},
	comfortable: {
		firstLineIndent: 2,
		fontFamily: "'Noto Serif CJK SC', Georgia, serif",
		fontSize: 18,
		letterSpacing: 0.02,
		lineHeight: 1.8,
		paragraphSpacing: 0.8,
		uiFontFamily: "'Noto Sans CJK SC', system-ui, sans-serif",
		uiFontSize: 15,
		uiScale: "comfortable",
	},
	compact: {
		firstLineIndent: 0,
		fontFamily: "'Fira Code', monospace",
		fontSize: 14,
		letterSpacing: 0,
		lineHeight: 1.4,
		paragraphSpacing: 0.3,
		uiFontFamily: "system-ui, sans-serif",
		uiFontSize: 12,
		uiScale: "compact",
	},
	default: {
		firstLineIndent: 0,
		fontFamily: "'Fira Code', 'Hack', 'JetBrains Mono', monospace",
		fontSize: 16,
		letterSpacing: 0,
		lineHeight: 1.6,
		paragraphSpacing: 0.5,
		uiFontFamily: "'Noto Sans CJK SC', system-ui, sans-serif",
		uiFontSize: 14,
		uiScale: "default",
	},
}

export class FontConfigManager {
	/**
	 * Get UI scale value
	 */
	static getUIScale(scaleValue: string): number {
		const option = UI_SCALE_OPTIONS.find((s) => s.value === scaleValue)
		return option?.scale || 1
	}

}
