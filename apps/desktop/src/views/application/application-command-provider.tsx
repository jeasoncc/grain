import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react"
import { createApplicationCommandRegistry, type ApplicationCommandDescriptor, type ApplicationCommandResult, type ApplicationCommandRegistration, type ApplicationCommandRegistry, type ApplicationResultPublisher } from "@/flows/application-command-registry"
import { createParameterSession } from "@/flows/org-command/parameter-session"
import { registerOrgInputCommandMetadata } from "@/flows/org-command/org-input-command-metadata"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import { OrgWhichKey } from "@/views/org-workspace/org-which-key.view.fn"
import type { OrgMinibufferSession } from "@/types/editor/minibuffer.interface"
import { OrgMinibuffer } from "@/views/org-workspace/org-minibuffer.view.fn"
import { flushSync } from "react-dom"

export type { ApplicationCommandDescriptor, ApplicationCommandResult, ApplicationResultPublisher } from "@/flows/application-command-registry"

type ParameterRegistration = { owner: object; live: boolean; lifetime: object | null; session: OrgMinibufferSession | null; result: ApplicationCommandResult | null }
type Origin = { element: HTMLElement; selection: { start: number | null; end: number | null; direction: "forward" | "backward" | "none" | null } | null; ranges: readonly Range[] }
type ParameterHandle = { entry: ParameterRegistration; unregister: () => void }
export interface ApplicationCommandHost {
	readonly registry: ApplicationCommandRegistry
	readonly open: () => boolean
	readonly close: () => boolean
	readonly execute: (id: string) => Promise<ApplicationCommandResult>
	readonly focusParameter: (id: number) => boolean
	readonly ownsParameter: (session: OrgMinibufferSession) => boolean
	readonly isOpen: boolean
	readonly result: ApplicationCommandResult | null
	readonly session: OrgMinibufferSession | null
	readonly hostRef: RefObject<HTMLDivElement | null>
	readonly registerParameter: (owner: object) => ParameterHandle
	readonly updateParameter: (entry: ParameterRegistration, session: OrgMinibufferSession | null, result: ApplicationCommandResult | null) => void
}

function captureOrigin(): Origin | null {
	const element = document.activeElement
	if (!(element instanceof HTMLElement) || element === document.body) return null
	const selection = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
		? { start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection } : null
	const domSelection = document.getSelection()
	const ranges: Range[] = []
	if (domSelection) for (let index = 0; index < domSelection.rangeCount; ++index) ranges.push(domSelection.getRangeAt(index).cloneRange())
	return { element, selection, ranges }
}

function restoreOrigin(origin: Origin | null, host: HTMLElement | null, retiredFocus: HTMLElement | null = null) {
	const focused = document.activeElement
	const owned = host?.contains(focused) || (retiredFocus && !retiredFocus.isConnected && focused === document.body)
	if (!origin?.element.isConnected || origin.element.ownerDocument !== document || !owned) return
	const window = origin.element.closest("[data-org-editor-window]")
	if (window && window.getAttribute("data-org-active-editor-window") !== "true") return
	origin.element.focus({ preventScroll: true })
	if (origin.selection && (origin.element instanceof HTMLInputElement || origin.element instanceof HTMLTextAreaElement)) {
		const { start, end, direction } = origin.selection
		if (start !== null && end !== null) origin.element.setSelectionRange(start, end, direction ?? undefined)
	} else if (origin.ranges.length && origin.ranges.every((range) => range.startContainer.isConnected && range.endContainer.isConnected)) {
		const selection = document.getSelection()
		selection?.removeAllRanges()
		for (const range of origin.ranges) selection?.addRange(range)
	}
}

