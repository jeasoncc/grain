import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import type { OrgAgendaEntry } from "@/pipes/org"
import type { OrgWorkspaceController } from "@/hooks/use-org-workspace"
import { captureOrgCalendarContext } from "@/utils/org-date-clock"
import { readOrgPlanningDate, readOrgStoredTimestamp, type OrgDateContext } from "@/pipes/org/org-date-reader.pipe"
import type { OrgAgendaTodoNoteRequest, OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import type { OrgAgendaActionOutcome, OrgAgendaCommand } from "@/types/org/org-agenda-command.types"
import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"
import { freezeOrgAgendaEntrySnapshot } from "@/pipes/org/org-agenda-command-plan.pipe"
import * as E from "fp-ts/Either"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { useSettings } from "./use-settings"
import { getOrgInputConfiguration, useOrgInputConfiguration } from "./use-org-input-configuration"
import type { ApplicationCommandResult } from "@/flows/application-command-registry"
import { getOrgAgendaConfiguration, subscribeOrgAgendaConfiguration, useOrgAgendaConfiguration } from "./use-org-agenda-configuration"

export type AgendaParameterController = Pick<
	OrgWorkspaceController,
	"executeAgendaCommand" | "prepareAgendaCommand"
>
const systemNow = () => new Date()
const outcomeResult = (
	label: string,
	outcome: Exclude<OrgAgendaActionOutcome, { readonly kind: "needs-note" }>,
): ApplicationCommandResult => {
	if (outcome.kind === "confirmed")
		return { kind: "success", message: `${label} changed in working copy. Save to write the file.` }
	if (outcome.kind === "unchanged") return { kind: "success", message: `${label} unchanged.` }
	if (outcome.kind === "stale") return { kind: "rejected", message: "Agenda row changed; select a refreshed row and try again." }
	if (outcome.kind === "report") return { kind: "rejected", message: "Clock reports require their retained readonly report surface." }
	return { kind: "rejected", message: outcome.message ?? `${label} change rejected.` }
}

/** Owns an immutable row snapshot, not a buffer or another source authority. */
export function useOrgAgendaParameters({
	controller,
	scope,
	sourceVersion = "",
	reload,
	now = systemNow,
	restoreFocus,
	captureOrigin,
	onTodoNoteRequest,
	getProjectionGeneration,
}: {
	readonly controller: AgendaParameterController
	readonly scope: string
	readonly sourceVersion?: string
	readonly reload: () => void
	readonly now?: () => Date
	readonly restoreFocus: () => void
	readonly captureOrigin?: (entry: OrgAgendaEntry) => ApplicationToolOrigin | null
	readonly onTodoNoteRequest?: (request: OrgAgendaTodoNoteRequest) => boolean | void
	readonly getProjectionGeneration?: () => object
}) {
	const behaviorJson = useSettings((state) => state.orgBehaviorConfigurationJson)
	const inputConfiguration = useOrgInputConfiguration()
	const agendaConfiguration = useOrgAgendaConfiguration()
	const [core] = useState(createParameterSession)
	const effects = useRef(new Set<Promise<unknown>>())
	const { session } = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const [pending, setPending] = useState(false)
	const [, publishNoteState] = useState(0)
	const [result, setResult] = useState<ApplicationCommandResult | null>(null)
	const scopeRef = useRef(scope)
	scopeRef.current = scope
	const sourceVersionRef = useRef(sourceVersion)
	sourceVersionRef.current = sourceVersion
	const noteOwner = useRef<{
		readonly abort: AbortController
		readonly scope: string
		readonly sourceVersion: string
		readonly behavior: string
		readonly configuration: object
		readonly agendaGeneration: object
		readonly projectionGeneration: object | undefined
		readonly listeners: Set<() => void>
		committing: boolean
		accepting: boolean
		cancelled: boolean
		stale: boolean
	} | null>(null)
	const active = useRef<{
		readonly lease: ParameterLease
		readonly scope: string
		readonly sourceVersion: string
		readonly behavior: string
		readonly configuration: object
		readonly agendaGeneration: object
		readonly projectionGeneration: object | undefined
		readonly originFocus: Element | null
		readonly sourceFocus: Element | null
		completionHost: Element | null
	} | null>(null)
	const syncPending = () => {
		if (core.isAttached()) setPending(Boolean(core.getSnapshot().lease) || core.busy() || Boolean(noteOwner.current))
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
	useLayoutEffect(() => {
		core.attach()
		syncPending()
		setResult(null)
		return () => {
			core.detach()
			const note = noteOwner.current
			if (note && !note.committing) {
				note.abort.abort()
				for (const listener of note.listeners) listener()
				noteOwner.current = null
			}
			active.current = null
		}
	}, [scope, core])
	// biome-ignore lint/correctness/useExhaustiveDependencies: source changes invalidate cancellable reads, not started commits.
	useLayoutEffect(() => {
		const note = noteOwner.current
		if (note && note.sourceVersion !== sourceVersion) {
			if (!note.committing) {
				note.stale = true
				note.abort.abort()
			}
			for (const listener of note.listeners) listener()
		}
		const request = active.current
		if (!request || request.sourceVersion === sourceVersion) return
		const restore = !core.getSnapshot().session ? sourceFocusAfterPublication(request) : () => {}
		if (core.cancel(request.lease)) {
			active.current = null
			syncPending()
			setResult({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." })
			reload()
			restore()
		}
	}, [sourceVersion, core])
	const configurationCurrent = (request: { readonly behavior: string; readonly configuration: object; readonly agendaGeneration: object; readonly projectionGeneration: object | undefined }) =>
		useSettings.getState().orgBehaviorConfigurationJson === request.behavior &&
		getOrgInputConfiguration().generation === request.configuration &&
		getOrgAgendaConfiguration().generation === request.agendaGeneration &&
		getProjectionGeneration?.() === request.projectionGeneration
	const retireConfiguration = () => {
		const note = noteOwner.current
		if (note && !configurationCurrent(note) && !note.stale) {
			note.stale = true
			if (!note.committing) note.abort.abort()
			for (const listener of note.listeners) listener()
			if (!note.committing) setResult({ kind: "rejected", message: "Agenda configuration changed; the retained note is read-only." })
		}
		const request = active.current
		if (request && !configurationCurrent(request) && core.cancel(request.lease)) {
			active.current = null
			syncPending()
			setResult({ kind: "rejected", message: "Agenda configuration changed; start a new action." })
		}
	}
	useLayoutEffect(() => {
		const settings = useSettings.subscribe(retireConfiguration)
		const agenda = subscribeOrgAgendaConfiguration(retireConfiguration)
		return () => { settings(); agenda() }
	}, [core])
	useEffect(retireConfiguration, [inputConfiguration.generation, behaviorJson, agendaConfiguration.generation])
	const cancel = () => {
		const note = noteOwner.current
		if (note) {
			note.cancelled = true
			if (note.committing) return
			note.abort.abort()
			for (const listener of note.listeners) listener()
			noteOwner.current = null
			syncPending()
			return
		}
		const request = active.current
		if (!request) return
		const restore = cancelFocusAfterPublication(request)
		if (!core.cancel(request.lease)) return
		active.current = null
		syncPending()
		setResult({ kind: "cancelled", message: "Agenda action cancelled." })
		restore()
	}
	const start = (entry: OrgAgendaEntry, kind: OrgAgendaCommand["kind"], suppliedOrigin?: ApplicationToolOrigin | null) => {
		if (kind === "clock-in" || kind === "clock-out" || kind === "cancel-clock" || kind === "clock-report") return
		if (core.getSnapshot().lease || core.busy() || noteOwner.current) return
		const configuration = getOrgInputConfiguration()
		const behavior = useSettings.getState().orgBehaviorConfigurationJson
		const agenda = getOrgAgendaConfiguration()
		const parsedConfiguration = parseOrgBehaviorConfiguration(behavior)
		if (!configuration.configuration || E.isLeft(parsedConfiguration) || agenda.error) {
			setResult({ kind: "rejected", message: agenda.error ?? (E.isLeft(parsedConfiguration) ? parsedConfiguration.left.message : configuration.error ?? "Org input configuration is unavailable.") })
			return
		}
		const policy = parsedConfiguration.right
		const logging = Object.freeze({ logging: policy.logging, inheritance: policy.inheritance })
		// The exact row/tool origin is captured before any clock or host effect.
		const originFocus = typeof document === "undefined" ? null : document.activeElement
		const target = freezeOrgAgendaEntrySnapshot(entry)
		const toolOrigin = suppliedOrigin === undefined ? captureOrigin?.(target) ?? null : suppliedOrigin
		if (captureOrigin && !toolOrigin || toolOrigin && !toolOrigin.isLive()) return
		if (!core.isAttached() || scopeRef.current !== scope || sourceVersionRef.current !== sourceVersion) return
		const lease = core.begin()
		if (!lease) return
		const request = {
			lease,
			scope,
			sourceVersion,
			behavior,
			configuration: configuration.generation,
			agendaGeneration: agenda.generation,
			projectionGeneration: getProjectionGeneration?.(),
			originFocus,
			sourceFocus:
				originFocus?.isConnected && originFocus.closest("[data-agenda-key]") ? originFocus : null,
			completionHost: null as Element | null,
		}
		active.current = request
		const current = () => core.current(lease) && scopeRef.current === request.scope
		const originCurrent = () => current() && sourceVersionRef.current === request.sourceVersion && configurationCurrent(request) &&
			(!toolOrigin || toolOrigin.isLive())
		const label = ({
			"cycle-todo": "TODO state", "todo-state": "TODO state", "complete-repeating": "Recurring TODO completion",
			schedule: "Schedule", deadline: "Deadline", "remove-schedule": "Schedule removal", "remove-deadline": "Deadline removal",
		} as const)[kind]
		const captureCompletionOwnership = () => {
			const host = globalThis.document?.activeElement?.closest("[data-org-parameter-session]")
			request.completionHost =
				host?.getAttribute("data-org-parameter-session") === String(lease.id) ? host : null
		}
		const finish = (completion: ApplicationCommandResult, refresh = false, preparing = false) => {
			if (!current()) return
			if (!configurationCurrent(request)) {
				core.retire(lease)
				if (active.current === request) active.current = null
				syncPending()
				return
			}
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
			setResult(completion)
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
		const continueNote = (outcome: Extract<OrgAgendaActionOutcome, { kind: "needs-note" }>) => {
			if (!originCurrent()) {
				finish({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." }, true)
				return
			}
			// Transfer to the real scratch tool; the calendar host no longer owns this request.
			if (!core.retire(lease)) return
			if (active.current === request) active.current = null
			const note = {
				abort: new AbortController(), scope: request.scope, sourceVersion: request.sourceVersion,
				behavior: request.behavior, configuration: request.configuration,
				agendaGeneration: request.agendaGeneration, projectionGeneration: request.projectionGeneration,
				listeners: new Set<() => void>(), committing: false, accepting: false, cancelled: false, stale: false,
			}
			noteOwner.current = note
			const noteCurrent = () => core.isAttached() && noteOwner.current === note &&
				scopeRef.current === note.scope && sourceVersionRef.current === note.sourceVersion && configurationCurrent(note) &&
				!note.abort.signal.aborted && !note.cancelled && !note.stale && (!toolOrigin || toolOrigin.isLive())
			const validate = (): OrgTodoNoteResult => noteCurrent() && !note.accepting
				? { kind: "ready" }
				: { kind: "rejected", reason: "Agenda row changed; select a refreshed row and try again." }
			const settle = (completion: ApplicationCommandResult, refresh = false) => {
				if (noteOwner.current !== note) return
				noteOwner.current = null
				syncPending()
				for (const listener of note.listeners) listener()
				if (core.isAttached() && scopeRef.current === note.scope && configurationCurrent(note)) {
					setResult(completion)
					if (refresh) reload()
				}
			}
			const noteRequest: OrgAgendaTodoNoteRequest = {
				label: `${label} logging note`,
				successMessage: `${label} changed in working copy. Save to write the file.`,
				origin: toolOrigin ?? undefined,
				validate,
				subscribeValidation: (listener) => { note.listeners.add(listener); return () => { note.listeners.delete(listener) } },
				abort: () => {
					note.cancelled = true
					if (note.committing) return
					note.abort.abort()
					settle({ kind: "cancelled", message: "Agenda action cancelled." })
				},
				execute: async (text) => {
					const valid = validate()
					if (valid.kind !== "ready") return valid
					const command: OrgAgendaCommand = outcome.command.kind === "cycle-todo" || outcome.command.kind === "todo-state" || outcome.command.kind === "complete-repeating"
						? Object.freeze({ ...outcome.command, note: text })
						: Object.freeze({ ...outcome.command, context: Object.freeze({ ...outcome.command.context!, note: text }) })
					note.accepting = true
					let effect: Promise<OrgAgendaActionOutcome> | undefined
					try {
						effect = controller.executeAgendaCommand(outcome.entry, command, note.abort.signal, {
							isCurrent: () => note.committing || noteCurrent(),
							onCommitStarted: () => { note.committing = true; publishNoteState((value) => value + 1) },
						})
						effects.current.add(effect)
						syncPending()
						const result = await effect
						if (result.kind === "confirmed") {
							settle({ kind: "success", message: `${label} changed in working copy. Save to write the file.` }, true)
							return { kind: "applied" }
						}
						if (note.cancelled) {
							settle({ kind: "cancelled", message: "Agenda action cancelled." }, result.kind === "stale")
							return { kind: "aborted" }
						}
						if (result.kind === "stale" || note.committing) {
							note.stale = true
							for (const listener of note.listeners) listener()
							if (core.isAttached() && scopeRef.current === note.scope) reload()
						}
						return { kind: "rejected", reason: "message" in result && result.message ? result.message : "Agenda row changed or action rejected." }
					} catch {
						if (note.committing) {
							note.stale = true
							for (const listener of note.listeners) listener()
						}
						if (core.isAttached() && scopeRef.current === note.scope) reload()
						return { kind: "rejected", reason: `${label} change failed; no automatic retry.` }
					} finally {
						if (effect) effects.current.delete(effect)
						note.accepting = false
						note.committing = false
						if (note.cancelled) settle({ kind: "cancelled", message: "Agenda action cancelled." })
						syncPending()
					}
				},
			}
			syncPending()
			if (!onTodoNoteRequest) noteRequest.abort()
			else if (onTodoNoteRequest(noteRequest) === false) noteRequest.abort()
		}
		const execute = (command: OrgAgendaCommand) => {
			if (current() && !originCurrent()) {
				finish({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." }, true)
				return { ok: true as const }
			}
			captureCompletionOwnership()
			let committing = false
			const accepted = core.accept(lease, originCurrent, false, async () => {
				const abort = core.beginRead(lease)
				if (!abort) return { ok: false as const, message: "Agenda action is no longer current." }
				try {
					const outcome = await controller.executeAgendaCommand(target, command, abort.signal, {
						isCurrent: () => committing || originCurrent(),
						onCommitStarted: () => {
							// Detach may invalidate delivery via the signal; the effect lock still drains.
							core.beginCommit(lease)
							committing = true
						},
					})
					if (outcome.kind === "needs-note") {
						continueNote(outcome)
						return { ok: true as const }
					}
					finish(outcomeResult(label, outcome), true)
					return { ok: true as const }
				} catch {
					finish({ kind: "rejected", message: `${label} change failed; no automatic retry.` }, true)
					return { ok: true as const }
				} finally {
					core.endRead(lease, abort)
				}
			})
			if (!accepted) return { ok: false as const, message: "Agenda action is no longer current." }
			effects.current.add(accepted)
			return accepted.finally(() => { effects.current.delete(accepted); syncPending() })
		}
		setPending(true)
		setResult({ kind: "success", message: kind === "cycle-todo" || kind === "complete-repeating" ? "Changing TODO state…" : `Preparing ${label.toLowerCase()}…` })
		if (kind === "cycle-todo" || kind === "complete-repeating" || kind === "remove-schedule" || kind === "remove-deadline") {
			const preparationClock = captureOrgCalendarContext(now)
			if (preparationClock.kind === "error") {
				finish({ kind: "rejected", message: preparationClock.message }, false, true)
				return
			}
			void execute(kind === "cycle-todo" || kind === "complete-repeating"
				? Object.freeze({ kind, timestamp: preparationClock.context.logStamp, ...logging })
				: Object.freeze({ kind, context: Object.freeze({ ...preparationClock.context, policy: policy.dateReader }), ...logging }))
			return
		}
		const abort = core.beginRead(lease)
		if (!abort) return
		void (async () => {
			try {
				const prepared = await controller.prepareAgendaCommand(target, kind, abort.signal)
				if (!current()) return
				if (!originCurrent()) {
					finish({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." }, true, true)
					return
				}
				if (prepared.kind !== "ready") {
					finish(outcomeResult(label, prepared), true, true)
					return
				}
				if (kind === "todo-state") {
					if (!prepared.states) {
						finish({ kind: "rejected", message: "TODO keyword preparation is unavailable." }, false, true)
						return
					}
					core.endRead(lease, abort)
					core.publishSession(lease, {
						id: lease.id, prompt: "Agenda TODO state (empty removes state):", initialInput: prepared.initialInput ?? "",
						candidates: prepared.states, completion: "token", historyKey: "agenda-todo-state", onCancel: cancel,
						get cancelWhileAccepting() { return core.getSnapshot().phase !== "commit" },
						onAccept: (state) => {
							if (!originCurrent() || core.busy()) return { ok: false, message: "Agenda action is no longer current." }
							const clock = captureOrgCalendarContext(now)
							if (clock.kind === "error") return { ok: false, message: clock.message }
							return execute(Object.freeze({ kind, state, timestamp: clock.context.logStamp, ...logging }))
						},
					})
					return
				}
				const preparationClock = captureOrgCalendarContext(now)
				if (preparationClock.kind === "error") {
					finish({ kind: "rejected", message: preparationClock.message }, false, true)
					return
				}
				if (!originCurrent()) {
					finish({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." }, true, true)
					return
				}
				core.endRead(lease, abort)
				const existing = prepared.date ? readOrgStoredTimestamp(prepared.date) : null
				const calendar: OrgDateContext = Object.freeze({
					...preparationClock.context,
					policy: policy.dateReader,
					defaultDate: existing?.kind === "date" ? existing.date : preparationClock.context.today,
					defaultTime: existing?.kind === "date" ? existing.timestamp?.time : undefined,
				})
				const today = calendar.today
				setResult({ kind: "success", message: `${label} date for ${target.heading ?? "(No heading)"}` })
				core.publishSession(lease, {
					id: lease.id,
					prompt: `${label} (date / time / range / repeater / warning):`,
					historyKey: `agenda-${kind}`,
					completion: "value",
					calendar,
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
							finish({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." }, true)
							return { ok: true }
						}
						const acceptedClock = captureOrgCalendarContext(now)
						if (acceptedClock.kind === "error") return { ok: false, message: acceptedClock.message }
						if (!originCurrent()) {
							finish({ kind: "rejected", message: "Agenda source changed; select a refreshed row and try again." }, true)
							return { ok: false, message: "Agenda source changed; select a refreshed row and try again." }
						}
						const acceptedContext: OrgDateContext = Object.freeze({
							...acceptedClock.context,
							defaultDate: calendar.defaultDate,
							defaultTime: calendar.defaultTime,
							policy: policy.dateReader,
						})
						const parsed = readOrgPlanningDate(input, acceptedContext, existing?.kind === "date" ? existing.timestamp : undefined)
						if (parsed.kind === "error") return { ok: false, message: parsed.message }
						return execute(Object.freeze({ kind, date: input, context: acceptedContext, ...logging }))
					},
				})
			} catch {
				finish({ kind: "rejected", message: `Cannot prepare ${label.toLowerCase()}; no automatic retry.` }, false, true)
			} finally {
				core.endRead(lease, abort)
				syncPending()
			}
		})()
	}
	return {
		session,
		pending,
		result,
		start,
		cancel,
		isPending: () => Boolean(core.getSnapshot().lease) || core.busy() || Boolean(noteOwner.current),
		retireConfiguration,
		isCommitting: () => core.getSnapshot().phase === "commit" || core.getSnapshot().phase === "settle" || Boolean(noteOwner.current?.committing),
		close: () => {
			if (core.getSnapshot().phase === "commit" || core.getSnapshot().phase === "settle" || noteOwner.current?.committing) return false
			cancel()
			return true
		},
		dispose: async () => { cancel(); core.detach(); await Promise.allSettled([...effects.current]) },
	}
}
