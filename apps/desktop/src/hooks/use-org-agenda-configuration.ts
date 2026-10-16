import * as E from "fp-ts/Either"
import { useSyncExternalStore } from "react"
import { parseOrgAgendaConfiguration } from "@/pipes/org/org-agenda-configuration.pipe"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { useSettings } from "./use-settings"
import { getConfigurationError, subscribeConfiguration } from "@/state/configuration.state"

let revision = 0
function createSnapshot() {
	const state = useSettings.getState()
	const agenda = parseOrgAgendaConfiguration(state.orgAgendaConfigurationJson)
	const behavior = parseOrgBehaviorConfiguration(state.orgBehaviorConfigurationJson)
	const storageError = getConfigurationError()
	return Object.freeze({ raw: state.orgAgendaConfigurationJson, behaviorRaw: state.orgBehaviorConfigurationJson,
		generation: Object.freeze({ revision: revision++ }),
		configuration: !storageError && E.isRight(agenda) ? agenda.right : null,
		behavior: !storageError && E.isRight(behavior) ? behavior.right : null,
		error: storageError ?? (E.isLeft(agenda) ? agenda.left.message : E.isLeft(behavior) ? behavior.left.message : null) })
}
let snapshot = createSnapshot()
const listeners = new Set<() => void>()
const publishSnapshot = () => {
	snapshot = createSnapshot()
	for (const listener of listeners) listener()
}
subscribeConfiguration(publishSnapshot)
// Observe every actual settings transition, not just the final React render (ABA).
useSettings.subscribe(state => {
	if (state.orgAgendaConfigurationJson === snapshot.raw && state.orgBehaviorConfigurationJson === snapshot.behaviorRaw) return
	publishSnapshot()
})
export const getOrgAgendaConfiguration = () => snapshot
export const subscribeOrgAgendaConfiguration = (listener: () => void) => {
	listeners.add(listener)
	return () => { listeners.delete(listener) }
}
export function useOrgAgendaConfiguration() {
	const current = useSyncExternalStore(subscribeOrgAgendaConfiguration, getOrgAgendaConfiguration, getOrgAgendaConfiguration)
	return current
}
