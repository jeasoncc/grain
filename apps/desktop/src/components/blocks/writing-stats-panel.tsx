/**
 * @file writing-stats-panel.tsx
 * @description Writing Statistics面板 - 显示写作Target、进度、会话统计
 *
 * 纯展示组件，所有状态和回调通过 props 传入。
 * 不直接访问 Store 或 DB。
 */

import { Clock, Flame, Settings2, Target, TrendingUp } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
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
import type { WritingGoal, WritingSession } from "@/types/writing";

// ==============================
// Types
// ==============================

/**
 * WritingStatsPanel 组件的 Props 接口
 *
 * 所有写作状态和回调函数通过 props 传入，
 * 组件本身不直接访问 Store。
 */
export interface WritingStatsPanelProps {
	/** 当前字数 */
	readonly currentWordCount: number;
	/** 写作目标配置 */
	readonly writingGoal: WritingGoal;
	/** 更新写作目标 */
	readonly onWritingGoalChange: (goal: Partial<WritingGoal>) => void;
	/** 今日字数 */
	readonly todayWordCount: number;
	/** 当前写作会话 */
	readonly session: WritingSession | null;
	/** 开始新会话 */
	readonly onStartSession: (wordCount: number) => void;
	/** 更新会话字数 */
	readonly onUpdateSessionWordCount: (wordCount: number) => void;
	/** 检查并重置今日字数（日期变化时） */
	readonly onResetTodayIfNeeded: () => void;
	/** 自定义样式类名 */
	readonly className?: string;
}

// ==============================
// Helper Functions
// ==============================

/**
 * 格式化时长显示
 */
const formatDuration = (seconds: number): string => {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = seconds % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
};

/**
 * 计算进度百分比
 */
const calculateProgress = (
	writingGoal: WritingGoal,
	todayWordCount: number,
): number => {
	if (!writingGoal.enabled) return 0;
	return Math.min(100, (todayWordCount / writingGoal.dailyTarget) * 100);
};

/**
 * 计算会话字数
 */
const calculateSessionWords = (session: WritingSession | null): number => {
	if (!session) return 0;
	return session.currentWordCount - session.startWordCount;
};

// ==============================
// WritingStatsPanel Component
// ==============================

/**
 * Writing Statistics面板组件
 *
 * 显示写作进度和统计信息，包含：
 * - 今日写作进度（目标/已完成）
 * - 本次会话统计（时长、字数变化）
 * - 设置弹出框（目标配置）
 *
 * 纯展示组件，所有状态通过 props 传入。
 */
export const WritingStatsPanel = memo(function WritingStatsPanel({
	currentWordCount,
	writingGoal,
	onWritingGoalChange,
	todayWordCount,
	session,
	onStartSession,
	onUpdateSessionWordCount,
	onResetTodayIfNeeded,
	className,
}: WritingStatsPanelProps) {
	// UI 状态：会话时长（仅用于显示）
	const [sessionDuration, setSessionDuration] = useState(0);

	// 检查日期变化
	useEffect(() => {
		onResetTodayIfNeeded();
	}, [onResetTodayIfNeeded]);

	// 自动开始会话 - 只在首次有字数时启动
	useEffect(() => {
		if (!session && currentWordCount > 0) {
			onStartSession(currentWordCount);
		}
		// 只依赖 session 是否存在，避免循环
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentWordCount > 0, !session]);

	// 更新会话字数 - 使用 ref 避免循环
	const lastWordCountRef = useRef(currentWordCount);
	useEffect(() => {
		if (session && currentWordCount !== lastWordCountRef.current) {
			lastWordCountRef.current = currentWordCount;
			onUpdateSessionWordCount(currentWordCount);
		}
	}, [currentWordCount, session, onUpdateSessionWordCount]);

	// 计算会话时长
	useEffect(() => {
		if (!session) return;

		const interval = setInterval(() => {
			setSessionDuration(Math.floor((Date.now() - session.startTime) / 1000));
		}, 1000);

		return () => clearInterval(interval);
	}, [session]);

	const progress = calculateProgress(writingGoal, todayWordCount);
	const sessionWords = calculateSessionWords(session);

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
								Enable每日Target
							</Label>
							<Switch
								id="goal-enabled"
								checked={writingGoal.enabled}
								onCheckedChange={(checked: boolean) =>
									onWritingGoalChange({ enabled: checked })
								}
							/>
						</div>

						{writingGoal.enabled && (
							<div className="space-y-2">
								<Label htmlFor="daily-target" className="text-sm">
									每日TargetWord Count
								</Label>
								<Input
									id="daily-target"
									type="number"
									value={writingGoal.dailyTarget}
									onChange={(e) =>
										onWritingGoalChange({
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
});
