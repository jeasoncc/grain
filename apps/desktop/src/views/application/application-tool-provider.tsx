import * as E from "fp-ts/Either"
import { createPortal } from "react-dom"
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { createApplicationToolRegistry, type ApplicationToolDescriptor, type ApplicationToolLease, type ApplicationToolRegistry, type ApplicationToolLayout, type ApplicationToolWindow } from "@/flows/application/application-tool-registry"
import { useConfirm } from "@/views/ui/confirm"
import type { CompiledExtensionToolHandle, CompiledExtensionToolWindow, TrustedCompiledExtension } from "@/flows/application/trusted-compiled-extension"
import { useApplicationPopupConfiguration, getApplicationPopupConfiguration, subscribeApplicationPopupConfiguration } from "@/hooks/use-application-popup-configuration"

const Context = createContext<ApplicationToolRegistry | null>(null)
const Docks = createContext<Partial<Record<ApplicationToolLayout, HTMLDivElement>> | null>(null)

type CompiledSurface = {
	readonly owner: TrustedCompiledExtension
	readonly handle: CompiledExtensionToolHandle
	readonly frame: HTMLDivElement
	children: (tool: CompiledExtensionToolWindow) => ReactNode
	className?: string
	anchor: HTMLDivElement | null
	attached: boolean
}
interface CompiledSurfaceHost {
	readonly getSnapshot: () => readonly CompiledSurface[]
	readonly subscribe: (listener: () => void) => () => void
	readonly attach: (surface: CompiledSurface) => void
	readonly refresh: () => void
	readonly release: (surface: CompiledSurface) => void
	readonly remove: (surface: CompiledSurface) => void
	readonly place: (surface: CompiledSurface, tool: CompiledExtensionToolWindow) => void
}

function relocateToolFrame(frame: HTMLElement, destination: Node, before: Node | null = null) {
	if (frame.parentNode === destination && (!before || frame.nextSibling === before)) return
	const document = frame.ownerDocument
	const focused = document.activeElement instanceof HTMLElement && frame.contains(document.activeElement)
		? document.activeElement : null
	const selection = document.getSelection()
	const anchor = selection?.anchorNode ?? null
	const focus = selection?.focusNode ?? null
	const retained = !!anchor && !!focus && frame.contains(anchor) && frame.contains(focus)
	const anchorOffset = selection?.anchorOffset ?? 0
	const focusOffset = selection?.focusOffset ?? 0
	destination.insertBefore(frame, before)
	if (focused?.isConnected && document.activeElement === document.body) focused.focus({ preventScroll: true })
	if (retained && anchor?.isConnected && focus?.isConnected)
		selection!.setBaseAndExtent(anchor, anchorOffset, focus, focusOffset)
}

const compiledToolIsDocked = (tool: CompiledExtensionToolWindow, attached: boolean) =>
	!attached || tool.layout !== "main" || tool.configured && tool.producerLayout !== "main"

function createCompiledSurfaceHost(docks: Partial<Record<ApplicationToolLayout, HTMLDivElement>>): CompiledSurfaceHost {
	let surfaces: readonly CompiledSurface[] = []
	const listeners = new Set<() => void>()
	const publish = () => {
		surfaces = [...surfaces]
		for (const listener of listeners) listener()
	}
	const place = (surface: CompiledSurface, tool: CompiledExtensionToolWindow) => {
		const docked = compiledToolIsDocked(tool, surface.attached)
		const destination = docked ? docks[tool.layout] : surface.anchor
		if (!destination) return
		relocateToolFrame(surface.frame, destination)
		if (docked || tool.configured) applyFramePlacement(surface.frame, tool)
		else { surface.frame.className = "contents"; surface.frame.removeAttribute("style") }
	}
	const remove = (surface: CompiledSurface) => {
		if (!surfaces.includes(surface)) return
		surfaces = surfaces.filter((entry) => entry !== surface)
		publish()
	}
	return {
		getSnapshot: () => surfaces,
		subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
		attach: (surface: CompiledSurface) => {
			surface.attached = true
			if (!surfaces.includes(surface)) surfaces = [...surfaces, surface]
			publish()
		},
		refresh: publish,
		release: (surface: CompiledSurface) => {
			surface.attached = false
			surface.anchor = null
			const tool = surface.owner.getToolWindow(surface.handle)
			if (!tool?.open) { remove(surface); return }
			// Move before the producer's anchor is removed; the original portal stays mounted.
			place(surface, tool)
			publish()
		},
		remove, place,
	}
}
const CompiledSurfaces = createContext<CompiledSurfaceHost | null>(null)

