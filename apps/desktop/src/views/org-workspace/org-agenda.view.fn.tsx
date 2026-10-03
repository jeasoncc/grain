import { CalendarDays, FileText } from "lucide-react"
import { memo, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react"
import type { OrgAgendaEntry } from "@/pipes/org"

export interface OrgAgendaViewProps {
	readonly entries: readonly OrgAgendaEntry[]
	readonly error: string | null
	readonly isLoading: boolean
	readonly onOpenEntry: (entry: OrgAgendaEntry) => void
	readonly onCycleTodo?: (entry: OrgAgendaEntry) => void
	readonly actionPending?: boolean
	readonly actionStatus?: string | null
	readonly focusScope?: string
}

interface AgendaGroup {
	readonly date: string
	readonly entries: readonly OrgAgendaEntry[]
}

export const groupOrgAgendaEntries = (
	entries: readonly OrgAgendaEntry[],
): readonly AgendaGroup[] => {
	const groups = new Map<string, OrgAgendaEntry[]>()
	for (const entry of entries) {
		const current = groups.get(entry.date)
		if (current) {
			current.push(entry)
		} else {
			groups.set(entry.date, [entry])
		}
	}
	return [...groups].map(([date, groupedEntries]) => ({ date, entries: groupedEntries }))
}

const kindLabel = (kind: OrgAgendaEntry["kind"]): string => {
	if (kind === "deadline") {
		return "Deadline"
	}
	if (kind === "scheduled") {
		return "Scheduled"
	}
	return "Timestamp"
}

const entryKey = (entry: OrgAgendaEntry): string =>
	JSON.stringify([entry.relativePath, entry.line, entry.column, entry.kind, entry.date])

export const OrgAgendaView = memo(function OrgAgendaView({
	entries,
	error,
	isLoading,
	onOpenEntry,
	onCycleTodo,
	actionPending = false,
	actionStatus,
	focusScope,
}: OrgAgendaViewProps) {
	const [selectedKey, setSelectedKey] = useState<string | null>(null)
	const groups = groupOrgAgendaEntries(entries)
	const orderedEntries = groups.flatMap((group) => group.entries)
	const selectedIndex = Math.max(
		0,
		orderedEntries.findIndex((entry) => entryKey(entry) === selectedKey),
	)
	const selectedEntry = orderedEntries[selectedIndex]

	const rootRef = useRef<HTMLElement>(null)
	const ownsFocus = useRef(false)
	const previousScope = useRef(focusScope)
	useLayoutEffect(() => {
		const track = (event: FocusEvent) => {
			ownsFocus.current = !!rootRef.current?.contains(event.target as Node)
		}
		document.addEventListener("focusin", track)
		return () => document.removeEventListener("focusin", track)
	}, [])
	useLayoutEffect(() => {
		if (previousScope.current !== focusScope) {
			previousScope.current = focusScope
			ownsFocus.current = false
			setSelectedKey(null)
			return
		}
		const root = rootRef.current
		// A removed focused row falls back to body without a focusin event. Never
		// reclaim focus after the user has explicitly focused another surface.
		if (!root || !ownsFocus.current || root.contains(document.activeElement)) return
		if (document.activeElement !== document.body) return
		const rows = root.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
		;(rows[selectedIndex] ?? root).focus()
	}, [entries, error, isLoading, actionPending, focusScope, selectedIndex])

	const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		const target = event.target as HTMLElement
		if (
			event.defaultPrevented ||
			event.nativeEvent.isComposing ||
			event.keyCode === 229 ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey ||
			target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
			target.isContentEditable ||
			window.getSelection()?.toString() ||
			(target.closest('button, a, [role="button"]') && !target.closest("[data-agenda-open]")) ||
			actionPending ||
			!selectedEntry
		)
			return

		const direction =
			event.key === "n" || event.key === "ArrowDown"
				? 1
				: event.key === "p" || event.key === "ArrowUp"
					? -1
					: 0
		if (direction) {
			event.preventDefault()
			const nextIndex = Math.max(0, Math.min(orderedEntries.length - 1, selectedIndex + direction))
			setSelectedKey(entryKey(orderedEntries[nextIndex]))
			event.currentTarget
				.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")
				[nextIndex]?.focus()
		} else if (event.key === "Enter") {
			event.preventDefault()
			onOpenEntry(selectedEntry)
		} else if (event.key === "t" && onCycleTodo) {
			event.preventDefault()
			if (!event.repeat) onCycleTodo(selectedEntry)
		}
	}

	return (
		<main
			ref={rootRef}
			className="min-w-0 flex-1 overflow-auto"
			aria-label="Org agenda"
			tabIndex={-1}
			aria-busy={actionPending || isLoading}
			onKeyDown={handleKeyDown}
		>
			{isLoading ? (
				<p className="text-sm text-muted-foreground">Loading agenda…</p>
			) : error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : entries.length === 0 ? (
				<div className="text-center text-muted-foreground">
					<CalendarDays className="mx-auto mb-2 size-6" />
					<p className="text-sm">No active Org timestamps in this workspace.</p>
				</div>
			) : (
				<div className="mx-auto max-w-[760px] space-y-6 px-8 pb-16 pt-6">
					{actionStatus && (
						<p role="status" className="text-sm text-muted-foreground">
							{actionStatus}
						</p>
					)}
					{groups.map((group) => (
						<section key={group.date} aria-labelledby={`agenda-${group.date}`}>
							<h2 id={`agenda-${group.date}`} className="mb-2 text-[13px] font-semibold">
								{group.date}
							</h2>
							<ul className="space-y-1">
								{group.entries.map((entry) => (
									<li
										key={entryKey(entry)}
										data-selected={entry === selectedEntry}
										className="flex items-center gap-2"
									>
										<button
											type="button"
											className="flex min-h-14 w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 aria-[current=true]:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
											data-agenda-open
											aria-current={entry === selectedEntry ? "true" : undefined}
											aria-disabled={actionPending}
											onFocus={() => setSelectedKey(entryKey(entry))}
											onClick={() => {
												if (actionPending) return
												setSelectedKey(entryKey(entry))
												onOpenEntry(entry)
											}}
										>
											<FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
											<span className="min-w-0 flex-1">
												<span className="flex items-center gap-2">
													<span className="text-xs font-medium uppercase text-muted-foreground">
														{kindLabel(entry.kind)}
													</span>
													{entry.todo && (
														<span className="text-xs font-semibold">{entry.todo}</span>
													)}
												</span>
												<span className="block truncate text-sm font-medium">
													{entry.heading ?? "(No heading)"}
												</span>
												<span className="block truncate text-xs text-muted-foreground">
													{entry.relativePath}:{entry.line}
												</span>
											</span>
										</button>
										{onCycleTodo && (
											<button
												type="button"
												aria-disabled={actionPending}
												aria-label={`Cycle TODO for ${entry.heading ?? "(No heading)"}`}
												className="shrink-0 rounded-md border px-3 py-2 text-xs aria-disabled:opacity-50"
												onFocus={() => setSelectedKey(entryKey(entry))}
												onClick={() => {
													if (!actionPending) onCycleTodo(entry)
												}}
											>
												Cycle TODO
											</button>
										)}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</main>
	)
})
