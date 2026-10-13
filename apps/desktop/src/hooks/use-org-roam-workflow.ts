import * as E from "fp-ts/Either"
import { useApplicationCommandHost, type ApplicationCommandResult, type ApplicationResultPublisher } from "@/views/application/application-command-provider"
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"
import type { OrgCommandEditorContext } from "@/flows/org-command/org-workspace-command"
import { loadOrgRoamNodesFlow } from "@/flows/org-workspace/org-roam.flow"
import { validateOrgRoamNoteCapture, planOrgRoamNote, type OrgRoamNotePlan } from "@/pipes/org/org-note.pipe"
import { planOrgRoamLinkEdit, type OrgRoamNode } from "@/pipes/org/org-roam.pipe"
import type { OrgMinibufferAcceptResult, OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import type { OrgEditorCommandTarget } from "@/views/org-editor"
import { orgQueryScopeFromController, orgQuerySourcesFromController } from "./org-query-sources"
import type { OrgWorkspaceController } from "./use-org-workspace"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"

type Mode = "find" | "insert" | "create"
interface Origin {
	readonly target: OrgEditorCommandTarget
	readonly bufferId: string | null
	readonly context: OrgCommandEditorContext
	readonly incarnation?: string
	readonly generation?: number
	readonly restore: (() => boolean) | null
}
interface Request {
	lease: ParameterLease
	readonly mode: Mode
	readonly scope: string
	readonly focus: Element | null
	readonly origin: Origin | null
	readonly bufferKey: string
	host: Element | null
	applying: boolean
	readonly dirtyId: string
	protection: OrgWorkspaceController | null
	unsubscribe: (() => void) | null
	plan: OrgRoamNotePlan | null
	content: string
	pending: boolean
	published: boolean
	afterPublication: (() => void) | null
	retired: boolean
	stale: boolean
	message: string | null
	queryHandler: OrgMinibufferSession["onAccept"] | null
	queryAccept: OrgMinibufferSession["onAccept"] | null
	queryCancel: (() => void) | null
	effect: Promise<void> | null
}
export interface OrgRoamCaptureTool {
	readonly id: number
	readonly content: string
	readonly title: string
	readonly relativePath: string
	readonly pending: boolean
	readonly dirty: boolean
	readonly readOnly: boolean
	readonly origin: ApplicationToolOrigin | null
	readonly drain: () => Promise<void>
	readonly closeFence: string
	readonly message: string | null
	readonly bindHost: (host: HTMLElement | null) => void
	readonly onChange: (content: string) => void
	readonly finish: () => void
	readonly cancel: () => void
}
export interface OrgRoamWorkflow {
	readonly session: OrgMinibufferSession | null
	readonly echo: string | null
	readonly parameterResult: ApplicationCommandResult | null
	readonly openFind: () => boolean
	readonly openInsert: () => boolean
	readonly openCreate: () => boolean
	readonly owned: boolean
	readonly tool: OrgRoamCaptureTool | null
}
const nodeKey = (node: OrgRoamNode) => JSON.stringify([node.id, node.relativePath, node.line, node.kind])
const rejected = (message: string): OrgMinibufferAcceptResult => ({ ok: false, message })
const accepted: OrgMinibufferAcceptResult = { ok: true }

/** Root-owned parameters and a memory-only full-source scratch; no second body writer. */
export function useOrgRoamWorkflow({ controller, getTarget, suspended = false, onOpened, beginResult }: {
	readonly controller: OrgWorkspaceController
	readonly getTarget: () => OrgEditorCommandTarget | null
	readonly suspended?: boolean
	readonly onOpened?: () => void
	readonly beginResult?: () => ApplicationResultPublisher | null
}): OrgRoamWorkflow {
	const applicationHost = useApplicationCommandHost()
	const latest = useRef({ controller, getTarget, suspended, onOpened, beginResult })
	latest.current = { controller, getTarget, suspended, onOpened, beginResult }
	const [core] = useState(createParameterSession)
	const { session, lease } = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const active = useRef<Request | null>(null)
	const mounted = useRef(true)
	const navigationFocus = useRef<{ readonly scope: string; readonly path: string; readonly before: Element } | null>(null)
	const [, render] = useState(0)
	const [echo, setEcho] = useState<string | null>(null)
	const [parameterResult, setParameterResult] = useState<ApplicationCommandResult | null>(null)
	const sources = orgQuerySourcesFromController(controller)
	const scope = () => orgQueryScopeFromController(latest.current.controller)
	const publish = () => { if (mounted.current) render((value) => value + 1) }
	const owns = (request: Request) => mounted.current && active.current === request && core.current(request.lease) && scope() === request.scope
	const bufferKey = () => {
		const current = latest.current.controller
		const buffer = current.liveBuffers.find((entry) => entry.bufferId === current.activeBufferId)
		return JSON.stringify([current.activeBufferId, current.activeDocument?.relativePath, buffer?.runtimeIncarnation, buffer?.sourceGeneration])
	}
	const ownsFocus = (request: Request) => {
		const focused = globalThis.document?.activeElement
		const parameter = core.getSnapshot().session
		const currentHost = request.plan || (parameter && applicationHost.ownsParameter(parameter))
		return focused === request.focus || Boolean(currentHost && request.host?.isConnected &&
			request.host.getAttribute(request.plan ? "data-org-roam-session" : "data-org-parameter-session") === String(request.lease.id) &&
			request.host.contains(focused ?? null))
	}
	const originCurrent = (request: Request) => {
		if (bufferKey() !== request.bufferKey) return false
		const origin = request.origin
		if (!origin) return true
		if (latest.current.getTarget() !== origin.target) return false
		const context = origin.target.getCommandContext()
		const captured = origin.context
		const ownPublicationReadonly = request.plan !== null && request.pending && !captured.readOnly && context.readOnly
		if (!context.available || context.windowId !== captured.windowId || (context.readOnly !== captured.readOnly && !ownPublicationReadonly) || context.ownership !== captured.ownership || context.revision !== captured.revision || context.content !== captured.content || context.relativePath !== captured.relativePath || context.cursor !== captured.cursor || context.selectionFrom !== captured.selectionFrom || context.selectionTo !== captured.selectionTo || context.selectionRangeCount !== captured.selectionRangeCount) return false
		const buffer = latest.current.controller.liveBuffers.find((entry) => entry.document.relativePath === captured.relativePath)
		return origin.incarnation === undefined || (buffer?.runtimeIncarnation === origin.incarnation && buffer.sourceGeneration === origin.generation)
	}
	const originLive = (request: Request) => {
		const origin = request.origin
		if (!origin || !mounted.current || active.current !== request || request.retired || request.stale || scope() !== request.scope) return false
		const context = origin.target.getCommandContext()
		const buffer = latest.current.controller.liveBuffers.find((entry) => entry.bufferId === origin.bufferId)
		return context.available && context.ownership === origin.context.ownership && context.windowId === origin.context.windowId &&
			context.relativePath === origin.context.relativePath &&
			(origin.incarnation === undefined || buffer?.runtimeIncarnation === origin.incarnation)
	}
	const locked = () => {
		const current = latest.current.controller
		const bufferId = active.current?.origin?.bufferId
		return latest.current.suspended || current.isWorkspaceBlocked || (!!bufferId && !!current.getBufferEffectState(bufferId)?.readOnly)
	}
	const focusReturn = (request: Request) => {
		const before = globalThis.document?.activeElement
		const wasOwned = Boolean(before && before !== document.body && ownsFocus(request))
		return () => {
			if (!wasOwned || !mounted.current || scope() !== request.scope) return
			const after = document.activeElement
			if (after !== before && !(before && !before.isConnected && after === document.body)) return
			if (request.origin) {
				if (originCurrent(request)) request.origin.restore?.()
			} else if (request.focus instanceof HTMLElement && request.focus.isConnected) request.focus.focus()
		}
	}
	const captureNavigationFocus = (request: Request, path: string) => {
		const before = globalThis.document?.activeElement
		if (before && request.host?.isConnected && request.host.contains(before))
			navigationFocus.current = { scope: request.scope, path, before }
	}
	useLayoutEffect(() => {
		const pending = navigationFocus.current
		if (!pending) return
		const focused = document.activeElement
		if (scope() !== pending.scope || (focused !== pending.before && !(focused === document.body && !pending.before.isConnected))) {
			navigationFocus.current = null
			return
		}
		const target = latest.current.getTarget()
		if (!target) return
		const context = target.getCommandContext()
		if (!context.available || context.relativePath !== pending.path) return
		navigationFocus.current = null
		target.restoreFocus()
	})
	const release = (request: Request, message: string, restore = true, kind: ApplicationCommandResult["kind"] = "rejected") => {
		const returnFocus = restore ? focusReturn(request) : () => {}
		request.protection?.setTransientDirty(request.dirtyId, false)
		request.protection = null
		request.unsubscribe?.()
		request.unsubscribe = null
		core.retire(request.lease)
		if (active.current === request) active.current = null
		if (mounted.current) { setEcho(message); setParameterResult(request.plan ? null : { kind, message }); publish() }
		returnFocus()
	}
	const cancel = () => {
		const request = active.current
		if (!request || request.pending) return
		const returnFocus = focusReturn(request)
		if (!request.plan && !core.cancel(request.lease)) return
		release(request, request.retired ? "Roam draft closed; no rollback or retry was attempted." : "Roam capture cancelled; no file was written.", false, "cancelled")
		returnFocus()
	}
	const staleDraft = (request: Request, message: string) => {
		if (request.stale) return
		request.stale = true
		request.message = message
		publish()
	}
	useLayoutEffect(() => {
		mounted.current = true
		core.attach()
		return () => {
			mounted.current = false
			core.detach()
			const request = active.current
			request?.unsubscribe?.()
			request?.protection?.setTransientDirty(request.dirtyId, false)
			if (request) {
				request.protection = null
				request.afterPublication?.()
				request.afterPublication = null
			}
		}
	}, [core])
	useLayoutEffect(() => {
		const request = active.current
		if (!request) return
		if (scope() !== request.scope) {
			if (request.plan) staleDraft(request, "Workspace grant or session changed. This draft is read-only and copyable; do not blindly retry.")
			else if (core.cancel(request.lease)) { request.unsubscribe?.(); active.current = null; publish() }
		}
		if (request.plan && !request.published && (!request.protection || orgQueryScopeFromController(request.protection) !== sources.scope)) {
			const previous = request.protection
			previous?.setTransientDirty(request.dirtyId, false)
			request.protection = controller.setTransientDirty(request.dirtyId, true) === true ? controller : null
			if (request.protection !== previous) publish()
		}
		if (request.plan && !originCurrent(request)) staleDraft(request, "The originating selection or source changed. Keep or copy this draft; completion cannot override the new source.")
	}, [controller, sources.scope])
	useEffect(() => {
		const request = active.current
		if (!request?.afterPublication) return
		const resume = request.afterPublication
		request.afterPublication = null
		resume()
	})
	useLayoutEffect(() => {
		const request = active.current
		const parameter = core.getSnapshot().session
		if (!request || request.plan || !parameter || !applicationHost.ownsParameter(parameter)) return
		request.host = applicationHost.hostRef.current?.querySelector(`[data-org-parameter-session="${request.lease.id}"]`) ?? null
	})

	const makeTitleSession = (request: Request) => {
		const replacement = core.begin(request.lease)
		if (!replacement) return rejected("Roam session is no longer current.")
		request.lease = replacement
		core.publishSession(replacement, {
			id: replacement.id, prompt: "New Org-roam node title:", historyKey: "org-roam-title", completion: "value", initialInput: "", candidates: [],
			onCancel: () => { if (request.lease === replacement && !request.plan && owns(request)) cancel() },
			onAccept: (input) => {
				if (request.lease !== replacement || request.plan || !owns(request) || locked() || !originCurrent(request)) return rejected("The originating context is no longer available.")
				if (!input.trim()) return rejected("Enter a nonblank node title.")
				let plan: OrgRoamNotePlan
				try { plan = Object.freeze({ ...planOrgRoamNote(new Date(), crypto.randomUUID(), input) }) }
				catch { return rejected("Cannot prepare the chronological note template.") }
				// Synchronous native-close protection precedes any editable scratch publication.
				const protection = latest.current.controller
				if (protection.setTransientDirty(request.dirtyId, true) !== true) return rejected("Cannot protect this capture draft from closing.")
				request.protection = protection
				request.plan = plan
				request.content = plan.content
				request.message = null
				publish()
				return accepted
			},
		})
		return accepted
	}
	const insert = (request: Request, id: string, title: string): boolean => {
		if (!owns(request) || request.stale || !originCurrent(request) || !ownsFocus(request) || latest.current.suspended || locked()) return false
		const origin = request.origin
		if (!origin) return false
		const context = origin.context
		const from = context.selectionFrom ?? context.cursor
		const to = context.selectionTo ?? context.cursor
		const description = from !== to ? context.content.slice(from, to) : title
		const edit = planOrgRoamLinkEdit(context.content, from, to, id, description)
		if (!edit) return false
		const returnFocus = ownsFocus(request)
		request.applying = true
		let applied = false
		try {
			applied = origin.target.applyEdit(context.content, edit)
		} finally {
			request.applying = false
		}
		if (applied && returnFocus && scope() === request.scope && latest.current.getTarget() === origin.target && ownsFocus(request)) {
			const updated = origin.target.getCommandContext()
			const expected = context.content.slice(0, edit.from) + edit.insert + context.content.slice(edit.to)
			if (updated.available && !updated.readOnly && updated.ownership === context.ownership && updated.content === expected && updated.cursor === edit.cursor && (updated.selectionRangeCount ?? 1) === 1 && (updated.selectionFrom ?? updated.cursor) === edit.cursor && (updated.selectionTo ?? updated.cursor) === edit.cursor)
				origin.target.restoreFocus()
		}
		return applied
	}
	const publishNodes = (request: Request, nodes: readonly OrgRoamNode[]) => {
		if (!owns(request) || request.plan) return
		const byKey = new Map(nodes.map((node) => [nodeKey(node), node]))
		const publishedLease = request.lease
		const nextSession: OrgMinibufferSession = {
			id: request.lease.id, prompt: request.mode === "insert" ? "Insert Org-roam node (or choose Create new node):" : "Find Org-roam node (or choose Create new node):",
			historyKey: `org-roam-${request.mode}`, completion: "value", initialInput: "", candidates: [], acceptCandidate: true, matchingMode: "multi-term",
			get cancelWhileAccepting() { return core.getSnapshot().phase !== "commit" },
			annotatedCandidates: [
				{ value: "roam:create", label: "Create new node…", detail: "Chronological capture · editable Org draft", searchText: "create new node capture chronological" },
				...nodes.map((node) => ({ value: nodeKey(node), label: node.title, detail: `${node.kind} · ${node.relativePath}:${node.line}${node.aliases.length ? ` · aliases: ${node.aliases.join(", ")}` : ""}${node.tags.length ? ` · :${node.tags.join(":")}:` : ""}`, searchText: [node.title, ...node.aliases, ...node.tags, node.relativePath].join(" "), ...(node.ambiguous ? { unavailableReason: "Duplicate Org ID is ambiguous; reconcile the sources before using this node." } : {}) })),
			],
			onCancel: () => { if (request.lease === publishedLease && !request.plan && owns(request)) cancel() },
			onAccept: (value) => {
				if (request.lease !== publishedLease || request.plan || !owns(request) || locked()) return rejected("Roam session is no longer available.")
				if (!originCurrent(request)) { release(request, "Origin changed; no node action was performed."); return accepted }
				if (value === "roam:create") return makeTitleSession(request)
				const chosen = byKey.get(value)
				if (!chosen || chosen.ambiguous) return rejected("Choose an unambiguous node; raw input is not a file path.")
				const result = core.accept(request.lease, () => owns(request), false, async () => {
					const abort = core.beginRead(request.lease)
					if (!abort) return rejected("Roam read is no longer current.")
					try {
						const currentSources = orgQuerySourcesFromController(latest.current.controller)
						if (!currentSources.workspace) return rejected("No workspace open.")
						const fresh = await loadOrgRoamNodesFlow(currentSources.workspace, currentSources.overlays, undefined, { workspaceSessionId: currentSources.session ?? undefined }, abort.signal)()
						if (!owns(request) || abort.signal.aborted) return accepted
						if (orgQuerySourcesFromController(latest.current.controller).sourceKey !== currentSources.sourceKey) return rejected("Org sources changed during selection; choose a refreshed node.")
						if (E.isLeft(fresh)) return rejected(fresh.left.message)
						const node = fresh.right.find((entry) => nodeKey(entry) === value)
						if (!node || node.ambiguous || node.revision !== chosen.revision || node.title !== chosen.title) return rejected("The node changed or its ID became ambiguous; reopen node completion.")
						if (locked() || !originCurrent(request) || (request.mode === "find" && !ownsFocus(request))) return rejected("The originating context is no longer available.")
						core.endRead(request.lease, abort)
						if (!core.beginCommit(request.lease)) return rejected("Roam session is no longer current.")
						request.pending = true
						publish()
						if (request.mode === "insert") {
							const applied = insert(request, node.id, node.title)
							request.pending = false
							release(request, applied ? "Org ID link inserted in the working source; save to persist it." : "Origin changed; no link inserted.", true, applied ? "success" : "rejected")
						} else {
							const opened = await latest.current.controller.openOrgLink({ kind: "id", relativePath: null, value: node.id })
							request.pending = false
							if (owns(request)) {
								if (opened) { captureNavigationFocus(request, node.relativePath); latest.current.onOpened?.() }
								release(request, opened ? `Opened ${node.title}.` : "Node could not be opened; no path fallback was attempted.", !opened, opened ? "success" : "rejected")
							} else if (mounted.current && active.current === request) release(request, "Workspace changed while node navigation settled; no focus return was attempted.", false)
						}
						return accepted
					} catch {
						if (mounted.current && active.current === request) { request.pending = false; release(request, "Roam selection failed; no automatic retry.", owns(request)) }
						return accepted
					} finally { core.endRead(request.lease, abort) }
				})
				return result ? result.finally(publish) : rejected("Roam action is already running.")
			},
		}
		request.queryHandler = nextSession.onAccept
		request.queryAccept ??= (input) => request.queryHandler?.(input) ?? rejected("Roam session is no longer current.")
		request.queryCancel ??= nextSession.onCancel
		// Updating candidate data must not reset typed input or re-arm a replacement DOM generation.
		core.publishSession(request.lease, { ...nextSession, onAccept: request.queryAccept, onCancel: request.queryCancel })
	}
	const loadNodes = (request: Request) => {
		const snapshot = orgQuerySourcesFromController(latest.current.controller)
		if (!snapshot.workspace || !owns(request)) return
		const abort = core.beginRead(request.lease)
		if (!abort) return
		setEcho("Reading Org-roam nodes…")
		setParameterResult({ kind: "success", message: "Reading Org-roam nodes…" })
		void loadOrgRoamNodesFlow(snapshot.workspace, snapshot.overlays, undefined, { workspaceSessionId: snapshot.session ?? undefined }, abort.signal)().then((result) => {
			core.endRead(request.lease, abort)
			if (!owns(request) || abort.signal.aborted || request.plan) return
			if (orgQuerySourcesFromController(latest.current.controller).sourceKey !== snapshot.sourceKey) { loadNodes(request); return }
			if (E.isLeft(result)) { release(request, result.left.message); return }
			const message = result.right.length ? null : "No Org ID nodes yet. Choose Create new node to capture one."
			setEcho(message)
			setParameterResult(message ? { kind: "success", message } : null)
			publishNodes(request, result.right)
		}).catch(() => {
			core.endRead(request.lease, abort)
			if (owns(request)) release(request, "Cannot load Org-roam nodes.")
		})
	}
	const start = (mode: Mode): boolean => {
		if (!mounted.current || active.current || core.busy() || core.getSnapshot().lease || !latest.current.controller.workspace || locked()) return false
		let origin: Origin | null = null
		const target = latest.current.getTarget()
		if (mode === "insert" && !target) return false
		if (target) {
			const context = Object.freeze({ ...target.getCommandContext() })
			if (!context.available || (mode === "insert" && (context.readOnly || (context.selectionRangeCount ?? 1) !== 1))) return false
			const buffer = latest.current.controller.liveBuffers.find((entry) => entry.document.relativePath === context.relativePath)
			origin = { target, context, bufferId: buffer?.bufferId ?? null, incarnation: buffer?.runtimeIncarnation, generation: buffer?.sourceGeneration, restore: target.captureFocus() }
		}
		const lease = core.begin()
		if (!lease) return false
		const request: Request = { lease, mode, scope: scope(), focus: globalThis.document?.activeElement ?? null, origin, bufferKey: bufferKey(), host: null, applying: false, dirtyId: `org-roam:${lease.id}`, protection: null, unsubscribe: null, plan: null, content: "", pending: false, published: false, effect: null, afterPublication: null, retired: false, stale: false, message: null, queryHandler: null, queryAccept: null, queryCancel: null }
		active.current = request
		if (origin?.target.subscribeCommandContext) request.unsubscribe = origin.target.subscribeCommandContext(() => {
			if (active.current !== request || request.applying || originCurrent(request)) return
			if (request.plan) staleDraft(request, "The originating selection or source changed. This draft remains copyable, but cannot insert into the changed source.")
			else if (!request.pending) release(request, "Origin changed; no link inserted.", false)
		})
		setEcho(null)
		setParameterResult(null)
		if (mode === "create") makeTitleSession(request)
		else { publishNodes(request, []); loadNodes(request) }
		publish()
		return true
	}
	const finishDraft = () => {
		const request = active.current
		if (!request?.plan || !owns(request) || request.pending || request.retired || request.stale || !request.protection || locked()) return
		if (!originCurrent(request)) { staleDraft(request, "Origin changed. No file was written; copy or cancel this draft."); return }
		const plan = Object.freeze({ ...request.plan, content: request.content })
		const report = latest.current.beginResult?.() ?? null
		const validation = validateOrgRoamNoteCapture(plan)
		if (validation.kind === "rejected") {
			request.message = `${validation.message} The full draft remains editable; no file was written.`
			report?.({ kind: "rejected", message: request.message })
			publish()
			return
		}
		const operation = core.accept(request.lease, () => owns(request), true, async () => {
			if (!core.beginCommit(request.lease)) return
			request.pending = true
			request.message = null
			publish()
			let result: ApplicationCommandResult = { kind: "rejected", message: "Roam publication was not confirmed." }
			try {
				const outcome = await latest.current.controller.createRoamNote(plan, { open: false })
				result = outcome.kind === "created" || outcome.kind === "created-unopened"
					? { kind: "success", message: `Created ${outcome.relativePath}.` }
					: { kind: "rejected", message: outcome.message }
				if (!mounted.current || active.current !== request) return
				if (outcome.kind === "created" || outcome.kind === "created-unopened") {
					request.published = true
					request.protection?.setTransientDirty(request.dirtyId, false)
					request.protection = null
				}
				// The owned write temporarily locks the source. Re-check after its committed
				// render and the editor's passive writable reconfiguration, never against that lock.
				const publication = Promise.withResolvers<void>()
				request.afterPublication = publication.resolve
				publish()
				await publication.promise
				if (!mounted.current || active.current !== request) return
				request.pending = false
				if (!owns(request) || request.stale || !originCurrent(request)) {
					request.retired = true
					request.message = outcome.kind === "created" || outcome.kind === "created-unopened" ? `Created ${outcome.relativePath}, but the origin changed. No link was inserted; the file was not rolled back. Copy this draft if needed.` : `${outcome.message ?? "Creation ended after context loss."} This draft is read-only; reconcile disk before retrying.`
					publish()
					return
				}
				if (outcome.kind === "created" || outcome.kind === "created-unopened") {
					if (request.mode === "insert") {
						const applied = insert(request, outcome.id, outcome.title)
						if (!applied) { request.retired = true; request.message = `Created ${outcome.relativePath}, but no link was inserted because the origin changed. The confirmed file remains; no rollback was attempted. You can copy this draft.`; publish(); return }
						release(request, `Created ${outcome.relativePath} and inserted its Org ID link.`, true, "success")
					} else {
						if (!ownsFocus(request) || latest.current.suspended) {
							request.retired = true
							request.message = `Created ${outcome.relativePath}, but focus or command ownership moved elsewhere. The confirmed file was not opened or rolled back; this draft remains copyable.`
							publish()
							return
						}
						request.pending = true
						publish()
						const opened = await latest.current.controller.openOrgLink({ kind: "id", relativePath: null, value: outcome.id })
						request.pending = false
						if (!owns(request)) { request.retired = true; request.message = `Created ${outcome.relativePath}; navigation settled after the workspace changed. No rollback or focus override was attempted.`; publish(); return }
						if (!opened) { request.retired = true; request.message = `Created ${outcome.relativePath}, but its ID could not be opened. The file remains; this draft is read-only and copyable.`; publish(); return }
						captureNavigationFocus(request, outcome.relativePath)
						latest.current.onOpened?.()
						release(request, `Created ${outcome.relativePath}.`, false, "success")
					}
				} else {
					request.retired = outcome.kind === "uncertain" || outcome.kind === "stale"
					request.message = request.retired ? `${outcome.message} The file may already exist; reconcile it before retrying. This draft is read-only and copyable.` : outcome.message
					publish()
				}
			} catch {
				request.pending = false
				request.retired = true
				request.message = "Creation ended unexpectedly. The file may exist; no automatic retry or rollback was attempted. Copy this read-only draft and reconcile disk."
				publish()
			} finally {
				report?.(request.message ? { kind: "rejected", message: request.message } : result)
			}
		})
		if (!operation) return
		request.effect = operation
		void operation.finally(publish)
	}
	const request = active.current
	const tool: OrgRoamCaptureTool | null = request?.plan ? {
		id: request.lease.id, content: request.content, title: request.plan.title,
		relativePath: `${request.plan.directory.replace(/\/?$/, "/")}${request.plan.filenameStem}.org`, pending: request.pending,
		dirty: !request.published,
		get readOnly() { return request.pending || request.retired || request.stale || !request.protection || !owns(request) || !originCurrent(request) || locked() },
		message: request.message,
		origin: request.origin ? {
			isLive: () => originLive(request),
			restore: () => { if (originLive(request)) request.origin?.restore?.() },
		} : request.focus instanceof HTMLElement ? {
			isLive: () => owns(request) && !request.retired && !request.stale && request.focus instanceof HTMLElement && request.focus.isConnected,
			restore: () => { if (owns(request) && !request.retired && !request.stale && request.focus instanceof HTMLElement && request.focus.isConnected) request.focus.focus() },
		} : null,
		drain: async () => { await request.effect },
		closeFence: sources.scope,
		bindHost: (host) => {
			if (active.current === request && (!host || host.getAttribute("data-org-roam-session") === String(request.lease.id))) request.host = host
		},
		onChange: (content) => {
			if (!owns(request) || request.pending || request.retired || request.stale || !request.protection || locked()) return
			request.content = content
			publish()
		}, finish: () => { if (active.current === request) finishDraft() }, cancel: () => { if (active.current === request) cancel() },
	} : null
	return { session: tool ? null : (request && owns(request) ? session : null) as OrgMinibufferSession | null, echo, parameterResult, openFind: () => start("find"), openInsert: () => start("insert"), openCreate: () => start("create"), owned: Boolean(request || lease || core.busy()), tool }
}
