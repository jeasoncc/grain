import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"

export type ParameterPhase = "prepare" | "collect" | "read" | "commit" | "settle" | "retired"
export type ParameterLease = Readonly<{ id: number }>
export type ParameterSnapshot = Readonly<{
	lease: ParameterLease | null
	phase: ParameterPhase
	session: OrgMinibufferSession | null
}>

/** Lifecycle law only: origin gates never confer domain or filesystem authority. */
export const canCancelParameter = (phase: ParameterPhase) =>
	phase === "prepare" || phase === "collect" || phase === "read"
export const ownsParameter = (snapshot: ParameterSnapshot, lease: ParameterLease) =>
	snapshot.lease === lease && snapshot.phase !== "retired"

// Identity allocation only, not shared command state: DOM session markers must not alias hosts.
let sequence = 0

/** Scoped reservoir. Callers own all domain guards, effects, and DOM focus. */
export function createParameterSession() {
	let snapshot: ParameterSnapshot = Object.freeze({ lease: null, phase: "retired", session: null })
	let attached = true
	let notifying = false
	let aborting = false
	let accepting: ParameterLease | null = null
	let effectOwner: ParameterLease | null = null
	let read: { lease: ParameterLease; abort: AbortController } | null = null
	const listeners = new Set<() => void>()
	const current = (lease: ParameterLease) => attached && ownsParameter(snapshot, lease)
	const publish = (next: ParameterSnapshot) => {
		snapshot = Object.freeze(next)
		notifying = true
		try {
			// Observer failure cannot roll back publication or prevent other subscribers.
			for (const listener of [...listeners]) {
				try {
					listener()
				} catch {
					/* notification is not a transaction */
				}
			}
		} finally {
			notifying = false
		}
	}
	const abortRead = (lease?: ParameterLease) => {
		if (read && (!lease || read.lease === lease)) {
			// Abort dispatch is synchronous: relinquish only the captured read, and fence callbacks.
			const captured = read
			read = null
			aborting = true
			try {
				captured.abort.abort()
			} finally {
				aborting = false
			}
		}
	}
	const retire = (lease: ParameterLease) => {
		if (notifying || aborting || !current(lease)) return false
		abortRead(lease)
		if (!current(lease)) return false
		if (accepting === lease && effectOwner !== lease) accepting = null
		publish({ lease: null, phase: "retired", session: null })
		return true
	}
	const begin = (previous?: ParameterLease): ParameterLease | null => {
		if (notifying || aborting || !attached || effectOwner || (accepting && accepting !== previous))
			return null
		if (previous && !current(previous)) return null
		const prior = snapshot
		abortRead()
		if (!attached || snapshot !== prior || (previous && !current(previous))) return null
		const lease = Object.freeze({ id: ++sequence })
		publish({ lease, phase: "prepare", session: null })
		return lease
	}
	return {
		getSnapshot: () => snapshot,
		isAttached: () => attached,
		subscribe: (listener: () => void) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
		current,
		begin,
		busy: () => Boolean(accepting || effectOwner || read),
		publishSession: (lease: ParameterLease, session: OrgMinibufferSession) => {
			if (notifying || aborting || !current(lease)) return false
			// Preserve dynamic cancellation getter while taking ownership of candidate data.
			const captured = Object.freeze(
				Object.defineProperties(
					{},
					{
						...Object.getOwnPropertyDescriptors(session),
						candidates: { value: Object.freeze([...session.candidates]), enumerable: true },
					},
				),
			) as OrgMinibufferSession
			publish({ lease, phase: "collect", session: captured })
			return true
		},
		accept: <T>(
			lease: ParameterLease,
			originCurrent: () => boolean,
			locked: boolean,
			callback: () => T,
		): T | null => {
			if (notifying || aborting || !current(lease) || accepting || effectOwner) return null
			accepting = lease
			const release = () => {
				if (current(lease) && snapshot.phase === "commit") publish({ ...snapshot, phase: "settle" })
				if (accepting === lease) accepting = null
				if (effectOwner === lease) effectOwner = null
				if (current(lease) && snapshot.phase !== "collect")
					publish({ ...snapshot, phase: "collect" })
			}
			try {
				if (!originCurrent() || !current(lease)) {
					release()
					return null
				}
				if (locked) effectOwner = lease
				const result = callback()
				if (result && typeof (result as unknown as PromiseLike<unknown>).then === "function")
					return Promise.resolve(result).finally(release) as T
				release()
				return result
			} catch (error) {
				release()
				throw error
			}
		},
		beginRead: (lease: ParameterLease) => {
			if (notifying || aborting || !current(lease) || effectOwner) return null
			abortRead()
			if (!current(lease)) return null
			const abort = new AbortController()
			read = { lease, abort }
			publish({ ...snapshot, phase: "read" })
			return abort
		},
		endRead: (lease: ParameterLease, abort: AbortController) => {
			if (read?.lease === lease && read.abort === abort) read = null
		},
		beginCommit: (lease: ParameterLease) => {
			if (notifying || aborting || !current(lease) || (effectOwner && effectOwner !== lease))
				return false
			effectOwner = lease
			publish({ ...snapshot, phase: "commit" })
			return true
		},
		cancel: (lease: ParameterLease) => {
			if (
				notifying ||
				aborting ||
				!current(lease) ||
				effectOwner === lease ||
				!canCancelParameter(snapshot.phase)
			)
				return false
			return retire(lease)
		},
		retire,
		detach: () => {
			if (notifying || aborting) return
			attached = false
			if (!effectOwner) accepting = null
			abortRead()
			publish({ lease: null, phase: "retired", session: null })
		},
		attach: () => {
			if (!notifying && !aborting) attached = true
		},
	}
}
