import { isTauri } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"
import {
	type OrgWindowCloseState,
	registerOrgWindowClose,
} from "@/io/event/org-window-close.adapter"
import { useConfirm } from "@/views/ui/confirm"

export const ORG_WINDOW_CLOSE_DISCARD_MESSAGE =
	"Discard all unsaved Org changes, including changes in inactive documents, and close this window?"
export const ORG_WINDOW_CLOSE_BUSY_MESSAGE =
	"An Org file operation is in progress. Wait for it to finish before closing the window."

/** Returns readiness for editing; browser/router unload protection remains separate. */
export const useOrgWindowClose = (
	state: OrgWindowCloseState,
	onMessage: (message: string) => void,
	captureDiscard: () => () => boolean,
	closeViewOnly: (signal: AbortSignal) => Promise<boolean>,
): boolean => {
	const confirm = useConfirm()
	const [ready, setReady] = useState(() => !isTauri())
	const latest = useRef({ captureDiscard, closeViewOnly, onMessage, state })
	latest.current = { captureDiscard, closeViewOnly, onMessage, state }
	useEffect(() => {
		let active = true
		setReady(!isTauri())
		const stop = registerOrgWindowClose({
			captureDiscard: () => latest.current.captureDiscard(),
			closeViewOnly: (signal) => latest.current.closeViewOnly(signal),
			confirmDiscard: (signal) =>
				confirm({
					cancelText: "Keep editing",
					confirmText: "Discard and close",
					description: ORG_WINDOW_CLOSE_DISCARD_MESSAGE,
					signal,
					title: "Discard unsaved Org changes?",
				}),
			getState: () => latest.current.state,
			onBlocked: () => latest.current.onMessage(ORG_WINDOW_CLOSE_BUSY_MESSAGE),
			onError: (error) =>
				latest.current.onMessage(
					`Could not protect or close the window: ${error instanceof Error ? error.message : String(error)}`,
				),
			onReady: () => {
				if (active) {
					setReady(true)
				}
			},
		})
		return () => {
			active = false
			stop()
		}
	}, [confirm])
	return ready
}
