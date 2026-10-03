import * as E from "fp-ts/Either"
import { memo, useEffect, useRef, useState } from "react"
import { loadOrgAgendaFlow } from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"
import { OrgMinibuffer } from "./org-minibuffer.view.fn"
import { useOrgAgendaParameters } from "@/hooks/use-org-agenda-parameters"

/** Derived rows are snapshots, never a second working-copy authority. */
export const OrgAgendaContainer = memo(function OrgAgendaContainer({
	controller,
	onShowEditor,
	now,
}: {
	readonly controller: OrgWorkspaceController
	readonly onShowEditor: () => void
	readonly now?: () => Date
}) {
	const [entries, setEntries] = useState<readonly OrgAgendaEntry[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setLoading] = useState(true)
	const [reload, setReload] = useState(0)
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
		return () => {
			disposedRef.current = true
			openGeneration.current += 1
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
	const startAction = (entry: OrgAgendaEntry, kind: "cycle-todo" | "schedule" | "deadline") => {
		if (parameters.isPending()) return
		openGeneration.current += 1
		const element = document.activeElement as HTMLElement | null
		const row = element?.closest<HTMLElement>("[data-agenda-key]")
		focusOrigin.current =
			element && row
				? { key: row.dataset.agendaKey!, action: element.dataset.agendaAction ?? "open", element }
				: null
		parameters.start(entry, kind)
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
				actionPending={parameters.pending}
				actionStatus={parameters.status}
				onSchedule={(entry) => startAction(entry, "schedule")}
				onDeadline={(entry) => startAction(entry, "deadline")}
				onCancelAction={parameters.cancel}
				onCycleTodo={(entry) => startAction(entry, "cycle-todo")}
				onOpenEntry={(entry) => {
					if (parameters.isPending()) return
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
