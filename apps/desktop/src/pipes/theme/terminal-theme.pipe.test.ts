import { describe, expect, it } from "vitest"
import palettes from "@/types/theme/iterm2/catalog.json"
import { adaptTerminalPalette } from "./terminal-theme.pipe"

const luminance = (color: string): number => {
	const channels = [1, 3, 5].map((offset) => {
		const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const contrast = (first: string, second: string): number => {
	const a = luminance(first)
	const b = luminance(second)
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

describe("offline terminal palette adaptation", () => {
	it("preserves every upstream palette and its exact name independently of semantic colors", () => {
		for (const palette of palettes) {
			const before = JSON.stringify(palette)
			const theme = adaptTerminalPalette(palette)
			expect(theme.name).toBe(palette.name)
			expect(theme.key).toBe(palette.name)
			expect(theme.colors.background).toBe(palette.background)
			expect(JSON.stringify(palette)).toBe(before)
		}
	})

	it("uses actual background luminance even when the name claims the opposite mode", () => {
		const palette = palettes[0]
		expect(adaptTerminalPalette({ ...palette, name: "Light", background: "#101010" }).type).toBe("dark")
		expect(adaptTerminalPalette({ ...palette, name: "Dark", background: "#fafafa" }).type).toBe("light")
	})

	it("keeps text, syntax, status and selected text readable for every bundled palette", () => {
		for (const palette of palettes) {
			const { colors } = adaptTerminalPalette(palette)
			const surfaces = [colors.background, colors.card, colors.popover, colors.sidebar, colors.muted]
			const textColors = [
				colors.foreground, colors.mutedForeground, colors.primary, colors.folderColor,
				colors.success, colors.warning, colors.error, colors.info, colors.destructive,
				colors.syntaxHeading, colors.syntaxBold, colors.syntaxItalic,
				colors.syntaxLink, colors.syntaxCode, colors.syntaxQuote, colors.syntaxComment,
			]
			for (const foreground of textColors) {
				expect(foreground, `${palette.name}: missing semantic text color`).toBeDefined()
				if (foreground) {
					for (const surface of surfaces) {
						expect(contrast(foreground, surface), `${palette.name}: ${foreground} on ${surface}`).toBeGreaterThanOrEqual(4.5)
					}
				}
			}
			expect(contrast(colors.primaryForeground, colors.primary), palette.name).toBeGreaterThanOrEqual(4.5)
			expect(colors.destructiveForeground, palette.name).toBeDefined()
			if (colors.destructive && colors.destructiveForeground) {
				expect(contrast(colors.destructiveForeground, colors.destructive), palette.name).toBeGreaterThanOrEqual(4.5)
			}
			expect(contrast(colors.foreground, colors.editorSelection), palette.name).toBeGreaterThanOrEqual(4.5)
			expect(contrast(colors.accentForeground, colors.accent), palette.name).toBeGreaterThanOrEqual(4.5)
			expect(colors.editorCursor, palette.name).toBeDefined()
			for (const surface of surfaces) {
				expect(contrast(colors.border, surface), palette.name).toBeGreaterThanOrEqual(3)
				if (colors.editorCursor) {
					expect(contrast(colors.editorCursor, surface), palette.name).toBeGreaterThanOrEqual(3)
				}
			}
		}
	})
})
