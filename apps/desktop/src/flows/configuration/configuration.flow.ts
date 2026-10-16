import type { ApplicationCommandResult } from "@/flows/application-command-registry"
import { useSettings } from "@/hooks/use-settings"
import { broadcastConfigurationReload, createConfigurationFile, listenConfigurationReload, openNativeConfigurationFile, readConfigurationFile } from "@/io/api/configuration.api"
import { clearOrgCaptureDrafts } from "@/io/storage/org-capture-draft.storage"
import { parseConfigurationDocument } from "@/pipes/configuration/configuration-document.pipe"
import { CONFIGURATION_LEGACY_KEYS, migrateLegacyConfiguration } from "@/pipes/configuration/configuration-migration.pipe"
import { parseOrgCaptureConfiguration } from "@/pipes/org/org-capture-configuration.pipe"
import { useConfigurationState } from "@/state/configuration.state"
import { useDiagramStore } from "@/state/diagram.state"
import { useFontStore } from "@/state/font.state"
import { useIconThemeStore } from "@/state/icon-theme.state"
import { useThemeStore } from "@/state/theme.state"
import { getThemeByName } from "@/utils/themes.util"
import * as E from "fp-ts/Either"

let attempt = 0
let initialization: Promise<ApplicationCommandResult> | undefined

async function loadConfiguration(createIfMissing: boolean): Promise<ApplicationCommandResult> {
	const request = ++attempt
	const previous = useConfigurationState.getState()
	const previousCapture = parseOrgCaptureConfiguration(useSettings.getState().orgCaptureConfigurationJson)
	const recoveryWasEnabled = E.isRight(previousCapture) && previousCapture.right.draftRecovery
	// Retire producers before awaiting IO, even when the next file has equal text.
	useConfigurationState.setState({ status: "loading", error: "Configuration is being reloaded; captured commands are unavailable.", notice: null, generation: {} })
	let path = previous.path
	try {
		let file = await readConfigurationFile()
		if (request !== attempt) return { kind: "cancelled" }
		path = file.path
		useConfigurationState.setState({ path })
		let migrationNotice: string | null = null
		if (file.content === null) {
			if (!createIfMissing) throw new Error("The configuration file is missing. Restore it or create a version-1 configuration, then reload; it was not recreated automatically.")
			const legacy = Object.fromEntries(CONFIGURATION_LEGACY_KEYS.map(key => [key, localStorage.getItem(key)]))
			const migration = migrateLegacyConfiguration(legacy)
			file = await createConfigurationFile(migration.document)
			if (file.content === migration.document) migrationNotice = migration.notice
		}
		if (file.content === null) throw new Error("Configuration creation did not return a file.")
		const configuration = parseConfigurationDocument(file.content)
		if (request !== attempt) return { kind: "cancelled" }
		const selected = getThemeByName(configuration.appearance.theme)!
		const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
		const effective = configuration.appearance.mode === "system"
			? getThemeByName(systemTheme === "dark" ? configuration.appearance.darkTheme : configuration.appearance.lightTheme)!
			: selected
		// The complete document has passed validation. Publish while declarative authority
		// remains closed, then release all consumers together with a fresh generation.
		useFontStore.setState({
			fontFamily: configuration.font.source.family, fontSize: configuration.font.source.size,
			lineHeight: configuration.font.source.lineHeight, letterSpacing: configuration.font.source.letterSpacing,
			paragraphSpacing: configuration.font.source.paragraphSpacing, firstLineIndent: configuration.font.source.firstLineIndent,
			uiFontFamily: configuration.font.interface.family, uiFontSize: configuration.font.interface.size, uiScale: configuration.font.interface.scale,
		})
		useThemeStore.setState({
			themeKey: selected.key, lightThemeKey: configuration.appearance.lightTheme, darkThemeKey: configuration.appearance.darkTheme,
			mode: configuration.appearance.mode === "system" ? "system" : selected.type,
			systemTheme, effectiveTheme: effective.type, enableTransition: configuration.appearance.transitions,
		})
		useIconThemeStore.setState({ currentThemeKey: configuration.appearance.icons })
		useDiagramStore.setState({ krokiServerUrl: configuration.diagrams.serverUrl })
		useSettings.setState({
			autoSave: configuration.saving.autoSave, autoSaveInterval: configuration.saving.autoSaveInterval,
			wordCountMode: configuration.wordCount.mode, showWordCountBadge: configuration.wordCount.badge,
			orgCaptureConfigurationJson: JSON.stringify(configuration.capture), orgKeymapConfigurationJson: JSON.stringify(configuration.keymaps),
			orgBehaviorConfigurationJson: JSON.stringify(configuration.org), orgAgendaConfigurationJson: JSON.stringify(configuration.agenda),
			applicationPopupConfigurationJson: JSON.stringify(configuration.tools),
		})
		let notice = migrationNotice
		if (recoveryWasEnabled && !configuration.capture.draftRecovery)
			notice = [notice, "Capture recovery is now off. Existing saved drafts are retained, not read or deleted. Use Delete saved Capture drafts for explicit deletion."].filter(Boolean).join(" ")
		try {
			for (const key of CONFIGURATION_LEGACY_KEYS) localStorage.removeItem(key)
		} catch {
			notice = [notice, "Retired preference storage could not be removed; it is no longer read or synchronized."].filter(Boolean).join(" ")
		}
		useConfigurationState.setState({ status: "ready", path, error: null, notice, generation: {} })
		return { kind: "success", message: `Configuration loaded: ${path}` }
	} catch (error) {
		if (request !== attempt) return { kind: "cancelled" }
		const message = `${path ? `${path}\n` : ""}${error instanceof Error ? error.message : String(error)}`
		// Leave prior visual preferences intact, never grant permission or default invalid
		// declarative configuration. Source bytes and runtime ownership are untouched.
		useConfigurationState.setState({ status: "error", path, error: message, notice: null, generation: {} })
		return { kind: "rejected", message }
	}
}

