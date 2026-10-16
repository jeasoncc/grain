import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import { RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { clearAllLogsFromSQLite, queryLogsFromSQLite } from "@/io/log/log.storage.api"
import type { LogEntry, LogLevel } from "@/types/log/log.interface"
import { Button } from "@/views/ui/button"
import { useConfirm } from "@/views/ui/confirm"
import { Input } from "@/views/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/views/ui/select"
import { UtilityRow, UtilityPage, UtilitySection } from "@/views/application/utility-page"

export const Route = createFileRoute("/logs")({
	component: LogsPage,
})

const LOG_LEVELS = ["all", "error", "warn", "info", "success", "debug", "trace"] as const
type LogLevelFilter = (typeof LOG_LEVELS)[number]

function LogsPage() {
	const confirm = useConfirm()
	const lifetime = useRef<AbortController | null>(null)
	useEffect(() => {
		const owner = new AbortController()
		lifetime.current = owner
		return () => owner.abort()
	}, [])
	const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const queryClient = useQueryClient()
	const [clearError, setClearError] = useState<string | null>(null)
	const [clearing, setClearing] = useState(false)

	const {
		data: logsResult,
		isLoading,
		isFetching,
		isError,
		error,
		refetch,
	} = useQuery({
		queryFn: async () => {
			const result = await queryLogsFromSQLite({
				levelFilter: levelFilter === "all" ? undefined : [levelFilter as LogLevel],
				limit: 500,
				messageSearch: searchQuery || undefined,
			})()

			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
		queryKey: ["logs", levelFilter, searchQuery],
		refetchInterval: 5000,
	})

	const logs = logsResult?.entries ?? []
	const total = logsResult?.total ?? 0

	const filteredLogs = useMemo(() => {
		if (!logs) {
			return []
		}
		return [...logs].reverse()
	}, [logs])

	const handleClearLogs = async () => {
		const owner = lifetime.current
		if (!owner || owner.signal.aborted || await confirm({
			title: "Clear all logs?",
			description: "This deletes ALL application logs, including logs outside the current search and level filter. This cannot be undone.",
			confirmText: "Clear",
			cancelText: "Cancel",
			signal: owner.signal,
		}) !== true || owner.signal.aborted) {
			return
		}
		setClearError(null)
		setClearing(true)
		try {
			const result = await clearAllLogsFromSQLite()()
			if (owner.signal.aborted) return
			if (E.isRight(result)) {
				await queryClient.invalidateQueries({ queryKey: ["logs"] })
			} else {
				setClearError(result.left.message)
			}
		} catch (error) {
			if (!owner.signal.aborted) setClearError(String(error))
		} finally {
			if (!owner.signal.aborted) setClearing(false)
		}
	}

	const handleRefresh = () => {
		refetch()
	}

	const formatTimestamp = (timestamp: string) => {
		const date = dayjs(timestamp)
		if (!date.isValid()) {
			return timestamp
		}
		return date.format("YYYY/MM/DD HH:mm:ss")
	}

	return (
		<UtilityPage title="Logs" description="Application diagnostics from the existing log service. Up to 500 entries per query; refreshed every 5 seconds.">
			<UtilitySection title="Find logs">
				<UtilityRow label="Search log messages" description="Search the message text stored by the log service." controlId="log-search">
					<Input
						id="log-search"
						type="search"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						aria-describedby="log-search-help"
						className="w-full"
					/>
				</UtilityRow>
				<UtilityRow label="Log level" description="Show all levels or query one diagnostic level." controlId="log-level">
					<Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as LogLevelFilter)}>
						<SelectTrigger id="log-level" aria-labelledby="log-level-label" aria-describedby="log-level-help" className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{LOG_LEVELS.map((level) => (
								<SelectItem key={level} value={level}>{level === "all" ? "All levels" : level}</SelectItem>
							))}
						</SelectContent>
					</Select>
				</UtilityRow>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
						<RefreshCw className="size-4" aria-hidden="true" />
						{isFetching ? "Refreshing…" : "Refresh"}
					</Button>
					<Button variant="outline" size="sm" onClick={handleClearLogs} disabled={total === 0 || clearing} aria-describedby="log-clear-help">
						<Trash2 className="size-4" aria-hidden="true" />
						{clearing ? "Clearing…" : "Clear"}
					</Button>
				</div>
				<p id="log-clear-help" className="text-sm text-muted-foreground">Clear deletes all application logs, not only the filtered results. You must confirm before deletion.</p>
				{clearError && <p role="alert" className="break-words">Could not clear logs: {clearError}</p>}
			</UtilitySection>
			<UtilitySection title="Diagnostic entries">
				{isError && <p role="alert" className="break-words">Could not query logs: {error.message}. An empty log database has not been established.</p>}
				{isError && filteredLogs.length > 0 && <p className="text-sm text-muted-foreground">Showing the last successful query. These entries may be out of date.</p>}
				{isLoading ? (
					<p role="status" className="text-sm text-muted-foreground">Loading logs…</p>
				) : filteredLogs.length === 0 ? (
					!isError && <p role="status" className="text-sm text-muted-foreground">{total === 0 ? "No logs available" : "No logs match your filter"}</p>
				) : (
					<div className="max-h-[600px] overflow-auto">
						<table className="w-full text-sm">
							<caption className="sr-only">Application logs, newest first</caption>
							<thead className="sticky top-0 bg-background">
								<tr className="border-b border-border/50">
									<th scope="col" className="text-left pr-3 py-2 font-medium">Time</th>
									<th scope="col" className="text-left pr-3 py-2 font-medium">Level</th>
									<th scope="col" className="text-left py-2 font-medium">Message</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border/40">
								{filteredLogs.map((log, index) => (
									<LogRow key={log.id ?? index} log={log} formatTimestamp={formatTimestamp} />
								))}
							</tbody>
						</table>
					</div>
				)}
				{logsResult && <p className="text-sm text-muted-foreground">Query total: {total} · Showing: {filteredLogs.length}{logsResult.hasMore ? " · More entries are available beyond the 500-entry limit." : ""}</p>}
			</UtilitySection>
		</UtilityPage>
	)
}

interface LogRowProps {
	readonly log: LogEntry
	readonly formatTimestamp: (timestamp: string) => string
}

function LogRow({ log, formatTimestamp }: LogRowProps) {
	return (
		<tr>
			<td className="pr-3 py-2 align-top whitespace-nowrap font-mono">{formatTimestamp(log.timestamp)}</td>
			<td className="pr-3 py-2 align-top">{log.level}</td>
			<td className="py-2 align-top break-all whitespace-pre-wrap">{log.message}</td>
		</tr>
	)
}
