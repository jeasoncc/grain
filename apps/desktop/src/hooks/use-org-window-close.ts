import { isTauri } from "@tauri-apps/api/core"
import { useEffect, useRef, useState } from "react"
import {
	type OrgWindowCloseState,
	registerOrgWindowClose,
} from "@/io/event/org-window-close.adapter"

export const ORG_WINDOW_CLOSE_DISCARD_MESSAGE =
	"Discard all unsaved Org changes, including changes in inactive documents, and close this window?"
export const ORG_WINDOW_CLOSE_BUSY_MESSAGE =
	"An Org file operation is in progress. Wait for it to finish before closing the window."

/** Returns readiness for editing; browser/router unload protection remains separate. */
export const useOrgWindowClose = (
	state: OrgWindowCloseState,
	onMessage: (message: string) => void,
): boolean => {
	const [ready, setReady] = useState(() => !isTauri())
	const latest = useRef({ onMessage, state })
	latest.current = { onMessage, state }
	useEffect(() => {
		let active = true
		setReady(!isTauri())
		const stop = registerOrgWindowClose({
			confirmDiscard: () => window.confirm(ORG_WINDOW_CLOSE_DISCARD_MESSAGE),
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
	}, [])
	return ready
}
