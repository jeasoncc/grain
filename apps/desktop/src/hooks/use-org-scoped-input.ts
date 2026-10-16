import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { claimOrgInputEvent, isOrgRepeatedKeyEvent, retainOrgInputKeys, resolveOrgInput } from "@/flows/org-command/org-prefix-keymap"
import { getOrgInputConfiguration, useOrgInputConfiguration } from "./use-org-input-configuration"
import type { OrgKeymapScope, OrgPrefixSession } from "@/types/editor/org-keymap.interface"

interface ScopedInputOptions {
	readonly selectionEmpty?: boolean
	readonly isComposing?: boolean
	readonly isParameterInput?: boolean
}
interface GlobalInputRoute {
	readonly scope: () => OrgKeymapScope
	readonly accepts: (event: KeyboardEvent) => boolean
	readonly resolve: (event: KeyboardEvent, options?: ScopedInputOptions) => boolean
}
const globalRoutes = new Set<GlobalInputRoute>()
const scopePriority: Record<OrgKeymapScope, number> = {
	application: 0, workspace: 1, "org-source": 2,
	"file-tree": 3, "org-capture": 3, "org-roam": 3, "org-agenda": 3, "org-todo-note": 3, "org-remark": 3,
}

/** Non-Source producers share the same resolver and a focus/configuration-bound prefix lease. */
export const useOrgScopedInput = ({
	scope, owner, active = true, execute, onUnavailable, acceptsEvent,
}: {
	readonly scope: OrgKeymapScope
	readonly owner: object
	readonly active?: boolean
	readonly execute: (id: string) => boolean
	readonly onUnavailable: (id: string) => void
	/** Global listeners declare eligibility so mount order cannot choose authority. */
	readonly acceptsEvent?: (event: KeyboardEvent) => boolean
}) => {
	const configuration = useOrgInputConfiguration()
	const [prefix, setPrefix] = useState<OrgPrefixSession | null>(null)
	const prefixRef = useRef<OrgPrefixSession | null>(null)
	const targetRef = useRef<EventTarget | null>(null)
	const nextId = useRef(0)
	const attached = useRef(false)
	const composing = useRef(false)
	const latest = useRef({ scope, owner, active, execute, onUnavailable, acceptsEvent })
	latest.current = { scope, owner, active, execute, onUnavailable, acceptsEvent }
	const cancel = useCallback(() => {
		prefixRef.current = null
		targetRef.current = null
		setPrefix(null)
	}, [])
	useLayoutEffect(() => {
		const releaseKeys = retainOrgInputKeys(window)
		attached.current = true
		return () => { attached.current = false; prefixRef.current = null; targetRef.current = null; releaseKeys() }
	}, [])
	useLayoutEffect(cancel, [cancel, owner, scope, active, configuration.generation])
	useEffect(() => {
		const focus = (event: FocusEvent) => {
			if (prefixRef.current && targetRef.current !== event.target) cancel()
		}
		const compositionStart = () => { composing.current = true; cancel() }
		const compositionEnd = () => { composing.current = false }
		const blur = () => { composing.current = false; cancel() }
		window.addEventListener("blur", blur)
		document.addEventListener("focusin", focus)
		document.addEventListener("compositionstart", compositionStart)
		document.addEventListener("compositionend", compositionEnd)
		return () => {
			window.removeEventListener("blur", blur)
			document.removeEventListener("focusin", focus)
			document.removeEventListener("compositionstart", compositionStart)
			document.removeEventListener("compositionend", compositionEnd)
			composing.current = false
			prefixRef.current = null
			targetRef.current = null
		}
	}, [cancel])
	useEffect(() => {
		if (!prefix || prefix.expiresAt === null) return
		const expire = () => {
			if (prefixRef.current === prefix) cancel()
		}
		const timer = setTimeout(expire, Math.max(0, prefix.expiresAt - Date.now()))
		return () => clearTimeout(timer)
	}, [prefix, cancel])
	const resolveEvent = useCallback((event: KeyboardEvent, options: ScopedInputOptions = {}): boolean => {
		const current = latest.current
		if (!attached.current || !current.active) { cancel(); return false }
		if (!claimOrgInputEvent(event)) return false
		if (prefixRef.current && targetRef.current !== event.target) cancel()
		const policy = getOrgInputConfiguration()
		const target = event.target instanceof Element ? event.target : null
		const selected = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
			? target.selectionStart !== target.selectionEnd : document.getSelection()?.isCollapsed === false
		const routed = resolveOrgInput({
			configuration: policy.configuration, scope: current.scope, current: prefixRef.current,
			input: {
				key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
				altKey: event.altKey, shiftKey: event.shiftKey, defaultPrevented: event.defaultPrevented,
				isComposing: composing.current || options.isComposing || event.isComposing, keyCode: event.keyCode,
				repeat: isOrgRepeatedKeyEvent(event), altGraphKey: event.getModifierState("AltGraph"),
				isParameterInput: options.isParameterInput ?? Boolean(target?.closest('[data-org-parameter-input], [role="dialog"], [role="alertdialog"]')),
			},
			now: Date.now(), nextId: ++nextId.current, owner: current.owner,
			generation: policy.generation, selectionEmpty: options.selectionEmpty ?? !selected,
		})
		prefixRef.current = routed.session
		targetRef.current = routed.session ? event.target : null
		setPrefix(routed.session)
		if (!routed.consumed) return false
		event.preventDefault()
		if (routed.commandId && !current.execute(routed.commandId)) current.onUnavailable(routed.commandId)
		return true
	}, [cancel])
	const route = useRef<GlobalInputRoute | null>(null)
	if (!route.current) route.current = {
		scope: () => latest.current.scope,
		accepts: (event) => attached.current && latest.current.active && Boolean(latest.current.acceptsEvent?.(event)),
		resolve: (event, options) => resolveEvent(event, options),
	}
	useLayoutEffect(() => {
		const registered = route.current!
		globalRoutes.add(registered)
		return () => { globalRoutes.delete(registered) }
	}, [])
	const handleKeyDown = useCallback((event: KeyboardEvent, options: ScopedInputOptions = {}): boolean => {
		if (!latest.current.acceptsEvent) return resolveEvent(event, options)
		let selected: GlobalInputRoute | null = null
		for (const candidate of globalRoutes) {
			if (candidate.accepts(event) && (!selected || scopePriority[candidate.scope()] > scopePriority[selected.scope()]))
				selected = candidate
		}
		return selected?.resolve(event, selected === route.current ? options : undefined) ?? false
	}, [resolveEvent])
	return {
		prefix: active && prefix?.owner === owner && prefix.generation === configuration.generation ? prefix : null,
		handleKeyDown, cancel, error: configuration.error,
	}
}
