/**
 * 写作统计面板 - 显示写作目标、进度、会话统计
 */

import { Clock, Flame, Settings2, Target, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useWritingStore } from "@/stores/writing";

interface WritingStatsPanelProps {
	currentWordCount: number;
	className?: string;
}

export function WritingStatsPanel({
	currentWordCount,
	className,
}: WritingStatsPanelProps) {
	const {
		writingGoal,
		setWritingGoal,
		todayWordCount,
		resetTodayIfNeeded,
		session,
		startSession,
		updateSessionWordCount,
	} = useWritingStore();

	const [sessionDuration, setSessionDuration] = useState(0);

	// 检查日期变化
	useEffect(() => {
		resetTodayIfNeeded();
	}, [resetTodayIfNeeded]);

	// 自动开始会话 - 只在首次有字数时启动
	useEffect(() => {
		if (!session && currentWordCount > 0) {
			startSession(currentWordCount);
		}
		// 只依赖 session 是否存在，避免循环
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentWordCount > 0, !session]);

	// 更新会话字数 - 使用 ref 避免循环
	const lastWordCountRef = useRef(currentWordCount);
	useEffect(() => {
		if (session && currentWordCount !== lastWordCountRef.current) {
			lastWordCountRef.current = currentWordCount;
			updateSessionWordCount(currentWordCount);
		}
	}, [currentWordCount, session, updateSessionWordCount]);

	// 计算会话时长
	useEffect(() => {
		if (!session) return;

		const interval = setInterval(() => {
			setSessionDuration(Math.floor((Date.now() - session.startTime) / 1000));
		}, 1000);

		return () => clearInterval(interval);
	}, [session]);

	const progress = writingGoal.enabled
		? Math.min(100, (todayWordCount / writingGoal.dailyTarget) * 100)
		: 0;

	const sessionWords = session
		? session.currentWordCount - session.startWordCount
		: 0;

	const formatDuration = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) return `${h}h ${m}m`;
		if (m > 0) return `${m}m ${s}s`;
		return `${s}s`;
	};

	return (
		<div
			className={cn(
				"flex items-center gap-4 text-sm text-muted-foreground",
				className,
			)}
		>
			{/* 今日进度 */}
			{writingGoal.enabled && (
				<div className="flex items-center gap-2">
					<Target className="size-4" />
					<div className="flex items-center gap-2">
						<Progress value={progress} className="w-24 h-2" />
						<span className="text-xs tabular-nums">
							{todayWordCount.toLocaleString()}/
							{writingGoal.dailyTarget.toLocaleString()}
						</span>
					</div>
					{progress >= 100 && <Flame className="size-4 text-orange-500" />}
				</div>
			)}

			{/* 本次会话 */}
			{session && (
				<>
					<div className="w-px h-4 bg-border" />
					<div className="flex items-center gap-1.5">
						<Clock className="size-3.5" />
						<span className="text-xs tabular-nums">
							{formatDuration(sessionDuration)}
						</span>
					</div>
					<div className="flex items-center gap-1.5">
						<TrendingUp className="size-3.5" />
						<span className="text-xs tabular-nums">
							{sessionWords >= 0 ? "+" : ""}
							{sessionWords.toLocaleString()}
						</span>
					</div>
				</>
			)}

			{/* 设置 */}
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" className="size-7">
						<Settings2 className="size-3.5" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-64">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<Label htmlFor="goal-enabled" className="text-sm">
								启用每日目标
							</Label>
							<Switch
								id="goal-enabled"
								checked={writingGoal.enabled}
								onCheckedChange={(checked: boolean) =>
									setWritingGoal({ enabled: checked })
								}
							/>
						</div>

						{writingGoal.enabled && (
							<div className="space-y-2">
								<Label htmlFor="daily-target" className="text-sm">
									每日目标字数
								</Label>
								<Input
									id="daily-target"
									type="number"
									value={writingGoal.dailyTarget}
									onChange={(e) =>
										setWritingGoal({
											dailyTarget: Math.max(100, Number(e.target.value)),
										})
									}
									min={100}
									step={100}
								/>
							</div>
						)}

						<div className="pt-2 border-t text-xs text-muted-foreground">
							<p>今日已写: {todayWordCount.toLocaleString()} 字</p>
							{session && (
								<p>
									本次会话: {sessionWords.toLocaleString()} 字 ·{" "}
									{formatDuration(sessionDuration)}
								</p>
							)}
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
