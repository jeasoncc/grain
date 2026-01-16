import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import dayjs from "dayjs"
import * as E from "fp-ts/Either"
import {
	AlertTriangle,
	Box,
	Bug,
	CheckCircle2,
	Filter,
	Info,
	type LucideIcon,
	RefreshCw,
	Search,
	Trash2,
	XCircle,
} from "lucide-react"
import { useMemo, useState } from "react"
import {
	clearAllLogsFromSQLite,
	queryLogsFromSQLite,
} from "@/io/log/log.storage.api"
import type { LogEntry, LogLevel } from "@/types/log/log.interface"
import { cn } from "@/utils/cn.util"
import { Button } from "@/views/ui/button"
import { Input } from "@/views/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/views/ui/select"

export const Route = createFileRoute("/settings/logs")({
	component: LogsSettingsPage,
})

const LOG_ICONS: Record<string, LucideIcon> = {
	debug: Bug,
	error: XCircle,
	info: Info,
	success: CheckCircle2,
	trace: Box,
	warn: AlertTriangle,
}

const LOG_LEVEL_COLORS: Record<string, string> = {
	debug: "text-violet-500 bg-violet-50/50 dark:bg-violet-950/10",
	error: "text-red-500 bg-red-50/50 dark:bg-red-950/10",
	info: "text-blue-500 bg-blue-50/50 dark:bg-blue-950/10",
	success: "text-green-500 bg-green-50/50 dark:bg-green-950/10",
	trace: "text-muted-foreground bg-muted/10",
	warn: "text-orange-500 bg-orange-50/50 dark:bg-orange-950/10",
}

const LOG_LEVELS = ["all", "error", "warn", "info", "success", "debug", "trace"] as const
type LogLevelFilter = (typeof LOG_LEVELS)[number]

function LogsSettingsPage() {
	const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all")
	const [searchQuery, setSearchQuery] = useState("")
	const queryClient = useQueryClient()

	const { data: logsResult, isLoading, refetch } = useQuery({
		queryKey: ["logs", levelFilter, searchQuery],
		queryFn: async () => {
			const result = await queryLogsFromSQLite({
				limit: 500,
				levelFilter: levelFilter === "all" ? undefined : [levelFilter as LogLevel],
				messageSearch: searchQuery || undefined,
			})()

			if (E.isLeft(result)) {
				throw new Error(result.left.message)
			}
			return result.right
		},
		refetchInterval: 5000,
	})

	const logs = logsResult?.entries ?? []
	const total = logsResult?.total ?? 0

	const filteredLogs = useMemo(() => {
		if (!logs) return []
		return [...logs].reverse()
	}, [logs])

	const handleClearLogs = async () => {
		if (!window.confirm("Are you sure you want to clear all logs?")) {
			return
		}
		const result = await clearAllLogsFromSQLite()()
		if (E.isRight(result)) {
			queryClient.invalidateQueries({ queryKey: ["logs"] })
		}
	}

	const handleRefresh = () => {
		refetch()
	}

	const formatTimestamp = (timestamp: string) => {
		const date = dayjs(timestamp)
		if (!date.isValid()) return timestamp
		return date.format("YYYY/MM/DD HH:mm:ss")
	}

	return (
		<div className="space-y-10 max-w-6xl">
			<div>
				<h3 className="text-lg font-medium">Logs</h3>
				<p className="text-sm text-muted-foreground">
					View and manage application logs for debugging.
				</p>
			</div>

			<div className="space-y-6">
				<div className="flex flex-wrap items-center gap-4 p-1">
					<div className="relative flex-1 min-w-[240px] max-w-md">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							placeholder="Search logs..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 h-9"
						/>
					</div>

					<div className="flex items-center gap-3">
						<Select
							value={levelFilter}
							onValueChange={(value) => setLevelFilter(value as LogLevelFilter)}
						>
							<SelectTrigger className="w-[140px] h-9">
								<Filter className="size-3.5 mr-2 text-muted-foreground" />
								<SelectValue placeholder="Level" />
							</SelectTrigger>
							<SelectContent>
								{LOG_LEVELS.map((level) => (
									<SelectItem key={level} value={level}>
										{level === "all" ? "All Levels" : level}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Button
							variant="ghost"
							size="sm"
							onClick={handleRefresh}
							className="h-9 text-muted-foreground"
						>
							<RefreshCw className="size-4 mr-2" />
							Refresh
						</Button>

						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearLogs}
							disabled={total === 0}
							className="h-9 text-muted-foreground hover:text-destructive"
						>
							<Trash2 className="size-4 mr-2" />
							Clear
						</Button>
					</div>
				</div>

				<div className="rounded-md border bg-background/50">
					{isLoading ? (
						<div className="p-12 text-center text-muted-foreground text-sm">
							Loading logs...
						</div>
					) : filteredLogs.length === 0 ? (
						<div className="p-12 text-center text-muted-foreground text-sm">
							{total === 0 ? "No logs available" : "No logs match your filter"}
						</div>
					) : (
						<div className="max-h-[600px] overflow-y-auto custom-scrollbar">
							<table className="w-full text-xs font-mono">
								<thead className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
									<tr>
										<th className="text-left px-4 py-3 font-medium text-muted-foreground w-[170px]">
											Time
										</th>
										<th className="text-left px-4 py-3 font-medium text-muted-foreground w-[100px]">
											Level
										</th>
										<th className="text-left px-4 py-3 font-medium text-muted-foreground">
											Message
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/50">
									{filteredLogs.map((log, index) => (
										<LogRow
											key={log.id ?? index}
											log={log}
											formatTimestamp={formatTimestamp}
										/>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>

				<div className="text-xs text-muted-foreground px-1">
					Total: {total} | Showing: {filteredLogs.length}
				</div>
			</div>
		</div>
	)
}

interface LogRowProps {
	readonly log: LogEntry
	readonly formatTimestamp: (timestamp: string) => string
}

function LogRow({ log, formatTimestamp }: LogRowProps) {
	const levelColor = LOG_LEVEL_COLORS[log.level] || "text-foreground"
	const Icon = LOG_ICONS[log.level] || Info

	return (
		<tr className="hover:bg-muted/30 transition-colors group">
			<td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap opacity-70 group-hover:opacity-100">
				{formatTimestamp(log.timestamp)}
			</td>
			<td className="px-4 py-2.5">
				<span
					className={cn(
						"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-medium border border-transparent",
						levelColor,
					)}
				>
					<Icon className="size-3" />
					{log.level}
				</span>
			</td>
			<td className="px-4 py-2.5 break-all leading-relaxed text-foreground/90">
				{log.message}
			</td>
		</tr>
	)
}
