import { useSyncExternalStore } from "react"
import * as E from "fp-ts/Either"
import { parseApplicationPopupConfiguration } from "@/flows/application/application-popup-configuration"
import { useSettings } from "./use-settings"
import { getOrgConfigurationStorageError, subscribeOrgConfigurationStorage, useOrgConfigurationStorageSynchronization } from "./use-org-input-configuration"

function createSnapshot() {
	const raw = useSettings.getState().applicationPopupConfigurationJson
	const storageError = getOrgConfigurationStorageError()
	return Object.freeze({ raw, generation: {}, parsed: storageError ? E.left({ message: storageError }) : parseApplicationPopupConfiguration(raw) })
}
let snapshot = createSnapshot()
const listeners = new Set<() => void>()
const publishSnapshot = () => {
	snapshot = createSnapshot()
	for (const listener of listeners) listener()
}
subscribeOrgConfigurationStorage(publishSnapshot)
// Observe every settings transition before React can coalesce a placement ABA.
useSettings.subscribe((state) => {
	if (state.applicationPopupConfigurationJson === snapshot.raw) return
	publishSnapshot()
})
export const getApplicationPopupConfiguration = () => snapshot
export const subscribeApplicationPopupConfiguration = (listener: () => void) => {
	listeners.add(listener)
	return () => { listeners.delete(listener) }
}
export function useApplicationPopupConfiguration() {
	const current = useSyncExternalStore(subscribeApplicationPopupConfiguration, getApplicationPopupConfiguration, getApplicationPopupConfiguration)
	useOrgConfigurationStorageSynchronization()
	return current
}
