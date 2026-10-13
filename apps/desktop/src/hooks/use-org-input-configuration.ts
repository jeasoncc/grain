import * as E from "fp-ts/Either"
import { useEffect, useSyncExternalStore } from "react"
import { parseOrgKeymapConfiguration } from "@/pipes/org/org-keymap-configuration.pipe"
import { useSettings } from "./use-settings"
import type { OrgKeymapConfiguration } from "@/types/editor/org-keymap.interface"
import { subscribeOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"

export interface OrgInputConfigurationSnapshot {
	readonly raw: string
	readonly generation: object
	readonly configuration: OrgKeymapConfiguration | null
	readonly error: string | null
}

let configurationStorageError: string | null = null
let configurationStorageFailure: string | null = null
let repairingStorage = false
const storageListeners = new Set<() => void>()
export const getOrgConfigurationStorageError = (): string | null => configurationStorageError
export const subscribeOrgConfigurationStorage = (listener: () => void) => {
	storageListeners.add(listener)
	return () => { storageListeners.delete(listener) }
}
const publishStorageTransition = () => {
	for (const listener of storageListeners) listener()
}
// Validate the existing Zustand envelope only; its body is never installed from an event.
const storedSettingsError = (raw: string | null): string | null => {
	if (raw === null) return "Saved settings were removed. Save a valid configuration before using captured commands."
	let value: unknown
	try { value = JSON.parse(raw) } catch { return "Saved settings must be valid JSON. Repair them in Editor settings." }
	if (typeof value !== "object" || value === null || Array.isArray(value) ||
		!("state" in value) || typeof value.state !== "object" || value.state === null || Array.isArray(value.state))
		return "Saved settings must contain the persisted settings state. Repair them in Editor settings."
	if ("version" in value && value.version !== 0)
		return "Saved settings use an unsupported storage version. Repair them in Editor settings."
	return null
}
// Initial persist hydration may have completed before this module subscribed.
try {
	const stored = localStorage.getItem("grain-settings")
	configurationStorageFailure = stored === null ? null : storedSettingsError(stored)
} catch {
	configurationStorageFailure = "Saved settings could not be read. Repair them in Editor settings."
}
configurationStorageError = configurationStorageFailure ??
	(useSettings.persist.hasHydrated() ? null : "Settings storage is being synchronized; captured commands are unavailable.")

const createSnapshot = (raw: string, metadataPrevious?: OrgInputConfigurationSnapshot): OrgInputConfigurationSnapshot => {
	const parsed = parseOrgKeymapConfiguration(raw)
	const configuration = !configurationStorageError && E.isRight(parsed) ? parsed.right : null
	const error = configurationStorageError ?? (E.isLeft(parsed) ? parsed.left.message : null)
	// Discovery labels do not retire input authority; raw/storage ABA still does.
	const generation = metadataPrevious && metadataPrevious.raw === raw && metadataPrevious.error === error &&
		Boolean(metadataPrevious.configuration) === Boolean(configuration) ? metadataPrevious.generation : {}
	return { raw, generation, configuration, error }
}
let snapshot = createSnapshot(useSettings.getState().orgKeymapConfigurationJson)
const inputListeners = new Set<() => void>()
const publishSnapshot = () => {
	snapshot = createSnapshot(useSettings.getState().orgKeymapConfigurationJson)
	for (const listener of inputListeners) listener()
}
subscribeOrgInputCommandMetadata(() => {
	const next = createSnapshot(useSettings.getState().orgKeymapConfigurationJson, snapshot)
	if (next.generation === snapshot.generation) {
		const before = snapshot.configuration, after = next.configuration
		if (!before || !after) return
		let labelsChanged = false
		// With identical raw JSON, metadata can change validity or resolved labels, not bindings.
		for (const id in after.maps) if (after.maps[id].bindings.some((binding, index) => binding.label !== before.maps[id].bindings[index].label)) {
			labelsChanged = true
			break
		}
		if (!labelsChanged) return
	}
	snapshot = next
	for (const listener of inputListeners) listener()
})
subscribeOrgConfigurationStorage(publishSnapshot)
useSettings.persist.onHydrate(() => {
	try { configurationStorageFailure ??= storedSettingsError(localStorage.getItem("grain-settings")) }
	catch { configurationStorageFailure ??= "Saved settings could not be read. Repair them in Editor settings." }
	configurationStorageError = configurationStorageFailure ??
		"Settings storage is being synchronized; captured commands are unavailable."
	publishStorageTransition()
})
useSettings.persist.onFinishHydration(() => {
	let error: string | null
	try { error = storedSettingsError(localStorage.getItem("grain-settings")) }
	catch { error = "Saved settings could not be read. Repair them in Editor settings." }
	// A readable later storage event is not an explicit repair of an unknown authority.
	if (repairingStorage && !error) configurationStorageFailure = null
	else configurationStorageFailure ??= error
	repairingStorage = false
	configurationStorageError = configurationStorageFailure
	publishStorageTransition()
})
/** A successful explicit save repairs a previously unreadable storage authority without another write. */
export const repairOrgConfigurationStorage = (): void => {
	if (configurationStorageError === null) return
	repairingStorage = true
	void Promise.resolve(useSettings.persist.rehydrate()).finally(() => { repairingStorage = false })
}
// Observe each transition, including an A -> B -> A change batched into one React render.
useSettings.subscribe((state) => {
	if (state.orgKeymapConfigurationJson !== snapshot.raw) publishSnapshot()
})
export const getOrgInputConfiguration = (): OrgInputConfigurationSnapshot => snapshot
const subscribeInputConfiguration = (listener: () => void) => {
	inputListeners.add(listener)
	return () => { inputListeners.delete(listener) }
}

let listeners = 0
const synchronizeSettings = (event: StorageEvent) => {
	if (event.storageArea !== localStorage || (event.key !== "grain-settings" && event.key !== null)) return
	// Retire consumers synchronously, then read the latest authority. Event bodies may be delayed.
	configurationStorageError = configurationStorageFailure ??
		"Settings storage is being synchronized; captured commands are unavailable."
	publishStorageTransition()
	// Zustand hydration merges persisted settings without issuing another uncertain write.
	void useSettings.persist.rehydrate()
}

/** All declarative configuration consumers share one native storage listener. */
export const useOrgConfigurationStorageSynchronization = (): void => {
	useEffect(() => {
		if (++listeners === 1) window.addEventListener("storage", synchronizeSettings)
		return () => {
			if (--listeners === 0) window.removeEventListener("storage", synchronizeSettings)
		}
	}, [])
}
/** Same authority in embedded and detached Source; each transition gets a fresh incarnation. */
export const useOrgInputConfiguration = (): OrgInputConfigurationSnapshot => {
	const current = useSyncExternalStore(subscribeInputConfiguration, getOrgInputConfiguration, getOrgInputConfiguration)
	useOrgConfigurationStorageSynchronization()
	return current
}