function applyFramePlacement(frame: HTMLElement, tool: Pick<ApplicationToolWindow, "size" | "layout">) {
	frame.className = "pointer-events-auto flex min-h-0 min-w-0 shrink-0 flex-col overflow-auto border bg-background shadow-sm"
	frame.style.width = tool.size?.widthPercent !== undefined ? `${tool.size.widthPercent}vw` : tool.layout === "side" ? "min(380px, 45vw)" : tool.layout === "popup" ? "70vw" : "100%"
	frame.style.height = tool.size?.heightPercent !== undefined ? `${tool.size.heightPercent}vh` : tool.layout === "bottom" ? "30vh" : tool.layout === "popup" ? "60vh" : "100%"
	frame.style.maxWidth = "90vw"
	frame.style.maxHeight = "90vh"
}

/** One application inventory. Retained portals keep the original producer body/history, not a copied draft. */
export function ApplicationToolProvider({ children }: { readonly children: ReactNode }) {
	const confirm = useConfirm()
	const latest = useRef(confirm)
	latest.current = confirm
	const docks = useRef<Partial<Record<ApplicationToolLayout, HTMLDivElement>>>({}).current
	const [compiledHost] = useState(() => createCompiledSurfaceHost(docks))
	const compiledSurfaces = useSyncExternalStore(compiledHost.subscribe, compiledHost.getSnapshot, compiledHost.getSnapshot)
	const externalFrames = useRef(new Map<ApplicationToolLease, { host: HTMLElement; marker: Comment; style: string | null; className: string }>()).current
	const [registry] = useState(() => createApplicationToolRegistry((tool, signal) => latest.current({
		title: `Close ${tool.label}?`,
		description: "This tool has an unsaved draft. Closing the tool does not save, close its source buffer, or undo a published operation.",
		confirmText: "Close tool", cancelText: "Keep draft", signal,
	}), (lease, host, tool) => {
		if (host?.dataset.applicationToolFrame === "managed") return
		let previous = externalFrames.get(lease)
		if (previous && (previous.host !== host || !tool?.configured || !tool.open)) {
			if (previous.host.isConnected && previous.marker.parentNode) relocateToolFrame(previous.host, previous.marker.parentNode, previous.marker)
			if (previous.style === null) previous.host.removeAttribute("style"); else previous.host.setAttribute("style", previous.style)
			previous.host.className = previous.className
			previous.marker.remove()
			externalFrames.delete(lease)
			previous = undefined
		}
		if (!host || !tool?.configured || !tool.open) return
		const inlineMain = tool.layout === "main" && tool.producerLayout === "main"
		const destination = inlineMain ? previous?.marker.parentNode ?? host.parentNode : docks[tool.layout]
		if (!destination) return
		if (!previous) {
			const marker = document.createComment("application tool origin")
			host.parentNode?.insertBefore(marker, host)
			previous = { host, marker, style: host.getAttribute("style"), className: host.className }
			externalFrames.set(lease, previous)
		}
		relocateToolFrame(host, destination, inlineMain && previous.marker.parentNode === destination ? previous.marker : null)
		applyFramePlacement(host, tool)
	}))
	const { parsed: configuration } = useApplicationPopupConfiguration()
	useLayoutEffect(() => {
		const apply = () => {
			const { parsed } = getApplicationPopupConfiguration()
			// Invalid persisted data is diagnosed, never converted into a successful default override.
			if (E.isRight(parsed)) registry.setConfiguration(parsed.right)
		}
		const unsubscribe = subscribeApplicationPopupConfiguration(apply)
		apply()
		return unsubscribe
	}, [registry])
	const windows = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
	const occupied = (layout: ApplicationToolLayout) => windows.some((tool) => tool.open && tool.layout === layout && (
		tool.configured && !(layout === "main" && tool.producerLayout === "main") ||
		compiledSurfaces.some((surface) => {
			const current = surface.owner.getToolWindow(surface.handle)
			return current?.windowId === tool.windowId && compiledToolIsDocked(current, surface.attached)
		})
	))
	const unmatched = E.isRight(configuration) ? configuration.right.rules.filter((rule) => !windows.some((tool) => rule.id === tool.lease.id || (rule.prefix !== undefined && tool.lease.id.startsWith(rule.prefix) && tool.lease.id.length > rule.prefix.length))) : []
	return <Context.Provider value={registry}>
		<Docks.Provider value={docks}>
		<CompiledSurfaces.Provider value={compiledHost}>
		<div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
			{E.isLeft(configuration) && <p role="alert" className="shrink-0 border-b p-2 text-sm">Saved popup configuration is invalid: {configuration.left.message} Placement remains at the last valid policy (producer placement before any valid policy). Repair it in Editor settings.</p>}
			{unmatched.length > 0 && <p role="status" className="shrink-0 border-b p-2 text-xs">Placement selectors with no currently registered producer: {unmatched.map((rule) => rule.id ?? rule.prefix).join(", ")}. These rules do not create or load tools.</p>}
			<div className="flex min-h-0 flex-1">
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<div ref={(host) => { if (host) docks.main = host }} data-application-tool-dock="main" className="flex min-h-0 flex-col overflow-auto" style={{ display: occupied("main") ? undefined : "none", flex: occupied("main") ? "1 1 0%" : undefined }} />
					<div className="min-h-0 flex-1">{children}</div>
				</div>
				<div ref={(host) => { if (host) docks.side = host }} data-application-tool-dock="side" className="flex min-h-0 shrink-0 flex-col overflow-auto border-l bg-background" style={{ display: occupied("side") ? undefined : "none", maxWidth: "90%" }} />
			</div>
			<div ref={(host) => { if (host) docks.bottom = host }} data-application-tool-dock="bottom" className="flex min-h-0 shrink-0 flex-col overflow-auto border-t bg-background" style={{ display: occupied("bottom") ? undefined : "none", maxHeight: "65%" }} />
			<div ref={(host) => { if (host) docks.popup = host }} data-application-tool-dock="popup" className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-auto" style={{ display: occupied("popup") ? undefined : "none" }} />
			<ApplicationToolInventory />
			{compiledSurfaces.map((surface) => <ApplicationCompiledToolBody key={surface.frame.dataset.compiledSurfaceId} surface={surface} host={compiledHost} />)}
		</div>
		</CompiledSurfaces.Provider>
		</Docks.Provider>
	</Context.Provider>
}
export function useApplicationTools() {
	const registry = useContext(Context)
	if (!registry) throw new Error("Application tools require ApplicationToolProvider")
	const tools = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
	return {
		registry, tools, open: registry.open,
		focus: (lease: ApplicationToolLease) => registry.focus(lease, tools.find((tool) => tool.lease === lease)?.windowId ?? null),
		close: (lease: ApplicationToolLease) => registry.close(lease, tools.find((tool) => tool.lease === lease)?.windowId ?? null),
		complete: (lease: ApplicationToolLease) => registry.complete(lease, tools.find((tool) => tool.lease === lease)?.windowId ?? null),
		restoreOrigin: (lease: ApplicationToolLease) => registry.restoreOrigin(lease, tools.find((tool) => tool.lease === lease)?.windowId ?? null),
	}
}
export function useApplicationToolRegistration(owner: object, descriptor: ApplicationToolDescriptor) {
	const { registry } = useApplicationTools()
	const lease = useMemo(() => registry.createLease(owner, descriptor.id), [registry, owner, descriptor.id])
	const latest = useRef(descriptor)
	latest.current = descriptor
	useLayoutEffect(() => {
		registry.register(lease, latest.current)
		return () => { void registry.retire(lease) }
	}, [registry, lease])
	useLayoutEffect(() => { registry.update(lease, descriptor) })
	return lease
}
/** A layout/window boundary, not another editor, draft, or filesystem writer. */
export function ApplicationToolSurface({ lease, children, className }: {
	readonly lease: ApplicationToolLease
	readonly children: ReactNode
	readonly className?: string
}) {
	const { registry, tools } = useApplicationTools()
	const tool = tools.find((entry) => entry.lease === lease)
	const windowId = tool?.windowId ?? null
	const docked = !!tool?.configured && !(tool.layout === "main" && tool.producerLayout === "main")
	const docks = useContext(Docks)
	const anchor = useRef<HTMLDivElement | null>(null)
	// This portal target never changes. Moving the target DOM preserves CodeMirror/textarea,
	// exact Source, canonical projection leases, undo, selections, and producer effects.
	const [frame] = useState(() => {
		const host = document.createElement("div")
		host.className = "contents"
		return host
	})
	frame.dataset.applicationToolFrame = "managed"
	useLayoutEffect(() => {
		if (!tool?.open) { registry.bindHost(lease, null); frame.remove(); return }
		const destination = docked ? docks?.[tool.layout] : anchor.current
		if (!destination) return
		relocateToolFrame(frame, destination)
		if (tool.configured) applyFramePlacement(frame, tool)
		else { frame.className = "contents"; frame.removeAttribute("style") }
		registry.bindHost(lease, frame, windowId)
	}, [registry, lease, frame, tool?.open, tool?.layout, tool?.configured, tool?.size, windowId, docks, docked])
	useLayoutEffect(() => () => { registry.bindHost(lease, null); frame.remove() }, [registry, lease, frame])
	if (!tool?.open) return null
	return <><div ref={(host) => {
		anchor.current = host
		// Attach before portal children run their first layout/focus effects.
		if (host && !frame.isConnected) {
			const destination = docked ? docks?.[tool.layout] : host
			destination?.appendChild(frame)
		}
	}} className={docked ? "hidden" : className} />
		{createPortal(<div tabIndex={-1} data-application-tool={lease.id} data-application-tool-window={tool.windowId}
		onFocusCapture={(event) => { if (event.target instanceof HTMLElement) registry.recordFocus(lease, event.target) }}
		data-application-tool-layout={tool.layout} aria-busy={tool.closing || tool.state.pending}
		inert={tool.closing} className={tool.configured ? `flex h-full min-h-0 flex-col overflow-auto ${className ?? ""}` : className}>{children}</div>, frame)}
	</>
}

