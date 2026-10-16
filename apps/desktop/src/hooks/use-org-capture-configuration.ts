import * as E from "fp-ts/Either"
import { useSyncExternalStore } from "react"
import { parseOrgCaptureConfiguration } from "@/pipes/org/org-capture-configuration.pipe"
import type { OrgCaptureConfiguration } from "@/types/editor/org-capture.interface"
import { useSettings } from "./use-settings"
import { getConfigurationError, subscribeConfiguration } from "@/state/configuration.state"

export interface OrgCaptureConfigurationSnapshot {
	readonly raw: string
	readonly generation: object
	readonly configuration: OrgCaptureConfiguration | null
	readonly error: string | null
}
const createSnapshot = (): OrgCaptureConfigurationSnapshot => {
	const raw = useSettings.getState().orgCaptureConfigurationJson
	const parsed = parseOrgCaptureConfiguration(raw)
	const storageError = getConfigurationError()
	return Object.freeze({ raw, generation: {},
		configuration: !storageError && E.isRight(parsed) ? parsed.right : null,
		error: storageError ?? (E.isLeft(parsed) ? parsed.left.message : null) })
}
let snapshot = createSnapshot()
const listeners = new Set<() => void>()
const publishSnapshot = () => {
	snapshot = createSnapshot()
	for (const listener of listeners) listener()
}
subscribeConfiguration(publishSnapshot)
useSettings.subscribe((state) => {
	if (state.orgCaptureConfigurationJson !== snapshot.raw) publishSnapshot()
})
export const getOrgCaptureConfiguration = (): OrgCaptureConfigurationSnapshot => snapshot
export const subscribeOrgCaptureConfiguration = (listener: () => void) => {
	listeners.add(listener)
	return () => { listeners.delete(listener) }
}
export function useOrgCaptureConfiguration(): OrgCaptureConfigurationSnapshot {
	const current = useSyncExternalStore(subscribeOrgCaptureConfiguration, getOrgCaptureConfiguration, getOrgCaptureConfiguration)
	return current
}
