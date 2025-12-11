/**
 * 日志查看器设置页面
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7
 */
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useMemo } from "react";
import { Search, Trash2, Filter } from "lucide-react";
import { logDB, type LogEntry } from "@/lib/log-db";
import { ICONS } from "@/log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/logs")({
	component: LogsSettingsPage,
});

// Log level color mapping - Requirements: 3.3
const LOG_LEVEL_COLORS: Record<string, string> = {
	FATAL: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
	ERROR: "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
	WARN: "text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
	LOG: "text-foreground bg-muted/30",
	INFO: "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
	SUCCESS: "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
	DEBUG: "text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30",
	TRACE: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/30",
	VERBOSE: "text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
	READY: "text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
	START: "text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30",
	BOX: "text-yellow-500 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30",
	FAIL: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
};

const LOG_LEVELS = [
	"all",
	"FATAL",
	"ERROR",
	"WARN",
	"LOG",
	"INFO",
	"SUCCESS",
	"DEBUG",
	"TRACE",
] as const;

type LogLevelFilter = (typeof LOG_LEVELS)[number];

function LogsSettingsPage() {
	const [levelFilter, setLevelFilter] = useState<LogLevelFilter>("all");
	const [searchQuery, setSearchQuery] = useState("");

	// Fetch logs from LogDB - Requirements: 3.1
	const logs = useLiveQuery(
		() => logDB.logs.orderBy("id").reverse().toArray(),
		[]
	);

	// Filter logs based on level and search query - Requirements: 3.6, 3.7
	const filteredLogs = useMemo(() => {
		if (!logs) return [];
		
		return logs.filter((log) => {
			// Level filter
			if (levelFilter !== "all" && log.level !== levelFilter) {
				return false;
			}
			// Search filter
			if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
				return false;
			}
			return true;
		});
	}, [logs, levelFilter, searchQuery]);

	// Clear all logs - Requirements: 3.4
	const handleClearLogs = async () => {
		if (!window.confirm("Are you sure you want to clear all logs? This cannot be undone.")) {
			return;
		}
		await logDB.logs.clear();
	};

	const getLogIcon = (level: string) => {
		const levelLower = level.toLowerCase() as keyof typeof ICONS;
		return ICONS[levelLower] ?? "💬";
	};

	const formatTimestamp = (timestamp: string) => {
		try {
			const date = new Date(timestamp);
			return date.toLocaleString();
		} catch {
			return timestamp;
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">日志查看器</h3>
				<p className="text-sm text-muted-foreground">
					查看和管理应用程序日志
				</p>
			</div>
			<Separator />

			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-3">
				{/* Search - Requirements: 3.7 */}
				<div className="relative flex-1 min-w-[200px] max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="搜索日志..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* Level Filter - Requirements: 3.6 */}
				<div className="flex items-center gap-2">
					<Filter className="size-4 text-muted-foreground" />
					<Select
						value={levelFilter}
						onValueChange={(value) => setLevelFilter(value as LogLevelFilter)}
					>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Filter by level" />
						</SelectTrigger>
						<SelectContent>
							{LOG_LEVELS.map((level) => (
								<SelectItem key={level} value={level}>
									{level === "all" ? "All Levels" : level}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Clear Logs - Requirements: 3.4 */}
				<Button
					variant="destructive"
					size="sm"
					onClick={handleClearLogs}
					disabled={!logs || logs.length === 0}
				>
					<Trash2 className="size-4 mr-1" />
					Clear Logs
				</Button>
			</div>

			{/* Log count */}
			<div className="text-sm text-muted-foreground">
				Showing {filteredLogs.length} of {logs?.length ?? 0} logs
			</div>

			{/* Log List - Requirements: 3.1, 3.2, 3.3 */}
			<div className="border rounded-lg overflow-hidden">
				{!logs ? (
					<div className="p-8 text-center text-muted-foreground">
						Loading logs...
					</div>
				) : filteredLogs.length === 0 ? (
					<div className="p-8 text-center text-muted-foreground">
						{logs.length === 0 ? "No logs yet" : "No logs match your filters"}
					</div>
				) : (
					<div className="max-h-[500px] overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="bg-muted/50 sticky top-0">
								<tr>
									<th className="text-left px-4 py-2 font-medium w-[180px]">Timestamp</th>
									<th className="text-left px-4 py-2 font-medium w-[100px]">Level</th>
									<th className="text-left px-4 py-2 font-medium">Message</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{filteredLogs.map((log) => (
									<LogRow key={log.id} log={log} getLogIcon={getLogIcon} formatTimestamp={formatTimestamp} />
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}

interface LogRowProps {
	log: LogEntry;
	getLogIcon: (level: string) => string;
	formatTimestamp: (timestamp: string) => string;
}

function LogRow({ log, getLogIcon, formatTimestamp }: LogRowProps) {
	const levelColor = LOG_LEVEL_COLORS[log.level] ?? "text-foreground";
	
	return (
		<tr className="hover:bg-muted/30 transition-colors">
			{/* Timestamp - Requirements: 3.2 */}
			<td className="px-4 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">
				{formatTimestamp(log.timestamp)}
			</td>
			{/* Level with color coding - Requirements: 3.2, 3.3 */}
			<td className="px-4 py-2">
				<span className={cn(
					"inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
					levelColor
				)}>
					<span>{getLogIcon(log.level)}</span>
					{log.level}
				</span>
			</td>
			{/* Message - Requirements: 3.2 */}
			<td className="px-4 py-2 font-mono text-xs break-all">
				{log.message}
			</td>
		</tr>
	);
}