/** Registers the original body with the application lifetime, so producer retirement cannot erase it. */
export function ApplicationCompiledToolSurface({ owner, handle, children, className }: {
	readonly owner: TrustedCompiledExtension
	readonly handle: CompiledExtensionToolHandle
	readonly children: (tool: CompiledExtensionToolWindow) => ReactNode
	readonly className?: string
}) {
	const host = useContext(CompiledSurfaces)
	if (!host) throw new Error("Compiled tools require ApplicationToolProvider")
	const subscribe = useMemo(() => (notify: () => void) => owner.subscribeTools(notify), [owner])
	const snapshot = useMemo(() => () => owner.getToolWindow(handle), [owner, handle])
	const tool = useSyncExternalStore(subscribe, snapshot, snapshot)
	const latest = useRef({ children, className })
	latest.current = { children, className }
	const surface = useMemo<CompiledSurface>(() => {
		const frame = document.createElement("div")
		frame.className = "contents"
		frame.dataset.applicationToolFrame = "managed"
		frame.dataset.compiledSurfaceId = crypto.randomUUID()
		return { owner, handle, frame, ...latest.current, anchor: null, attached: true }
	}, [owner, handle])
	useLayoutEffect(() => {
		host.attach(surface)
		return () => { host.release(surface) }
	}, [host, surface])
	useLayoutEffect(() => {
		if (!owner.isLive()) return
		surface.children = children
		surface.className = className
		host.refresh()
	}, [host, surface, owner, children, className])
	const docked = !!tool && compiledToolIsDocked(tool, surface.attached)
	return <div ref={(anchor) => { surface.anchor = anchor }} className={docked ? "hidden" : className} />
}

