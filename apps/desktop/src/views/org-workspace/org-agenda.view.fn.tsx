import { CalendarDays, FileText } from "lucide-react"
import { memo, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import type { OrgAgendaEntry } from "@/pipes/org"
import { useOrgScopedInput } from "@/hooks/use-org-scoped-input"
import { getOrgInputConfiguration } from "@/hooks/use-org-input-configuration"
import { claimOrgInputEvent } from "@/flows/org-command/org-prefix-keymap"
import { useApplicationCommandHost, useApplicationCommandRegistration, type ApplicationCommandDescriptor, type ApplicationCommandResult } from "@/views/application/application-command-provider"
import type { ApplicationToolOrigin } from "@/flows/application/application-tool-registry"
import { freezeOrgAgendaEntrySnapshot } from "@/pipes/org/org-agenda-command-plan.pipe"
import type { OrgAgendaCommand } from "@/types/org/org-agenda-command.types"
import type { OrgAgendaViewConfiguration } from "@/pipes/org/org-agenda-configuration.pipe"
import { OrgWhichKey } from "./org-which-key.view.fn"

export interface OrgAgendaViewProps {
	readonly entries: readonly OrgAgendaEntry[]
	readonly error: string | null
	readonly isLoading: boolean
	readonly view?: OrgAgendaViewConfiguration | null
	readonly onOpenEntry: (entry: OrgAgendaEntry) => void
	readonly onAction?: (entry: OrgAgendaEntry, action: OrgAgendaCommand["kind"], origin?: ApplicationToolOrigin | null) => void
	readonly captureOrigin?: (entry: OrgAgendaEntry) => ApplicationToolOrigin | null
	readonly onCancelAction?: () => void
	readonly onSaveEntry?: (entry: OrgAgendaEntry, origin?: ApplicationToolOrigin | null) => ApplicationCommandResult | Promise<ApplicationCommandResult>
	readonly onReturnSource?: (entry: OrgAgendaEntry, origin?: ApplicationToolOrigin | null) => void | Promise<void>
	readonly onClockEntry?: (entry: OrgAgendaEntry, operation: "clock-in" | "clock-out" | "cancel-clock" | "clock-report", origin?: ApplicationToolOrigin | null) => void | ApplicationCommandResult | Promise<void | ApplicationCommandResult>
	readonly actionPending?: boolean
	readonly focusScope?: string
}

interface AgendaGroup {
	readonly date: string | null
	readonly entries: readonly OrgAgendaEntry[]
}

export const groupOrgAgendaEntries = (
	entries: readonly OrgAgendaEntry[],
): readonly AgendaGroup[] => {
	const groups = new Map<string | null, OrgAgendaEntry[]>()
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
	if (kind === "todo") return "Heading"
	if (kind === "deadline") {
		return "Deadline"
	}
	if (kind === "scheduled") {
		return "Scheduled"
	}
	return "Timestamp"
}

const entryKey = (entry: OrgAgendaEntry): string => {
	const heading = entry.origin?.heading
	// Source/action anchors remain unchanged by virtual dates. Planning source rows
	// retain focus after a reschedule; each virtual occurrence has a separate key.
	return JSON.stringify([
		entry.relativePath, heading?.from ?? entry.line, entry.kind,
		entry.sourceOrdinal ?? (entry.kind === "timestamp" ? entry.origin?.timestamp?.from ?? entry.column : null),
		entry.occurrence && entry.occurrence !== "source" ? [entry.occurrence, entry.date] : null,
	])
}

export const OrgAgendaView = memo(function OrgAgendaView({
	entries,
	error,
	isLoading,
	view = null,
	onOpenEntry,
	onAction,
	onCancelAction,
	onSaveEntry,
	onReturnSource,
	onClockEntry,
	actionPending = false,
	focusScope,
	captureOrigin,
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
	const focusedAction = useRef("open")
	const previousScope = useRef(focusScope)
	useLayoutEffect(() => {
		const track = (event: FocusEvent) => {
			ownsFocus.current = !!rootRef.current?.contains(event.target as Node)
			if (ownsFocus.current)
				focusedAction.current = (event.target as HTMLElement).dataset.agendaAction ?? "open"
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
		const rows = root.querySelectorAll<HTMLElement>("[data-agenda-key]")
		;(
			rows[selectedIndex]?.querySelector<HTMLElement>(
				`[data-agenda-action="${focusedAction.current}"]`,
			) ??
			rows[selectedIndex]?.querySelector<HTMLElement>("[data-agenda-open]") ??
			root
		).focus()
	}, [entries, error, isLoading, actionPending, focusScope, selectedIndex])

	const commandOwner = useMemo(() => ({}), [focusScope])
	const host = useApplicationCommandHost()
	const eventEntry = useRef<OrgAgendaEntry | null>(null)
	const live = useRef({ scope: focusScope, entries })
	live.current = { scope: focusScope, entries }
	const selected = () => {
		const focusedKey = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-agenda-key]")?.dataset.agendaKey
		return eventEntry.current ?? orderedEntries.find((entry) => entryKey(entry) === focusedKey) ?? selectedEntry
	}
	const descriptors: readonly ApplicationCommandDescriptor[] = ([
		["next", "Next agenda entry"], ["previous", "Previous agenda entry"], ["open", "Open agenda source"],
		["save", "Save agenda source"], ["return-source", "Return to agenda source"],
		["clock-in", "Clock in agenda heading"], ["clock-out", "Clock out agenda heading"],
		["cancel-clock", "Cancel agenda clock"], ["clock-report", "Report agenda clock totals"],
		["cycle-todo", "Cycle agenda TODO"], ["schedule", "Schedule agenda heading"], ["deadline", "Set agenda deadline"],
		["todo-state", "Set agenda TODO state"], ["complete-repeating", "Complete recurring agenda TODO"],
		["remove-schedule", "Remove agenda schedule"], ["remove-deadline", "Remove agenda deadline"],
		["cancel", "Cancel agenda action"],
	] as const).map(([action, label]) => ({
		id: `org-agenda.${action}`, label, group: "Agenda",
		getDisabledReason: () => action === "cancel"
			? actionPending && onCancelAction ? null : "No agenda action is running."
			: actionPending ? "An agenda action is running."
			: !selected() ? "No agenda heading is selected."
			: action === "save" ? onSaveEntry ? null : "Saving this agenda source is unavailable."
			: action === "return-source" ? onReturnSource ? null : "Returning to this agenda source is unavailable."
			: action === "clock-in" || action === "clock-out" || action === "cancel-clock" || action === "clock-report"
				? onClockEntry ? null : "Clock actions are unavailable."
			: action !== "next" && action !== "previous" && action !== "open" && !onAction
				? "This agenda action is unavailable." : null,
		capture: () => {
			const entry = selected()
			const capturedScope = focusScope
			const root = rootRef.current
			if (action === "cancel") return () => {
				if (root !== rootRef.current || !root?.isConnected) return { kind: "cancelled" }
				onCancelAction?.()
				return { kind: "cancelled", message: "Agenda action cancelled." }
			}
			if (!entry || !root) return { kind: "rejected", message: "No agenda heading is selected." }
			const snapshot = freezeOrgAgendaEntrySnapshot(entry)
			const origin = captureOrigin?.(entry) ?? null
			if (captureOrigin && !origin && action !== "next" && action !== "previous")
				return { kind: "rejected", message: "The selected Agenda row is awaiting a current Source projection." }
			const configurationGeneration = getOrgInputConfiguration().generation
			const index = orderedEntries.indexOf(entry)
			const currentEntries = entries
			return async () => {
				if (!root.isConnected || rootRef.current !== root || capturedScope !== live.current.scope ||
					live.current.entries !== currentEntries || !live.current.entries.includes(entry) ||
					getOrgInputConfiguration().generation !== configurationGeneration || origin && !origin.isLive())
					return { kind: "cancelled" }
				if (action === "next" || action === "previous") {
					const next = Math.max(0, Math.min(orderedEntries.length - 1, index + (action === "next" ? 1 : -1)))
					setSelectedKey(entryKey(orderedEntries[next]))
					root.querySelectorAll<HTMLButtonElement>("[data-agenda-open]")[next]?.focus()
				} else if (action === "open") onOpenEntry(snapshot)
				else if (action === "save") return onSaveEntry
					? await onSaveEntry(snapshot, origin) : { kind: "rejected", message: "Saving this agenda source is unavailable." }
				else if (action === "return-source") await onReturnSource?.(snapshot, origin)
				else if (action === "clock-in" || action === "clock-out" || action === "cancel-clock" || action === "clock-report") {
					const result = await onClockEntry?.(snapshot, action, origin)
					if (result) return result
				} else onAction?.(snapshot, action, origin)
				return { kind: "success" }
			}
		},
	}))
	useApplicationCommandRegistration(commandOwner, descriptors)
	const input = useOrgScopedInput({
		scope: "org-agenda", owner: commandOwner,
		execute: (id) => {
			if (id === "execute-command") return host.open()
			if (!host.registry.getSnapshot().commands.some((command) => command.id === id)) return false
			// Agenda cancellation must reach its captured producer even while its own reader is visible.
			if (id === "org-agenda.cancel") void host.registry.execute(id)
			else void host.execute(id)
			return true
		},
		onUnavailable: (id) => host.registry.publishResult({ kind: "rejected", message: `Command ${id} is unavailable in Agenda.` }),
	})
	const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
		const target = event.target as HTMLElement
		if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ||
			target.isContentEditable || window.getSelection()?.toString() ||
			(target.closest('button, a, [role="button"]') && !target.closest("[data-agenda-open]") &&
				!event.ctrlKey && !event.metaKey && !event.altKey)) {
			claimOrgInputEvent(event.nativeEvent)
			return
		}
		const focusedKey = target.closest<HTMLElement>("[data-agenda-key]")?.dataset.agendaKey
		eventEntry.current = orderedEntries.find((entry) => entryKey(entry) === focusedKey) ?? selectedEntry ?? null
		try {
			input.handleKeyDown(event.nativeEvent)
			if (event.nativeEvent.defaultPrevented) event.preventDefault()
		} finally {
			eventEntry.current = null
		}
	}

	return (
		<main
			ref={rootRef}
			className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
			aria-label="Org agenda"
			tabIndex={-1}
			aria-busy={actionPending || isLoading}
			onKeyDown={handleKeyDown}
		>
			<OrgWhichKey prefix={input.prefix} />
			<header className="shrink-0 space-y-2 px-4 pb-4 pt-6 sm:px-8">
				<h1 className="text-base font-semibold">Agenda</h1>
				<p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
					{view?.mode === "todo" ? "TODO headings" : view?.mode === "match" ? "Matching headings" : "Scheduled tasks, deadlines and dated events"} from Org Source. Open an entry to return to its original file.
				</p>
				{!error && <p className="max-w-2xl break-words text-xs leading-relaxed text-muted-foreground">
					{view?.files ? view.files.length ? view.files.join(", ") : "No files in this view" : "All workspace Org files"}
					{view?.window ? ` · ${view.window.start}, ${view.window.span} days` : view ? " · Heading list" : " · All Source dates"}
					{view?.todo ? ` · TODO: ${typeof view.todo === "string" ? view.todo : view.todo.join(", ")}` : ""}
					{view?.match ? ` · Match: ${view.match}` : ""}
				</p>}
			</header>
			{isLoading ? (
				<p role="status" className="px-4 py-4 text-sm text-muted-foreground sm:px-8">Loading agenda…</p>
			) : error ? (
				<p role="alert" className="px-4 py-4 text-sm text-destructive sm:px-8">
					{error}
				</p>
			) : entries.length === 0 ? (
				<div className="flex flex-1 shrink-0 flex-col px-4 py-8 sm:px-8">
					<div className="mx-auto my-auto w-full max-w-md space-y-3 text-center">
						<CalendarDays aria-hidden="true" className="mx-auto mb-4 size-6 text-muted-foreground" />
						<h2 className="text-base font-medium">{view ? "No matching items" : "Nothing planned yet"}</h2>
						<p className="text-sm leading-relaxed text-muted-foreground">
							{view ? "This view has no matching Org entries. Check its configured files and filters in config.json." : "Add a scheduled date or deadline below a heading in an Org Source file to collect it here."}
						</p>
						{!view && <pre aria-label="Example Org planning entry" className="overflow-auto bg-muted/30 px-4 py-3 text-left font-mono text-xs leading-relaxed">{"* TODO Review notes\nSCHEDULED: <2026-10-14 Wed>"}</pre>}
					</div>
				</div>
			) : (
				<div className="mx-auto max-w-[760px] space-y-6 px-8 pb-16 pt-6">
					{groups.map((group) => (
						<section key={group.date ?? "undated"} aria-labelledby={`agenda-${group.date ?? "undated"}`}>
							<h2 id={`agenda-${group.date ?? "undated"}`} className="mb-2 text-[13px] font-semibold">
								{group.date ?? "Heading list"}
							</h2>
							<ul className="space-y-1">
								{group.entries.map((entry) => (
									<li
										key={entryKey(entry)}
										data-selected={entry === selectedEntry}
										data-agenda-key={entryKey(entry)}
										data-agenda-path={entry.relativePath}
										data-agenda-heading={entry.origin?.heading?.from}
										data-agenda-kind={entry.kind}
										data-agenda-timestamp={entry.origin?.timestamp?.from ?? ""}
										data-agenda-date={entry.date ?? ""}
										className="flex items-center gap-2"
									>
										<button
											type="button"
											className="flex min-h-14 w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 hover:bg-muted/60 aria-[current=true]:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
											data-agenda-open
											data-agenda-action="open"
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
														{entry.occurrence && entry.occurrence !== "source" ? ` · ${entry.occurrence}` : ""}
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
													{entry.timestampValue && entry.date !== entry.timestampValue.date ? ` · Source: ${entry.timestampValue.date}` : ""}
													{entry.timestampValue?.endDate ? `–${entry.timestampValue.endDate}` : ""}
													{entry.timestampValue?.time ? ` · ${entry.timestampValue.time}${entry.timestampValue.endTime ? `–${entry.timestampValue.endTime}` : ""}` : ""}
												</span>
											</span>
										</button>
										{onAction && (["cycle-todo", "schedule", "deadline"] as const).map((kind) => (
											<button
												key={kind}
												type="button"
												data-agenda-action={kind}
												aria-disabled={actionPending}
												aria-label={`${kind === "cycle-todo" ? "Cycle TODO" : kind === "schedule" ? "Schedule" : "Deadline"} for ${entry.heading ?? "(No heading)"}`}
												className="shrink-0 rounded-md border px-3 py-2 text-xs aria-disabled:opacity-50"
												onFocus={() => setSelectedKey(entryKey(entry))}
												onClick={() => { if (!actionPending) onAction(entry, kind) }}
											>
												{kind === "cycle-todo" ? "Cycle TODO" : kind === "schedule" ? "Schedule" : "Deadline"}
											</button>
										))}
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