export function initializeConfiguration(): Promise<ApplicationCommandResult> {
	initialization ??= loadConfiguration(true)
	return initialization
}
export async function reloadConfiguration(): Promise<ApplicationCommandResult> {
	await initializeConfiguration()
	const result = await loadConfiguration(false)
	try { await broadcastConfigurationReload() } catch (error) {
		const message = `Other windows could not be notified to reload configuration: ${String(error)}`
		useConfigurationState.setState({ notice: message })
		return { kind: "rejected", message: [result.message, message].filter(Boolean).join("\n") }
	}
	return result
}
export async function openConfigurationFile(): Promise<ApplicationCommandResult> {
	await initializeConfiguration()
	try { await openNativeConfigurationFile(); return { kind: "success", message: "Configuration opened with the system default application." } }
	catch (error) { return { kind: "rejected", message: String(error) } }
}

/** Each native view rereads the real file; no event-supplied preference snapshot is trusted. */
export function startConfigurationSynchronization(): () => void {
	let unlisten: (() => void) | undefined
	void initializeConfiguration()
	if (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window))
		unlisten = listenConfigurationReload(() => { void loadConfiguration(false) })
	return () => unlisten?.()
}

/** Data deletion, not a configuration editor. Recovery must already be revoked in the file. */
export async function deleteSavedCaptureDrafts(confirm: () => Promise<boolean>, isPublicationPending: () => boolean): Promise<ApplicationCommandResult> {
	const snapshot = useConfigurationState.getState()
	const capture = parseOrgCaptureConfiguration(useSettings.getState().orgCaptureConfigurationJson)
	if (snapshot.status !== "ready") return { kind: "rejected", message: "Load a valid configuration before deleting saved drafts." }
	if (E.isLeft(capture)) return { kind: "rejected", message: capture.left.message }
	if (capture.right.draftRecovery) return { kind: "rejected", message: "Set capture.draftRecovery to false in config.json and reload before deleting saved drafts." }
	if (isPublicationPending()) return { kind: "rejected", message: "Wait for pending tool publications before deleting saved drafts." }
	if (!await confirm()) return { kind: "cancelled" }
	if (useConfigurationState.getState().generation !== snapshot.generation || isPublicationPending())
		return { kind: "rejected", message: "Configuration or pending work changed while confirming deletion. No saved drafts were deleted." }
	const result = clearOrgCaptureDrafts()
	return E.isLeft(result) ? { kind: "rejected", message: result.left.message } : { kind: "success", message: "Saved Capture drafts deleted. Org files were not changed." }
}