function ApplicationCompiledToolBody({ surface, host }: { readonly surface: CompiledSurface; readonly host: CompiledSurfaceHost }) {
	const { owner, handle, frame } = surface
	const subscribe = useMemo(() => (notify: () => void) => owner.subscribeTools(notify), [owner])
	const snapshot = useMemo(() => () => owner.getToolWindow(handle), [owner, handle])
	const tool = useSyncExternalStore(subscribe, snapshot, snapshot)
	const windowId = tool?.windowId ?? null
	useLayoutEffect(() => {
		if (!tool?.open) {
			owner.bindToolHost(handle, null, windowId)
			frame.remove()
			if (!surface.attached) host.remove(surface)
			return
		}
		host.place(surface, tool)
		owner.bindToolHost(handle, frame, windowId)
	}, [owner, handle, frame, tool, windowId, host, surface, surface.attached, surface.className])
	useLayoutEffect(() => () => { owner.bindToolHost(handle, null, windowId); frame.remove() }, [owner, handle, frame])
	if (!tool?.open) return null
	return createPortal(<div tabIndex={-1} data-application-compiled-tool="true" data-application-tool-window={windowId}
		data-application-tool-layout={tool.layout} aria-label={tool.label} aria-busy={tool.closing || tool.state.pending}
		inert={tool.closing} className={tool.configured || compiledToolIsDocked(tool, surface.attached) ? `flex h-full min-h-0 flex-col overflow-auto ${surface.className ?? ""}` : surface.className}>
		{tool.revoked && <p role="status" className="shrink-0 border-b p-2 text-sm">The extension owner was revoked. This retained read-only body can be selected and copied; closing still requires the tool's discard approval.</p>}
		{surface.children(tool)}
	</div>, frame)
}
function ApplicationToolInventory() {
	const { tools, open, focus, close } = useApplicationTools()
	if (!tools.length) return null
	return <nav aria-label="Application tools" className="flex shrink-0 flex-wrap gap-2 border-t bg-background px-3 py-1 text-xs">
		{tools.map((tool) => <span key={tool.lease.identity} className="inline-flex items-center gap-1">
			<button type="button" aria-label={`${tool.open ? "Focus" : "Open"} ${tool.label} tool window`} aria-pressed={tool.open} disabled={tool.closing}
				onPointerDown={(event) => event.preventDefault()}
				onClick={() => { if (tool.open) focus(tool.lease); else open(tool.lease) }}>
				{tool.label}{tool.state.dirty ? " *" : ""}{tool.state.readOnly ? " (read-only)" : ""}
			</button>
			{tool.open && <button type="button" aria-label={`Close ${tool.label}`} disabled={tool.closing || tool.state.pending}
				onPointerDown={(event) => event.preventDefault()}
				onClick={() => { void close(tool.lease) }}>×</button>}
		</span>)}
	</nav>
}
