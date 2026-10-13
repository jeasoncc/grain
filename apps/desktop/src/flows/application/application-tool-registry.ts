import { EMPTY_APPLICATION_POPUP_CONFIGURATION, resolveApplicationPopupRule, type ApplicationPopupConfiguration, type ApplicationPopupSize } from "./application-popup-configuration"

export type ApplicationToolLayout = "main" | "side" | "bottom" | "popup"
export interface ApplicationToolState {
	readonly dirty: boolean
	readonly pending: boolean
	readonly readOnly?: boolean
	/** Draft/grant/window revision: discard approval is valid for this exact value only. */
	readonly fence: string | number
}
export interface ApplicationToolOrigin {
	readonly isLive: () => boolean
	readonly restore: () => void | Promise<void>
}
export interface ApplicationToolDescriptor {
	readonly id: string
	readonly label: string
	readonly layout: ApplicationToolLayout
	readonly state: ApplicationToolState
	/** Producer-owned tools project their real lifetime; shell tools omit this. */
	readonly active?: boolean
	readonly captureOrigin?: () => ApplicationToolOrigin | null
	/** Exact registered parameter ownership may temporarily place focus in the root minibuffer. */
	readonly ownsFocus?: () => boolean
	readonly onOpen?: () => boolean | void
	readonly requestClose: (signal: AbortSignal) => boolean | Promise<boolean>
	/** Abort owned candidate reads and drain accepted effects; never writes on dismissal. */
	readonly dispose?: () => void | Promise<void>
}
export interface ApplicationToolLease {
	readonly id: string
	readonly owner: object
	readonly identity: number
}
export interface ApplicationToolWindow {
	readonly lease: ApplicationToolLease
	readonly label: string
	readonly layout: ApplicationToolLayout
	readonly producerLayout: ApplicationToolLayout
	readonly configured: boolean
	readonly size?: ApplicationPopupSize
	readonly state: ApplicationToolState
	readonly open: boolean
	readonly closing: boolean
	readonly windowId: number | null
}
export interface ApplicationToolRegistry {
	readonly getSnapshot: () => readonly ApplicationToolWindow[]
	readonly subscribe: (listener: () => void) => () => void
	readonly setConfiguration: (configuration: ApplicationPopupConfiguration) => void
	readonly createLease: (owner: object, id: string) => ApplicationToolLease
	readonly register: (lease: ApplicationToolLease, descriptor: ApplicationToolDescriptor) => boolean
	readonly update: (lease: ApplicationToolLease, descriptor: ApplicationToolDescriptor) => boolean
	readonly open: (lease: ApplicationToolLease) => boolean
	readonly focus: (lease: ApplicationToolLease, windowId?: number | null) => boolean
	readonly bindHost: (lease: ApplicationToolLease, host: HTMLElement | null, windowId?: number | null) => void
	readonly recordFocus: (lease: ApplicationToolLease, element: HTMLElement) => void
	readonly restoreOrigin: (lease: ApplicationToolLease, windowId?: number | null) => Promise<void>
	readonly close: (lease: ApplicationToolLease, windowId?: number | null) => Promise<boolean>
	readonly complete: (lease: ApplicationToolLease, windowId?: number | null) => boolean
	readonly retire: (lease: ApplicationToolLease) => Promise<void>
}
interface Entry {
	readonly lease: ApplicationToolLease
	descriptor: ApplicationToolDescriptor
	open: boolean
	windowId: number | null
	origin: ApplicationToolOrigin | null
	host: HTMLElement | null
	hostFocus: ((event: FocusEvent) => void) | null
	lastFocus: HTMLElement | null
	openingFocus: Element | null
	close: AbortController | null
	operation: Promise<boolean> | null
	retired: boolean
	acceptedClose: boolean
	disposal: Promise<void> | null
}
let identity = 0
let windowIdentity = 0
export function createApplicationToolRegistry(
	confirmDiscard: (tool: ApplicationToolWindow, signal: AbortSignal) => Promise<boolean>,
	placeHost?: (lease: ApplicationToolLease, host: HTMLElement | null, tool: ApplicationToolWindow | null) => void,
): ApplicationToolRegistry {
	const entries = new Map<ApplicationToolLease, Entry>()
	const listeners = new Set<() => void>()
	let snapshot: readonly ApplicationToolWindow[] = Object.freeze([])
	let notifying = false
	let republish = false
	let configuration = EMPTY_APPLICATION_POPUP_CONFIGURATION
	const placement = (entry: Entry) => {
		const rule = resolveApplicationPopupRule(configuration, entry.lease.id)
		return { layout: rule?.layout ?? entry.descriptor.layout, configured: !!rule, size: rule?.size }
	}
	const placementFence = (entry: Entry) => JSON.stringify(placement(entry))
	const current = (entry: Entry) => entries.get(entry.lease) === entry && !entry.retired
	const publish = () => {
		if (notifying) { republish = true; return }
		snapshot = Object.freeze([...entries.values()].filter((entry) => !entry.retired).map((entry) => Object.freeze({
			lease: entry.lease, label: entry.descriptor.label, producerLayout: entry.descriptor.layout, ...placement(entry),
			state: Object.freeze({ ...entry.descriptor.state }), open: entry.open,
			closing: entry.close !== null, windowId: entry.windowId,
		})))
		for (const entry of entries.values()) if (entry.host) placeHost?.(entry.lease, entry.retired ? null : entry.host, snapshot.find((tool) => tool.lease === entry.lease) ?? null)
		notifying = true
		try { for (const listener of [...listeners]) { try { listener() } catch { /* Publication cannot be rolled back. */ } } }
		finally {
			notifying = false
			if (republish) { republish = false; publish() }
		}
	}
	const disposeEntry = (entry: Entry) => {
		if (entry.disposal) return entry.disposal
		const dispose = entry.descriptor.dispose
		entry.disposal = Promise.resolve().then(async () => { await dispose?.() })
		return entry.disposal
	}
	const releaseHost = (entry: Entry) => {
		if (entry.host && entry.hostFocus) entry.host.removeEventListener("focusin", entry.hostFocus)
		placeHost?.(entry.lease, null, null)
		entry.host = null
		entry.hostFocus = null
		entry.lastFocus = null
	}
	const activate = (entry: Entry) => {
		entry.origin = entry.descriptor.captureOrigin?.() ?? null
		entry.open = true
		entry.windowId = ++windowIdentity
		entry.disposal = null
		entry.lastFocus = null
		entry.openingFocus = typeof document === "undefined" ? null : document.activeElement
	}
	const returnOrigin = async (entry: Entry, ownedFocus: boolean) => {
		if (ownedFocus && entries.get(entry.lease) === entry && (!entry.retired || entry.acceptedClose) && entry.origin?.isLive()) await entry.origin.restore()
	}
	const close = (lease: ApplicationToolLease, expectedWindow?: number | null): Promise<boolean> => {
		const entry = entries.get(lease)
		if (!entry || !current(entry) || !entry.open || notifying || (expectedWindow !== undefined && entry.windowId !== expectedWindow)) return Promise.resolve(false)
		if (entry.operation) return entry.operation
		if (entry.descriptor.state.pending) return Promise.resolve(false)
		const abort = new AbortController()
		const descriptor = entry.descriptor
		const fence = descriptor.state.fence
		const windowId = entry.windowId
		const policyFence = placementFence(entry)
		const focused = typeof document === "undefined" ? null : document.activeElement
		const ownedFocus = Boolean(entry.host?.contains(focused) || descriptor.ownsFocus?.())
		entry.close = abort
		publish()
		const valid = () => current(entry) && entry.open && entry.close === abort && !abort.signal.aborted &&
			entry.windowId === windowId && entry.descriptor.state.fence === fence && placementFence(entry) === policyFence && !entry.descriptor.state.pending
		const operation = async () => {
			try {
				if (!valid()) return false
				if (descriptor.state.dirty && !(await confirmDiscard(snapshot.find((tool) => tool.lease === lease)!, abort.signal))) return false
				if (!valid()) return false
				// Capture the exact producer callback. A later update cannot redirect an accepted close.
				entry.acceptedClose = true
				if (!(await descriptor.requestClose(abort.signal)) || entries.get(lease) !== entry || abort.signal.aborted || entry.windowId !== windowId) return false
				await disposeEntry(entry)
				if (entries.get(lease) !== entry || entry.windowId !== windowId) return false
				entry.open = false
				entry.windowId = null
				publish()
				// Let consumers reveal the source layout before its exact focus bookmark runs.
				await Promise.resolve()
				const now = typeof document === "undefined" ? null : document.activeElement
				const stillOwned = now === focused || now === globalThis.document?.body || Boolean(entry.host?.contains(now)) || Boolean(now instanceof Element && now.closest('[data-org-confirm-dialog]'))
				try { await returnOrigin(entry, ownedFocus && stillOwned) }
				finally { entry.origin = null; releaseHost(entry); entry.openingFocus = null }
				return true
			} catch { return false }
			finally {
				entry.acceptedClose = false
				if (entry.close === abort) { entry.close = null; entry.operation = null; if (current(entry)) publish() }
			}
		}
		// Install singleflight before confirmation/abort listeners can reenter.
		const result = Promise.resolve().then(operation)
		entry.operation = result
		return result
	}
	return {
		getSnapshot: () => snapshot,
		subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
		setConfiguration: (next) => {
			const previous = new Map([...entries.values()].map((entry) => [entry, placementFence(entry)]))
			configuration = next
			let changed = false
			for (const entry of entries.values()) {
				if (previous.get(entry) === placementFence(entry)) continue
				changed = true
				if (entry.close && !entry.acceptedClose) entry.close.abort()
			}
			if (changed) publish()
		},
		createLease: (owner: object, id: string): ApplicationToolLease => Object.freeze({ owner, id, identity: ++identity }),
		register: (lease: ApplicationToolLease, descriptor: ApplicationToolDescriptor) => {
			if (notifying || (entries.has(lease) && !entries.get(lease)?.retired) || [...entries.values()].some((entry) => entry.lease.owner === lease.owner && entry.lease.id === lease.id && !entry.retired)) return false
			const entry: Entry = { lease, descriptor, open: false, windowId: null, origin: null, host: null, hostFocus: null, lastFocus: null, openingFocus: null, close: null, operation: null, retired: false, acceptedClose: false, disposal: null }
			entries.set(lease, entry)
			if (descriptor.active) activate(entry)
			publish()
			return true
		},
		update: (lease: ApplicationToolLease, descriptor: ApplicationToolDescriptor) => {
			const entry = entries.get(lease)
			if (!entry || !current(entry) || notifying) return false
			const old = entry.descriptor
			const changed = old.label !== descriptor.label || old.layout !== descriptor.layout || old.active !== descriptor.active ||
				old.state.dirty !== descriptor.state.dirty || old.state.pending !== descriptor.state.pending || old.state.readOnly !== descriptor.state.readOnly || old.state.fence !== descriptor.state.fence
			entry.descriptor = descriptor
			if (entry.close && !entry.acceptedClose && (old.state.fence !== descriptor.state.fence || old.layout !== descriptor.layout)) entry.close.abort()
			if (descriptor.active !== undefined && descriptor.active !== entry.open && !entry.close) {
				if (descriptor.active) activate(entry)
				else { entry.open = false; entry.windowId = null; entry.origin = null }
			}
			if (changed) publish()
			return true
		},
		open: (lease: ApplicationToolLease) => {
			const entry = entries.get(lease)
			if (!entry || !current(entry) || notifying || entry.close) return false
			if (entry.open) {
				const remembered = entry.lastFocus
				;(remembered?.isConnected && entry.host?.contains(remembered) ? remembered : entry.host?.querySelector<HTMLElement>('.cm-content, textarea, input, button, [tabindex="0"]'))?.focus()
				return true
			}
			if (entry.descriptor.onOpen?.() === false) return false
			activate(entry)
			publish()
			return true
		},
		focus: (lease: ApplicationToolLease, expectedWindow?: number | null) => {
			const entry = entries.get(lease)
			if (!entry || !current(entry) || !entry.open || entry.close || !entry.host?.isConnected || (expectedWindow !== undefined && entry.windowId !== expectedWindow)) return false
			const remembered = entry.lastFocus
			;(remembered?.isConnected && entry.host.contains(remembered) ? remembered : entry.host.querySelector<HTMLElement>('.cm-content, textarea, input, button, [tabindex="0"]') ?? entry.host).focus()
			return true
		},
		bindHost: (lease: ApplicationToolLease, host: HTMLElement | null, expectedWindow?: number | null) => {
			const entry = entries.get(lease)
			if (!entry || !current(entry) || (expectedWindow !== undefined && entry.windowId !== expectedWindow)) return
			if (entry.host !== host) {
				releaseHost(entry)
				entry.host = host
				if (host) {
					entry.hostFocus = (event) => {
						if (current(entry) && entry.open && event.target instanceof HTMLElement && entry.host?.contains(event.target)) entry.lastFocus = event.target
					}
					host.addEventListener("focusin", entry.hostFocus)
				}
			}
			placeHost?.(lease, host, snapshot.find((tool) => tool.lease === lease) ?? null)
			if (host && entry.openingFocus) {
				const before = entry.openingFocus
				entry.openingFocus = null
				const focused = document.activeElement
				if (!entry.close && (focused === before || (!before.isConnected && focused === document.body)) && !focused?.closest("[data-org-parameter-session]"))
					(host.querySelector<HTMLElement>('.cm-content, textarea, input, button, [tabindex="0"]') ?? host).focus()
			}
		},
		recordFocus: (lease: ApplicationToolLease, element: HTMLElement) => {
			const entry = entries.get(lease)
			if (entry && current(entry) && entry.open && entry.host?.contains(element)) entry.lastFocus = element
		},
		close,
		restoreOrigin: async (lease: ApplicationToolLease, expectedWindow?: number | null) => {
			const entry = entries.get(lease)
			if (entry && current(entry) && (expectedWindow === undefined || entry.windowId === expectedWindow) && entry.origin?.isLive()) await entry.origin.restore()
		},
		/** Producer completion closes only its tool window, without discard or file close. */
		complete: (lease: ApplicationToolLease, expectedWindow?: number | null) => {
			const entry = entries.get(lease)
			if (!entry || !current(entry) || notifying || (expectedWindow !== undefined && entry.windowId !== expectedWindow)) return false
			if (entry.close) return true
			releaseHost(entry)
			entry.open = false; entry.windowId = null; entry.origin = null; entry.openingFocus = null
			publish()
			return true
		},
		retire: async (lease: ApplicationToolLease) => {
			const entry = entries.get(lease)
			if (!entry || !current(entry)) return
			entry.retired = true
			if (!entry.acceptedClose) entry.close?.abort()
			publish()
			try {
				await entry.operation
				// StrictMode replay reattaches this exact producer before disposal starts.
				if (entries.get(lease) === entry) await disposeEntry(entry)
			} catch {
				/* A failed producer disposal cannot revive its retired callback authority. */
			}
			finally {
				entry.origin = null; releaseHost(entry); entry.openingFocus = null
				if (entries.get(lease) === entry) entries.delete(lease)
			}
		},
	}
}
