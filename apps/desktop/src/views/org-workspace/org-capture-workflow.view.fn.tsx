import * as E from "fp-ts/Either"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { OrgCaptureOutcome, OrgCaptureTargetOutcome, OrgWorkspaceController } from "@/hooks/use-org-workspace"
import type { ApplicationResultPublisher } from "@/views/application/application-command-provider"
import {
	validateOrgCaptureSource,
	validateOrgCaptureTarget,
} from "@/pipes/org/org-capture.pipe"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import type { OrgCaptureTarget, OrgCaptureTemplateContext, OrgCaptureTemplateTarget, OrgPreparedCaptureTemplate } from "@/types/editor/org-capture.interface"
import { OrgEditor, type OrgEditorCommandTarget } from "@/views/org-editor"
import { useApplicationCommandHost, useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import type { ApplicationToolState } from "@/flows/application/application-tool-registry"
import { getOrgCaptureConfiguration, subscribeOrgCaptureConfiguration, useOrgCaptureConfiguration } from "@/hooks/use-org-capture-configuration"
import { type OrgCaptureDraftRecord, saveOrgCaptureDraft, removeOrgCaptureDraft, readOrgCaptureDrafts, OrgCaptureDraftPublicationError } from "@/io/storage/org-capture-draft.storage"
import { type OrgCaptureTemplatePlan, planOrgCaptureTemplate, renderOrgCaptureTemplate } from "@/pipes/org/org-capture-template.pipe"
import { OrgConfirmDialog } from "./org-action-dialog.view.fn"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"
import { OrgWhichKey } from "./org-which-key.view.fn"
import { Button } from "@/views/ui/button"
import { Input } from "@/views/ui/input"
import { getConfigurationError } from "@/state/configuration.state"

export interface OrgCaptureOrigin {
	readonly scope: {
		readonly workspaceSessionId: string | null
		readonly rootPath: string | null
		readonly capabilityToken: string | undefined
	}
	readonly bufferId: string | null
}
export interface OrgCaptureToolLifecycle {
	readonly state: ApplicationToolState
	readonly ownsFocus: () => boolean
	readonly close: () => Promise<boolean>
	readonly dispose: () => Promise<void>
}
export interface OrgCaptureWorkflowProps {
	readonly controller: OrgWorkspaceController
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly onToolLifecycle?: (lifecycle: OrgCaptureToolLifecycle) => void
	readonly requestDismiss?: () => void
	readonly isToolEditable?: () => boolean
	readonly beginResult?: () => ApplicationResultPublisher | null
	/** Frozen Source/window context; target-relative annotation is resolved before prompts. */
	readonly getTemplateContext?: (target: OrgCaptureTemplateTarget) => OrgCaptureTemplateContext
	/** Parent restores only its captured surviving source/window; no buffer/path fallback. */
	readonly onRestoreOrigin?: (
		origin: OrgCaptureOrigin,
		signal?: AbortSignal,
	) => void | Promise<void>
}
let nextSession = 0
const scopeOf = (controller: OrgWorkspaceController): OrgCaptureOrigin["scope"] => ({
	capabilityToken: controller.workspace?.capabilityToken,
	rootPath: controller.workspace?.rootPath ?? null,
	workspaceSessionId: controller.workspaceSessionId,
})
const scopeKey = (controller: OrgWorkspaceController) => JSON.stringify(scopeOf(controller))

/** Parameter minibuffers and an owned scratch tool; durable recovery requires current opt-in. */
export const OrgCaptureWorkflow = (props: OrgCaptureWorkflowProps) =>
	props.open ? <CaptureSession {...props} /> : null

const CaptureSession = (props: OrgCaptureWorkflowProps) => {
	const configurationSnapshot = useOrgCaptureConfiguration()
	const latest = useRef(props)
	const applicationHost = useApplicationCommandHost()
	const liveApplicationHost = useRef(applicationHost)
	liveApplicationHost.current = applicationHost
	const offeredParameterRef = useRef<OrgMinibufferSession | null>(null)
	latest.current = props
	const [session] = useState(() => ({
		abort: new AbortController(),
		clearDirty: props.controller.setTransientDirty,
		closing: false,
		confirming: false,
		focus: document.activeElement instanceof HTMLElement ? document.activeElement : null,
		id: ++nextSession,
		key: scopeKey(props.controller),
		configuration: configurationSnapshot,
		configurationRetired: false,
		attached: true,
		effects: new Set<Promise<unknown>>(),
		protection: props.controller as OrgWorkspaceController | null,
		live: true,
		context: props.getTemplateContext ?? ((): OrgCaptureTemplateContext => ({ date: new Date(), region: "", annotation: "" })),
		journal: null as OrgCaptureDraftRecord | null,
		prepared: null as OrgPreparedCaptureTemplate | null,
		sourceRelativePath: undefined as string | undefined,
		draft: "",
		path: "",
		preview: null as Extract<OrgCaptureTargetOutcome, { kind: "ready" }> | null,
		previewAbort: null as AbortController | null,
		previewRequest: 0,
		recoveredRevision: undefined as string | undefined,
		parameterId: 0,
		initialDirty: false,
		origin: { bufferId: props.controller.activeBufferId, scope: scopeOf(props.controller) },
		pending: false,
		retired: false,
	}))
	const configuration = session.configuration.configuration
	const recoveryEnabled = configuration?.draftRecovery === true
	const dirtyId = `org-capture:${session.key}:${session.id}`
	const [template, setTemplate] = useState<OrgPreparedCaptureTemplate | null>(null)
	const [parameters, setParameters] = useState<{ readonly plan: OrgCaptureTemplatePlan; readonly answers: readonly string[]; readonly id: number } | null>(null)
	const [savedDrafts, setSavedDrafts] = useState<readonly OrgCaptureDraftRecord[]>([])
	const [preview, setPreview] = useState<Extract<OrgCaptureTargetOutcome, { kind: "ready" }> | null>(null)
	const [previewPending, setPreviewPending] = useState(false)
	const [draft, setDraft] = useState("")
	const [target, setTarget] = useState("")
	const [pending, setPending] = useState(false)
	const [retired, setRetired] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [confirmation, setConfirmation] = useState<{ readonly kind: "refresh" | "delete"; readonly path: string; readonly journalId: string | null } | null>(null)
	const [prefix, setPrefix] = useState<OrgPrefixSession | null>(null)
	const composing = useRef(false)
	const scratchFocused = useRef(false)
	const scratch = useRef<HTMLDivElement>(null)
	const sourceReadOnly = props.isToolEditable?.() === false || props.controller.isWorkspaceBlocked || !!(session.origin.bufferId && props.controller.getBufferEffectState(session.origin.bufferId)?.readOnly)
	const current = useCallback(
		() => session.live && !session.configurationRetired &&
			getOrgCaptureConfiguration().generation === session.configuration.generation &&
			getOrgCaptureConfiguration().configuration !== null &&
			scopeKey(latest.current.controller) === session.key && latest.current.isToolEditable?.() !== false,
		[session],
	)
	const focusScratch = useCallback(
		(target: OrgEditorCommandTarget | null) => {
			if (!target) {
				// StrictMode destroys and recreates the CM instance during effect replay.
				scratchFocused.current = false
				return
			}
			if (!current() || scratchFocused.current || composing.current) {
				return
			}
			scratchFocused.current = true
			target.restoreFocus()
		},
		[current],
	)
	const clear = useCallback(() => {
		session.clearDirty(dirtyId, false)
		if (session.protection && scopeKey(session.protection) !== session.key &&
			scopeKey(session.protection) === scopeKey(latest.current.controller))
			session.protection.setTransientDirty(dirtyId, false)
	}, [session, dirtyId])
	useLayoutEffect(() => {
		// React StrictMode replays setup/cleanup without remounting the local draft.
		session.attached = true
		session.live = !session.configurationRetired && scopeKey(latest.current.controller) === session.key
		if (session.abort.signal.aborted) {
			session.abort = new AbortController()
		}
		return () => {
			session.live = false
			session.attached = false
			session.abort.abort()
			session.previewAbort?.abort()
			clear()
		}
	}, [session, clear])
	useLayoutEffect(() => {
		const retire = () => {
			const policy = getOrgCaptureConfiguration()
			if (policy.generation === session.configuration.generation && policy.configuration) return
			session.configurationRetired = true
			session.retired = true
			session.live = false
			session.abort.abort()
			session.previewAbort?.abort()
			session.previewRequest += 1
			session.preview = null
			session.parameterId = ++nextSession
			session.confirming = false
			setRetired(true)
			setPreview(null)
			setPreviewPending(false)
			setConfirmation(null)
			setSavedDrafts([])
			setPrefix(null)
			setError(`Capture configuration changed or is unavailable${policy.error && !getConfigurationError() ? `: ${policy.error}` : "."} This session is read-only and copyable; start a new Capture after reloading a valid configuration.`)
		}
		const unsubscribe = subscribeOrgCaptureConfiguration(retire)
		retire()
		return unsubscribe
	}, [session])
	useLayoutEffect(() => {
		if (scopeKey(props.controller) !== session.key) {
			session.retired = true
			setRetired(true)
			setError("Workspace grant changed. This draft is read-only and copyable; no retry or rollback was attempted.")
			session.live = false
			session.abort.abort()
			session.confirming = false
			setConfirmation(null)
			setSavedDrafts([])
			if (!session.protection || scopeKey(session.protection) !== scopeKey(props.controller)) {
				session.protection?.setTransientDirty(dirtyId, false)
				session.protection = props.controller.setTransientDirty(dirtyId, true) === true ? props.controller : null
			}
			session.previewAbort?.abort()
		}
	}, [props.controller, session, clear])
	const restore = useCallback(async () => {
		const origin = session.origin
		if (!current()) return
		const focused = document.activeElement
		const ownsParameter = !!offeredParameterRef.current && liveApplicationHost.current.ownsParameter(offeredParameterRef.current) &&
			!!liveApplicationHost.current.hostRef.current?.contains(focused)
		if (focused !== document.body && !scratch.current?.contains(focused) && !ownsParameter) return
		try {
			if (latest.current.onRestoreOrigin) {
				await latest.current.onRestoreOrigin(origin, session.abort.signal)
				return
			}
			if (origin.bufferId) {
				if (!latest.current.controller.openBuffers.some((buffer) => buffer.bufferId === origin.bufferId)) return
				const switched = await latest.current.controller.switchBuffer(origin.bufferId, session.abort.signal)
				if (!switched || !current()) return
			}
			if (session.focus?.isConnected) session.focus.focus()
		} catch {
			/* Restoration is best effort, never a retry of the write. */
		}
	}, [current, session])
	const saveSnapshot = (status: OrgCaptureDraftRecord["status"]): boolean => {
		const prepared = session.prepared
		const rootPath = session.origin.scope.rootPath
		if (!current() || !prepared || !rootPath) return false
		if (!recoveryEnabled) return true
		const expectedRevision = session.preview?.expectedRevision ??
			(session.journal?.target.relativePath === session.path ? session.journal.expectedRevision : undefined)
		const record: OrgCaptureDraftRecord = {
			version: 1,
			id: session.journal?.id ?? crypto.randomUUID(),
			rootPath,
			templateId: prepared.id,
			label: prepared.label,
			entryType: prepared.entryType,
			target: { ...prepared.target, relativePath: session.path },
			initialSource: prepared.initialSource,
			initialCursor: prepared.initialCursor,
			draft: session.draft,
			status,
			updatedAt: Date.now(),
			...(expectedRevision ? { expectedRevision } : {}),
			...(session.sourceRelativePath ? { sourceRelativePath: session.sourceRelativePath } : {}),
		}
		const saved = saveOrgCaptureDraft(record, { enabled: true })
		if (E.isLeft(saved)) {
			if (saved.left instanceof OrgCaptureDraftPublicationError) {
				session.retired = true
				setRetired(true)
			}
			setError(`Draft recovery failed: ${saved.left.message} Current text remains in memory.`)
			return false
		}
		session.journal = record
		return true
	}
	const removeJournal = (): boolean => {
		if (!current()) return false
		if (!session.journal) return true
		const removed = removeOrgCaptureDraft(session.journal.rootPath, session.journal.id)
		if (E.isLeft(removed)) {
			setError(`Saved Capture draft could not be removed: ${removed.left.message}`)
			return false
		}
		session.journal = null
		return true
	}
	const previewTarget = async (reviewChangedTarget = false) => {
		const prepared = session.prepared
		if (!current() || !prepared || session.pending || session.retired || session.closing) return
		session.previewAbort?.abort()
		const abort = new AbortController()
		session.previewAbort = abort
		const request = ++session.previewRequest
		const path = session.path
		const destination: OrgCaptureTarget = { ...prepared.target, relativePath: path }
		const checked = validateOrgCaptureTarget(destination)
		session.preview = null
		setPreview(null)
		if (E.isLeft(checked)) {
			setError(checked.left.message)
			setPreviewPending(false)
			return
		}
		setPreviewPending(true)
		setError(null)
		let result: OrgCaptureTargetOutcome
		try {
			const effect = latest.current.controller.readCaptureTarget(checked.right, abort.signal)
			session.effects.add(effect)
			try { result = await effect } finally { session.effects.delete(effect) }
		} catch {
			result = { kind: "rejected", message: "Target preview failed; no content write was requested." }
		}
		if (!current() || abort.signal.aborted || request !== session.previewRequest ||
			session.prepared !== prepared || session.path !== path || session.closing) return
		setPreviewPending(false)
		if (result.kind === "rejected") {
			setError(result.message)
			return
		}
		if (!reviewChangedTarget && session.recoveredRevision &&
			session.recoveredRevision !== result.expectedRevision) {
			setError("The target changed since this saved draft. It may already contain the entry. Open and reconcile it before explicitly refreshing the preview.")
			return
		}
		session.recoveredRevision = undefined
		session.preview = result
		setPreview(result)
		saveSnapshot("editing")
	}
	const install = (prepared: OrgPreparedCaptureTemplate, recovered?: OrgCaptureDraftRecord) => {
		if (!current() || session.pending || session.closing || session.configurationRetired) return
		session.prepared = prepared
		session.draft = recovered?.draft ?? prepared.initialSource
		session.path = prepared.target.relativePath
		session.journal = recovered ?? null
		session.sourceRelativePath = recovered?.sourceRelativePath ?? session.sourceRelativePath
		session.recoveredRevision = recovered?.expectedRevision
		session.initialDirty = E.isRight(validateOrgCaptureSource(prepared.initialSource, prepared.entryType))
		session.retired = recovered !== undefined && recovered.status !== "editing"
		latest.current.controller.setTransientDirty(dirtyId,
			session.initialDirty || session.draft !== prepared.initialSource || session.retired)
		setTemplate(prepared)
		setParameters(null)
		setDraft(session.draft)
		setTarget(session.path)
		setRetired(session.retired)
		if (session.retired) {
			setError("This saved Capture may have been published. Its draft is read-only and copyable. Open and reconcile the target; do not retry automatically.")
		} else {
			saveSnapshot("editing")
			void previewTarget()
		}
	}
	useLayoutEffect(() => {
		const rootPath = session.origin.scope.rootPath
		if (!current() || !rootPath || !recoveryEnabled) {
			setSavedDrafts([])
			return
		}
		const saved = readOrgCaptureDrafts(rootPath, { enabled: true })
		if (E.isLeft(saved)) setError(saved.left.message)
		else setSavedDrafts(saved.right)
	}, [current, recoveryEnabled, session])

	const cancel = useCallback(async () => {
		if (!session.attached || session.pending || session.confirming || session.closing) return false
		const closeScope = scopeKey(latest.current.controller)
		const closeGeneration = getOrgCaptureConfiguration().generation
		// An uncertain publication survives Dismiss as a read-only recovery record.
		if (current() && !session.retired && session.journal) {
			const removed = removeOrgCaptureDraft(session.journal.rootPath, session.journal.id)
			if (E.isLeft(removed)) {
				setError(`Cancellation could not delete the saved draft: ${removed.left.message} The draft remains open.`)
				return false
			}
			session.journal = null
		}
		session.closing = true
		session.previewAbort?.abort()
		setPending(true)
		clear()
		await restore()
		if (!session.attached || scopeKey(latest.current.controller) !== closeScope ||
			getOrgCaptureConfiguration().generation !== closeGeneration) {
			session.closing = false
			if (session.attached) setPending(false)
			return false
		}
		latest.current.onOpenChange(false)
		return true
	}, [clear, current, restore, session])
	const finish = async () => {
		const prepared = session.prepared
		if (!current() || session.pending || session.confirming || session.retired || session.closing ||
			latest.current.controller.isWorkspaceBlocked || latest.current.isToolEditable?.() === false || composing.current || !prepared) return
		const validation = validateOrgCaptureSource(session.draft, prepared.entryType)
		const report = latest.current.beginResult?.() ?? null
		const reject = (message: string) => { setError(message); report?.({ kind: "rejected", message }) }
		if (E.isLeft(validation)) {
			reject(validation.left.message)
			return
		}
		const destination = validateOrgCaptureTarget({ ...prepared.target, relativePath: session.path })
		if (E.isLeft(destination)) {
			reject(destination.left.message)
			return
		}
		const targetBuffer = latest.current.controller.liveBuffers.find((buffer) => buffer.document.relativePath === session.path)
		if (targetBuffer && latest.current.controller.getBufferEffectState(targetBuffer.bufferId)?.busy) {
			reject("The Capture target has a file operation in progress. Wait before finishing.")
			return
		}
		const confirmedPreview = session.preview
		if (!confirmedPreview || confirmedPreview.target.relativePath !== session.path) {
			reject("Preview and review the current target before confirming Capture.")
			return
		}
		session.pending = true
		setPending(true)
		setError(null)
		// Persist the non-retry marker before requesting a native content write.
		if (!saveSnapshot("publishing")) {
			session.pending = false
			setPending(false)
			report?.({ kind: "rejected", message: "Capture recovery status could not be persisted; no content write was requested." })
			return
		}
		let result: OrgCaptureOutcome
		try {
			const effect = latest.current.controller.captureEntry({
				entryType: prepared.entryType,
				entrySource: session.draft,
				target: confirmedPreview.target,
				expectedRevision: confirmedPreview.expectedRevision,
			})
			session.effects.add(effect)
			try { result = await effect } finally { session.effects.delete(effect) }
		} catch {
			result = { kind: "uncertain", message: "Capture ended unexpectedly." }
		}
		// The accepted canonical publication drains even after its producer lease retires.
		report?.({ kind: result.kind === "success" ? "success" : "rejected", message: result.message ?? (result.kind === "success" ? "Capture saved." : "Capture publication was not confirmed; the draft is retained.") })
		if (!current()) {
			session.pending = false
			if (session.attached) setPending(false)
			return // Durable publishing marker remains non-retryable.
		}
		if (result.kind === "success") {
			const removed = removeJournal()
			clear()
			await restore()
			if (!current()) return
			if (result.message || !removed) {
				session.pending = false
				session.retired = true
				setPending(false)
				setRetired(true)
				if (removed) setError(`Capture saved. ${result.message} No rollback was attempted.`)
			} else latest.current.onOpenChange(false)
			return
		}
		session.pending = false
		setPending(false)
		if (result.kind === "uncertain") {
			session.retired = true
			setRetired(true)
			const saved = saveSnapshot("uncertain")
			setError(`${result.message ?? "Capture could not be confirmed."} The target may already contain the entry. Reread and reconcile it; do not blindly retry. No rollback was attempted. You can select and copy this draft.${saved ? "" : " Recovery status could not be updated; any publishing marker remains read-only."}`)
		} else {
			// A guaranteed no-content-write rejection may start a fresh editing journal.
			if (!removeJournal()) {
				session.retired = true
				setRetired(true)
				return
			}
			saveSnapshot("editing")
			session.preview = null
			setPreview(null)
			setError(result.message ?? "Capture was rejected before writing. Check the draft and preview the target again.")
		}
	}
	const minibuffer = useMemo<OrgMinibufferSession>(
		() => ({
			acceptCandidate: true,
			candidates: configuration?.templates.map((entry) => entry.id) ?? [],
			annotatedCandidates: configuration?.templates.map((entry) => ({
				value: entry.id, label: entry.label, detail: `${entry.entryType} · ${entry.target.kind} · ${entry.target.relativePath}`,
			})) ?? [],
			completion: "value",
			historyKey: "org-capture-template",
			id: session.id,
			initialInput: "",
			onAccept: (value) => {
				if (!current() || latest.current.isToolEditable?.() === false) return { message: "Capture scope or tool window changed.", ok: false }
				if (!configuration) return { message: session.configuration.error ?? "Capture configuration is unavailable.", ok: false }
				const selected = configuration.templates.find((entry) => entry.id === value)
				if (!selected) return { message: "Choose a configured Capture template.", ok: false }
				const context = session.context(selected.target)
				session.sourceRelativePath = context.sourceRelativePath
				const planned = planOrgCaptureTemplate(selected, context)
				if (E.isLeft(planned)) return { message: planned.left.message, ok: false }
				if (planned.right.prompts.length) {
					session.parameterId = ++nextSession
					setParameters({ plan: planned.right, answers: [], id: session.parameterId })
					return { ok: true }
				}
				const prepared = renderOrgCaptureTemplate(planned.right, [])
				if (E.isLeft(prepared)) return { message: prepared.left.message, ok: false }
				install(prepared.right)
				return { ok: true }
			},
			onCancel: () => { if (current()) latest.current.requestDismiss ? latest.current.requestDismiss() : void cancel() },
			prompt: "Capture template:",
		}),
		[session, cancel, current, configuration],
	)
	const promptSession = useMemo<OrgMinibufferSession | null>(() => {
		if (!parameters) return null
		const prompt = parameters.plan.prompts[parameters.answers.length]
		return {
			id: parameters.id,
			prompt: prompt.label,
			initialInput: prompt.initialInput,
			candidates: prompt.candidates,
			completion: "value",
			// Capture answers must not leak into persistent parameter history.
			onAccept: (value) => {
				if (!current() || session.parameterId !== parameters.id || latest.current.isToolEditable?.() === false)
					return { message: "Capture prompt is no longer current.", ok: false }
				const answers = [...parameters.answers, value]
				if (answers.length < parameters.plan.prompts.length) {
					latest.current.controller.setTransientDirty(dirtyId, answers.some((answer) => !!answer.trim()))
					session.parameterId = ++nextSession
					setParameters({ ...parameters, answers, id: session.parameterId })
					return { ok: true }
				}
				const prepared = renderOrgCaptureTemplate(parameters.plan, answers)
				if (E.isLeft(prepared)) return { message: prepared.left.message, ok: false }
				install(prepared.right)
				return { ok: true }
			},
			onCancel: () => { if (current()) latest.current.requestDismiss ? latest.current.requestDismiss() : void cancel() },
		}
	}, [parameters, current, cancel, dirtyId, session])
	const offeredParameter = !template && current() && !session.closing ? promptSession ?? minibuffer : null
	offeredParameterRef.current = offeredParameter
	useApplicationParameterRegistration(session, offeredParameter)
	const fence = useRef({ draft, target, parameterId: parameters?.id, retired, scope: scopeKey(props.controller), version: 0 })
	const nextScope = scopeKey(props.controller)
	if (fence.current.draft !== draft || fence.current.target !== target || fence.current.parameterId !== parameters?.id ||
		fence.current.retired !== retired || fence.current.scope !== nextScope)
		fence.current = { draft, target, parameterId: parameters?.id, retired, scope: nextScope, version: fence.current.version + 1 }
	useLayoutEffect(() => {
		props.onToolLifecycle?.({
			state: {
				dirty: (!!template && (session.initialDirty || draft !== template.initialSource || target !== template.target.relativePath || retired)) || !!parameters?.answers.some((answer) => answer.trim()),
				pending: session.pending,
				readOnly: retired || !current() || sourceReadOnly,
				fence: fence.current.version,
			},
			close: cancel,
			ownsFocus: () => !!offeredParameter && liveApplicationHost.current.ownsParameter(offeredParameter) && !!liveApplicationHost.current.hostRef.current?.contains(document.activeElement),
			dispose: async () => {
				session.previewAbort?.abort()
				session.abort.abort()
				await Promise.allSettled([...session.effects])
			},
		})
	}, [props.onToolLifecycle, props.controller.workspaceSessionId, props.controller.workspace?.capabilityToken, template, parameters, session, draft, target, retired, pending, cancel, current, sourceReadOnly])
	const executeInputCommand = (id: string): boolean => {
		if (id === "org-capture.finish") {
			if (!current() || session.pending || session.confirming || session.retired || session.closing || sourceReadOnly || composing.current) return false
			void finish()
			return true
		}
		if (id === "org-capture.cancel") {
			if (!session.attached || session.pending || session.confirming || session.closing) return false
			if (latest.current.requestDismiss) latest.current.requestDismiss()
			else void cancel()
			return true
		}
		return false
	}
	const outerInput = useOrgScopedInput({
		scope: "org-capture", owner: session,
		active: !!template && current() && !session.closing && !session.retired && !session.pending && !session.confirming,
		execute: executeInputCommand,
		onUnavailable: (id) => setError(`Input command "${id}" is unavailable in this tool window.`),
	})
	if (!template) return (
		<div data-org-capture-template-minibuffer="true">
			{configurationSnapshot.error && !getConfigurationError() && <p role="alert">Capture configuration: {configurationSnapshot.error} Edit capture in config.json, then run Reload configuration.</p>}
			{configuration && !configuration.templates.length && <output className="block">No Capture templates configured. Edit capture.templates in config.json, then run Reload configuration; saved drafts remain separately recoverable when opted in.</output>}
			{error && <p role="alert">{error}</p>}
			{retired && <Button type="button" size="sm" variant="ghost" onClick={() => { latest.current.requestDismiss ? latest.current.requestDismiss() : void cancel() }}>Dismiss (no rollback)</Button>}
			{!retired && !parameters && recoveryEnabled && savedDrafts.length > 0 && (
				<section aria-label="Saved Capture drafts" className="bg-muted/20 p-3">
					<p>Saved drafts are plaintext, not file authority. Resume never writes automatically.</p>
					{savedDrafts.map((record) => (
						<button key={record.id} type="button" className="block"
							onClick={() => install({
								id: record.templateId, label: record.label, entryType: record.entryType,
								target: record.target, initialSource: record.initialSource, initialCursor: record.initialCursor,
							}, record)}>
							{record.status === "editing" ? "Resume" : "View read-only"} saved Capture: {record.label} · {record.target.relativePath}
						</button>
					))}
				</section>
			)}
		</div>
	)
	const update = (source: string, path: string) => {
		if (!current() || session.pending || session.confirming || session.closing || session.retired || latest.current.isToolEditable?.() === false ||
			latest.current.controller.isWorkspaceBlocked || (session.origin.bufferId && latest.current.controller.getBufferEffectState(session.origin.bufferId)?.readOnly)) return
		outerInput.cancel()
		latest.current.controller.setTransientDirty(dirtyId,
			session.initialDirty || source !== template.initialSource || path !== template.target.relativePath)
		const targetChanged = path !== session.path
		session.draft = source
		session.path = path
		if (targetChanged) {
			session.previewAbort?.abort()
			session.previewRequest += 1
			session.preview = null
			session.recoveredRevision = undefined
			setPreview(null)
			setPreviewPending(false)
		}
		setDraft(source)
		setTarget(path)
		setError(null)
		saveSnapshot("editing")
	}
	return (
		<>
		<section
			aria-label="Org capture tool buffer"
			data-org-parameter-input="true"
			data-org-capture-tool-window="true"
			aria-busy={pending || sourceReadOnly}
			className="flex max-h-[min(65vh,36rem)] min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-auto bg-muted/20 p-3"
			onCompositionStart={() => { composing.current = true }}
			onCompositionEnd={() => {
				composing.current = false
			}}
			onKeyDown={(event) => {
				event.stopPropagation()
				// Source owns its own prefix lease; controls retain a focus-bound tool lease.
				if (event.target instanceof Node && scratch.current?.contains(event.target)) return
				outerInput.handleKeyDown(event.nativeEvent, {
					isComposing: composing.current,
					isParameterInput: Boolean((event.target as Element | null)?.closest?.("[data-org-parameter-session]")),
				})
				if (event.nativeEvent.defaultPrevented) event.preventDefault()
			}}
		>
			<header className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<h2 className="min-w-0 break-words font-medium">Capture · {template.label}</h2>
				<span className="text-xs text-muted-foreground">
					{recoveryEnabled ? "Recovery on · unencrypted local draft" : "Recovery off · memory-only draft"}
				</span>
			</header>
			<label className="flex shrink-0 items-center gap-2 text-xs">
				<span className="shrink-0">Target file</span>
				<Input
					aria-label="Capture target file"
					className="h-8 min-w-0 font-mono text-xs md:text-xs"
					value={target}
					readOnly={pending || retired || sourceReadOnly}
					onChange={(event) => update(draft, event.target.value)}
				/>
			</label>
			{preview && <output aria-label="Capture target preview" className="block shrink-0 break-words text-xs">
				<span className="font-medium">Reviewed target: </span>
				{preview.target.relativePath} · {preview.preview.headingPath.join(" / ") || "file end"} · line {preview.preview.line}
				{preview.preview.createdHeadings.length > 0 && ` · creates ${preview.preview.createdHeadings.join(" / ")}`}
			</output>}
			{session.configurationRetired && <output className="block shrink-0 text-xs">
				Configuration lease retired: read-only scratch; existing recovery checkpoints are retained without new writes.
			</output>}
			{error && <p role="alert" className="shrink-0 break-words text-sm">{error}</p>}
			{!pending && sourceReadOnly && (
				<output className="block shrink-0 text-sm">
					The originating buffer is temporarily read-only; the Capture draft is retained. You can cancel.
				</output>
			)}
			{pending && (
				<output className="block shrink-0 text-sm">
					{session.closing
						? "Restoring capture origin…"
						: "Finishing capture… Cancellation is unavailable while the write is pending."}
				</output>
			)}
			<div ref={scratch} className="h-[clamp(14rem,32vh,22rem)] min-h-0 shrink-0 overflow-auto bg-background">
				<OrgEditor
					sessionKey={`org-capture:${session.id}`}
					value={draft}
					initialCursor={template.initialCursor}
					onCommandTarget={focusScratch}
					inputScope="org-capture"
					onInputCommand={executeInputCommand}
					onPrefixChange={setPrefix}
					onChange={(value) => update(value, target)}
					onSave={() => {
						void finish()
					}}
					readOnly={pending || retired || confirmation !== null || sourceReadOnly}
					getEditPermission={() => current() && !session.pending && !session.confirming && !session.retired && !session.closing &&
						!latest.current.controller.isWorkspaceBlocked && !(session.origin.bufferId && latest.current.controller.getBufferEffectState(session.origin.bufferId)?.readOnly)}
					ariaLabel="Capture Org draft"
				/>
			</div>
			<OrgWhichKey prefix={outerInput.prefix ?? prefix} getInputCommandDisabledReason={(id) =>
				id === "org-capture.finish" && (pending || retired || sourceReadOnly || confirmation !== null)
					? "Capture is not editable" : id === "org-capture.cancel" && pending ? "Publication is pending" : null} />
			<details className="shrink-0 text-xs">
				<summary className="cursor-pointer rounded-md py-2 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">Details &amp; help</summary>
				<div className="max-h-32 space-y-2 overflow-auto break-words py-2">
					<p>
						Scratch Org buffer · Type: {template.entryType} · Target: {template.target.kind}
						{template.target.kind !== "file" && ` · ${(template.target.headingPath ?? []).join(" / ") || "file root"}`}
						{template.target.kind === "datetree" && ` · frozen date ${template.target.date}`}
					</p>
					{preview && <p className="break-all">Finish confirms this exact revision: {preview.expectedRevision}</p>}
					<p>{recoveryEnabled
						? "Draft recovery opted in: unencrypted local scratch; no grant or automatic source write."
						: "Draft recovery off: this scratch stays in memory only."}</p>
					<p>Default keys: C-c C-c / Mod-S finish · C-c C-k / C-g cancel. Configure tool keys in config.json under keymaps.</p>
				</div>
			</details>
			<footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center gap-2 bg-background py-2">
				{!retired && <Button type="button" size="sm" variant="outline" disabled={pending || previewPending || sourceReadOnly}
					onClick={() => {
						if (!current() || session.retired || session.pending || session.closing) return
						if (session.recoveredRevision) {
							session.confirming = true
							setConfirmation({ kind: "refresh", path: session.path, journalId: session.journal?.id ?? null })
						} else void previewTarget()
					}}>
					{previewPending ? "Reading target preview…" : "Preview target"}
				</Button>}
				{!retired && (
					<Button
						type="button"
						size="sm"
						disabled={pending || previewPending || sourceReadOnly}
						onClick={() => {
							void finish()
						}}
					>
						Finish
					</Button>
				)}
				<Button
					type="button"
					size="sm"
					variant="ghost"
					disabled={pending}
					onClick={() => {
						if (latest.current.requestDismiss) latest.current.requestDismiss()
						else void cancel()
					}}
				>
					{retired ? "Dismiss (no rollback)" : "Cancel"}
				</Button>
				{!session.configurationRetired && (retired || session.recoveredRevision) && <Button type="button" size="sm" variant="outline"
					className="h-auto min-h-8 whitespace-normal py-1"
					disabled={pending || props.controller.isWorkspaceBlocked}
					onClick={() => void props.controller.openDocumentPath(target)}>
					Open target to reconcile
				</Button>}
				{retired && !session.configurationRetired && session.journal && <Button type="button" size="sm" variant="outline" disabled={pending}
					onClick={() => {
						if (!current() || session.pending || session.closing) return
						session.confirming = true
						setPrefix(null)
						setConfirmation({ kind: "delete", path: session.path, journalId: session.journal?.id ?? null })
					}}>Delete saved draft</Button>}
			</footer>
		</section>
		<OrgConfirmDialog
			open={confirmation !== null}
			title={confirmation?.kind === "delete" ? "Delete saved Capture draft?" : "Confirm target reconciliation"}
			description={confirmation?.kind === "delete"
				? "Delete only this saved draft? This does not roll back or change its target file; the current copy remains read-only."
				: "The target may already contain this saved Capture. Open and reconcile it before accepting. Refreshing only reads the target and permits a later, separate Finish confirmation."}
			confirmLabel={confirmation?.kind === "delete" ? "Delete saved draft only" : "I reconciled the target; refresh preview"}
			destructive={confirmation?.kind === "delete"}
			onOpenChange={(open) => {
				if (!open) {
					session.confirming = false
					setConfirmation(null)
				}
			}}
			onConfirm={() => {
				const request = confirmation
				session.confirming = false
				setConfirmation(null)
				if (!request || !current() || session.pending || latest.current.controller.isWorkspaceBlocked ||
					request.path !== session.path || request.journalId !== (session.journal?.id ?? null)) return
				if (request.kind === "refresh") {
					if (!session.retired) void previewTarget(true)
				} else if (removeJournal()) {
					setError("Saved draft deleted. The target file was not changed; this copy remains read-only.")
				}
			}}
		/>
		</>
	)
}
