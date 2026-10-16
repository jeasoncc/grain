import * as E from "fp-ts/Either"
import { useSyncExternalStore } from "react"
import { parseOrgKeymapConfiguration } from "@/pipes/org/org-keymap-configuration.pipe"
import { useSettings } from "./use-settings"
import type { OrgKeymapConfiguration } from "@/types/editor/org-keymap.interface"
import { subscribeOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"
import { getConfigurationError, subscribeConfiguration } from "@/state/configuration.state"

export interface OrgInputConfigurationSnapshot {
	readonly raw: string
	readonly generation: object
	readonly configuration: OrgKeymapConfiguration | null
	readonly error: string | null
}

const createSnapshot = (raw: string, metadataPrevious?: OrgInputConfigurationSnapshot): OrgInputConfigurationSnapshot => {
	const parsed = parseOrgKeymapConfiguration(raw)
	const configurationError = getConfigurationError()
	const configuration = !configurationError && E.isRight(parsed) ? parsed.right : null
	const error = configurationError ?? (E.isLeft(parsed) ? parsed.left.message : null)
	// Discovery labels do not retire input authority; every file reload and raw ABA does.
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
subscribeConfiguration(publishSnapshot)
// Observe each transition, including an A -> B -> A change batched into one React render.
useSettings.subscribe((state) => {
	if (state.orgKeymapConfigurationJson !== snapshot.raw) publishSnapshot()
})
export const getOrgInputConfiguration = (): OrgInputConfigurationSnapshot => snapshot
const subscribeInputConfiguration = (listener: () => void) => {
	inputListeners.add(listener)
	return () => { inputListeners.delete(listener) }
}

/** Same authority in embedded and detached Source; each transition gets a fresh incarnation. */
export const useOrgInputConfiguration = (): OrgInputConfigurationSnapshot => {
	const current = useSyncExternalStore(subscribeInputConfiguration, getOrgInputConfiguration, getOrgInputConfiguration)
	return current
}
