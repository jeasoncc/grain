import * as E from "fp-ts/Either"
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react"
import { useSettings } from "./use-settings"
import { getOrgInputConfiguration } from "./use-org-input-configuration"
import { parseOrgBehaviorConfiguration } from "@/pipes/org/org-behavior-configuration.pipe"
import { captureOrgCalendarContext, systemOrgNow } from "@/utils/org-date-clock"
import { readOrgStoredTimestamp, type OrgDateContext } from "@/pipes/org/org-date-reader.pipe"
import { guardOrgCommandOrigin, type OrgBufferCommand, type OrgBufferCommandContext, type OrgBufferCommandPreparation } from "@/flows/org-command/org-buffer-command"
import { buildOrgSparseTreePlan, parseOrgSparseTreeQuery, type OrgSparseTreeNativeContext } from "@/pipes/org/org-sparse-tree.pipe"
import { prepareOrgSparseTreeContext, type OrgSparseClockAdapter } from "@/flows/org-command/org-sparse-tree-context"
import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"
import type { OrgMinibufferSession, OrgMinibufferAcceptResult } from "@/types/editor/minibuffer.interface"
import type { OrgEditorCommandTarget } from "@/views/org-editor/org-editor.types"
import type { OrgTodoNoteResult } from "@/flows/org-command/org-todo-note"
import type { ApplicationCommandResult } from "@/flows/application-command-registry"

export interface OrgSourceParameterState {
	readonly relativePath: string
	readonly content: string
	readonly filename: string | null
	readonly savingOrLoading: boolean
}
interface SourceParameterOptions<T> {
	readonly current: T
	readonly scope: readonly unknown[]
	readonly readSource: (current: T) => OrgSourceParameterState | null
	readonly subscribeOrigin?: (listener: () => void) => () => void
	/** Returns canonical acceptance, never merely optimistic native publication. */
	readonly submitSource?: (run: () => boolean) => boolean | Promise<boolean>
	readonly preserveSelection?: boolean
	readonly isBusy: boolean
	readonly suspended?: boolean
	readonly now?: () => Date
	readonly captureClockContext?: (source: string, filename: string | null) => OrgSparseClockAdapter
}
type ParameterDescription = Pick<OrgMinibufferSession,
	"prompt" | "historyKey" | "completion" | "cancelWhileAccepting" | "acceptCandidate" | "preview" | "calendar">
type LoggingCollector = ((expectedSource: string, label: string,
	execute: (note: string, isCurrent: () => boolean) => OrgTodoNoteResult | Promise<OrgTodoNoteResult>,
	successMessage?: string,
) => boolean) | null
type ParameterCommit<T> = (
	origin: OrgBufferCommandContext, current: T, target: OrgEditorCommandTarget,
	finish: (result: ApplicationCommandResult, persistent?: boolean) => void, input: string,
	lease: ParameterLease, isCurrent: () => boolean,
	loggingCollector: LoggingCollector,
) => OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult>

