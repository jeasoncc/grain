import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { createParameterSession } from "@/flows/org-command/parameter-session"
import { useApplicationCommandHost, useApplicationParameterRegistration, type ApplicationCommandResult } from "@/views/application/application-command-provider"
import type { OrgModalPrompt, OrgModalPromptHandle, OrgModalPromptPorts } from "@/flows/org-modal/org-modal-adapter"

export interface OrgModalMinibufferOriginPorts {
	/** Captures exact window/source incarnation/config authority, never a fresh lease in a callback. */
	readonly capture: () => object | null
	readonly isCurrent: (lease: object) => boolean
	/** Restores only that captured Source, without changing its canonical selection. */
	readonly restore: (lease: object) => void
}

/** One application parameter host; the engine never mounts an input or a private panel. */
export function useOrgModalMinibuffer(origin: OrgModalMinibufferOriginPorts): OrgModalPromptPorts {
	const host = useApplicationCommandHost()
	const hostRef = useRef(host)
	hostRef.current = host
	const [core] = useState(createParameterSession)
	const snapshot = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const [echo, setEcho] = useState<ApplicationCommandResult | null>(null)
	const [mode, setMode] = useState<ApplicationCommandResult | null>(null)
	const echoOwner = useRef<object | null>(null)
	const owner = useRef({}).current
	const latest = useRef(origin)
	latest.current = origin
	const current = useRef<{ retire: () => void; isCurrent: () => boolean } | null>(null)
	useApplicationParameterRegistration(owner, snapshot.session, echo ?? mode)
	useLayoutEffect(() => {
		core.attach()
		return () => { current.current?.retire(); core.detach() }
	}, [core])
	useLayoutEffect(() => {
		if (current.current && !current.current.isCurrent()) current.current.retire()
		const captured = latest.current.capture()
		if (!captured || !latest.current.isCurrent(captured)) {
			echoOwner.current = null
			setEcho(null)
			setMode(null)
		}
	})
	const [ports] = useState<OrgModalPromptPorts>(() => ({
		runtimeScope: host.registry,
		mode(value) {
			const captured = latest.current.capture()
			if (captured && latest.current.isCurrent(captured)) setMode({ kind: "success", message: `-- ${value.toUpperCase()} --` })
		},
		echo(result) {
			const captured = latest.current.capture()
			if (!captured || !latest.current.isCurrent(captured)) return () => undefined
			const token = {}
			echoOwner.current = token
			setEcho({ kind: result.ok ? "success" : "rejected", message: result.message })
			return () => { if (echoOwner.current === token) { echoOwner.current = null; setEcho(null) } }
		},
		openPrompt(request: OrgModalPrompt): OrgModalPromptHandle | null {
			if (core.getSnapshot().phase === "commit" || (hostRef.current.session?.cancelWhileAccepting === false && !hostRef.current.ownsParameter(core.getSnapshot().session!))) return null
			const capturedPorts = latest.current
			const source = capturedPorts.capture()
			if (!source || !capturedPorts.isCurrent(source)) return null
			current.current?.retire()
			const lease = core.begin()
			if (!lease) return null
			echoOwner.current = null
			setEcho(null)
			let input: HTMLInputElement | null = null
			let setValue: ((value: string) => void) | null = null
			let root: HTMLElement | null = null
			let closed = false
			let accepting = false
			const valid = () => !closed && core.current(lease) && capturedPorts.isCurrent(source)
			const ownsHost = () => valid() && !!core.getSnapshot().session && host.ownsParameter(core.getSnapshot().session!)
			const retire = () => finish(false)
			const onFocus = (event: FocusEvent) => { if (root && !root.contains(event.target as Node)) retire() }
			const onBlur = () => retire()
			const finish = (restore: boolean) => {
				if (closed) return
				const owned = ownsHost()
				const shouldRestore = restore && owned && document.hasFocus() && !!root?.contains(document.activeElement)
				closed = true
				document.removeEventListener("focusin", onFocus)
				window.removeEventListener("blur", onBlur)
				if (current.current === lifetime) current.current = null
				core.retire(lease)
				if (shouldRestore && capturedPorts.isCurrent(source)) capturedPorts.restore(source)
				if (owned && root) request.onClose(root)
			}
			const lifetime = { retire, isCurrent: valid }
			current.current = lifetime
			const handle: OrgModalPromptHandle = {
				close: () => finish(true),
				setValue(value) { if (ownsHost() && input) { input.value = value; setValue?.(value) } },
				ownsInput: target => ownsHost() && target instanceof Node && !!root?.contains(target),
			}
			const cancel = () => { if (accepting) return; if (ownsHost()) request.onCancel(); if (!closed) finish(true) }
			request.onOpen(handle)
			core.publishSession(lease, {
				id: lease.id, prompt: request.prompt, inputLabel: "Vim command or search", initialInput: request.initialInput,
				candidates: [], completion: "value", historyKey: `vim.${request.prompt}`,
				get cancelWhileAccepting() { return !accepting },
				onAccept: value => {
					if (!ownsHost()) return { ok: false, message: "This Vim prompt is no longer active." }
					return core.accept(lease, () => capturedPorts.isCurrent(source), false, () => {
						accepting = true
						try {
							const result = request.onAccept(value)
							if ("then" in result) {
								core.beginCommit(lease)
								return Promise.resolve(result).finally(() => { accepting = false })
							}
							accepting = false
							return result
						} catch (cause) { accepting = false; throw cause }
					}) ?? { ok: false, message: "This Vim prompt is no longer active." }
				},
				onCancel: cancel,
				nativeInput: {
					selectValueOnOpen: request.selectValueOnOpen,
					bind(node, update) {
						input = node; setValue = node ? update : null
						if (!node || !valid()) return
						root = node.closest<HTMLElement>("[data-org-parameter-session]")
						document.addEventListener("focusin", onFocus)
						window.addEventListener("blur", onBlur)
					},
					onInput: (event, node) => { if (ownsHost() && node === input) request.onInput(event, node) },
					onKeyDown: (event, node) => ownsHost() && node === input ? request.onKeyDown(event, node) : false,
					onKeyUp: (event, node) => { if (ownsHost() && node === input) request.onKeyUp(event, node) },
				},
			})
			return handle
		},
	}))
	return ports
}