function useCommandProviderState(): ApplicationCommandHost {
	const [registry] = useState(createApplicationCommandRegistry)
	const snapshot = useSyncExternalStore(registry.subscribe, registry.getSnapshot, registry.getSnapshot)
	const [paletteCore] = useState(createParameterSession)
	const palette = useSyncExternalStore(paletteCore.subscribe, paletteCore.getSnapshot, paletteCore.getSnapshot)
	const [parameters, setParameters] = useState<readonly ParameterRegistration[]>([])
	const hostRef = useRef<HTMLDivElement>(null)
	const originRef = useRef<Origin | null>(null)
	const activeParameter = [...parameters].reverse().find((entry) => entry.session)
	const parametersRef = useRef(parameters)
	parametersRef.current = parameters
	const parameterResultOwner = useRef<ParameterRegistration | null>(null)
	useLayoutEffect(() => {
		registry.attach()
		paletteCore.attach()
		return () => { registry.detach(); paletteCore.detach() }
	}, [registry, paletteCore])
	const close = useCallback(() => {
		const lease = paletteCore.getSnapshot().lease
		if (!lease) {
			const parameter = [...parametersRef.current].reverse().find((entry) => entry.session)
			if (!parameter?.session || parameter.session.cancelWhileAccepting === false) return false
			parameter.session.onCancel()
			return true
		}
		restoreOrigin(originRef.current, hostRef.current)
		if (!paletteCore.cancel(lease)) return false
		registry.publishResult({ kind: "cancelled", message: "Canceled" })
		return true
	}, [paletteCore, registry])
	const execute = useCallback((id: string): Promise<ApplicationCommandResult> => {
		if (parametersRef.current.some((entry) => entry.session)) return Promise.resolve({ kind: "rejected", message: "Finish or cancel the current parameter first." })
		return registry.execute(id, () => {
			parameterResultOwner.current = null
			const lease = paletteCore.getSnapshot().lease
			if (lease) {
				const host = hostRef.current
				const focused = document.activeElement
				const ownedFocus = focused instanceof HTMLElement && host?.contains(focused) ? focused : null
				// Release modal ownership before the captured Source command launches its next reader.
				flushSync(() => paletteCore.retire(lease))
				restoreOrigin(originRef.current, host, ownedFocus)
			}
		})
	}, [registry, paletteCore])
	const focusParameter = useCallback((id: number) => {
		const entry = [...parametersRef.current].reverse().find((candidate) => candidate.live && candidate.session)
		if (entry?.session?.id !== id) return false
		const input = hostRef.current?.querySelector<HTMLInputElement>(`[data-org-parameter-session="${id}"] input[role="combobox"]`)
		if (!input?.isConnected) return false
		input.focus({ preventScroll: true })
		return document.activeElement === input
	}, [])
	const open = useCallback(() => {
		if (parametersRef.current.some((entry) => entry.session)) return false
		if (paletteCore.getSnapshot().lease) return true
		originRef.current = captureOrigin()
		const lease = paletteCore.begin()
		if (!lease) return false
		parameterResultOwner.current = null
		registry.clearResult()
		paletteCore.publishSession(lease, {
			id: lease.id, prompt: "Execute command:", initialInput: "", historyKey: "application.execute-command", completion: "value", acceptCandidate: true,
			candidates: [], matchingMode: "multi-term",
			onCancel: close,
			onAccept: async (id) => {
				if (!paletteCore.current(lease)) return { ok: false, message: "This command session is no longer active." }
				const result = await execute(id)
				return result.kind === "success" ? { ok: true } : { ok: false, message: result.message ?? "This command is no longer available." }
			},
		})
		return true
	}, [registry, paletteCore, close, execute])
	const updateParameter = useCallback((entry: ParameterRegistration, session: OrgMinibufferSession | null, result: ApplicationCommandResult | null) => {
		if (!entry.live) return
		const changed = entry.session !== session
		if (session && (!entry.session || entry.session.id !== session.id)) {
			// The same producer is handing off phases; its old callback must not cancel the new reader.
			const previous = [...parametersRef.current].reverse().find((candidate) => candidate !== entry && candidate.session)
			if (previous?.session?.cancelWhileAccepting === false) {
				if (session.cancelWhileAccepting !== false) session.onCancel()
				return
			}
			entry.lifetime = {}
			// Cancelling a superseded reader goes through its real flow core/AbortController.
			previous?.session?.onCancel()
			if (previous) { previous.session = null; previous.lifetime = null }
			parameterResultOwner.current = entry
			const lease = paletteCore.getSnapshot().lease
			if (lease) paletteCore.retire(lease)
		}
		entry.session = session
		if (!session) entry.lifetime = null
		const previousResult = entry.result
		if ((changed && !session) || result?.kind !== previousResult?.kind || result?.message !== previousResult?.message) {
			entry.result = result
			if (result && !paletteCore.getSnapshot().lease && !parametersRef.current.some((candidate) => candidate !== entry && candidate.session)) parameterResultOwner.current = entry
			// Reader progress is not a global result; publishing it would retire its launching command.
			if (!session && result && parameterResultOwner.current === entry) registry.publishResult(result)
			if (!session && !result && parameterResultOwner.current === entry) {
				parameterResultOwner.current = null
				const published = registry.getSnapshot().result
				if (previousResult && published?.kind === previousResult.kind && published.message === previousResult.message) registry.clearResult()
			}
		}
		if (changed) setParameters((current) => current.includes(entry) ? [...current.filter((candidate) => candidate !== entry), entry] : current)
	}, [registry, paletteCore])
	const registerParameter = useCallback((owner: object) => {
		const entry: ParameterRegistration = { owner, live: true, lifetime: null, session: null, result: null }
		setParameters((current) => [...current, entry])
		return { entry, unregister: () => {
			entry.live = false
			entry.lifetime = null
			// Flow cores abort candidate work and drain started commits on lifetime retirement.
			if (parameterResultOwner.current === entry) {
				parameterResultOwner.current = null
				const published = registry.getSnapshot().result
				if (entry.result && published?.kind === entry.result.kind && published.message === entry.result.message) registry.clearResult()
			}
			if (entry.session?.cancelWhileAccepting !== false) entry.session?.onCancel()
			entry.session = null
			setParameters((current) => current.filter((candidate) => candidate !== entry))
		} }
	}, [registry])
	const candidates = (palette.session ? snapshot.commands : []).filter((command, index, all) => all.findLastIndex((entry) => entry.id === command.id) === index).map((command) => ({
		value: command.id, label: command.label, detail: command.group, shortcut: command.shortcut, unavailableReason: command.getDisabledReason() ?? undefined,
	}))
	const sourceSession = activeParameter?.session
	const parameterLifetime = activeParameter?.lifetime
	// Candidate refreshes may replace producer callbacks within the same reader.
	// Keep UI handlers scoped to its registration/incarnation and read the current session.
	const handlers = useMemo<Pick<OrgMinibufferSession, "onAccept" | "onCancel"> | null>(() => {
		if (!sourceSession || !activeParameter) return null
		const id = sourceSession.id
		const current = () => activeParameter.live && activeParameter.lifetime === parameterLifetime &&
			parametersRef.current.includes(activeParameter) && activeParameter.session?.id === id &&
			[...parametersRef.current].reverse().find((entry) => entry.session) === activeParameter
		return {
			onAccept: async (input) => {
				if (!current() || !activeParameter.session) return { ok: false, message: "This parameter session is no longer active." }
				try {
					const result = await activeParameter.session.onAccept(input)
					if (!result.ok && current()) registry.publishResult({ kind: "rejected", message: result.message })
					return result
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error)
					if (current()) registry.publishResult({ kind: "rejected", message })
					return { ok: false, message }
				}
			},
			onCancel: () => { if (current()) activeParameter.session?.onCancel() },
		}
	}, [activeParameter, parameterLifetime, sourceSession?.id, registry])
	const ownsParameter = useCallback((session: OrgMinibufferSession) => {
		const entry = parametersRef.current.findLast((candidate) => candidate.session)
		return !!entry?.live && entry.lifetime !== null && entry.session === session
	}, [])
	const displayedSession = sourceSession && handlers
		? { ...sourceSession, ...handlers, get cancelWhileAccepting() { return sourceSession.cancelWhileAccepting } }
		: (palette.session ? { ...palette.session, annotatedCandidates: candidates } : null)
	return { registry, open, close, execute, focusParameter, ownsParameter, isOpen: Boolean(palette.lease), result: snapshot.result, session: displayedSession, hostRef, registerParameter, updateParameter }
}

