import * as E from "fp-ts/Either"
import { memo, useEffect, useRef, useState } from "react"
import { loadOrgAgendaFlow } from "@/flows/org-workspace"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"

/** Derived rows are snapshots, never a second working-copy authority. */
export const OrgAgendaContainer = memo(function OrgAgendaContainer({
	controller,
	onShowEditor,
}: {
	readonly controller: OrgWorkspaceController
	readonly onShowEditor: () => void
}) {
	const [entries, setEntries] = useState<readonly OrgAgendaEntry[]>([])
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setLoading] = useState(true)
	const [actionPending, setActionPending] = useState(false)
	const [actionStatus, setActionStatus] = useState<string | null>(null)
	const [reload, setReload] = useState(0)
	const actionRef = useRef<AbortController | null>(null)
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

	useEffect(() => {
		return () => {
			actionRef.current?.abort()
			actionRef.current = null
		}
	}, [workspace?.capabilityToken, workspace?.rootPath, session])

	useEffect(() => {
		setActionPending(false)
		setActionStatus(null)
	}, [workspace?.capabilityToken, workspace?.rootPath, session])

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
		<OrgAgendaView
			entries={entries}
			focusScope={scope}
			error={error}
			isLoading={isLoading}
			actionPending={actionPending}
			actionStatus={actionStatus}
			onCycleTodo={(entry) => {
				if (actionRef.current) return
				const request = new AbortController()
				actionRef.current = request
				setActionPending(true)
				setActionStatus("Changing TODO state…")
				void controller
					.actOnAgendaEntry(entry, request.signal)
					.then((outcome) => {
						if (actionRef.current !== request) return
						setActionStatus(
							outcome.kind === "confirmed"
								? "TODO state changed in working copy. Save to write the file."
								: outcome.kind === "stale"
									? "Agenda row changed; select a refreshed row and try again."
									: (outcome.message ?? "TODO change rejected."),
						)
						setReload((value) => value + 1)
					})
					.catch(() => {
						if (actionRef.current === request)
							setActionStatus("TODO change failed; no automatic retry.")
					})
					.finally(() => {
						if (actionRef.current !== request) return
						actionRef.current = null
						setActionPending(false)
					})
			}}
			onOpenEntry={(entry) => {
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
	)
})
