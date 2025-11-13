// src/routes/log.tsx

import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Spinner } from "@/components/ui/loading";
import { type LogEntry, logDB } from "@/lib/log-db";
import { ICONS } from "@/log";

export const Route = createFileRoute("/log")({
	component: RouteComponent,
});

async function fetchLogs(): Promise<LogEntry[]> {
	return await logDB.logs.orderBy("id").reverse().toArray();
}

function RouteComponent() {
	const { data: logs = [], isLoading } = useQuery({
		queryKey: ["logs"],
		queryFn: fetchLogs,
		refetchInterval: 2000, // 每 2 秒自动刷新日志
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-gray-900">
				<Spinner color="text-orange-600" />
			</div>
		);
	}

	return (
		<div className="p-4 font-mono text-sm text-white bg-neutral-900 h-screen">
			<h1 className="text-lg mb-2 font-bold">📜 日志记录</h1>
			<div className="space-y-1 overflow-auto h-[80vh]">
				{logs.map((log) => (
					<div key={log.id} className="flex items-center gap-2">
						<span className="text-neutral-500 w-[70px]">
							{new Date(log.timestamp).toLocaleTimeString()}
						</span>
						<span className="font-bold">
							{ICONS[log.level.toLowerCase() as keyof typeof ICONS] ?? "💬"} [
							{log.level}]
						</span>
						<span className="flex-1">{log.message}</span>
					</div>
				))}
			</div>
		</div>
	);
}
