import * as E from "fp-ts/Either"
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react"
import { loadOrgAgendaFlow } from "@/flows/org-workspace/org-agenda.flow"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { orgQuerySourcesFromController } from "@/hooks/org-query-sources"
import type { OrgAgendaTodoNoteRequest } from "@/flows/org-command/org-todo-note"
import type { OrgAgendaEntry } from "@/pipes/org"
import { OrgAgendaView } from "./org-agenda.view.fn"
import { useApplicationCommandHost, useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import type { ApplicationToolOrigin, ApplicationToolState } from "@/flows/application/application-tool-registry"
import { useOrgAgendaParameters } from "@/hooks/use-org-agenda-parameters"
import type { OrgAgendaCommand } from "@/types/org/org-agenda-command.types"
import { getOrgAgendaConfiguration, subscribeOrgAgendaConfiguration, useOrgAgendaConfiguration } from "@/hooks/use-org-agenda-configuration"
import { captureOrgCalendarContext, systemOrgNow } from "@/utils/org-date-clock"
import { useOrgClockWorkflow } from "@/hooks/use-org-clock-workflow"
import { OrgClockReportView } from "./org-clock-report.view.fn"
import type { ApplicationCommandResult } from "@/views/application/application-command-provider"
import { freezeOrgAgendaEntrySnapshot } from "@/pipes/org/org-agenda-command-plan.pipe"
import { hasOrgAgendaActionOrigin, validateOrgAgendaOrigin } from "@/pipes/org/org-agenda.pipe"

export interface OrgAgendaToolLifecycle {
	readonly state: ApplicationToolState
	readonly close: () => boolean
	readonly ownsFocus: () => boolean
	readonly dispose: () => Promise<void>
}
/** Derived rows are snapshots, never a second working-copy authority. */
export const OrgAgendaContainer = memo(function OrgAgendaContainer({
	controller,
	onShowEditor,
	onTodoNoteRequest,
	now,
	onToolLifecycle,
}: {
	readonly controller: OrgWorkspaceController
	readonly onShowEditor: () => void
	readonly onTodoNoteRequest?: (request: OrgAgendaTodoNoteRequest) => boolean | void
	readonly now?: () => Date
	readonly onToolLifecycle?: (lifecycle: OrgAgendaToolLifecycle) => void
}) {
	const [query, setQuery] = useState<{
		readonly key: string
		readonly scope: string
		readonly entries: readonly OrgAgendaEntry[]
		readonly error: string | null
		readonly isLoading: boolean
	}>({ key: "", scope: "", entries: [], error: null, isLoading: true })
	const [reload, setReload] = useState(0)
	const [navigationError, setNavigationError] = useState<string | null>(null)
	const configuration = useOrgAgendaConfiguration()
	const [selection, setSelection] = useState({ id: "", revision: 0 })
	const selectedViewId = selection.id
	const projectionGeneration = useRef<object>({})
	const views = configuration.configuration?.views ?? []
	const selectedView = views.find(view => view.id === selectedViewId) ?? null
	const surfaceRef = useRef<HTMLDivElement>(null)
	const effects = useRef(new Set<Promise<unknown>>())
	const queryRead = useRef<AbortController | null>(null)
	const parameterOwner = useRef({}).current
	const focusOrigin = useRef<{ key: string; action: string; element: HTMLElement } | null>(null)
	const { workspace, session, scope, overlays, liveSnapshotKey, sourceKey } =
		orgQuerySourcesFromController(controller)
	const applicationHost = useApplicationCommandHost()
	const liveApplicationHost = useRef(applicationHost)
	liveApplicationHost.current = applicationHost
	const projectionScope = JSON.stringify([scope, configuration.generation.revision, selection])
	const queryKey = JSON.stringify([sourceKey, reload, projectionScope])
	const queryKeyRef = useRef(queryKey)
	queryKeyRef.current = queryKey
	const sourceKeyRef = useRef(sourceKey)
	sourceKeyRef.current = sourceKey
	// Preserve focused same-session rows until replacement; never carry rows across grants/sessions.
	const entries = !configuration.error && query.scope === projectionScope ? query.entries : []
	const error = configuration.error ?? (views.length && !selectedView ? "Select an Agenda view to run its explicit file scope and calendar window." : query.key === queryKey ? query.error : null)
	const isLoading = !error && !!workspace && (query.scope !== projectionScope || query.isLoading)
	const scopeRef = useRef(projectionScope)
	scopeRef.current = projectionScope
	const openGeneration = useRef(0)
	const openRead = useRef<AbortController | null>(null)
	const cancelOpen = () => {
		openGeneration.current += 1
		openRead.current?.abort()
		openRead.current = null
	}
	useLayoutEffect(() => subscribeOrgAgendaConfiguration(() => {
		if (getOrgAgendaConfiguration().generation !== configuration.generation) {
			queryRead.current?.abort()
			cancelOpen()
		}
	}), [configuration.generation])
	const disposedRef = useRef(false)
	useEffect(() => {
		disposedRef.current = false
		return () => {
			disposedRef.current = true
			cancelOpen()
		}
	}, [projectionScope])

	const captureRowOrigin = (entry: OrgAgendaEntry): ApplicationToolOrigin | null => {
		// Retained focused rows may remain visible during a refresh, but are not fresh producers.
		if (query.isLoading || query.key !== queryKeyRef.current || getOrgAgendaConfiguration().generation !== configuration.generation) return null
		const root = surfaceRef.current
		if (!root) return null
		const focused = document.activeElement instanceof HTMLElement ? document.activeElement : null
		const row = focused?.closest<HTMLElement>("[data-agenda-key]")
		const rows = [...root.querySelectorAll<HTMLElement>("[data-agenda-key]")]
		const matches = (candidate: HTMLElement) => candidate.dataset.agendaPath === entry.relativePath &&
			candidate.dataset.agendaHeading === String(entry.origin?.heading?.from) &&
			candidate.dataset.agendaKind === entry.kind &&
			candidate.dataset.agendaTimestamp === String(entry.origin?.timestamp?.from ?? "") &&
			candidate.dataset.agendaDate === (entry.date ?? "")
		const exactRow = row && root.contains(row) && matches(row) ? row : rows.find(matches)
		const element = exactRow?.contains(focused) ? focused : exactRow?.querySelector<HTMLElement>("[data-agenda-open]")
		if (!element || !exactRow) return null
		const action = element.dataset.agendaAction ?? "open"
		const key = exactRow.dataset.agendaKey!
		focusOrigin.current = { key: exactRow.dataset.agendaKey!, action, element }
		const capturedScope = projectionScope
		const capturedRoot = root
		const capturedConfiguration = configuration.generation
		const capturedProjection = projectionGeneration.current
		return {
			isLive: () => !disposedRef.current && scopeRef.current === capturedScope &&
				getOrgAgendaConfiguration().generation === capturedConfiguration && projectionGeneration.current === capturedProjection &&
				surfaceRef.current === capturedRoot && capturedRoot.isConnected,
			restore: () => {
				if (disposedRef.current || scopeRef.current !== capturedScope ||
					getOrgAgendaConfiguration().generation !== capturedConfiguration || projectionGeneration.current !== capturedProjection ||
					surfaceRef.current !== capturedRoot || !capturedRoot.isConnected) return
				const row = [...capturedRoot.querySelectorAll<HTMLElement>("[data-agenda-key]")].find((candidate) => candidate.dataset.agendaKey === key)
				const destination = row?.querySelector<HTMLElement>(`[data-agenda-action="${action}"]`) ??
					row?.querySelector<HTMLElement>("[data-agenda-open]") ?? capturedRoot.querySelector<HTMLElement>("main")
				destination?.focus({ preventScroll: true })
			},
		}
	}
	const clockWorkflow = useOrgClockWorkflow({ controller, getTarget: () => null, captureOrigin: () => null })
	const controllerRef = useRef(controller)
	controllerRef.current = controller
	const [clockPending, setClockPending] = useState(false)
	const commandPending = useRef(false)
	const capturedRowCurrent = (origin: ApplicationToolOrigin, retainSourceGeneration: boolean) => {
		const capturedScope = projectionScope
		const capturedConfiguration = configuration.generation
		const capturedProjection = projectionGeneration.current
		const capturedSource = sourceKey
		return () => !disposedRef.current && origin.isLive() && scopeRef.current === capturedScope &&
			(!retainSourceGeneration || sourceKeyRef.current === capturedSource) &&
			getOrgAgendaConfiguration().generation === capturedConfiguration && projectionGeneration.current === capturedProjection
	}
	const saveEntry = async (entry: OrgAgendaEntry, suppliedOrigin?: ApplicationToolOrigin | null): Promise<ApplicationCommandResult> => {
		const origin = suppliedOrigin ?? captureRowOrigin(entry)
		if (!origin || parameters.isPending() || commandPending.current) return { kind: "rejected", message: "The exact Agenda save origin is unavailable." }
		const anchor = entry.origin
		if (!hasOrgAgendaActionOrigin(anchor)) return { kind: "rejected", message: "The Agenda Save target has no captured Source origin." }
		const target = { ...freezeOrgAgendaEntrySnapshot(entry), origin: Object.freeze(structuredClone(anchor)) }
		const current = capturedRowCurrent(origin, true)
		const root = controllerRef.current
		const buffer = root.liveBuffers.find(buffer => buffer.document.relativePath === target.relativePath)
		const save = buffer ? root.captureBufferSave(buffer.bufferId) : null
		if (buffer && !save) return { kind: "rejected", message: "The selected Agenda buffer cannot be saved." }
		commandPending.current = true
		setClockPending(true)
		const effect = (async (): Promise<ApplicationCommandResult> => {
			const inspected = await root.prepareAgendaCommand(target, "todo-state")
			if (!current() || inspected.kind !== "ready") return { kind: "rejected", message: "The selected Agenda row changed before Save." }
			if (!buffer) return { kind: "success", message: "The selected disk Source is already saved; no working-copy write was needed." }
			const latest = controllerRef.current
			const live = latest.liveBuffers.find(live => live.runtime === buffer.runtime && live.bufferId === buffer.bufferId)
			if (!live || buffer.runtime.closed || !validateOrgAgendaOrigin(target, buffer.runtime.source,
				anchor.source === "live" ? buffer.bufferId : live.document.revision,
				{ workspaceSessionId: latest.workspaceSessionId ?? undefined,
					...(anchor.source === "live" ? { runtimeIncarnation: live.runtimeIncarnation, sourceGeneration: buffer.runtime.revision } : {}) }).valid)
				return { kind: "rejected", message: "The selected canonical Agenda Source changed before Save." }
			const saved = await save!()
			return saved ? { kind: "success", message: "Selected Agenda Source saved." }
				: { kind: "rejected", message: "Selected Agenda Source was not acknowledged as saved; its working copy was retained." }
		})()
		effects.current.add(effect)
		try { return await effect } finally {
			effects.current.delete(effect)
			commandPending.current = false
			if (!disposedRef.current) setClockPending(false)
		}
	}
	const parameters = useOrgAgendaParameters({
		controller,
		scope,
		sourceVersion: JSON.stringify([liveSnapshotKey, workspace, entries]),
		getProjectionGeneration: () => projectionGeneration.current,
		now,
		reload: () => setReload((value) => value + 1),
		captureOrigin: captureRowOrigin,
		onTodoNoteRequest,
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
				if (disposedRef.current || scopeRef.current !== projectionScope || !root.isConnected) return
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
	useApplicationParameterRegistration(parameterOwner, parameters.session, parameters.result)
	useLayoutEffect(() => {
		onToolLifecycle?.({
			state: { dirty: false, pending: parameters.isCommitting() || clockPending, fence: projectionScope },
			ownsFocus: () => !!parameters.session && liveApplicationHost.current.session === parameters.session && !!liveApplicationHost.current.hostRef.current?.contains(document.activeElement),
			close: () => {
				if (commandPending.current) return false
				if (!parameters.close()) return false
				queryRead.current?.abort()
				cancelOpen()
				return true
			},
			dispose: async () => {
				queryRead.current?.abort()
				cancelOpen()
				await parameters.dispose()
				await Promise.allSettled([...effects.current])
			},
		})
	}, [onToolLifecycle, projectionScope, parameters.pending, parameters.session, clockPending])
	const startAction = (entry: OrgAgendaEntry, kind: OrgAgendaCommand["kind"], origin?: ApplicationToolOrigin | null) => {
		if (parameters.isPending() || getOrgAgendaConfiguration().generation !== configuration.generation) return
		cancelOpen()
		parameters.start(entry, kind, origin)
	}

	useEffect(() => {
		if (!workspace || configuration.error || !configuration.behavior || views.length > 0 && !selectedView) return
		const abort = new AbortController()
		queryRead.current = abort
		const capturedConfiguration = configuration.generation
		const capturedProjection = projectionGeneration.current
		const calendar = selectedView ? captureOrgCalendarContext(now ?? systemOrgNow) : null
		if (calendar?.kind === "error") {
			setQuery({ key: queryKey, scope: projectionScope, entries: [], error: calendar.message, isLoading: false })
			return () => abort.abort()
		}
		setQuery((current) => ({
			key: current.key,
			scope: projectionScope,
			entries: current.scope === projectionScope ? current.entries : [],
			error: null,
			isLoading: current.scope !== projectionScope || current.isLoading,
		}))
		void loadOrgAgendaFlow(
			workspace,
			undefined,
			undefined,
			overlays,
			{ workspaceSessionId: session ?? undefined },
			abort.signal,
			{ view: selectedView, calendar: calendar?.kind === "context" ? calendar.context : undefined,
				inheritance: configuration.behavior.inheritance, captureClockContext: controller.clock.captureSparseContext },
		)()
			.then((result) => {
				if (abort.signal.aborted || queryKeyRef.current !== queryKey || getOrgAgendaConfiguration().generation !== capturedConfiguration || projectionGeneration.current !== capturedProjection) return
				setQuery(
					E.isLeft(result)
						? { key: queryKey, scope: projectionScope, entries: [], error: result.left.message, isLoading: false }
						: { key: queryKey, scope: projectionScope, entries: result.right, error: null, isLoading: false },
				)
			})
			.catch(() => {
				if (abort.signal.aborted || queryKeyRef.current !== queryKey || getOrgAgendaConfiguration().generation !== capturedConfiguration || projectionGeneration.current !== capturedProjection) return
				setQuery({ key: queryKey, scope: projectionScope, entries: [], error: "Cannot load agenda.", isLoading: false })
			})
		return () => abort.abort()
	}, [queryKey])

	const openEntry = async (entry: OrgAgendaEntry, suppliedOrigin?: ApplicationToolOrigin | null): Promise<void> => {
		if (parameters.isPending() || getOrgAgendaConfiguration().generation !== configuration.generation) return
		const origin = suppliedOrigin ?? captureRowOrigin(entry)
		if (!origin?.isLive()) return
		setNavigationError(null)
		cancelOpen()
		const generation = openGeneration.current
		const abort = new AbortController()
		openRead.current = abort
		// Opening a disk row intentionally installs its live Source overlay.
		const rowCurrent = capturedRowCurrent(origin, false)
		const current = () => rowCurrent() && !abort.signal.aborted && openGeneration.current === generation
		const effect = (async () => {
			try {
				const opened = await controllerRef.current.openDocumentAt(entry.relativePath, entry.line, entry.origin?.diskRevision, current, abort.signal)
				if (current() && opened) onShowEditor()
			} catch {
				if (current()) setNavigationError("Cannot open the selected Agenda Source.")
			} finally {
				if (openRead.current === abort) openRead.current = null
			}
		})()
		effects.current.add(effect)
		try { await effect } finally { effects.current.delete(effect) }
	}

	return (
		<div ref={surfaceRef} className="flex min-h-0 flex-1 flex-col">
			{navigationError ? <p role="alert" className="text-sm text-destructive">{navigationError}</p> : null}
			{views.length > 0 && (
				<label className="flex items-center gap-2 border-b px-4 py-2 text-sm">
					Agenda view
					<select aria-label="Agenda view" className="rounded border bg-background px-2 py-1" value={selectedView?.id ?? ""} disabled={parameters.isCommitting()} onChange={(event) => {
						const id = event.target.value
						projectionGeneration.current = {}
						queryRead.current?.abort()
						cancelOpen()
						parameters.retireConfiguration()
						setSelection(current => ({ id, revision: current.revision + 1 }))
					}}>
						<option value="">Select an Agenda view</option>
						{views.map(view => <option key={view.id} value={view.id}>{view.name}</option>)}
					</select>
				</label>
			)}
			<OrgAgendaView
				entries={entries}
				focusScope={projectionScope}
				error={error}
				isLoading={isLoading}
				actionPending={parameters.pending || clockPending}
				captureOrigin={captureRowOrigin}
				onAction={startAction}
				onCancelAction={parameters.cancel}
				onSaveEntry={saveEntry}
				onClockEntry={async (entry, operation, suppliedOrigin) => {
					const origin = suppliedOrigin ?? captureRowOrigin(entry)
					if (!origin || parameters.isPending() || commandPending.current) return { kind: "rejected", message: "The exact Agenda Clock origin is unavailable." }
					const target = freezeOrgAgendaEntrySnapshot(entry)
					const current = capturedRowCurrent(origin, true)
					commandPending.current = true
					setClockPending(true)
					const effect = clockWorkflow.executeAgenda(target, operation, origin, current)
					effects.current.add(effect)
					try {
						const result = await effect
						if (current()) setReload(value => value + 1)
						return result
					} finally {
						effects.current.delete(effect)
						commandPending.current = false
						if (!disposedRef.current) setClockPending(false)
					}
				}}
				onOpenEntry={entry => { void openEntry(entry) }}
				onReturnSource={openEntry}
			/>
			{clockWorkflow.reports.map(tool => <OrgClockReportView key={tool.id} tool={tool} onClosed={clockWorkflow.closeReport} />)}
		</div>
	)
})
