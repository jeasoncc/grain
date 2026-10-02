import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

export interface OrgWindowCloseState {
	readonly hasDirtyBuffers: boolean
	readonly isBusy: boolean
}

export interface OrgWindowCloseOptions {
	/** Called only after active native registration succeeds, or immediately in a browser. */
	readonly onReady: () => void
	readonly getState: () => OrgWindowCloseState
	/** Must be synchronous: an asynchronous decision must never authorize a close. */
	readonly confirmDiscard: () => boolean
	readonly onBlocked: () => void
	readonly onError: (error: unknown) => void
}

let retireCurrent: (() => void) | undefined

/** Owns the native listener, including registrations that resolve after retirement. */
export const registerOrgWindowClose = (options: OrgWindowCloseOptions): (() => void) => {
	retireCurrent?.()
	let active = true
	let decidingOrDestroying = false
	let unlisten: (() => void) | undefined
	const stop = () => {
		active = false
		unlisten?.()
		unlisten = undefined
		if (retireCurrent === stop) {
			retireCurrent = undefined
		}
	}
	retireCurrent = stop
	const reportError = (error: unknown) => {
		if (active) {
			options.onError(error)
		}
	}
	try {
		if (!isTauri()) {
			options.onReady()
			return stop
		}
		const nativeWindow = getCurrentWindow()
		const attemptDiscard = (state: OrgWindowCloseState) => {
			decidingOrDestroying = true
			try {
				const confirmed = options.confirmDiscard()
				if (!active) {
					return
				}
				const latest = options.getState()
				if (latest.isBusy) {
					options.onBlocked()
					decidingOrDestroying = false
					return
				}
				if (confirmed !== true || latest.hasDirtyBuffers !== state.hasDirtyBuffers) {
					decidingOrDestroying = false
					return
				}
				// destroy bypasses another close-request event (and a second discard prompt).
				void nativeWindow
					.destroy()
					.catch(reportError)
					.finally(() => {
						decidingOrDestroying = false
					})
			} catch (error) {
				decidingOrDestroying = false
				reportError(error)
			}
		}
		void nativeWindow
			.onCloseRequested((event) => {
				if (!active) {
					return
				}
				const state = options.getState()
				if (!state.isBusy && !state.hasDirtyBuffers && !decidingOrDestroying) {
					return
				}
				// Tauri inspects this synchronously; do not await before preventing close.
				event.preventDefault()
				if (state.isBusy) {
					options.onBlocked()
					return
				}
				if (!decidingOrDestroying) {
					attemptDiscard(state)
				}
			})
			.then((removeListener) => {
				if (active) {
					unlisten = removeListener
					options.onReady()
				} else {
					removeListener()
				}
			})
			.catch(reportError)
	} catch (error) {
		reportError(error)
	}
	return stop
}
