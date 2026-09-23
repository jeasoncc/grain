import { CalendarDays, FileText } from "lucide-react"
import { memo } from "react"
import type { OrgAgendaEntry } from "@/pipes/org"

export interface OrgAgendaViewProps {
	readonly entries: readonly OrgAgendaEntry[]
	readonly error: string | null
	readonly isLoading: boolean
	readonly onOpenEntry: (entry: OrgAgendaEntry) => void
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

export const OrgAgendaView = memo(function OrgAgendaView({
	entries,
	error,
	isLoading,
	onOpenEntry,
}: OrgAgendaViewProps) {
	if (isLoading) {
		return (
			<main className="flex min-w-0 flex-1 items-center justify-center" aria-busy="true">
				<p className="text-sm text-muted-foreground">Loading agenda…</p>
			</main>
		)
	}
	if (error) {
		return (
			<main className="flex min-w-0 flex-1 items-center justify-center p-6">
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			</main>
		)
	}
	if (entries.length === 0) {
		return (
			<main className="flex min-w-0 flex-1 items-center justify-center p-6">
				<div className="text-center text-muted-foreground">
					<CalendarDays className="mx-auto mb-2 size-6" />
					<p className="text-sm">No active Org timestamps in this workspace.</p>
				</div>
			</main>
		)
	}

	return (
		<main className="min-w-0 flex-1 overflow-auto p-4" aria-label="Org agenda">
			<div className="mx-auto max-w-4xl space-y-5">
				{groupOrgAgendaEntries(entries).map((group) => (
					<section key={group.date} aria-labelledby={`agenda-${group.date}`}>
						<h2 id={`agenda-${group.date}`} className="mb-2 text-sm font-semibold">
							{group.date}
						</h2>
						<ul className="space-y-1">
							{group.entries.map((entry) => (
								<li key={`${entry.relativePath}:${entry.line}:${entry.column}:${entry.kind}`}>
									<button
										type="button"
										className="flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left hover:bg-muted"
										onClick={() => onOpenEntry(entry)}
									>
										<FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
										<span className="min-w-0 flex-1">
											<span className="flex items-center gap-2">
												<span className="text-xs font-medium uppercase text-muted-foreground">
													{kindLabel(entry.kind)}
												</span>
												{entry.todo && <span className="text-xs font-semibold">{entry.todo}</span>}
											</span>
											<span className="block truncate text-sm font-medium">
												{entry.heading ?? "(No heading)"}
											</span>
											<span className="block truncate text-xs text-muted-foreground">
												{entry.relativePath}:{entry.line}
											</span>
										</span>
									</button>
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</main>
	)
})