/** Source-only parameter ownership. Workspace transfer authority is supplied only by the main caller. */
export const useOrgSourceParameters = <T,>(
	options: SourceParameterOptions<T>, targetRef: RefObject<OrgEditorCommandTarget | null>,
) => {
	const { isBusy, suspended = false, now = systemOrgNow } = options
	const behaviorJson = useSettings((state) => state.orgBehaviorConfigurationJson)
	const [core] = useState(createParameterSession)
	const { session } = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const [result, setResult] = useState<ApplicationCommandResult | null>(null)
	const originGateRef = useRef<{
		lease: ParameterLease
		isActive: (checkRevision?: boolean) => boolean
		unsubscribe?: () => void
	} | null>(null)
	const lookupRef = useRef<{
		abort: AbortController
		lease: ParameterLease
		isActive: () => boolean
	} | null>(null)
	const abortLookup = () => {
		const lookup = lookupRef.current
		if (lookup) {
			lookupRef.current = null
			core.endRead(lookup.lease, lookup.abort)
			lookup.abort.abort()
		}
	}
	const persistentResultRef = useRef(false)
	const behaviorGenerationRef = useRef({})
	const runtimeRef = useRef({ ...options, isBusy, suspended, now })
	runtimeRef.current = { ...options, isBusy, suspended, now }
	useLayoutEffect(() => {
		core.attach()
		setResult(null)
		return () => {
			originGateRef.current?.unsubscribe?.()
			originGateRef.current = null
			core.detach()
			lookupRef.current = null
		}
	}, [core, ...options.scope])
	useLayoutEffect(() => useSettings.subscribe((state, previous) => {
		if (state.orgBehaviorConfigurationJson === previous.orgBehaviorConfigurationJson &&
			state.orgKeymapConfigurationJson === previous.orgKeymapConfigurationJson) return
		behaviorGenerationRef.current = {}
		const origin = originGateRef.current
		if (!origin) return
		abortLookup()
		core.retire(origin.lease)
	}), [core])
	useLayoutEffect(() => {
		const origin = originGateRef.current
		if (origin && !origin.isActive()) {
			abortLookup()
			core.retire(origin.lease)
		}
	}, [behaviorJson, core])
	useLayoutEffect(() => {
		const origin = originGateRef.current
		// An owned commit may publish its new source before the async result settles.
		// Lifetime/window drift still retires it; source revision drift does not.
		if (origin && core.current(origin.lease) && !origin.isActive(!core.busy()))
			core.retire(origin.lease)
		if (lookupRef.current && !lookupRef.current.isActive()) {
			const lease = lookupRef.current.lease
			abortLookup()
			core.retire(lease)
		}
		if (suspended) {
			const lease = core.getSnapshot().lease
			if (lease) core.retire(lease)
			setResult(null)
		}
	})
	useEffect(() => {
		if (!result || persistentResultRef.current) return
		const timer = window.setTimeout(() => setResult(null), 3500)
		return () => window.clearTimeout(timer)
	}, [result])

	const launch = (
		description: ParameterDescription,
		prepare: (context: OrgBufferCommandContext) => OrgBufferCommandPreparation,
		cursor: number,
		commit: ParameterCommit<T>,
		previous?: ParameterLease,
		direct = false,
	) => {
		const source = options.readSource(options.current)
		const target = targetRef.current
		if (!source || !target || isBusy || suspended || (!previous && core.busy()))
			return { ok: false as const, message: "The originating Source is unavailable or busy." }
		const targetOrigin = target.getCommandContext()
		if (!targetOrigin.available) return { ok: false as const, message: "The originating Source command target is unavailable." }
		const originFocus = globalThis.document?.activeElement
		const restoreOrigin = target.captureFocus()
		const loggingCollector = target.captureLoggingNote?.() ?? null
		const scope = [...options.scope]
		const configurationGeneration = getOrgInputConfiguration().generation
		const behaviorOrigin = useSettings.getState().orgBehaviorConfigurationJson
		const behaviorGeneration = behaviorGenerationRef.current
		const prepared = prepare({
			relativePath: source.relativePath,
			content: source.content,
			cursor,
		})
		if (prepared.kind === "rejected") {
			setResult({ kind: "rejected", message: prepared.message })
			return { ok: false as const, message: prepared.message }
		}
		Object.freeze(prepared.context)
		const lease = core.begin(previous)
		if (!lease) return { ok: false as const, message: "The originating Source parameter owner is no longer active." }
		const sessionId = lease.id
		setResult(null)
		const originIsActive = (checkRevision = true) => {
			const currentTarget = target.getCommandContext()
			return !runtimeRef.current.suspended &&
				core.current(lease) &&
				useSettings.getState().orgBehaviorConfigurationJson === behaviorOrigin &&
				behaviorGenerationRef.current === behaviorGeneration &&
				currentTarget.available &&
				currentTarget.ownership === targetOrigin.ownership &&
				(!checkRevision || currentTarget.revision === targetOrigin.revision) &&
				getOrgInputConfiguration().generation === configurationGeneration &&
				runtimeRef.current.scope.length === scope.length &&
				scope.every((value, index) => runtimeRef.current.scope[index] === value) &&
				runtimeRef.current.readSource(runtimeRef.current.current)?.relativePath === prepared.context.relativePath &&
				targetRef.current === target
		}
		if (!originIsActive()) {
			core.retire(lease)
			return { ok: false as const, message: "The originating Source authority changed before preparation finished." }
		}
		originGateRef.current?.unsubscribe?.()
		const revalidate = () => {
			if (originIsActive()) return
			if (lookupRef.current?.lease === lease) {
				abortLookup()
				core.retire(lease)
			} else if (!core.busy()) {
				core.retire(lease)
			}
		}
		const unsubscribeTarget = target.subscribeCommandContext?.(revalidate)
		const unsubscribeOrigin = options.subscribeOrigin?.(revalidate)
		originGateRef.current = { lease, isActive: originIsActive, unsubscribe: () => {
			unsubscribeTarget?.()
			unsubscribeOrigin?.()
		} }
		let completionFocus: { before: Element; host: Element } | null = null
		const captureCompletionFocus = () => {
			const before = globalThis.document?.activeElement
			const host = before?.closest("[data-org-parameter-session]")
			return before && host?.getAttribute("data-org-parameter-session") === String(lease.id)
				? { before, host }
				: null
		}
		const finish = (result: ApplicationCommandResult, persistent = false) => {
			// An owned successful commit may advance source revision; settlement never writes source.
			if (!originIsActive(false)) return
			const focus = completionFocus
			// Ownership follows the original host, not an input that publication may replace.
			const before = globalThis.document?.activeElement
			const ownsFocus = Boolean(
				focus?.host.isConnected &&
					focus.host.getAttribute("data-org-parameter-session") === String(lease.id) &&
					focus.host.contains(before ?? null),
			)
			if (!core.retire(lease) || !core.isAttached() || targetRef.current !== target) return
			persistentResultRef.current = persistent
			setResult(result)
			const after = globalThis.document?.activeElement
			if (
				ownsFocus &&
				focus &&
				(after === before || (before && !before.isConnected && after === globalThis.document?.body))
			)
				target.restoreFocus()
		}
		const parameter: OrgMinibufferSession = {
			...description,
			get cancelWhileAccepting() {
				const phase = core.getSnapshot().phase
				return description.cancelWhileAccepting !== false && phase !== "commit" && phase !== "settle"
			},
			id: sessionId,
			initialInput: prepared.initialInput,
			candidates: prepared.candidates,
			onCancel: () => {
				if (!originIsActive()) return
				const before = globalThis.document?.activeElement
				const ownsFocus =
					(before === originFocus && before !== globalThis.document?.body && before?.isConnected) ||
					(before === globalThis.document?.body &&
						Boolean(originFocus && !originFocus.isConnected)) ||
					before
						?.closest("[data-org-parameter-session]")
						?.getAttribute("data-org-parameter-session") === String(lease.id)
				if (core.cancel(lease) && core.isAttached() && targetRef.current === target) {
					persistentResultRef.current = false
					setResult({ kind: "cancelled", message: "Canceled" })
					const after = globalThis.document?.activeElement
					if (
						ownsFocus &&
						(after === before ||
							(before && !before.isConnected && after === globalThis.document?.body))
					)
						restoreOrigin?.()
				}
			},
			onAccept: (input) => {
				const current = runtimeRef.current
				if (!originIsActive()) {
					core.retire(lease)
					return { ok: false, message: "The originating command or buffer is no longer active." }
				}
				const currentSource = current.readSource(current.current)
				if (!currentSource) return { ok: false, message: "The originating Source is no longer available." }
				if (current.isBusy || currentSource.savingOrLoading || core.busy())
					return {
						ok: false,
						message: "The buffer is saving or loading. Try again when it finishes.",
					}
				const guard = guardOrgCommandOrigin(prepared.context, {
					relativePath: currentSource.relativePath,
					content: currentSource.content,
					cursor,
				})
				if (guard) return { ok: false, message: guard.message }
				completionFocus = captureCompletionFocus()
				return (
					core.accept(lease, originIsActive, description.cancelWhileAccepting === false, () =>
						commit(prepared.context, current.current, target, finish, input, lease, originIsActive, loggingCollector),
					) ?? { ok: false, message: "The originating command or buffer is no longer active." }
				)
			},
		}
		if (!direct) {
			core.publishSession(lease, parameter)
			return
		}
		const settle = (result: OrgMinibufferAcceptResult) => {
			if (!result.ok && core.current(lease)) {
				core.retire(lease)
				setResult({ kind: "rejected", message: result.message })
			}
			return result
		}
		const result = parameter.onAccept(prepared.initialInput)
		return result instanceof Promise ? result.then(settle) : settle(result)
	}
	const open = (command: OrgBufferCommand, cursor: number) => {
		const planning = command.id === "org.heading.scheduled" || command.id === "org.heading.deadline"
		const dated = planning || command.id === "org.timestamp.active" || command.id === "org.timestamp.inactive"
		const direct = command.id === "org.heading.remove-scheduled" || command.id === "org.heading.remove-deadline" || command.id === "org.heading.complete-repeating"
		const clocked = dated || direct || command.id === "org.heading.todo-state"
		const configuration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
		if (E.isLeft(configuration)) {
			setResult({ kind: "rejected", message: configuration.left.message })
			return { ok: false as const, message: configuration.left.message }
		}
		const policy = Object.freeze({ ...configuration.right.dateReader })
		let calendar: OrgDateContext | undefined
		return launch(
			{ historyKey: command.id, prompt: command.prompt, completion: command.completion, get calendar() { return calendar } },
			(context) => {
				const prepared = command.prepare(context)
				if (prepared.kind === "rejected" || !dated) return prepared
				const captured = captureOrgCalendarContext(runtimeRef.current.now)
				if (captured.kind === "error") return { kind: "rejected", reason: "invalid-date", message: captured.message }
				const previous = readOrgStoredTimestamp(prepared.initialInput)
				calendar = Object.freeze({
					...captured.context,
					policy,
					defaultDate: previous.kind === "date" ? previous.date : captured.context.today,
					defaultTime: previous.kind === "date" ? previous.timestamp?.time : undefined,
				})
				return prepared.initialInput ? prepared : { ...prepared, initialInput: captured.context.today }
			},
			cursor,
			(origin, current, target, finish, input, lease, isCurrent, loggingCollector) => {
				let dateContext: OrgDateContext | undefined
				if (clocked) {
					const captured = captureOrgCalendarContext(runtimeRef.current.now)
					if (captured.kind === "error") return { ok: false, message: captured.message }
					dateContext = Object.freeze({ ...captured.context, policy, defaultDate: calendar?.defaultDate, defaultTime: calendar?.defaultTime })
				}
				if (!isCurrent()) {
					core.retire(lease)
					return { ok: false, message: "The originating command or buffer is no longer active." }
				}
				const currentSource = runtimeRef.current.readSource(current)
				if (!currentSource) return { ok: false, message: "The originating Source is no longer available." }
				const result = command.execute(origin, { ...currentSource, cursor }, input, dateContext)
				if (result.kind === "rejected") return { ok: false, message: result.message }
				const applyResult = (nativeContext?: OrgSparseTreeNativeContext, matchedCount?: number): OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult> => {
					if (!isCurrent()) {
						core.retire(lease)
						return { ok: false, message: "The originating command or buffer is no longer active." }
					}
					if (result.kind === "needs-note") {
						const continuationInput = result.request.input ?? input
						const continuationContext = result.request.context ?? dateContext
						const accepted = loggingCollector?.(origin.content,
							result.request.operation.kind === "todo" ? "TODO note" : result.request.operation.kind === "reschedule" ? "Reschedule note" : "Deadline change note",
							(note, noteIsCurrent) => {
								if (!noteIsCurrent()) return { kind: "rejected", reason: "stale-note-request" }
								const planned = command.execute(origin, origin, continuationInput, { ...continuationContext!, logStamp: result.request.stamp, note })
								if (planned.kind === "rejected") return { kind: "rejected", reason: planned.message }
								if (planned.kind !== "edit" && planned.kind !== "batch") return { kind: "rejected", reason: `Unexpected logging result: ${planned.kind}` }
								const changes = planned.kind === "batch" ? planned.batch.changes : [planned.edit]
								let expected = origin.content
								for (const change of [...changes].sort((a, b) => b.from - a.from)) expected = expected.slice(0, change.from) + change.insert + expected.slice(change.to)
								const apply = () => {
									if (!noteIsCurrent()) return false
									const revision = target.getCommandContext().revision
									try {
										if (planned.kind === "edit" && (!runtimeRef.current.preserveSelection || !target.applyEdits)) return target.applyEdit(origin.content, planned.edit)
										return target.applyEdits?.(origin.content, { changes, cursor: planned.kind === "batch" ? planned.batch.cursor : planned.edit.cursor,
											requiredVisibleRanges: changes.map(({ from, to }) => ({ from, to })) }, runtimeRef.current.preserveSelection ? "preserve" : "cursor") ?? false
									} catch {
										const accepted = target.getCommandContext()
										return !runtimeRef.current.submitSource && accepted.content === expected && accepted.revision > revision
									}
								}
								const applied = runtimeRef.current.submitSource?.(apply) ?? apply()
								const settle = (accepted: boolean) => accepted ? { kind: "applied" as const } : { kind: "rejected" as const, reason: "commit-refused" }
								return applied instanceof Promise ? applied.then(settle) : settle(applied)
							}) ?? false
						if (!accepted) return { ok: false, message: "This Source window cannot collect the required logging note." }
						core.retire(lease)
						return { ok: true }
					}
					if (result.kind === "view" && !target.applyView?.(origin.content, { ...result.view, nativeContext }))
						return { ok: false, message: "This editor cannot apply the view, or the buffer changed. Cancel and retry." }
					if (result.kind === "edit" || result.kind === "batch") {
						const apply = () => {
							if (!isCurrent() || !core.beginCommit(lease)) return false
							if (result.kind === "edit" && (!runtimeRef.current.preserveSelection || !target.applyEdits)) return target.applyEdit(origin.content, result.edit)
							return target.applyEdits?.(origin.content, result.kind === "batch" ? result.batch : { changes: [result.edit], cursor: result.edit.cursor },
								runtimeRef.current.preserveSelection ? "preserve" : "cursor") ?? false
						}
						const settle = (accepted: boolean): OrgMinibufferAcceptResult => {
							if (!accepted) return { ok: false, message: "Canonical Source refused this command; unaccepted input remains protected in this window." }
							finish({ kind: "success", message: command.updatedMessage })
							return { ok: true }
						}
						const accepted = runtimeRef.current.submitSource?.(apply) ?? apply()
						return accepted instanceof Promise ? accepted.then(settle) : settle(accepted)
					}
					if (matchedCount === 0) {
						finish({ kind: "success", message: "No sparse-tree matches; the whole document remains visible." })
						return { ok: true }
					}
					finish({ kind: "success", message: result.kind === "no-change" ? command.unchangedMessage : command.updatedMessage })
					return { ok: true }
				}
				if (result.kind !== "view" || result.view.query === null) return applyResult()
				const configuration = parseOrgBehaviorConfiguration(useSettings.getState().orgBehaviorConfigurationJson)
				if (E.isLeft(configuration)) return { ok: false, message: configuration.left.message }
				const query = parseOrgSparseTreeQuery(result.view.query, configuration.right.inheritance)
				if (!query) return { ok: false, message: "Invalid Org match expression." }
				const applySparseContext = (nativeContext: OrgSparseTreeNativeContext): OrgMinibufferAcceptResult | Promise<OrgMinibufferAcceptResult> => {
					if (!isCurrent()) return { ok: false, message: "The originating command or buffer changed during sparse-tree context capture." }
					let matchedCount: number
					try {
						matchedCount = buildOrgSparseTreePlan(origin.content, query, undefined, undefined, nativeContext).matchedHeadingStarts.length
					} catch (error) {
						return { ok: false, message: error instanceof Error ? error.message : String(error) }
					}
					return applyResult(nativeContext, matchedCount)
				}
				const filename = currentSource.filename
				const captureAbort = new AbortController()
				let context: OrgSparseTreeNativeContext | Promise<OrgSparseTreeNativeContext>
				try {
					context = prepareOrgSparseTreeContext(origin.content, query, filename, captureAbort.signal,
						runtimeRef.current.captureClockContext?.(origin.content, filename))
				} catch (error) {
					return { ok: false, message: error instanceof Error ? error.message : String(error) }
				}
				if (!(context instanceof Promise)) return applySparseContext(context)
				const abort = core.beginRead(lease)
				const abortCapture = () => captureAbort.abort()
				if (abort) {
					abort.signal.addEventListener("abort", abortCapture, { once: true })
					lookupRef.current = { abort, lease, isActive: isCurrent }
				} else {
					captureAbort.abort()
				}
				return context.finally(() => {
					if (abort) {
						abort.signal.removeEventListener("abort", abortCapture)
						core.endRead(lease, abort)
						if (lookupRef.current?.abort === abort) lookupRef.current = null
					}
				}).then(applySparseContext, (error: unknown): OrgMinibufferAcceptResult => ({
					ok: false, message: error instanceof Error ? error.message : String(error),
				}))
			},
			undefined,
			direct,
		)
	}
	const clearSparseTree = () => {
		const current = runtimeRef.current
		const target = targetRef.current
		const source = current.readSource(current.current)
		if (
			!source ||
			!target ||
			current.isBusy ||
			source.savingOrLoading ||
			current.suspended ||
			core.busy()
		)
			return
		const lease = core.getSnapshot().lease
		const before = globalThis.document?.activeElement
		const host = before?.closest("[data-org-parameter-session]")
		const ownsFocus = Boolean(
			lease && host?.getAttribute("data-org-parameter-session") === String(lease.id),
		)
		if (!target.applyView?.(source.content, { kind: "sparse-tree", query: null })) {
			setResult({ kind: "rejected", message: "This editor cannot clear the view, or the buffer changed. Cancel and retry." })
			return
		}
		if (!core.isAttached() || targetRef.current !== target || core.getSnapshot().lease !== lease)
			return
		const currentFocus = globalThis.document?.activeElement
		const stillOwned =
			ownsFocus &&
			host?.isConnected &&
			host.getAttribute("data-org-parameter-session") === String(lease?.id) &&
			host.contains(currentFocus ?? null) &&
			core.getSnapshot().lease === lease
		if (lease) core.retire(lease)
		persistentResultRef.current = false
		setResult({ kind: "success", message: "Sparse tree cleared" })
		if (
			stillOwned &&
			core.isAttached() &&
			targetRef.current === target &&
			(globalThis.document?.activeElement === currentFocus ||
				(currentFocus &&
					!currentFocus.isConnected &&
					globalThis.document?.activeElement === globalThis.document?.body))
		)
			target.restoreFocus()
	}
	return {
		reportRejected: (reason: string) => {
			persistentResultRef.current = false
			setResult({ kind: "rejected", message: reason })
		},
		session,
		result,
		open,
		clearSparseTree,
		launch,
		core,
		lookupRef,
		runtimeRef,
	}
}
