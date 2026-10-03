import { useLayoutEffect, useRef, useState } from "react"
import type {
	OrgAgendaTodoNoteRequest,
	OrgTodoNoteRequest,
	OrgTodoNoteResult,
} from "@/flows/org-command/org-todo-note"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"

type Request = OrgTodoNoteRequest | OrgAgendaTodoNoteRequest
let nextOwner = 0
const abortSafely = (source: Request) => {
	try {
		source.abort()
	} catch {
		/* Cancellation must not strand shell ownership. */
	}
}

/** The shell owns the scratch buffer, even after its originating view is gone. */
export function useOrgTodoNoteWorkflow(controller: OrgWorkspaceController) {
	const live = useRef(controller)
	live.current = controller
	const owner = useRef<{
		readonly id: string
		readonly source: Request
		readonly request: OrgTodoNoteRequest
		readonly close: (host?: HTMLElement) => void
		protection: OrgWorkspaceController | null
	} | null>(null)
	const [note, setNote] = useState<typeof owner.current>(null)
	const [, publishProtection] = useState(0)
	const sameScope = (a: OrgWorkspaceController, b: OrgWorkspaceController) =>
		a.workspaceSessionId === b.workspaceSessionId &&
		a.workspace?.capabilityToken === b.workspace?.capabilityToken &&
		a.workspace?.rootPath === b.workspace?.rootPath
	// Layout registration precedes native-close readiness (passive effects) and
	// paint. A retained G1 draft is read-only until G2 acknowledges its own lease.
	useLayoutEffect(() => {
		const owned = owner.current
		if (!owned || (owned.protection && sameScope(owned.protection, controller))) return
		if (controller.setTransientDirty(owned.id, true) === true) {
			owned.protection = controller
			publishProtection((version) => version + 1)
		}
	})
	const admit = (source: Request): boolean => {
		if (owner.current) {
			if (owner.current.source !== source) abortSafely(source)
			return false
		}
		const origin = live.current
		const id = `todo-note:${++nextOwner}`
		const setDirty = origin.setTransientDirty
		const inScope = () => sameScope(live.current, origin)
		const focused = typeof document !== "undefined" ? document.activeElement : null
		const focusOrigin =
			focused instanceof HTMLElement &&
			focused.isConnected &&
			focused.closest(".cm-editor, [data-agenda-key]")
				? focused
				: null
		let pending = false
		let terminal = false
		let abortRequested = false
		const validate = (): OrgTodoNoteResult =>
			!inScope() || terminal || pending
				? { kind: "rejected", reason: "stale-note-request" }
				: (source.validate?.() ?? { kind: "ready" })
		const close = (host?: HTMLElement) => {
			const owned = owner.current
			if (!terminal || owned?.request !== request) return
			const restore =
				inScope() &&
				focusOrigin?.isConnected &&
				host?.isConnected &&
				host.contains(document.activeElement)
			// The old callback never releases a new grant. G2 has an explicit,
			// separate registration solely protecting the retained shell draft.
			if (inScope()) setDirty(id, false)
			else if (owned.protection && sameScope(owned.protection, live.current))
				owned.protection.setTransientDirty(id, false)
			owner.current = null
			setNote(null)
			if (restore) focusOrigin?.focus()
		}
		const request: OrgTodoNoteRequest = {
			validate,
			abort: () => {
				if (terminal || abortRequested) return
				abortRequested = true
				abortSafely(source)
				// Keep ownership through settlement if commit may have begun.
				if (!pending) terminal = true
			},
			execute: async (text: string): Promise<OrgTodoNoteResult> => {
				const valid = validate()
				if (valid.kind !== "ready") return valid
				pending = true
				try {
					const result = await source.execute(text)
					if (result.kind === "applied" || result.kind === "aborted") terminal = true
					if (result.kind === "rejected" && abortRequested) {
						terminal = true
						return { kind: "aborted" }
					}
					return result
				} catch {
					if (abortRequested) {
						terminal = true
						return { kind: "aborted" }
					}
					return { kind: "rejected", reason: "TODO state change failed; no automatic retry." }
				} finally {
					pending = false
				}
			},
		}
		// No editable draft or ownership publication without acknowledged protection.
		if (setDirty(id, true) !== true) {
			abortSafely(source)
			return false
		}
		owner.current = { id, source, request, close, protection: origin }
		setNote(owner.current)
		return true
	}
	return {
		note,
		admit,
		isActive: note !== null,
		isOwned: () => owner.current !== null,
		isProtected: !!owner.current?.protection && sameScope(owner.current.protection, controller),
	}
}
