import { useEffect, useState } from "react"

import { MAX_ORG_PREFIX_TIMEOUT_MS } from "@/flows/org-command/org-prefix-keymap"
import type { OrgPrefixSession } from "@/types/editor/org-keymap.interface"

/** Passive prefix help; the parent places it above the modeline in normal flow. */
export const OrgWhichKey = ({
	prefix,
	delayMs = 350,
}: {
	readonly prefix: OrgPrefixSession | null
	readonly delayMs?: number
}) => {
	const [visibleSessionId, setVisibleSessionId] = useState<number | null>(null)
	const sessionId = prefix?.id
	const expiresAt = prefix?.expiresAt

	useEffect(() => {
		setVisibleSessionId(null)
		if (sessionId === undefined || expiresAt === undefined) return
		const remainingMs = expiresAt === null ? null : expiresAt - Date.now()
		if (remainingMs !== null && remainingMs <= 0) return

		let active = true
		const revealTimer = setTimeout(
			() => {
				if (active && (expiresAt === null || Date.now() < expiresAt)) setVisibleSessionId(sessionId)
			},
			Math.min(MAX_ORG_PREFIX_TIMEOUT_MS, Math.max(0, Number.isFinite(delayMs) ? delayMs : 350)),
		)
		let expiryTimer: ReturnType<typeof setTimeout> | null = null
		const expire = () => {
			if (!active || expiresAt === null) return
			const remaining = expiresAt - Date.now()
			if (remaining <= 0) setVisibleSessionId(null)
			else expiryTimer = setTimeout(expire, Math.min(MAX_ORG_PREFIX_TIMEOUT_MS, remaining))
		}
		if (remainingMs !== null) expiryTimer = setTimeout(expire, Math.min(MAX_ORG_PREFIX_TIMEOUT_MS, remainingMs))
		return () => {
			active = false
			clearTimeout(revealTimer)
			if (expiryTimer !== null) clearTimeout(expiryTimer)
		}
	}, [sessionId, expiresAt, delayMs])

	// A replacement is hidden on its very first render, before effect cleanup.
	const now = Date.now()
	if (
		!prefix ||
		visibleSessionId !== prefix.id ||
		(prefix.expiresAt !== null && now >= prefix.expiresAt)
	)
		return null

	return (
		<section
			aria-label="Which-Key"
			className="max-h-[35vh] shrink-0 overflow-auto border-t border-border bg-background px-3 py-2 font-mono text-xs"
		>
			<p className="mb-1 font-medium text-primary">{prefix.label}</p>
			<dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-4 gap-y-1">
				{prefix.bindings.map((binding) => (
					<div key={binding.keyLabel} className="flex min-w-0 items-baseline gap-2">
						<dt className="shrink-0 text-foreground">
							<kbd>{binding.keyLabel}</kbd>
						</dt>
						<dd className="text-muted-foreground">{binding.label}</dd>
					</div>
				))}
			</dl>
		</section>
	)
}
