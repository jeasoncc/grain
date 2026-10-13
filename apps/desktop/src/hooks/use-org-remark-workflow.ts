import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import type { ApplicationCommandResult, ApplicationResultPublisher } from "@/views/application/application-command-provider"
import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"
import type { OrgCommandEditorContext, OrgCommandId } from "@/flows/org-command/org-workspace-command"
import type { OrgBufferRuntime } from "@/flows/org-editor-runtime"
import { createOrgRemarkTracker, type OrgRemarkSnapshot, type OrgRemarkTracker } from "@/flows/org-editor-runtime/org-remark-tracker"
import { ORG_REMARK_PENS, orgRemarkAtPoint, orgRemarkNavigate, orgRemarkNotesPath, parseOrgRemarkNotes, selectOrgRemarkSource } from "@/pipes/org/org-remark.pipe"
import type { OrgRemarkAction, OrgRemarkEntry } from "@/pipes/org/org-remark.types"
import type { OrgRemarkNotesContext, OrgRemarkSourceCapture } from "@/types/org/org-remark-workflow.types"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import type { OrgLiveBuffer, OrgWorkspaceController } from "./use-org-workspace"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import { orgPropertyDrawerAt, structuralOrgSourceLines } from "@/pipes/org/org-text.pipe"

interface RemarkAnchorMetadata {
	readonly key: string
	readonly label: string
	readonly originalText: string
}

/** Compare persisted coordinates without decoding them against a Source that may have changed length. */
function remarkAnchorMetadata(notes: string, sourcePath: string): ReadonlyMap<string, RemarkAnchorMetadata> {
	const records = new Map<string, RemarkAnchorMetadata>()
	const ancestors: { readonly level: number; readonly sourceFile: string | null }[] = []
	const filename = sourcePath.slice(sourcePath.lastIndexOf("/") + 1)
	for (const line of structuralOrgSourceLines(notes)) {
		const heading = /^(\*+)[ \t]+/.exec(line.text)
		if (!heading) continue
		const level = heading[1].length
		while (ancestors.length && ancestors[ancestors.length - 1].level >= level) ancestors.pop()
		const drawer = orgPropertyDrawerAt(notes, line.from)
		const fields = new Map(drawer?.kind === "drawer" ? drawer.properties.map((property) => [property.key.toLowerCase(), property.value]) : [])
		const sourceFile = fields.get("org-remark-file") ?? ancestors[ancestors.length - 1]?.sourceFile ?? null
		ancestors.push({ level, sourceFile })
		const id = fields.get("org-remark-id")
		const type = fields.get("org-remark-type") ?? "nil"
		if (!id || sourceFile !== filename || (type !== "nil" && type !== "line")) continue
		records.set(id, {
			key: JSON.stringify([fields.get("org-remark-beg"), fields.get("org-remark-end"), type]),
			label: fields.get("org-remark-label") ?? "nil", originalText: fields.get("org-remark-original-text") ?? "",
		})
	}
	return records
}

interface TrackerSlot {
	readonly tracker: OrgRemarkTracker
	readonly unsubscribe: () => void
	savedRevision: string | null
	failedLoad: string | null
	failedSync: string | null
	syncing: boolean
	loadedNotes: { readonly notes: OrgRemarkNotesContext; readonly anchors: ReadonlyMap<string, RemarkAnchorMetadata> } | null
}
interface RemarkRequest {
	readonly lease: ParameterLease
	readonly scope: string
	readonly target: OrgEditorCommandTarget
	readonly context: OrgCommandEditorContext
	source: OrgRemarkSourceCapture
	readonly tracker: OrgRemarkTracker
	readonly focus: Element | null
	unsubscribe: (() => void) | null
	notes: OrgRemarkNotesContext | null
	committing: boolean
	readonly report: ApplicationResultPublisher | null
	parameterized: boolean
}
interface RemarkPanelState {
	readonly source: OrgRemarkSourceCapture
	readonly notes: OrgRemarkNotesContext
	readonly entryId: string | null
	readonly scope: string
	readonly focusRequest: number
	readonly focus: boolean
	readonly origin: ApplicationToolOrigin
	readonly retired: boolean
}
export interface OrgRemarkPanel {
	readonly sourcePath: string
	readonly notes: OrgRemarkNotesContext
	readonly entry: OrgRemarkEntry | null
	readonly focusRequest: number
	readonly focus: boolean
	readonly readOnly: boolean
	readonly retired: boolean
	readonly origin: ApplicationToolOrigin
}
export interface OrgRemarkWorkflow {
	readonly session: OrgMinibufferSession | null
	readonly parameterResult: ApplicationCommandResult | null
	readonly echo: string | null
	readonly owned: boolean
	readonly pending: boolean
	readonly cancel: () => void
	readonly execute: (id: OrgCommandId) => boolean
	readonly snapshots: ReadonlyMap<OrgBufferRuntime, OrgRemarkSnapshot>
	readonly panel: OrgRemarkPanel | null
	readonly noteFocused: boolean
	readonly closePanel: () => void
	readonly returnToSource: () => void
	readonly saveNotes: () => void
	readonly drainNotes: () => Promise<void>
}
const sourceCapture = (buffer: OrgLiveBuffer, session: string, windowId: string | null): OrgRemarkSourceCapture => ({
	workspaceSessionId: session, relativePath: buffer.document.relativePath, bufferId: buffer.bufferId,
	runtimeIncarnation: buffer.runtimeIncarnation, sourceGeneration: buffer.runtime.revision,
	remarkVersion: createOrgRemarkTracker(buffer.runtime).getSnapshot().version,
	source: buffer.runtime.source, windowId,
})
const notesContext = (buffer: OrgLiveBuffer, controller: OrgWorkspaceController): OrgRemarkNotesContext => ({
	workspaceSessionId: controller.workspaceSessionId!, rootPath: controller.workspace!.rootPath,
	document: buffer.document, content: buffer.runtime.source, bufferId: buffer.bufferId,
	runtime: buffer.runtime, runtimeIncarnation: buffer.runtimeIncarnation, sourceGeneration: buffer.runtime.revision,
})

