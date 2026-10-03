import * as E from "fp-ts/Either"
import { memo, useEffect, useRef, useState } from "react"
import { loadOrgAgendaFlow } from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgAgendaTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"
import { OrgMinibuffer } from "./org-minibuffer.view.fn"
import { useOrgAgendaParameters } from "@/hooks/use-org-agenda-parameters"

/** Derived rows are snapshots, never a second working-copy authority. */
export const OrgAgendaContainer = memo(function OrgAgendaContainer({
	controller,
	onShowEditor,
	onTodoNoteRequest,
	now,
}: {
	readonly controller: OrgWorkspaceController
	readonly onShowEditor: () => void
	readonly onTodoNoteRequest?: (request: OrgAgendaTodoNoteRequest) => boolean | void
	readonly now?: () => Date
}) {
	const [entries, setEntries] = useState<readonly OrgAgendaEntry[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setLoading] = useState(true)
	const [reload, setReload] = useState(0)
	const [todoPending, setTodoPending] = useState(false)
	const [todoStatus, setTodoStatus] = useState<string | null>(null)
	const todoOwner = useRef<AbortController | null>(null)
	const todoCommitting = useRef(false)
	const todoAbortDeferred = useRef(false)
	const surfaceRef = useRef<HTMLDivElement>(null)
	const focusOrigin = useRef<{ key: string; action: string; element: HTMLElement } | null>(null)
	const workspace = controller.workspace
	const session = controller.workspaceSessionId
	const scope = JSON.stringify([workspace?.rootPath, workspace?.capabilityToken, session])
	const scopeRef = useRef(scope)
	scopeRef.current = scope
	const openGeneration = useRef(0)
	const disposedRef = useRef(false)
	useEffect(() => {
		disposedRef.current = false
		setTodoPending(false)
		setTodoStatus(null)
		return () => {
			disposedRef.current = true
			openGeneration.current += 1
			todoOwner.current?.abort()
			todoOwner.current = null
		}
	}, [scope])
	// The controller publishes fresh arrays. Depend on exact snapshot values, not array identity.
	const overlays = controller.liveBuffers.map((buffer) => ({
		workspaceRoot: workspace?.rootPath ?? "",
		capabilityToken: workspace?.capabilityToken,
		workspaceSessionId: session ?? undefined,
		relativePath: buffer.document.relativePath,
		content: buffer.content,
		sourceRevision: buffer.bufferId,
		diskRevision: buffer.document.revision,
		runtimeIncarnation: buffer.runtimeIncarnation,
		sourceGeneration: buffer.sourceGeneration,
	}))
	const liveSnapshotKey = JSON.stringify(overlays)
	const sourceVersion = JSON.stringify([liveSnapshotKey, workspace, entries])
	const sourceVersionRef = useRef(sourceVersion)
	sourceVersionRef.current = sourceVersion

	const parameters = useOrgAgendaParameters({
		controller,
		scope,
		sourceVersion: JSON.stringify([liveSnapshotKey, workspace, entries]),
		now,
		reload: () => setReload((value) => value + 1),
		restoreFocus: () => {
			const origin = focusOrigin.current
			const root = surfaceRef.current
			if (!origin || !root) return
			const focused = document.activeElement
			if (
				focused !== document.body &&
				focused !== origin.element &&
				!focused?.closest('[aria-label="Minibuffer"]')
			)
				return
			requestAnimationFrame(() => {
				if (disposedRef.current || scopeRef.current !== scope || !root.isConnected) return
				const current = document.activeElement
				if (
					current !== document.body &&
					current !== origin.element &&
					!current?.closest('[aria-label="Minibuffer"]')
				)
					return
				const row = [...root.querySelectorAll<HTMLElement>("[data-agenda-key]")].find(
					(row) => row.dataset.agendaKey === origin.key,
				)
				const button = row?.querySelector<HTMLElement>(`[data-agenda-action="${origin.action}"]`)
				;(
					button ??
					row?.querySelector<HTMLElement>("[data-agenda-open]") ??
					root.querySelector<HTMLElement>("main")
				)?.focus()
			})
		},
	})
	const startTodo = (entry: OrgAgendaEntry) => {
		const abort = new AbortController()
		todoOwner.current = abort
		todoCommitting.current = false
		todoAbortDeferred.current = false
		const version = sourceVersionRef.current
		const current = () =>
			!disposedRef.current &&
			scopeRef.current === scope &&
			todoOwner.current === abort &&
			!abort.signal.aborted
		const finish = (message: string, refresh = false) => {
			if (!current()) return
			todoOwner.current = null
			setTodoPending(false)
			setTodoStatus(message)
			if (refresh) setReload((value) => value + 1)
		}
		setTodoPending(true)
		setTodoStatus("Changing TODO state…")
		void (async () => {
			try {
				const outcome = await controller.executeAgendaCommand(
					entry,
					{ kind: "cycle-todo" },
					abort.signal,
					{
						onCommitStarted: () => {
							todoCommitting.current = true
						},
					},
				)
				if (!current()) return
				if (todoAbortDeferred.current && outcome.kind !== "confirmed") {
					finish("Agenda action cancelled.")
					abort.abort()
					return
				}
				todoCommitting.current = false
				if (outcome.kind !== "needs-note") {
					finish(
						outcome.kind === "confirmed"
							? "TODO state changed in working copy. Save to write the file."
							: outcome.kind === "unchanged"
								? "TODO state unchanged."
								: (outcome.message ?? "Agenda row changed or action rejected."),
						true,
					)
					return
				}
				let accepting = false
				const validate = (): OrgTodoNoteResult =>
					current() && !accepting && sourceVersionRef.current === version
						? { kind: "ready" }
						: {
								kind: "rejected",
								reason: "Agenda row changed; select a refreshed row and try again.",
							}
				const request: OrgAgendaTodoNoteRequest = {
					validate,
					abort: () => {
						if (todoCommitting.current) {
							todoAbortDeferred.current = true
							return
						}
						finish("Agenda action cancelled.")
						abort.abort()
					},
					execute: async (note) => {
						if (accepting) return { kind: "rejected", reason: "A workspace operation is running." }
						const valid = validate()
						if (valid.kind !== "ready") {
							finish("Agenda row changed; select a refreshed row and try again.", true)
							return valid
						}
						accepting = true
						try {
							const result = await controller.executeAgendaCommand(
								outcome.entry,
								{ kind: "cycle-todo", note },
								abort.signal,
								{
									onCommitStarted: () => {
										todoCommitting.current = true
									},
								},
							)
							if (result.kind === "confirmed") {
								finish("TODO state changed in working copy. Save to write the file.", true)
								return { kind: "applied" }
							}
							const reason =
								"message" in result && result.message
									? result.message
									: "Agenda row changed or action rejected."
							// Invalid notes and temporary locks retain this request's permission.
							// Only a stale anchor is terminal (the shell retains its readonly draft).
							if (result.kind === "stale") finish(reason, true)
							else if (current()) setTodoStatus(reason)
							return { kind: "rejected", reason }
						} catch {
							if (current()) setTodoStatus("TODO state change failed; no automatic retry.")
							return { kind: "rejected", reason: "TODO state change failed." }
						} finally {
							accepting = false
							if (todoOwner.current === abort) {
								todoCommitting.current = false
								if (todoAbortDeferred.current) {
									finish("Agenda action cancelled.")
									abort.abort()
								}
							}
						}
					},
				}
				if (!onTodoNoteRequest)
					finish("This TODO transition requires a note; the state was not changed.")
				else if (onTodoNoteRequest(request) === false) request.abort()
			} catch {
				finish("TODO state change failed; no automatic retry.", true)
			}
		})()
	}
	const startAction = (entry: OrgAgendaEntry, kind: "cycle-todo" | "schedule" | "deadline") => {
		if (parameters.isPending() || todoOwner.current) return
		openGeneration.current += 1
		const element = document.activeElement as HTMLElement | null
		const row = element?.closest<HTMLElement>("[data-agenda-key]")
		focusOrigin.current =
			element && row
				? { key: row.dataset.agendaKey!, action: element.dataset.agendaAction ?? "open", element }
				: null
		setTodoStatus(null)
		if (kind === "cycle-todo") startTodo(entry)
		else parameters.start(entry, kind)
	}

	useEffect(() => {
		let disposed = false
		if (!workspace) {
			setEntries([])
			setError(null)
			setLoading(false)
			return () => {
				disposed = true
			}
		}
		setError(null)
		void loadOrgAgendaFlow(workspace, undefined, undefined, overlays, {
			workspaceSessionId: session ?? undefined,
		})()
			.then((result) => {
				if (disposed) return
				setLoading(false)
				if (E.isLeft(result)) {
					setEntries([])
					setError(result.left.message)
					return
				}
				setEntries(result.right)
			})
			.catch(() => {
				if (disposed) return
				setLoading(false)
				setError("Cannot load agenda.")
			})
		return () => {
			disposed = true
		}
	}, [workspace, session, liveSnapshotKey, reload])

	return (
		<div ref={surfaceRef} className="flex min-h-0 flex-1 flex-col">
			<OrgAgendaView
				entries={entries}
				focusScope={scope}
				error={error}
				isLoading={isLoading}
				actionPending={parameters.pending || todoPending}
				actionStatus={todoStatus ?? parameters.status}
				onSchedule={(entry) => startAction(entry, "schedule")}
				onDeadline={(entry) => startAction(entry, "deadline")}
				onCancelAction={() => {
					if (todoOwner.current) {
						if (todoCommitting.current) {
							todoAbortDeferred.current = true
							return
						}
						todoOwner.current.abort()
						todoOwner.current = null
						setTodoPending(false)
						setTodoStatus("Agenda action cancelled.")
					} else parameters.cancel()
				}}
				onCycleTodo={(entry) => startAction(entry, "cycle-todo")}
				onOpenEntry={(entry) => {
					if (parameters.isPending() || todoOwner.current) return
					const generation = ++openGeneration.current
					const requestScope = scope
					// Root owns the file effect; this container independently owns navigation.
					void (async () => {
						try {
							const opened = await controller.openDocumentAt(
								entry.relativePath,
								entry.line,
								entry.origin?.diskRevision,
							)
							if (
								!disposedRef.current &&
								scopeRef.current === requestScope &&
								openGeneration.current === generation &&
								opened
							)
								onShowEditor()
						} catch {
							// Unexpected failures must not produce late navigation or error echoes.
						}
					})()
				}}
			/>
			<OrgMinibuffer session={parameters.session} />
		</div>
	)
})