const CommandContext = createContext<ApplicationCommandHost | null>(null)

export function ApplicationCommandProvider({ children }: { readonly children: ReactNode }) {
	const host = useCommandProviderState()
	const input = useOrgScopedInput({
		scope: "application", owner: host.registry,
		acceptsEvent: () => true,
		execute: (id) => {
			if (id === "execute-command") return host.open()
			if (!host.registry.getSnapshot().commands.some((command) => command.id === id)) return false
			void host.execute(id)
			return true
		},
		onUnavailable: (id) => host.registry.publishResult({ kind: "rejected", message: `Command ${id} is unavailable in this application scope.` }),
	})
	useEffect(() => {
		window.addEventListener("keydown", input.handleKeyDown)
		return () => window.removeEventListener("keydown", input.handleKeyDown)
	}, [input.handleKeyDown])
	return <CommandContext.Provider value={host}>
		<div className="flex h-screen min-h-0 w-screen flex-col overflow-hidden">
			<div className="min-h-0 flex-1">{children}</div>
			<div ref={host.hostRef} data-application-command-host="true" className="shrink-0">
				<OrgWhichKey prefix={input.prefix} getInputCommandDisabledReason={(id) => {
					if (id === "execute-command") return host.session ? "Finish or cancel the current parameter first" : null
					const command = host.registry.getSnapshot().commands.findLast((command) => command.id === id)
					return command ? command.getDisabledReason() : "Unavailable in this application scope"
				}} />
				{input.error && <p role="alert" className="px-3 py-1 text-xs text-destructive">{input.error}</p>}
				<OrgMinibuffer session={host.session} />
				{!host.session && <button type="button" className="px-3 py-1 font-mono text-xs text-muted-foreground hover:text-foreground" onMouseDown={(event) => event.preventDefault()} onClick={() => host.open()}>Execute command (Alt+X)</button>}
				{host.result?.message && !host.session && <div role={host.result.kind === "rejected" ? "alert" : "status"} className={`border-t px-3 py-1 font-mono text-xs ${host.result.kind === "rejected" ? "text-destructive" : "text-muted-foreground"}`}>{host.result.message}</div>}
			</div>
		</div>
	</CommandContext.Provider>
}