/** One root reservoir; views consume projections, sidecars own every annotation edit/undo. */
export function useOrgRemarkWorkflow({ controller, getTarget, suspended = false, beginResult }: {
	readonly controller: OrgWorkspaceController
	readonly getTarget: () => OrgEditorCommandTarget | null
	readonly suspended?: boolean
	readonly beginResult?: () => ApplicationResultPublisher | null
}): OrgRemarkWorkflow {
	const latest = useRef({ controller, getTarget, suspended, beginResult })
	latest.current = { controller, getTarget, suspended, beginResult }
	const [core] = useState(createParameterSession)
	const { session, lease } = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const slots = useRef(new Map<OrgBufferRuntime, TrackerSlot>())
	const active = useRef<RemarkRequest | null>(null)
	const liveNotes = useRef(new Map<OrgBufferRuntime, () => void>())
	const panelOrigin = useRef<ApplicationToolOrigin | null>(null)
	const mounted = useRef(true)
	const autoRead = useRef<AbortController | null>(null)
	const [, render] = useState(0)
	const noteEffects = useRef(new Set<Promise<unknown>>())
	const [echo, setEcho] = useState<string | null>(null)
	const [parameterResult, setParameterResult] = useState<ApplicationCommandResult | null>(null)
	const [panel, setPanel] = useState<RemarkPanelState | null>(null)
	const [noteFocused, setNoteFocused] = useState(false)
	const [pendingFocus, setPendingFocus] = useState<{ request: RemarkRequest; focus: Element | null; host: Element | null } | null>(null)
	const scope = JSON.stringify([controller.workspace?.rootPath, controller.workspace?.capabilityToken, controller.workspaceSessionId])
	const scopeRef = useRef(scope)
	scopeRef.current = scope
	const publish = () => { queueMicrotask(() => { if (mounted.current) render((value) => value + 1) }) }
	const refreshLiveNotes = () => {
		const c = latest.current.controller
		for (const buffer of c.liveBuffers) {
			const slot = slots.current.get(buffer.runtime)
			if (!slot || slot.syncing || !slot.loadedNotes) continue
			// An accepted Remark mutation owns its original tracker version until its save receipt settles.
			if (active.current?.committing && active.current.source.bufferId === buffer.bufferId) continue
			const note = c.liveBuffers.find((entry) => entry.document.relativePath === orgRemarkNotesPath(buffer.document.relativePath))
			if (!note || note.runtime.closed) continue
			const loaded = slot.loadedNotes
			if (loaded.notes.runtime === note.runtime && loaded.notes.runtimeIncarnation === note.runtimeIncarnation &&
				loaded.notes.sourceGeneration === note.runtime.revision) continue
			const before = slot.tracker.getSnapshot()
			const parsed = parseOrgRemarkNotes(note.runtime.source, buffer.document.relativePath, buffer.runtime.source)
			if (parsed.kind === "rejected") continue
			const retainMappedAnchors = !loaded.notes.runtime ||
				(loaded.notes.runtime === note.runtime && loaded.notes.runtimeIncarnation === note.runtimeIncarnation)
			const anchors = remarkAnchorMetadata(note.runtime.source, buffer.document.relativePath)
			if (!before.needsReload && retainMappedAnchors) {
				// Sidecar prose/pen edits must not reset anchors already mapped through unsaved source edits.
				const marks = new Map(parsed.marks.map((mark) => [mark.id, { ...mark, collapsed: false }]))
				for (const live of before.marks) {
					const previous = loaded.anchors.get(live.id)
					const next = anchors.get(live.id)
					if (previous && next && previous.key === next.key)
						marks.set(live.id, live.label === next.label && live.originalText === next.originalText
							? live : { ...live, label: next.label, originalText: next.originalText })
				}
				if (!slot.tracker.reconcile(before, [...marks.values()], before.dirty)) continue
			} else if (!slot.tracker.install(buffer.runtime.source, buffer.runtime.revision, parsed.marks)) continue
			slot.loadedNotes = { notes: notesContext(note, c), anchors }
		}
	}
	const release = (request: RemarkRequest, message: string, restore = false, kind: ApplicationCommandResult["kind"] = "rejected") => {
		request.unsubscribe?.()
		request.unsubscribe = null
		core.retire(request.lease)
		if (active.current === request) active.current = null
		if (!mounted.current || scopeRef.current !== request.scope) return
		setEcho(message)
		setParameterResult(request.parameterized ? { kind, message } : null)
		request.report?.({ kind, message })
		const focused = document.activeElement
		const host = focused?.closest(`[data-org-parameter-session="${request.lease.id}"]`) ?? null
		if (restore && document.hasFocus() && (focused === request.focus || host))
			setPendingFocus({ request, focus: focused, host })
	}
	const currentRequest = (request: RemarkRequest) => {
		if (!mounted.current || active.current !== request || !core.current(request.lease) || scopeRef.current !== request.scope ||
			latest.current.getTarget() !== request.target) return false
		const focused = document.activeElement
		if (focused !== request.focus && !focused?.closest(`[data-org-parameter-session="${request.lease.id}"]`)) return false
		const context = request.target.getCommandContext()
		const live = latest.current.controller.liveBuffers.find((buffer) => buffer.bufferId === request.source.bufferId)
		return context.available && context.windowId === request.context.windowId && context.ownership === request.context.ownership && context.revision === request.context.revision &&
			context.content === request.context.content && context.relativePath === request.context.relativePath &&
			context.cursor === request.context.cursor && context.selectionFrom === request.context.selectionFrom &&
			context.selectionTo === request.context.selectionTo && context.selectionRangeCount === request.context.selectionRangeCount &&
			live?.runtimeIncarnation === request.source.runtimeIncarnation && live.runtime.revision === request.source.sourceGeneration &&
			request.tracker.getSnapshot().version === request.source.remarkVersion
	}
	// The child editor restores its writable compartment in a passive effect.
	useEffect(() => {
		if (!pendingFocus || controller.isWorkspaceBlocked || controller.getBufferEffectState(pendingFocus.request.source.bufferId)?.readOnly || lease) return
		setPendingFocus(null)
		const { request, focus, host } = pendingFocus
		if (!mounted.current || scopeRef.current !== request.scope || latest.current.suspended ||
			latest.current.getTarget() !== request.target || !document.hasFocus() ||
			(document.activeElement !== focus && !(host && !host.isConnected && document.activeElement === document.body))) return
		const context = request.target.getCommandContext()
		const buffer = latest.current.controller.liveBuffers.find((entry) => entry.bufferId === request.source.bufferId)
		if (context.available && !context.readOnly && context.ownership === request.context.ownership && context.windowId === request.context.windowId && context.revision === request.context.revision &&
			context.relativePath === request.context.relativePath && context.content === request.context.content &&
			context.cursor === request.context.cursor && context.selectionFrom === request.context.selectionFrom &&
			context.selectionTo === request.context.selectionTo && context.selectionRangeCount === request.context.selectionRangeCount &&
			buffer?.runtimeIncarnation === request.source.runtimeIncarnation && buffer.runtime.revision === request.source.sourceGeneration)
			request.target.restoreFocus()
	}, [pendingFocus, controller, lease, suspended])
	const cancel = () => {
		const request = active.current
		if (request && !request.committing && core.cancel(request.lease)) release(request, "Remark command cancelled; no annotation was changed.", true, "cancelled")
	}
	useLayoutEffect(() => {
		mounted.current = true
		core.attach()
		setPanel(null)
		setNoteFocused(false)
		setEcho(null)
		return () => {
			mounted.current = false
			panelOrigin.current = null
			autoRead.current?.abort()
			autoRead.current = null
			active.current?.unsubscribe?.()
			active.current = null
			core.detach()
			for (const slot of slots.current.values()) { slot.unsubscribe(); slot.tracker.close() }
			for (const unsubscribe of liveNotes.current.values()) unsubscribe()
			liveNotes.current.clear()
			slots.current.clear()
		}
	}, [core, scope])
	useLayoutEffect(() => {
		let changed = false
		const retained = new Set(controller.liveBuffers.filter((buffer) => !buffer.document.relativePath.endsWith("-notes.org")).map((buffer) => buffer.runtime))
		for (const [runtime, slot] of slots.current) if (!retained.has(runtime) || runtime.closed) {
			slot.unsubscribe(); slot.tracker.close(); slots.current.delete(runtime); changed = true
		}
		for (const runtime of retained) if (!runtime.closed && !slots.current.has(runtime)) {
			const tracker = createOrgRemarkTracker(runtime)
			slots.current.set(runtime, { tracker, unsubscribe: tracker.subscribe(publish), savedRevision: null, failedLoad: null, failedSync: null, syncing: false, loadedNotes: null })
			changed = true
		}
		if (changed) publish()
		const notes = new Set(controller.liveBuffers.filter((buffer) => buffer.document.relativePath.endsWith("-notes.org")).map((buffer) => buffer.runtime))
		for (const [runtime, unsubscribe] of liveNotes.current) if (!notes.has(runtime) || runtime.closed) {
			unsubscribe(); liveNotes.current.delete(runtime)
		}
		for (const runtime of notes) if (!runtime.closed && !liveNotes.current.has(runtime))
			liveNotes.current.set(runtime, runtime.subscribeCommits(() => { refreshLiveNotes(); publish() }))
		refreshLiveNotes()
	})
	useEffect(() => {
		const focused = (event: FocusEvent) => {
			const element = event.target instanceof Element ? event.target : null
			if (element?.closest('[data-org-remark-note-window]')) setNoteFocused(true)
			else if (element?.closest('[data-org-editor-window]')) setNoteFocused(false)
		}
		document.addEventListener("focusin", focused)
		return () => document.removeEventListener("focusin", focused)
	}, [])
	const buffers = controller.liveBuffers.filter((buffer) => !buffer.document.relativePath.endsWith("-notes.org"))
	const requests = buffers.flatMap((buffer) => {
		const slot = slots.current.get(buffer.runtime)
		if (!slot || slot.syncing) return []
		const snapshot = slot.tracker.getSnapshot()
		const revision = controller.workspace?.documents.find((entry) => entry.relativePath === orgRemarkNotesPath(buffer.document.relativePath))?.revision ?? "<missing>"
		const note = controller.liveBuffers.find((entry) => entry.document.relativePath === orgRemarkNotesPath(buffer.document.relativePath))
		const key = `${buffer.runtimeIncarnation}:${buffer.runtime.revision}:${snapshot.version}:${revision}:${note?.runtimeIncarnation ?? ""}:${note?.runtime.revision ?? ""}`
		if ((snapshot.needsReload || (!buffer.isDirty && slot.savedRevision !== revision)) && slot.failedLoad !== key)
			return [{ buffer, slot, key, revision, sync: false }]
		if (!buffer.isDirty && snapshot.dirty && !snapshot.needsReload && slot.failedSync !== key)
			return [{ buffer, slot, key, revision, sync: true }]
		return []
	})
	const workKey = requests.map((request) => `${request.sync}:${request.key}`).join("\u0000")
	const readEligibility = useRef("")
	// An accepted owned read is not invalidated by unrelated controller renders.
	if (!autoRead.current) readEligibility.current = JSON.stringify([
		controller.isWorkspaceBlocked,
		requests.map(({ buffer }) => {
			const notes = controller.liveBuffers.find((entry) => entry.document.relativePath === orgRemarkNotesPath(buffer.document.relativePath))
			return [buffer.bufferId, controller.getBufferEffectState(buffer.bufferId)?.readOnly, notes ? controller.getBufferEffectState(notes.bufferId)?.busy : false]
		}),
	])
	useEffect(() => {
		if (!controller.workspaceSessionId || controller.isWorkspaceBlocked || lease || !requests.length) return
		const abort = new AbortController()
		autoRead.current = abort
		const capturedScope = scope
		void (async () => {
			for (const request of requests) {
				if (abort.signal.aborted || !mounted.current || scopeRef.current !== capturedScope) break
				const { buffer, slot } = request
				const notesPath = orgRemarkNotesPath(buffer.document.relativePath)
				const note = controller.liveBuffers.find((entry) => entry.document.relativePath === notesPath)
				if (controller.getBufferEffectState(buffer.bufferId)?.readOnly || (note && controller.getBufferEffectState(note.bufferId)?.busy)) continue
				if (!request.sync && !controller.workspace?.documents.some((entry) => entry.relativePath === notesPath) &&
					!controller.liveBuffers.some((entry) => entry.document.relativePath === notesPath)) {
					slot.tracker.install(buffer.runtime.source, buffer.runtime.revision, [])
					slot.savedRevision = "<missing>"
					slot.failedLoad = null
					continue
				}
				const source = sourceCapture(buffer, controller.workspaceSessionId!, null)
				const before = slot.tracker.getSnapshot()
				const result = await latest.current.controller.readRemarkNotes(source, abort.signal)
				if (abort.signal.aborted || !mounted.current || scopeRef.current !== capturedScope || slot.tracker.getSnapshot().version !== before.version) break
				if (result.kind !== "ready") {
					slot.failedLoad = request.key
					if (result.kind === "rejected" && buffer.bufferId === latest.current.controller.activeBufferId) setEcho(result.message)
					continue
				}
				if (result.notes.runtime && (result.notes.runtime.closed || result.notes.runtime.revision !== result.notes.sourceGeneration)) continue
				if (!request.sync && result.notes.document.revision !== request.revision) {
					slot.failedLoad = request.key
					if (buffer.bufferId === latest.current.controller.activeBufferId) setEcho("Remark notes changed on disk; the canonical draft and source anchors were retained. Resolve the sidecar conflict before reloading.")
					continue
				}
				if (request.sync) {
					// A cancelled read cannot discard the receipt of an already-owned sidecar CAS.
					slot.syncing = true
					try {
						const saved = await latest.current.controller.executeRemarkMutation(source, result.notes, { type: "sync", marks: before.marks })
						if (!mounted.current || scopeRef.current !== capturedScope || slots.current.get(buffer.runtime) !== slot) break
						if (saved.kind !== "confirmed") {
							slot.failedSync = request.key
							if ("message" in saved) setEcho(saved.message)
							continue
						}
						slot.tracker.reconcile(before, before.marks.filter((mark) => !mark.collapsed), false)
						slot.savedRevision = saved.notes.document.revision
						slot.loadedNotes = { notes: saved.notes, anchors: remarkAnchorMetadata(saved.notes.content, source.relativePath) }
						slot.failedSync = null
					} finally {
						slot.syncing = false
					}
				} else {
					const parsed = parseOrgRemarkNotes(result.notes.content, source.relativePath, source.source)
					if (parsed.kind === "rejected") {
						slot.failedLoad = request.key
						if (buffer.bufferId === latest.current.controller.activeBufferId) setEcho(parsed.message)
					} else if (slot.tracker.install(source.source, source.sourceGeneration, parsed.marks)) {
						slot.savedRevision = result.notes.document.revision
						slot.failedLoad = null
						slot.loadedNotes = { notes: result.notes, anchors: remarkAnchorMetadata(result.notes.content, source.relativePath) }
						if (parsed.diagnostics.length && buffer.bufferId === latest.current.controller.activeBufferId) setEcho(parsed.diagnostics.map((item) => item.message).join(" "))
					}
				}
			}
			publish()
		})().finally(() => { if (autoRead.current === abort) autoRead.current = null })
		return () => abort.abort()
	}, [scope, workKey, readEligibility.current, lease])
	const openPanel = (request: RemarkRequest, notes: OrgRemarkNotesContext, entry: OrgRemarkEntry | null, focus: boolean) => {
		if (!mounted.current || active.current !== request || !core.current(request.lease) ||
			scopeRef.current !== request.scope || latest.current.getTarget() !== request.target) return
		if (!notes.runtime) { release(request, "No source-side remark notes exist yet.", true); return }
		const restore = request.target.captureFocus()
		let retired = false
		const origin: ApplicationToolOrigin = {
			isLive: () => {
				const context = request.target.getCommandContext()
				const source = latest.current.controller.liveBuffers.find((buffer) => buffer.bufferId === request.source.bufferId)
				const sidecar = latest.current.controller.liveBuffers.find((buffer) => buffer.bufferId === notes.bufferId)
				const live = !retired && mounted.current && panelOrigin.current === origin && scopeRef.current === request.scope &&
					context.available && context.ownership === request.context.ownership && context.relativePath === request.context.relativePath &&
					context.windowId === request.context.windowId && source?.runtimeIncarnation === request.source.runtimeIncarnation &&
					sidecar?.runtimeIncarnation === notes.runtimeIncarnation && sidecar?.runtime === notes.runtime && !notes.runtime?.closed
				if (!live) retired = true
				return live
			},
			restore: () => { if (origin.isLive()) restore?.() },
		}
		panelOrigin.current = origin
		setPanel((previous) => ({ source: request.source, notes, entryId: entry?.id ?? null,
			scope: request.scope, focusRequest: (previous?.focusRequest ?? 0) + 1, focus, origin, retired: false }))
		release(request, `Opened ${notes.document.relativePath}.`, false, "success")
		if (!focus && document.hasFocus() && latest.current.getTarget() === request.target &&
			(document.activeElement === request.focus || document.activeElement?.closest(`[data-org-parameter-session="${request.lease.id}"]`)))
			request.target.restoreFocus()
	}
	const mutate = async (request: RemarkRequest, action: OrgRemarkAction) => {
		if (!request.notes || !currentRequest(request)) return { ok: false as const, message: "The captured source changed; restart the remark command." }
		const before = request.tracker.getSnapshot()
		if (!core.beginCommit(request.lease)) return { ok: false as const, message: "The remark session was replaced." }
		request.committing = true
		const result = await latest.current.controller.executeRemarkMutation(request.source, request.notes, action)
		if (!mounted.current || active.current !== request || scopeRef.current !== request.scope) return { ok: true as const }
		request.committing = false
		if (result.kind === "confirmed") {
			let marks = before.marks
			if (action.type === "add") {
				const parsed = parseOrgRemarkNotes(result.notes.content, request.source.relativePath, request.source.source)
				const added = parsed.kind === "ready" ? parsed.marks.find((mark) => mark.id === action.id) : undefined
				if (added) marks = [...marks, { ...added, collapsed: false }]
			} else if (action.type === "change") {
				marks = marks.map((mark) => mark.id === action.id ? { ...mark, label: action.label } : mark)
			} else if (action.type === "remove" || action.type === "delete") {
				marks = marks.filter((mark) => mark.id !== action.id)
			}
			request.tracker.reconcile(before, marks, before.dirty)
			const sourceBuffer = latest.current.controller.liveBuffers.find((buffer) => buffer.bufferId === request.source.bufferId)
			const slot = sourceBuffer ? slots.current.get(sourceBuffer.runtime) : undefined
			if (slot) {
				slot.savedRevision = result.notes.document.revision; slot.failedLoad = null; slot.failedSync = null
				slot.loadedNotes = { notes: result.notes, anchors: remarkAnchorMetadata(result.notes.content, request.source.relativePath) }
			}
			release(request, `Remark notes saved: ${result.notes.document.relativePath}.`, true, "success")
			return { ok: true as const }
		}
		if (result.kind === "confirmation-required") return { ok: false as const, message: result.message }
		release(request, result.message)
		return { ok: true as const }
	}
	const execute = (id: OrgCommandId): boolean => {
		if (!id.startsWith("remark-") || latest.current.suspended || active.current || lease || latest.current.controller.isWorkspaceBlocked) return false
		autoRead.current?.abort()
		autoRead.current = null
		const target = latest.current.getTarget()
		const context = target?.getCommandContext()
		const c = latest.current.controller
		const buffer = c.liveBuffers.find((entry) => entry.document.relativePath === context?.relativePath)
		if (!target || !context?.available || !context.windowId || !buffer || !c.workspaceSessionId || context.relativePath.endsWith("-notes.org")) return false
		const slot = slots.current.get(buffer.runtime)
		const next = core.begin()
		if (!slot || !next) return false
		const request: RemarkRequest = { lease: next, scope: scopeRef.current, target, context, source: sourceCapture(buffer, c.workspaceSessionId, context.windowId),
			tracker: slot.tracker, focus: document.activeElement, unsubscribe: null, notes: null, committing: false,
			parameterized: false, report: latest.current.beginResult?.() ?? null }
		active.current = request
		request.unsubscribe = target.subscribeCommandContext?.(() => {
			if (active.current === request && !request.committing && !currentRequest(request)) release(request, "The source changed; the remark command was cancelled.")
		}) ?? null
		const abort = core.beginRead(next)
		if (!abort) { release(request, "Cannot start the remark read."); return false }
		setEcho("Opening source-side remark notes…")
		setParameterResult(null)
		void c.readRemarkNotes(request.source, abort.signal, { mount: id === "remark-open" || id === "remark-next" || id === "remark-previous" }).then(async (result) => {
			core.endRead(next, abort)
			if (!currentRequest(request) || abort.signal.aborted) { if (active.current === request) release(request, "The remark source is no longer current."); return }
			if (result.kind !== "ready") { release(request, result.message, true); return }
			if (result.notes.runtime && (result.notes.runtime.closed || result.notes.runtime.revision !== result.notes.sourceGeneration)) {
				release(request, "The canonical remark notes changed while opening; restart the command.", true)
				return
			}
			request.notes = result.notes
			const parsed = parseOrgRemarkNotes(result.notes.content, request.source.relativePath, request.source.source)
			if (parsed.kind === "rejected") { release(request, parsed.message, true); return }
			if (request.tracker.getSnapshot().needsReload) {
				if (!request.tracker.install(request.source.source, request.source.sourceGeneration, parsed.marks)) {
					release(request, "The source changed before its remarks could be installed.")
					return
				}
				request.source = { ...request.source, remarkVersion: request.tracker.getSnapshot().version }
			}
			slot.loadedNotes = { notes: result.notes, anchors: remarkAnchorMetadata(result.notes.content, request.source.relativePath) }
			slot.savedRevision = result.notes.document.revision
			const marks = request.tracker.getSnapshot().marks.filter((mark) => !mark.collapsed)
			const mark = orgRemarkAtPoint(marks, context.cursor, request.source.source)
			if (id === "remark-open") { openPanel(request, result.notes, parsed.entries.find((entry) => entry.id === mark?.id) ?? null, true); return }
			if (id === "remark-next" || id === "remark-previous") {
				const nextMark = orgRemarkNavigate(marks, context.cursor, id === "remark-next" ? "next" : "previous", target.getVisibleSourceRanges?.())
				request.unsubscribe?.()
				request.unsubscribe = null
				if (!nextMark || !target.revealSourcePosition?.(request.source.source, nextMark.from)) { release(request, "No visible remark can be reached.", true); return }
				openPanel(request, result.notes, parsed.entries.find((entry) => entry.id === nextMark.id) ?? null, false)
				return
			}
			if (context.readOnly) { release(request, "The captured source editor is read-only.", true); return }
			if (id === "remark-change") {
				if (!mark) { release(request, "No highlight at the source cursor.", true); return }
				request.parameterized = true
				core.publishSession(next, { id: next.id, prompt: "Remark pen", initialInput: mark.label, completion: "value", acceptCandidate: true,
					candidates: ORG_REMARK_PENS.filter((pen) => pen.kind === mark.kind).map((pen) => pen.label), cancelWhileAccepting: false,
					onCancel: cancel, onAccept: (label) => !ORG_REMARK_PENS.some((pen) => pen.label === label && pen.kind === mark.kind)
						? { ok: false, message: "Choose a declared pen for this remark type." }
						: core.accept(next, () => currentRequest(request), true, () => mutate(request, { type: "change", id: mark.id, label, from: mark.from, to: mark.to })) ?? { ok: false, message: "The remark source changed." } })
				return
			}
			if (id === "remark-remove" || id === "remark-delete") {
				if (!mark) { release(request, "No highlight at the source cursor.", true); return }
				const entry = parsed.entries.find((item) => item.id === mark.id)
				if (id === "remark-delete" && entry?.hasNotes) {
					request.parameterized = true
					core.publishSession(next, { id: next.id, prompt: "Delete marginal notes too?", initialInput: "Keep notes", completion: "value", acceptCandidate: true,
						candidates: ["Keep notes", "Delete notes"], cancelWhileAccepting: false, onCancel: cancel,
						onAccept: (choice) => choice !== "Keep notes" && choice !== "Delete notes" ? { ok: false, message: "Choose Keep notes or Delete notes." }
							: core.accept(next, () => currentRequest(request), true, () => mutate(request, { type: "delete", id: mark.id, deleteNotes: choice === "Delete notes" })) ?? { ok: false, message: "The remark source changed." } })
				} else await core.accept(next, () => currentRequest(request), true, () =>
					mutate(request, { type: id === "remark-delete" ? "delete" : "remove", id: mark.id }))
				return
			}
			if (context.selectionRangeCount !== 1) { release(request, "Select one contiguous source region, or place one cursor on a word.", true); return }
			const selected = selectOrgRemarkSource({ source: request.source.source, point: context.cursor,
				region: context.selectionFrom !== undefined && context.selectionTo !== undefined ? { from: context.selectionFrom, to: context.selectionTo } : undefined,
				kind: id === "remark-line" ? "line" : "range" })
			if (selected.kind === "rejected") { release(request, selected.message, true); return }
			const label = id === "remark-line" ? "line" : id === "remark-mark" ? "nil" : id.slice("remark-".length)
			await core.accept(next, () => currentRequest(request), true, () =>
				mutate(request, { type: "add", id: crypto.randomUUID().slice(0, 8), from: selected.from, to: selected.to, kind: selected.markKind, label }))
		}).catch(() => { if (active.current === request) release(request, "The remark command was not confirmed; source and note bodies were retained.") })
		return true
	}
	const snapshots = new Map<OrgBufferRuntime, OrgRemarkSnapshot>()
	for (const [runtime, slot] of slots.current) snapshots.set(runtime, slot.tracker.getSnapshot())
	let visiblePanel: OrgRemarkPanel | null = null
	let panelRetired = false
	if (panel?.scope === scope && controller.workspace && controller.workspaceSessionId) {
		const note = controller.liveBuffers.find((buffer) => buffer.bufferId === panel.notes.bufferId &&
			buffer.runtimeIncarnation === panel.notes.runtimeIncarnation && buffer.runtime === panel.notes.runtime)
		const source = controller.liveBuffers.find((buffer) => buffer.bufferId === panel.source.bufferId &&
			buffer.runtimeIncarnation === panel.source.runtimeIncarnation)
		const notes = panel.retired ? panel.notes : note ? notesContext(note, controller) : { ...panel.notes, content: panel.notes.runtime?.source ?? panel.notes.content }
		const parsed = parseOrgRemarkNotes(notes.content, panel.source.relativePath, source?.runtime.source ?? panel.source.source)
		const entry = parsed.kind === "ready" ? parsed.entries.find((item) => item.id === panel.entryId) ?? null : null
		const summary = controller.openBuffers.find((buffer) => buffer.bufferId === note?.bufferId)
		const retired = !panel.origin.isLive() || panel.retired || !note || !source
		panelRetired = retired
		visiblePanel = { sourcePath: panel.source.relativePath, notes, entry, focusRequest: panel.focusRequest, focus: panel.focus && !retired, origin: panel.origin, retired,
			readOnly: retired || controller.isWorkspaceBlocked || !!(note && controller.getBufferEffectState(note.bufferId)?.readOnly) || suspended || !!summary?.hasConflict || !!summary?.autosavePaused }
	}
	useLayoutEffect(() => {
		if (panel && panelRetired && !panel.retired)
			setPanel((current) => current === panel ? { ...panel, notes: visiblePanel?.notes ?? panel.notes, retired: true } : current)
	}, [panel, panelRetired])
	return { session, echo, parameterResult, owned: !!lease, pending: !!lease && !session, cancel, execute, snapshots, panel: visiblePanel, noteFocused,
		closePanel: () => {
			if (!panel || panelOrigin.current !== panel.origin) return
			const focused = document.activeElement
			const restore = !!focused?.closest('[data-org-remark-note-window]')
			setPanel(null); setNoteFocused(false)
			if (restore && panel && !panel.retired) void panel.origin.restore()
			panelOrigin.current = null
		},
		returnToSource: () => { if (panel && !panel.retired && panel.origin.isLive()) void panel.origin.restore() },
		saveNotes: () => {
			if (!visiblePanel || visiblePanel.readOnly || !visiblePanel.origin.isLive() ||
				visiblePanel.notes.runtime?.revision !== visiblePanel.notes.sourceGeneration || latest.current.suspended ||
				latest.current.controller.isWorkspaceBlocked ||
				(visiblePanel.notes.bufferId && latest.current.controller.getBufferEffectState(visiblePanel.notes.bufferId)?.readOnly)) return
			const report = latest.current.beginResult?.() ?? null
			const effect = latest.current.controller.saveRemarkNotes(visiblePanel.notes)
			noteEffects.current.add(effect)
			void effect.then((result) => {
				if (mounted.current && scopeRef.current === scope) {
					const message = result.kind === "confirmed" ? "Remark notes saved." : result.message
					setEcho(message)
					report?.({ kind: result.kind === "confirmed" ? "success" : "rejected", message })
				}
			}, () => {
				if (mounted.current && scopeRef.current === scope)
					report?.({ kind: "rejected", message: "Remark note save failed; no automatic retry." })
			}).finally(() => noteEffects.current.delete(effect))
		},
		drainNotes: async () => { await Promise.allSettled([...noteEffects.current]) },
	}
}
