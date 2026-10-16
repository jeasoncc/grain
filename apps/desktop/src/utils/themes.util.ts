/**
 * Offline iTerm2-Color-Schemes catalog and isolated legacy migration lookup.
 * Source identity, generation details and licensing: types/theme/iterm2/.
 */

import { adaptTerminalPalette } from "@/pipes/theme/terminal-theme.pipe"
import terminalPalettes from "@/types/theme/iterm2/catalog.json"
import type { Theme, ThemeColors } from "@/types/theme/theme.types"

export type { Theme, ThemeColors }

// Not selectable configuration aliases: only the one-time local-storage migration
// may consult Grain's retired built-in keys.
const legacyThemes: readonly Pick<Theme, "key" | "name" | "type">[] = [
	{"key":"default-light","name":"Default Light","type":"light"},
	{"key":"github-light","name":"GitHub Light","type":"light"},
	{"key":"solarized-light","name":"Solarized Light","type":"light"},
	{"key":"quiet-light","name":"Quiet Light","type":"light"},
	{"key":"light-plus","name":"Light+","type":"light"},
	{"key":"atom-one-light","name":"Atom One Light","type":"light"},
	{"key":"winter-light","name":"Winter is Coming (Light)","type":"light"},
	{"key":"ayu-light","name":"Ayu Light","type":"light"},
	{"key":"gruvbox-light","name":"Gruvbox Light","type":"light"},
	{"key":"paper-light","name":"Paper","type":"light"},
	{"key":"sepia","name":"Sepia","type":"light"},
	{"key":"nord-light","name":"Nord Light","type":"light"},
	{"key":"rose-pine-dawn","name":"Rosé Pine Dawn","type":"light"},
	{"key":"catppuccin-latte","name":"Catppuccin Latte","type":"light"},
	{"key":"tokyo-night-day","name":"Tokyo Night Day","type":"light"},
	{"key":"bluloco-light","name":"Bluloco Light","type":"light"},
	{"key":"everforest-light","name":"Everforest Light","type":"light"},
	{"key":"dawn","name":"Dawn","type":"light"},
	{"key":"min-light","name":"Min Light","type":"light"},
	{"key":"flat-light","name":"Flat Light","type":"light"},
	{"key":"vitesse-light","name":"Vitesse Light","type":"light"},
	{"key":"summer","name":"Summer","type":"light"},
	{"key":"pure-light","name":"Pure","type":"light"},
	{"key":"cloud-light","name":"Cloud","type":"light"},
	{"key":"snow-light","name":"Snow","type":"light"},
	{"key":"default-dark","name":"Default Dark","type":"dark"},
	{"key":"github-dark","name":"GitHub Dark","type":"dark"},
	{"key":"one-dark-pro","name":"One Dark Pro","type":"dark"},
	{"key":"dracula","name":"Dracula","type":"dark"},
	{"key":"nord","name":"Nord","type":"dark"},
	{"key":"monokai-pro","name":"Monokai Pro","type":"dark"},
	{"key":"solarized-dark","name":"Solarized Dark","type":"dark"},
	{"key":"tokyo-night","name":"Tokyo Night","type":"dark"},
	{"key":"material-ocean","name":"Material Theme Ocean","type":"dark"},
	{"key":"palenight","name":"Palenight","type":"dark"},
	{"key":"gruvbox-dark","name":"Gruvbox Dark","type":"dark"},
	{"key":"night-owl","name":"Night Owl","type":"dark"},
	{"key":"cobalt2","name":"Cobalt2","type":"dark"},
	{"key":"synthwave-84","name":"SynthWave '84","type":"dark"},
	{"key":"shades-of-purple","name":"Shades of Purple","type":"dark"},
	{"key":"winter-dark","name":"Winter is Coming (Dark)","type":"dark"},
	{"key":"ayu-dark","name":"Ayu Dark","type":"dark"},
	{"key":"ayu-mirage","name":"Ayu Mirage","type":"dark"},
	{"key":"andromeda","name":"Andromeda","type":"dark"},
	{"key":"horizon","name":"Horizon","type":"dark"},
	{"key":"panda","name":"Panda","type":"dark"},
	{"key":"dark-plus","name":"Dark+","type":"dark"},
	{"key":"monokai","name":"Monokai","type":"dark"},
	{"key":"tokyo-night-storm","name":"Tokyo Night Storm","type":"dark"},
	{"key":"catppuccin-mocha","name":"Catppuccin Mocha","type":"dark"},
	{"key":"rose-pine","name":"Rosé Pine","type":"dark"},
	{"key":"github-dark-dimmed","name":"GitHub Dark Dimmed","type":"dark"},
	{"key":"one-monokai","name":"One Monokai","type":"dark"},
	{"key":"cyberpunk","name":"Cyberpunk","type":"dark"},
	{"key":"noctis","name":"Noctis","type":"dark"},
	{"key":"radical","name":"Radical","type":"dark"},
]

/** Exact upstream names available offline; semantic adaptation is lazy and cached. */
export const themeNames: readonly string[] = terminalPalettes.map((palette) => palette.name)

const palettesByName = new Map(terminalPalettes.map((palette) => [palette.name, palette]))
const adaptedThemes = new Map<string, Theme>()
const legacyThemesByKey = new Map(legacyThemes.map((theme) => [theme.key, theme]))

/** Exact upstream names are also stable configuration keys; no inferred aliases. */
export function getThemeByKey(key: string): Theme | undefined {
	return getThemeByName(key)
}

export function getThemeByName(name: string): Theme | undefined {
	const cached = adaptedThemes.get(name)
	if (cached) {
		return cached
	}
	const palette = palettesByName.get(name)
	if (!palette) {
		return undefined
	}
	const theme = adaptTerminalPalette(palette)
	adaptedThemes.set(name, theme)
	return theme
}

/** Only for importing the retired browser-local preference format once. */
export function getLegacyThemeByKey(
	key: string,
): Pick<Theme, "key" | "name" | "type"> | undefined {
	return legacyThemesByKey.get(key)
}