export function useApplicationCommandHost() {
	const host = useContext(CommandContext)
	if (!host) throw new Error("Application commands require ApplicationCommandProvider")
	return host
}

export function useApplicationCommandRegistration(owner: object, descriptors: readonly ApplicationCommandDescriptor[]) {
	const { registry } = useApplicationCommandHost()
	const latest = useRef(descriptors)
	latest.current = descriptors
	const registration = useRef<ApplicationCommandRegistration | null>(null)
	const signature = JSON.stringify(descriptors.map((entry) => [entry.id, entry.label, entry.group, entry.shortcut, entry.getDisabledReason()]))
	const metadataSignature = JSON.stringify(descriptors.map(({ id, label }) => [id, label]))
	const metadata = useMemo(() => descriptors.map(({ id, label }) => ({ id, label })), [metadataSignature])
	useLayoutEffect(() => registerOrgInputCommandMetadata(owner, metadata), [owner, metadata])
	const proxies = useMemo(() => descriptors.map((entry): ApplicationCommandDescriptor => ({
		id: entry.id, label: entry.label, group: entry.group, shortcut: entry.shortcut,
		getDisabledReason: () => {
			const descriptor = latest.current.find((descriptor) => descriptor.id === entry.id)
			return descriptor ? descriptor.getDisabledReason() : "This command is no longer available."
		},
		capture: () => latest.current.find((descriptor) => descriptor.id === entry.id)?.capture() ?? { kind: "cancelled" },
	})), [signature])
	useLayoutEffect(() => {
		const owned = registry.register(owner, proxies)
		registration.current = owned
		return () => { registry.unregister(owned); if (registration.current === owned) registration.current = null }
	}, [owner, registry])
	useLayoutEffect(() => { if (registration.current) registry.update(registration.current, proxies) }, [registry, proxies])
}

export function useApplicationParameterRegistration(owner: object, session: OrgMinibufferSession | null, result: ApplicationCommandResult | null = null) {
	const { registerParameter, updateParameter } = useApplicationCommandHost()
	const registration = useRef<ParameterHandle | null>(null)
	useLayoutEffect(() => {
		const owned = registerParameter(owner)
		registration.current = owned
		return () => { owned.unregister(); if (registration.current === owned) registration.current = null }
	}, [owner, registerParameter])
	useLayoutEffect(() => { if (registration.current) updateParameter(registration.current.entry, session, result) }, [session, result, updateParameter, owner])
}

/** UI producers capture publication ownership before async work, not when a status effect settles. */
export function useApplicationResultPublisher(owner: object): () => ApplicationResultPublisher | null {
	const { registry } = useApplicationCommandHost()
	const registration = useRef<ApplicationCommandRegistration | null>(null)
	useLayoutEffect(() => {
		const owned = registry.register(owner, [])
		registration.current = owned
		return () => { registry.unregister(owned); if (registration.current === owned) registration.current = null }
	}, [owner, registry])
	return useCallback(() => registration.current ? registry.beginResult(registration.current) : null, [registry])
}
