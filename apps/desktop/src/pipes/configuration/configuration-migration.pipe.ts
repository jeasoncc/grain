import { DEFAULT_CONFIGURATION_DOCUMENT, parseConfigurationDocument } from "./configuration-document.pipe"
import { getLegacyThemeByKey, getThemeByName } from "@/utils/themes.util"

export const CONFIGURATION_LEGACY_KEYS = ["grain-settings", "grain-font-settings", "grain-theme", "icon-theme", "diagram-settings"] as const

/** Decode only the retired Zustand v0 envelope. Malformed preferences are never discarded. */
export function migrateLegacyConfiguration(legacy: Readonly<Record<string, string | null>>): { readonly document: string; readonly notice: string | null } {
	const states: Record<string, Record<string, unknown>> = {}
	let present = false
	for (const key of CONFIGURATION_LEGACY_KEYS) {
		const raw = legacy[key]
		if (raw === null || raw === undefined) { states[key] = {}; continue }
		present = true
		let value: unknown
		try { value = JSON.parse(raw) } catch { throw new Error(`Legacy preference ${key} contains invalid JSON. It was not removed; create config.json manually to replace it.`) }
		if (typeof value !== "object" || value === null || Array.isArray(value) || !("state" in value) ||
			typeof value.state !== "object" || value.state === null || Array.isArray(value.state) || "version" in value && value.version !== 0)
			throw new Error(`Legacy preference ${key} is not a supported version-0 state envelope. It was not removed.`)
		states[key] = value.state as Record<string, unknown>
	}
	if (!present) return { document: DEFAULT_CONFIGURATION_DOCUMENT, notice: null }
	const document = JSON.parse(DEFAULT_CONFIGURATION_DOCUMENT)
	const settings = states["grain-settings"], font = states["grain-font-settings"], theme = states["grain-theme"]
	for (const field of ["autoSave", "autoSaveInterval"] as const) if (field in settings) document.saving[field] = settings[field]
	if ("wordCountMode" in settings) document.wordCount.mode = settings.wordCountMode
	if ("showWordCountBadge" in settings) document.wordCount.badge = settings.showWordCountBadge
	for (const [field, target] of [["fontFamily", "family"], ["fontSize", "size"], ["lineHeight", "lineHeight"], ["letterSpacing", "letterSpacing"], ["paragraphSpacing", "paragraphSpacing"], ["firstLineIndent", "firstLineIndent"]] as const)
		if (field in font) document.font.source[target] = font[field]
	for (const [field, target] of [["uiFontFamily", "family"], ["uiFontSize", "size"], ["uiScale", "scale"]] as const)
		if (field in font) document.font.interface[target] = font[field]
	for (const [field, target] of [["orgCaptureConfigurationJson", "capture"], ["orgKeymapConfigurationJson", "keymaps"], ["orgBehaviorConfigurationJson", "org"], ["orgAgendaConfigurationJson", "agenda"], ["applicationPopupConfigurationJson", "tools"]] as const) {
		if (!(field in settings)) continue
		const raw = settings[field]
		if (typeof raw !== "string") throw new Error(`Legacy preference grain-settings.${field} must contain JSON text. It was not removed.`)
		if (!raw.trim()) continue
		try { document[target] = JSON.parse(raw) } catch { throw new Error(`Legacy preference grain-settings.${field} contains invalid JSON. It was not removed.`) }
	}
	if ("currentThemeKey" in states["icon-theme"]) document.appearance.icons = states["icon-theme"].currentThemeKey
	if ("krokiServerUrl" in states["diagram-settings"]) document.diagrams.serverUrl = states["diagram-settings"].krokiServerUrl
	if ("enableTransition" in theme) document.appearance.transitions = theme.enableTransition
	if ("mode" in theme && theme.mode !== "light" && theme.mode !== "dark" && theme.mode !== "system")
		throw new Error("Legacy preference grain-theme.mode is unsupported. It was not removed.")
	if ("themeKey" in theme && typeof theme.themeKey !== "string") throw new Error("Legacy preference grain-theme.themeKey must be a string. It was not removed.")
	let themeNotice = ""
	if (typeof theme.themeKey === "string") {
		const old = getLegacyThemeByKey(theme.themeKey)
		const named = getThemeByName(old?.name ?? theme.themeKey)
		const type = theme.mode === "light" || theme.mode === "dark" ? theme.mode : old?.type ?? named?.type ?? "dark"
		const selected = named && (theme.mode === "system" || named.type === type) ? named : getThemeByName(type === "light" ? "GitHub" : "GitHub Dark")!
		document.appearance.theme = selected.name
		if (selected.type === "light") document.appearance.lightTheme = selected.name
		else document.appearance.darkTheme = selected.name
		if (!named || named !== selected) themeNotice = ` Retired theme ${JSON.stringify(old?.name ?? theme.themeKey)} was replaced with terminal palette ${JSON.stringify(selected.name)}.`
	}
	document.appearance.mode = theme.mode === "system" ? "system" : "theme"
	const notice = `Existing preferences were migrated once to config.json; it is now the only configuration authority.${themeNotice}`
	document.$comment = `${document.$comment} ${notice}`
	// Migration is all-or-nothing, particularly for plaintext recovery permission.
	const checked = parseConfigurationDocument(JSON.stringify(document))
	return { document: JSON.stringify(checked, null, 2) + "\n", notice }
}
