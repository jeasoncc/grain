import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { OrgAgendaEntry } from "@/pipes/org"
import type { OrgAgendaCommand, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { captureOrgToday, resolveOrgDateInput } from "@/utils/org-date-clock"
import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"

export type AgendaCommand = OrgAgendaCommand
export type AgendaParameterController = Pick<
	OrgWorkspaceController,
	"executeAgendaCommand" | "prepareAgendaPlanning"
>
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
	const [core] = useState(createParameterSession)
	const { session } = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const [pending, setPending] = useState(false)
	const [status, setStatus] = useState<string | null>(null)
	const scopeRef = useRef(scope)
	scopeRef.current = scope
	const sourceVersionRef = useRef(sourceVersion)
	sourceVersionRef.current = sourceVersion
	const active = useRef<{
		readonly lease: ParameterLease
		readonly scope: string
		readonly sourceVersion: string
		readonly originFocus: Element | null
		readonly sourceFocus: Element | null
		completionHost: Element | null
	} | null>(null)
	const syncPending = () => {
		if (core.isAttached()) setPending(Boolean(core.getSnapshot().lease) || core.busy())
	}
	// Preparation has no minibuffer yet. Only the exact connected Agenda origin owns focus.
	const sourceFocusAfterPublication = (request: NonNullable<typeof active.current>) => {
		const source = request.sourceFocus
		const owns = Boolean(
			active.current === request &&
				core.current(request.lease) &&
				!core.getSnapshot().session &&
				scopeRef.current === request.scope &&
				source?.isConnected &&
				source === globalThis.document?.activeElement,
		)
		return () => {
			if (
				owns &&
				core.isAttached() &&
				scopeRef.current === request.scope &&
				active.current === null &&
				!core.getSnapshot().lease &&
				source?.isConnected &&
				source === globalThis.document?.activeElement
			)
				restoreFocus()
		}
	}
	// Capture ownership before publication; observers may move focus during publication.
	const cancelFocusAfterPublication = (request: NonNullable<typeof active.current>) => {
		const before = typeof document === "undefined" ? null : document.activeElement
		const owns =
			before !== null &&
			((before === request.originFocus && before !== document.body && before.isConnected) ||
				before
					.closest("[data-org-parameter-session]")
					?.getAttribute("data-org-parameter-session") === String(request.lease.id))
		return () => {
			if (!owns || !core.isAttached() || scopeRef.current !== request.scope) return
			const after = document.activeElement
			if (after === before || (!before.isConnected && after === document.body)) restoreFocus()
		}
	}
	// biome-ignore lint/correctness/useExhaustiveDependencies: scope is the lifetime boundary.
	useEffect(() => {
		core.attach()
		syncPending()
		setStatus(null)
		return () => {
			core.detach()
			active.current = null
		}
	}, [scope, core])
	// biome-ignore lint/correctness/useExhaustiveDependencies: source changes invalidate cancellable reads, not started commits.
	useEffect(() => {
		const request = active.current
		if (!request || request.sourceVersion === sourceVersion) return
		const restore = !core.getSnapshot().session ? sourceFocusAfterPublication(request) : () => {}
		if (core.cancel(request.lease)) {
			active.current = null
			syncPending()
			setStatus("Agenda source changed; select a refreshed row and try again.")
			reload()
			restore()
		}
	}, [sourceVersion, core])
	const cancel = () => {
		const request = active.current
		if (!request) return
		const restore = cancelFocusAfterPublication(request)
		if (!core.cancel(request.lease)) return
		active.current = null
		syncPending()
		setStatus("Agenda action cancelled.")
		restore()
	}
	const start = (entry: OrgAgendaEntry, kind: "cycle-todo" | "schedule" | "deadline") => {
		if (core.getSnapshot().lease || core.busy()) return
		// Validate the local clock before allocating a lease or starting preparation.
		const preparationToday = kind === "cycle-todo" ? null : captureOrgToday(now)
		if (preparationToday?.kind === "error") {
			setStatus(preparationToday.message)
			return
		}
		const originFocus = typeof document === "undefined" ? null : document.activeElement
		const lease = core.begin()
		if (!lease) return
		const captured = structuredClone(entry)
		const target = Object.freeze({
			...captured,
			...(captured.origin
				? {
						origin: Object.freeze({
							...captured.origin,
							timestamp: Object.freeze({ ...captured.origin.timestamp }),
							heading: captured.origin.heading
								? Object.freeze({ ...captured.origin.heading })
								: null,
						}),
					}
				: {}),
		})
		const request = {
			lease,
			scope,
			sourceVersion,
			originFocus,
			sourceFocus:
				originFocus?.isConnected && originFocus.closest("[data-agenda-key]") ? originFocus : null,
			completionHost: null as Element | null,
		}
		active.current = request
		const current = () => core.current(lease) && scopeRef.current === request.scope
		const originCurrent = () => current() && sourceVersionRef.current === request.sourceVersion
		const label =
			kind === "cycle-todo" ? "TODO state" : kind === "schedule" ? "Schedule" : "Deadline"
		const captureCompletionOwnership = () => {
			const host = globalThis.document?.activeElement?.closest("[data-org-parameter-session]")
			request.completionHost =
				host?.getAttribute("data-org-parameter-session") === String(lease.id) ? host : null
		}
		const finish = (message: string, refresh = false, preparing = false) => {
			if (!current()) return
			const restoreSource = preparing ? sourceFocusAfterPublication(request) : () => {}
			const host = request.completionHost
			const before = globalThis.document?.activeElement
			const owns = Boolean(
				host?.isConnected &&
					host.getAttribute("data-org-parameter-session") === String(lease.id) &&
					host.contains(before ?? null),
			)
			if (!core.retire(lease) || !core.isAttached() || scopeRef.current !== request.scope) return
			if (active.current === request) active.current = null
			syncPending()
			setStatus(message)
			if (refresh) reload()
			restoreSource()
			const after = globalThis.document?.activeElement
			if (
				owns &&
				core.isAttached() &&
				scopeRef.current === request.scope &&
				(after === before || (before && !before.isConnected && after === document.body))
			)
				restoreFocus()
		}
		const execute = (command: AgendaCommand) => {
			if (current() && !originCurrent()) {
				finish("Agenda source changed; select a refreshed row and try again.", true)
				return { ok: true as const }
			}
			captureCompletionOwnership()
			const accepted = core.accept(lease, originCurrent, false, async () => {
				const abort = core.beginRead(lease)
				if (!abort) return { ok: false as const, message: "Agenda action is no longer current." }
				try {
					const outcome = await controller.executeAgendaCommand(target, command, abort.signal, {
						onCommitStarted: () => {
							// Detach may invalidate delivery via the signal; the effect lock still drains.
							core.beginCommit(lease)
						},
					})
					finish(outcomeStatus(label, outcome), true)
					return { ok: true as const }
				} catch {
					finish(`${label} change failed; no automatic retry.`, true)
					return { ok: true as const }
				} finally {
					core.endRead(lease, abort)
				}
			})
			if (!accepted) return { ok: false as const, message: "Agenda action is no longer current." }
			return accepted.finally(syncPending)
		}
		setPending(true)
		setStatus(kind === "cycle-todo" ? "Changing TODO state…" : `Preparing ${label.toLowerCase()}…`)
		if (kind === "cycle-todo") {
			void execute({ kind })
			return
		}
		const abort = core.beginRead(lease)
		if (!abort) return
		void (async () => {
			try {
				const prepared = await controller.prepareAgendaPlanning(target, kind, abort.signal)
				if (!current()) return
				if (!originCurrent()) {
					finish("Agenda source changed; select a refreshed row and try again.", true, true)
					return
				}
				if (prepared.kind !== "ready") {
					finish(outcomeStatus(label, prepared), true, true)
					return
				}
				core.endRead(lease, abort)
				if (preparationToday?.kind !== "date") return
				const today = preparationToday.date
				setStatus(`${label} date for ${target.heading ?? "(No heading)"}`)
				core.publishSession(lease, {
					id: lease.id,
					prompt: `${label} (YYYY-MM-DD, today, tomorrow, yesterday, +1d, -1w):`,
					historyKey: `agenda-${kind}`,
					completion: "value",
					get cancelWhileAccepting() {
						return core.getSnapshot().phase !== "commit"
					},
					candidates: [
						...new Set([
							prepared.date ?? today,
							today,
							"today",
							"tomorrow",
							"yesterday",
							"+1d",
							"-1w",
						]),
					],
					initialInput: prepared.date ?? today,
					onCancel: () => {
						if (current()) cancel()
					},
					onAccept: (input) => {
						if (!current() || core.busy())
							return { ok: false, message: "Agenda action is no longer current." }
						if (!originCurrent()) {
							finish("Agenda source changed; select a refreshed row and try again.", true)
							return { ok: true }
						}
						const parsed = resolveOrgDateInput(input, now)
						if (parsed.kind === "error") return { ok: false, message: parsed.message }
						return execute({ kind, date: parsed.date })
					},
				})
			} catch {
				finish(`Cannot prepare ${label.toLowerCase()}; no automatic retry.`, false, true)
			} finally {
				core.endRead(lease, abort)
				syncPending()
			}
		})()
	}
	return {
		session,
		pending,
		status,
		start,
		cancel,
		isPending: () => Boolean(core.getSnapshot().lease) || core.busy(),
	}
}
