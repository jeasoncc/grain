import { useEffect, useRef, useState } from "react"
import type { OrgAgendaEntry } from "@/pipes/org"
import type { OrgAgendaCommand, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { validOrgDate } from "@/pipes/org/org-text.pipe"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"

export type AgendaCommand = OrgAgendaCommand
export type AgendaParameterController = Pick<
	OrgWorkspaceController,
	"executeAgendaCommand" | "prepareAgendaPlanning"
>
const localToday = (now: Date) =>
	`${now.getFullYear().toString().padStart(4, "0")}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`
const systemNow = () => new Date()
const outcomeStatus = (
	label: string,
	outcome: { readonly kind: string; readonly message?: string },
): string => {
	if (outcome.kind === "confirmed")
		return `${label} changed in working copy. Save to write the file.`
	if (outcome.kind === "unchanged") return `${label} unchanged.`
	if (outcome.kind === "stale") return "Agenda row changed; select a refreshed row and try again."
	return outcome.message ?? `${label} change rejected.`
}

/** Owns an immutable row snapshot, not a buffer or another source authority. */
export function useOrgAgendaParameters({
	controller,
	scope,
	sourceVersion = "",
	reload,
	now = systemNow,
	restoreFocus,
}: {
	readonly controller: AgendaParameterController
	readonly scope: string
	readonly sourceVersion?: string
	readonly reload: () => void
	readonly now?: () => Date
	readonly restoreFocus: () => void
}) {
	const [session, setSession] = useState<OrgMinibufferSession | null>(null)
	const [pending, setPending] = useState(false)
	const [status, setStatus] = useState<string | null>(null)
	const active = useRef<{
		readonly abort: AbortController
		readonly scope: string
		accepting: boolean
		committing: boolean
	} | null>(null)
	const scopeRef = useRef(scope)
	scopeRef.current = scope
	const sourceVersionRef = useRef(sourceVersion)
	sourceVersionRef.current = sourceVersion
	const mounted = useRef(false)
	const generation = useRef(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: scope is the lifetime boundary, even when no request exists.
	useEffect(() => {
		mounted.current = true
		setSession(null)
		setPending(false)
		setStatus(null)
		return () => {
			mounted.current = false
			active.current?.abort.abort()
			active.current = null
			generation.current += 1
		}
	}, [scope])
	const cancel = () => {
		// Reads remain abortable; publication and result delivery do not.
		if (active.current?.committing) return
		active.current?.abort.abort()
		active.current = null
		generation.current += 1
		setSession(null)
		setPending(false)
		setStatus("Agenda action cancelled.")
		restoreFocus()
	}
	const start = (entry: OrgAgendaEntry, kind: "cycle-todo" | "schedule" | "deadline") => {
		if (active.current || !mounted.current) return
		const originSourceVersion = sourceVersion
		const target = structuredClone(entry)
		const request = { abort: new AbortController(), scope, accepting: false, committing: false }
		active.current = request
		const id = ++generation.current
		const current = () =>
			mounted.current &&
			scopeRef.current === request.scope &&
			active.current === request &&
			generation.current === id &&
			!request.abort.signal.aborted
		const label =
			kind === "cycle-todo" ? "TODO state" : kind === "schedule" ? "Schedule" : "Deadline"
		const finish = (message: string, refresh = false) => {
			if (!current()) return
			active.current = null
			setSession(null)
			setPending(false)
			setStatus(message)
			if (refresh) reload()
			restoreFocus()
		}
		const execute = async (command: AgendaCommand) => {
			if (sourceVersionRef.current !== originSourceVersion) {
				finish("Agenda source changed; select a refreshed row and try again.", true)
				return { ok: true as const }
			}
			if (!current() || request.accepting)
				return { ok: false as const, message: "Agenda action is no longer current." }
			request.accepting = true
			try {
				const outcome = await controller.executeAgendaCommand(
					target,
					command,
					request.abort.signal,
					{
						onCommitStarted: () => {
							request.committing = true
						},
					},
				)
				if (!current()) return { ok: true as const }
				finish(outcomeStatus(label, outcome), true)
				return { ok: true as const }
			} catch {
				finish(`${label} change failed; no automatic retry.`, true)
				return { ok: true as const }
			}
		}
		setPending(true)
		setStatus(kind === "cycle-todo" ? "Changing TODO state…" : `Preparing ${label.toLowerCase()}…`)
		if (kind === "cycle-todo") {
			void execute({ kind })
			return
		}
		void (async () => {
			try {
				const prepared = await controller.prepareAgendaPlanning(target, kind, request.abort.signal)
				if (!current()) return
				if (sourceVersionRef.current !== originSourceVersion) {
					finish("Agenda source changed; select a refreshed row and try again.", true)
					return
				}
				if (prepared.kind !== "ready") {
					finish(outcomeStatus(label, prepared), true)
					return
				}
				// Preparation validates without allocating or replacing this snapshot.
				const today = localToday(now())
				setStatus(`${label} date for ${target.heading ?? "(No heading)"}`)
				setSession({
					id,
					prompt: `${label} (YYYY-MM-DD):`,
					historyKey: `agenda-${kind}`,
					completion: "value",
					// Read dynamically even from an event closure preceding React's next render.
					get cancelWhileAccepting() {
						return !request.committing
					},
					candidates: [...new Set([prepared.date ?? today, today])],
					initialInput: prepared.date ?? today,
					onCancel: () => {
						if (current()) cancel()
					},
					onAccept: (input) => {
						if (!current() || request.accepting)
							return { ok: false, message: "Agenda action is no longer current." }
						if (sourceVersionRef.current !== originSourceVersion) {
							finish("Agenda source changed; select a refreshed row and try again.", true)
							return { ok: true }
						}
						const date = input.trim()
						if (!validOrgDate(date))
							return {
								ok: false,
								message:
									"Enter a real calendar date in YYYY-MM-DD format (for example, 2026-09-30).",
							}
						return execute({ kind, date })
					},
				})
			} catch {
				finish(`Cannot prepare ${label.toLowerCase()}; no automatic retry.`)
			}
		})()
	}
	return { session, pending, status, start, cancel, isPending: () => active.current !== null }
}
