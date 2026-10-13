import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

export interface OrgWindowCloseState {
	readonly hasDirtyBuffers: boolean
	readonly isBusy: boolean
	readonly hasOtherWindows: boolean
}

export interface OrgWindowCloseOptions {
	/** Called only after active native registration succeeds, or immediately in a browser. */
	readonly onReady: () => void
	readonly getState: () => OrgWindowCloseState
	readonly captureDiscard: () => () => boolean
	/** Close/hide only this view while another native window retains the canonical owner. */
	readonly closeViewOnly: (signal: AbortSignal) => Promise<boolean>
	readonly confirmDiscard: (signal: AbortSignal) => Promise<boolean>
	readonly onBlocked: () => void
	readonly onError: (error: unknown) => void
}

let retireCurrent: (() => void) | undefined

/** Owns the native listener, including registrations that resolve after retirement. */
export const registerOrgWindowClose = (options: OrgWindowCloseOptions): (() => void) => {
	retireCurrent?.()
	let active = true
	let pending: AbortController | undefined
	let unlisten: (() => void) | undefined
	const stop = () => {
		active = false
		const confirmation = pending
		pending = undefined
		confirmation?.abort()
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
		const attemptClose = async () => {
			const confirmation = new AbortController()
			pending = confirmation
			const current = () => active && pending === confirmation && !confirmation.signal.aborted
			try {
				const initial = { ...options.getState() }
				if (initial.hasOtherWindows) {
					if (await options.closeViewOnly(confirmation.signal)) return
					if (!current()) return
					options.onBlocked()
					return
				}
				if (initial.isBusy) {
					options.onBlocked()
					return
				}
				if (initial.hasDirtyBuffers) {
					const mayDiscard = options.captureDiscard()
					if (!current()) return
					const confirmed = await options.confirmDiscard(confirmation.signal)
					if (!current() || confirmed !== true) return
					const latest = options.getState()
					if (latest.isBusy || latest.hasOtherWindows) {
						options.onBlocked()
						return
					}
					if (latest.hasDirtyBuffers !== initial.hasDirtyBuffers || !mayDiscard()) return
				}
				if (!current()) return
				// Bypass another close-request event only after exit/discard authority is settled.
				await nativeWindow.destroy()
			} catch (error) {
				reportError(error)
			} finally {
				if (pending === confirmation) pending = undefined
			}
		}
		void nativeWindow
			.onCloseRequested((event) => {
				if (!active) {
					return
				}
				const { hasDirtyBuffers, isBusy, hasOtherWindows } = options.getState()
				if (!isBusy && !hasDirtyBuffers && !hasOtherWindows && !pending) return
				// Tauri inspects this synchronously; view-only handling happens afterward.
				event.preventDefault()
				if (!pending) void attemptClose()
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
