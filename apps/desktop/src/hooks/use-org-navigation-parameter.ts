import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { createParameterSession, type ParameterLease } from "@/flows/org-command/parameter-session"
import { useApplicationParameterRegistration } from "@/views/application/application-command-provider"
import type { OrgMinibufferAcceptResult } from "@/types/editor/minibuffer.interface"

export interface OrgNavigationParameterCandidate<T> {
	readonly id: string
	readonly relativePath: string
	readonly value: T
	readonly markers?: string
	readonly optionLabel?: string
	readonly disabled?: boolean
	readonly disabledReason?: string
}
export interface OrgNavigationParameterOptions<T> {
	readonly candidates: readonly OrgNavigationParameterCandidate<T>[]
	readonly sessionKey?: string
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly onSelect: (value: T, signal?: AbortSignal) => boolean | undefined | Promise<boolean | undefined>
	readonly label: string
	readonly inputLabel: string
	readonly emptyMessage: string
	readonly errorMessage: string
}
/** Navigation candidates are parameters, not independent tool buffers or body authorities. */
export function useOrgNavigationParameter<T>(options: OrgNavigationParameterOptions<T>) {
	const latest = useRef(options)
	latest.current = options
	const [core] = useState(createParameterSession)
	const snapshot = useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot)
	const origin = useRef<HTMLElement | null>(null)
	const active = useRef<{ lease: ParameterLease; scope: string | undefined } | null>(null)
	const owner = useRef({}).current
	useApplicationParameterRegistration(owner, snapshot.session)
	useLayoutEffect(() => {
		core.attach()
		if (options.open) {
			if (!document.activeElement?.closest('[data-org-parameter-session]'))
				origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
			const lease = core.begin()
			active.current = lease ? { lease, scope: options.sessionKey } : null
		} else active.current = null
		return () => { active.current = null; core.detach() }
	}, [core, options.open, options.sessionKey])
	useLayoutEffect(() => {
		const request = active.current
		if (!request || !core.current(request.lease)) return
		const current = () => active.current === request && core.current(request.lease) && latest.current.open && latest.current.sessionKey === request.scope
		core.publishSession(request.lease, {
			id: request.lease.id, prompt: `${options.label}:`, inputLabel: options.inputLabel,
			initialInput: "", candidates: options.candidates.map((candidate) => candidate.id),
			annotatedCandidates: options.candidates.map((candidate) => ({
				value: candidate.id, path: candidate.relativePath, label: candidate.optionLabel ?? candidate.relativePath,
				detail: candidate.markers, searchText: [candidate.relativePath, candidate.optionLabel, candidate.markers].filter(Boolean).join(" "),
				unavailableReason: candidate.disabled ? candidate.disabledReason ?? "Unavailable" : undefined,
			})),
			matchingMode: "path", completion: "value", acceptCandidate: true, cancelWhileAccepting: true,
			emptyMessage: options.emptyMessage,
			onCancel: () => {
				if (!current() || !core.cancel(request.lease)) return
				active.current = null
				const focus = document.activeElement
				if (origin.current?.isConnected && (focus?.closest('[data-org-parameter-session]') || focus === document.body)) origin.current.focus()
				latest.current.onOpenChange(false)
			},
			onAccept: (id) => core.accept(request.lease, current, false, async (): Promise<OrgMinibufferAcceptResult> => {
				const candidate = latest.current.candidates.find((entry) => entry.id === id)
				if (!candidate || candidate.disabled) return { ok: false, message: candidate?.disabledReason ?? "The selected candidate is no longer available." }
				const abort = core.beginRead(request.lease)
				if (!abort) return { ok: false, message: options.errorMessage }
				try {
					// Cancellation retires candidate authority; an already accepted controller effect still drains.
					const opened = await latest.current.onSelect(candidate.value, abort.signal)
					if (!current() || abort.signal.aborted) return { ok: true }
					const fresh = latest.current.candidates.find((entry) => entry.id === id)
					if (opened === false || !fresh || fresh.disabled) return { ok: false, message: options.errorMessage }
					core.retire(request.lease)
					active.current = null
					latest.current.onOpenChange(false)
					return { ok: true }
				} catch { return { ok: false, message: options.errorMessage } }
				finally { core.endRead(request.lease, abort) }
			}) ?? { ok: false, message: "Navigation session is no longer current." },
		})
	}, [core, options.open, options.sessionKey, options.candidates, options.label, options.inputLabel, options.errorMessage, options.emptyMessage])
}
