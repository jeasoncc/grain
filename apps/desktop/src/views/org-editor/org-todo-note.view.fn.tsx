import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import { ApplicationToolSurface, useApplicationToolRegistration, useApplicationTools } from "@/views/application/application-tool-provider"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import { useApplicationResultPublisher } from "@/views/application/application-command-provider"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import { OrgWhichKey } from "@/views/org-workspace/org-which-key.view.fn"

/** Plain-text scratch buffer; native textarea undo never enters Org history. */
export function OrgTodoNote({
	request,
	onClose,
	isProtected = true,
	origin,
	closeFence,
}: {
	readonly request: OrgTodoNoteRequest
	readonly onClose: (host?: HTMLElement) => void
	readonly isProtected?: boolean
	readonly origin?: ApplicationToolOrigin
	readonly closeFence?: string
}) {
	const id = useId()
	const label = request.label ?? "TODO note"
	const root = useRef<HTMLDivElement>(null)
	const closed = useRef(false)
	const closeNote = (host?: HTMLElement) => {
		if (closed.current) return
		closed.current = true
		onClose(host)
	}
	const composing = useRef(false)
	const aborted = useRef(false)
	const abortRequest = () => {
		if (aborted.current) return
		aborted.current = true
		request.abort()
	}
	const locked = useRef(false)
	const resultOwner = useMemo(() => ({}), [request, closeFence])
	const beginResult = useApplicationResultPublisher(resultOwner)
	const liveCloseFence = useRef(closeFence)
	liveCloseFence.current = closeFence
	const retiredScope = useRef(false)
	const settlement = useRef<Promise<void> | null>(null)
	const tools = useApplicationTools()
	const [busy, setBusy] = useState(false)
	const [note, setNote] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [stale, setStale] = useState<string | null>(null)
	const validation = busy ? undefined : request.validate?.()
	const staleReason = validation?.kind === "rejected" ? validation.reason : stale ?? (retiredScope.current ? "The originating scope changed; this logging note remains read-only and copyable." : null)
	const fence = useRef({ note, staleReason, isProtected, closeFence, version: 0 })
	if (fence.current.note !== note || fence.current.staleReason !== staleReason || fence.current.isProtected !== isProtected || fence.current.closeFence !== closeFence)
		fence.current = { note, staleReason, isProtected, closeFence, version: fence.current.version + 1 }
	// Origin windows can disappear during this commit, after render-time validation.
	useLayoutEffect(() => {
		if (locked.current) return
		const result = request.validate?.()
		setStale(result?.kind === "rejected" ? result.reason : null)
	})
	useLayoutEffect(() => {
		const revalidate = () => {
			if (locked.current) return
			const result = request.validate?.()
			setStale(result?.kind === "rejected" ? result.reason : null)
		}
		const unsubscribe = request.subscribeValidation?.(revalidate)
		revalidate()
		return unsubscribe
	}, [request])
	useEffect(() => {
		const timer = setInterval(() => {
			if (!root.current?.isConnected || locked.current) return
			const result = request.validate?.()
			setStale(result?.kind === "rejected" ? result.reason : null)
		}, 250)
		return () => clearInterval(timer)
	}, [request])
	const finish = () => {
		if (locked.current || retiredScope.current || !isProtected || !editable()) return
		const originFence = closeFence
		const report = beginResult()
		input.cancel()
		locked.current = true
		setBusy(true)
		setError(null)
		// Keep synchronous editor commits synchronous; asynchronous commits own the
		// scratch until their actual outcome, even if abort was requested meanwhile.
		const settle = (result: OrgTodoNoteResult) => {
			locked.current = false
			if (!root.current?.isConnected) return
			setBusy(false)
			if (liveCloseFence.current !== originFence) {
				retiredScope.current = true
				setStale("The originating scope changed; this logging note remains read-only and copyable.")
				return
			}
			report?.(result.kind === "applied"
				? { kind: "success", message: request.successMessage ?? "Org change applied." }
				: result.kind === "aborted"
					? { kind: "cancelled", message: `${label} cancelled.` }
					: { kind: "rejected", message: `${label} rejected: ${result.kind === "rejected" ? result.reason : "change was not applied"}` })
			if (result.kind === "applied" || result.kind === "aborted") closeNote(root.current ?? undefined)
			else if (result.kind === "rejected") setError(result.reason)
		}
		try {
			const result = request.execute(note)
			if ("then" in result) {
				settlement.current = result.then(settle, () =>
					settle({ kind: "rejected", reason: "Org change failed; no automatic retry" }),
				).finally(() => { settlement.current = null })
			} else settle(result)
		} catch {
			settle({ kind: "rejected", reason: "Org change failed; no automatic retry" })
		}
	}
	const abort = () => {
		input.cancel()
		// The request guards the commit boundary. Never hide a pending outcome.
		try {
			abortRequest()
		} catch {
			// A source callback failure must not trap the scratch after cancellation.
		} finally {
			if (!locked.current) closeNote(root.current ?? undefined)
		}
	}
	const lease = useApplicationToolRegistration(request, {
		id: "todo-note", label, layout: "bottom", active: true,
		state: { dirty: note.length > 0, pending: busy, readOnly: !!staleReason || !isProtected, fence: fence.current.version },
		captureOrigin: () => origin ?? null,
		requestClose: () => { abort(); return !locked.current },
		dispose: async () => {
			try { abortRequest() } catch { /* The accepted effect still drains. */ }
			if (settlement.current) await Promise.allSettled([settlement.current])
			if (root.current?.isConnected) closeNote(root.current)
		},
	})
	const windowId = tools.tools.find((tool) => tool.lease === lease)?.windowId
	const editable = () => tools.registry.getSnapshot().some((tool) => tool.lease === lease && tool.open && !tool.closing && tool.windowId === windowId)
	const closeTool = () => {
		if (locked.current) {
			// Revoke candidate authority, but keep the scratch mounted until the accepted effect settles.
			try { abortRequest() } catch { /* The accepted outcome still owns the scratch. */ }
			return
		}
		void tools.close(lease)
	}
	const input = useOrgScopedInput({
		scope: "org-todo-note", owner: request,
		execute: (command) => {
			if (command === "org-todo-note.cancel") { closeTool(); return true }
			if (command !== "org-todo-note.finish") return false
			if (!editable() || locked.current || retiredScope.current || !isProtected || staleReason) return false
			finish()
			return true
		},
		onUnavailable: (command) => setError(`Command ${command} is unavailable for this note request.`),
	})
	return (
		<ApplicationToolSurface lease={lease}>
		<div ref={root} role="group" aria-label={label} aria-busy={busy} className="shrink-0 p-3">
			<label htmlFor={id}>
				{label} (finish/abort use the configured logging-note keymap)
			</label>
			<textarea
				id={id}
				aria-label={label}
				// biome-ignore lint/a11y/noAutofocus: explicit keyboard command opens this scratch input.
				autoFocus
				className="block w-full"
				rows={5}
				value={note}
				readOnly={busy || !!staleReason || !isProtected}
				onChange={(event) => {
					if (!locked.current && !retiredScope.current && !staleReason && isProtected && editable()) setNote(event.currentTarget.value)
				}}
				onKeyDown={(event) => {
					event.stopPropagation()
					if (input.handleKeyDown(event.nativeEvent, {
						selectionEmpty: event.currentTarget.selectionStart === event.currentTarget.selectionEnd,
						isComposing: composing.current, isParameterInput: false,
					})) event.preventDefault()
				}}
				onKeyUp={(event) => event.stopPropagation()}
				onBlur={input.cancel}
				onCompositionStart={() => {
					input.cancel()
					composing.current = true
				}}
				onCompositionEnd={() => {
					composing.current = false
				}}
			/>
			{(error || staleReason) && (
				<output>
					Cannot finish logging note: {error || staleReason}. Copy your note before aborting.
				</output>
			)}
			<button type="button" disabled={busy || !isProtected} onClick={finish}>
				Finish note
			</button>
			<button type="button" onClick={closeTool}>
				Abort note
			</button>
			<OrgWhichKey prefix={input.prefix} getInputCommandDisabledReason={(command) =>
				command === "org-todo-note.cancel" ? null
					: command === "org-todo-note.finish" ? staleReason ?? (busy || !isProtected ? "Note request is unavailable" : null)
						: "Unavailable in this note request"} />
		</div>
		</ApplicationToolSurface>
	)
}
