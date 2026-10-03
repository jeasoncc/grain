import { useEffect, useId, useRef, useState } from "react"
import type { OrgTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"

/** Plain-text scratch buffer; native textarea undo never enters Org history. */
export function OrgTodoNote({
	request,
	onClose,
	isProtected = true,
}: {
	readonly request: OrgTodoNoteRequest
	readonly onClose: (host?: HTMLElement) => void
	readonly isProtected?: boolean
}) {
	const id = useId()
	const root = useRef<HTMLDivElement>(null)
	const prefix = useRef(false)
	const composing = useRef(false)
	const locked = useRef(false)
	const [busy, setBusy] = useState(false)
	const [note, setNote] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [stale, setStale] = useState<string | null>(null)
	const validation = busy ? undefined : request.validate?.()
	const staleReason = validation?.kind === "rejected" ? validation.reason : stale
	useEffect(() => {
		const timer = setInterval(() => {
			if (!root.current?.isConnected || locked.current) return
			const result = request.validate?.()
			setStale(result?.kind === "rejected" ? result.reason : null)
		}, 250)
		return () => clearInterval(timer)
	}, [request])
	const finish = () => {
		if (locked.current || !isProtected) return
		prefix.current = false
		locked.current = true
		setBusy(true)
		setError(null)
		// Keep synchronous editor commits synchronous; asynchronous commits own the
		// scratch until their actual outcome, even if abort was requested meanwhile.
		const settle = (result: OrgTodoNoteResult) => {
			locked.current = false
			if (!root.current?.isConnected) return
			setBusy(false)
			if (result.kind === "applied" || result.kind === "aborted") onClose(root.current ?? undefined)
			else if (result.kind === "rejected") setError(result.reason)
		}
		try {
			const result = request.execute(note)
			if ("then" in result) {
				void result.then(settle, () =>
					settle({ kind: "rejected", reason: "TODO state change failed; no automatic retry" }),
				)
			} else settle(result)
		} catch {
			settle({ kind: "rejected", reason: "TODO state change failed; no automatic retry" })
		}
	}
	const abort = () => {
		prefix.current = false
		// The request guards the commit boundary. Never hide a pending outcome.
		try {
			request.abort()
		} catch {
			// A source callback failure must not trap the scratch after cancellation.
		} finally {
			if (!locked.current) onClose(root.current ?? undefined)
		}
	}
	return (
		<div ref={root} role="group" aria-label="TODO note" aria-busy={busy} className="shrink-0 p-3">
			<label htmlFor={id}>
				TODO note (Ctrl-C Ctrl-C or Mod-S to finish; Ctrl-C Ctrl-K or Ctrl-G to abort)
			</label>
			<textarea
				id={id}
				aria-label="TODO note"
				// biome-ignore lint/a11y/noAutofocus: explicit keyboard command opens this scratch input.
				autoFocus
				className="block w-full"
				rows={5}
				value={note}
				readOnly={busy || !!staleReason || !isProtected}
				onChange={(event) => {
					if (!locked.current && !staleReason && isProtected) setNote(event.currentTarget.value)
				}}
				onKeyDown={(event) => {
					event.stopPropagation()
					const consumed = event.defaultPrevented
					const command = event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey
					const key = event.key.toLowerCase()
					const save =
						key === "s" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
					// Selection copy wins over prefixes, locks, repeat and IME guards.
					if (
						command &&
						key === "c" &&
						event.currentTarget.selectionStart !== event.currentTarget.selectionEnd
					) {
						prefix.current = false
						return
					}
					if (!save && (!command || !["c", "g", "k"].includes(key))) {
						prefix.current = false
						return
					}
					const prefixed = prefix.current
					prefix.current = false
					if (key === "k" && !prefixed) return
					event.preventDefault()
					if (
						consumed ||
						event.repeat ||
						composing.current ||
						event.nativeEvent.isComposing ||
						event.keyCode === 229
					)
						return
					if (key === "g" || key === "k") abort()
					else if (save || prefixed) finish()
					else prefix.current = true
				}}
				onKeyUp={(event) => event.stopPropagation()}
				onBlur={() => {
					prefix.current = false
				}}
				onCompositionStart={() => {
					prefix.current = false
					composing.current = true
				}}
				onCompositionEnd={() => {
					composing.current = false
				}}
			/>
			{(error || staleReason) && (
				<output>
					Cannot finish TODO note: {error || staleReason}. Copy your note before aborting.
				</output>
			)}
			<button type="button" disabled={busy || !isProtected} onClick={finish}>
				Finish note
			</button>
			<button type="button" onClick={abort}>
				Abort note
			</button>
		</div>
	)
}
