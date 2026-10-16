import type { TerminalPalette } from "@/types/theme/terminal-palette.types"
import type { Theme, ThemeColors } from "@/types/theme/theme.types"

type RGB = readonly [number, number, number]

const rgb = (color: string): RGB => [
	Number.parseInt(color.slice(1, 3), 16),
	Number.parseInt(color.slice(3, 5), 16),
	Number.parseInt(color.slice(5, 7), 16),
]

const mix = (from: string, to: string, amount: number): string => {
	const start = rgb(from)
	const end = rgb(to)
	return `#${start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount).toString(16).padStart(2, "0")).join("")}`
}

/** WCAG relative luminance, derived from actual colors rather than theme names. */
const luminance = (color: string): number => {
	const channels = rgb(color).map((value) => {
		const channel = value / 255
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

const contrast = (first: string, second: string): number => {
	const a = luminance(first)
	const b = luminance(second)
	return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const minimumContrast = (color: string, backgrounds: readonly string[]): number =>
	Math.min(...backgrounds.map((background) => contrast(color, background)))

/** Keep the palette's hue where possible, moving only as far as readability requires. */
const readable = (color: string, backgrounds: readonly string[], ratio = 4.5): string => {
	if (minimumContrast(color, backgrounds) >= ratio) {
		return color
	}
	const endpoint = minimumContrast("#000000", backgrounds) > minimumContrast("#ffffff", backgrounds)
		? "#000000"
		: "#ffffff"
	let low = 0
	let high = 1
	for (let step = 0; step < 16; step += 1) {
		const amount = (low + high) / 2
		if (minimumContrast(mix(color, endpoint, amount), backgrounds) >= ratio) {
			high = amount
		} else {
			low = amount
		}
	}
	return mix(color, endpoint, high)
}

const selectionSurface = (selection: string, background: string, foreground: string): string => {
	let amount = 0.35
	for (let step = 0; step < 24; step += 1) {
		const candidate = mix(background, selection, amount)
		if (contrast(foreground, candidate) >= 4.5) {
			return candidate
		}
		amount *= 0.7
	}
	return background
}

/**
 * Adapt terminal colors to Grain surfaces without changing the original palette.
 * Text and syntax meet 4.5:1 against all normal surfaces; boundaries/cursors meet
 * 3:1. Existing icons, status labels, emphasis and other non-color hints remain
 * the UI's responsibility, unchanged by this adapter.
 */
export function adaptTerminalPalette(palette: TerminalPalette): Theme {
	const background = palette.background
	const type = luminance(background) < 0.179128784747792 ? "dark" : "light"
	// Recess surfaces toward the mode's background endpoint, never across the
	// black/white contrast crossover (important for unusual midtone palettes).
	const surfaceEndpoint = type === "dark" ? "#000000" : "#ffffff"
	const card = mix(background, surfaceEndpoint, 0.04)
	const sidebar = mix(background, surfaceEndpoint, 0.08)
	const muted = mix(background, surfaceEndpoint, 0.12)
	const surfaces = [background, card, sidebar, muted]
	const foreground = readable(palette.foreground, surfaces)
	const primary = readable(palette.blue, surfaces)
	const primaryForeground = readable(palette.background, [primary])
	const mutedForeground = readable(mix(foreground, background, 0.25), surfaces)
	const border = readable(mix(background, foreground, 0.35), surfaces, 3)
	const accent = selectionSurface(palette.selectionBackground, sidebar, foreground)
	const error = readable(palette.red, surfaces)
	const colors: Required<ThemeColors> = {
		background,
		foreground,
		card,
		cardForeground: foreground,
		popover: card,
		popoverForeground: foreground,
		primary,
		primaryForeground,
		secondary: muted,
		secondaryForeground: foreground,
		muted,
		mutedForeground,
		accent,
		accentForeground: foreground,
		destructive: error,
		destructiveForeground: readable(background, [error]),
		border,
		input: border,
		ring: primary,
		sidebar,
		sidebarForeground: foreground,
		sidebarPrimary: primary,
		sidebarPrimaryForeground: primaryForeground,
		sidebarAccent: accent,
		sidebarAccentForeground: foreground,
		sidebarBorder: border,
		folderColor: readable(palette.yellow, surfaces),
		toastBackground: card,
		toastForeground: foreground,
		toastBorder: border,
		editorCursor: readable(palette.cursorColor, surfaces, 3),
		editorSelection: selectionSurface(palette.selectionBackground, background, foreground),
		editorLineHighlight: muted,
		success: readable(palette.green, surfaces),
		warning: readable(palette.yellow, surfaces),
		error,
		info: readable(palette.cyan, surfaces),
		syntaxHeading: readable(palette.blue, surfaces),
		syntaxBold: readable(palette.brightWhite, surfaces),
		syntaxItalic: readable(palette.purple, surfaces),
		syntaxLink: readable(palette.cyan, surfaces),
		syntaxCode: readable(palette.red, surfaces),
		syntaxQuote: readable(palette.green, surfaces),
		syntaxComment: mutedForeground,
	}
	return {
		key: palette.name,
		name: palette.name,
		description: `${palette.name} — iTerm2-Color-Schemes terminal palette, adapted for Grain.`,
		type,
		colors,
		terminalPalette: palette,
	}
}
