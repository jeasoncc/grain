/**
 * @file focus-mode.tsx
 * @description 专注模式 - 全屏沉浸式写作体验
 *
 * 纯展示组件，所有状态和回调通过 props 传入。
 * 不直接访问 Store 或 DB。
 */

import {
	AlignCenter,
	Clock,
	Flame,
	Settings2,
	Target,
	TrendingUp,
	X,
} from "lucide-react";
import { memo, useEffect } from "react";
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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WritingGoal, WritingSession } from "@/types/writing";

// ==============================
// Types
// ==============================

/**
 * FocusModeSettings 组件的 Props 接口
 */
interface FocusModeSettingsProps {
	/** 打字机模式是否启用 */
	readonly typewriterMode: boolean;
	/** 设置打字机模式 */
	readonly onTypewriterModeChange: (enabled: boolean) => void;
	/** 写作目标配置 */
	readonly writingGoal: WritingGoal;
	/** 更新写作目标 */
	readonly onWritingGoalChange: (goal: Partial<WritingGoal>) => void;
}

/**
 * FocusMode 组件的 Props 接口
 *
 * 所有写作状态和回调函数通过 props 传入，
 * 组件本身不直接访问 Store。
 */
export interface FocusModeProps {
	/** 编辑器内容 */
	readonly children: React.ReactNode;
	/** 当前字数 */
	readonly wordCount: number;
	/** 场景标题 */
	readonly sceneTitle?: string;
	/** 章节标题 */
	readonly chapterTitle?: string;
	/** 退出专注模式回调 */
	readonly onExit: () => void;
	/** 打字机模式是否启用 */
	readonly typewriterMode: boolean;
	/** 切换打字机模式 */
	readonly onToggleTypewriterMode: () => void;
	/** 设置打字机模式 */
	readonly onTypewriterModeChange: (enabled: boolean) => void;
	/** 写作目标配置 */
	readonly writingGoal: WritingGoal;
	/** 更新写作目标 */
	readonly onWritingGoalChange: (goal: Partial<WritingGoal>) => void;
	/** 今日字数 */
	readonly todayWordCount: number;
	/** 当前写作会话 */
	readonly session: WritingSession | null;
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
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
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

/**
 * 计算会话时长（秒）
 */
const calculateSessionDuration = (session: WritingSession | null): number => {
	if (!session) return 0;
	return Math.floor((Date.now() - session.startTime) / 1000);
};

// ==============================
// FocusModeSettings Component
// ==============================

/**
 * 专注模式设置弹出框
 * 纯展示组件，通过 props 接收状态和回调
 */
const FocusModeSettings = memo(function FocusModeSettings({
	typewriterMode,
	onTypewriterModeChange,
	writingGoal,
	onWritingGoalChange,
}: FocusModeSettingsProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="size-8">
					<Settings2 className="size-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72">
				<div className="space-y-4">
					<h4 className="font-medium text-sm">专注模式设置</h4>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label htmlFor="typewriter" className="text-sm">
								打字机模式
							</Label>
							<Switch
								id="typewriter"
								checked={typewriterMode}
								onCheckedChange={onTypewriterModeChange}
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							当前行自动居中，保持视线稳定
						</p>
					</div>

					<div className="h-px bg-border" />

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label htmlFor="goal-enabled" className="text-sm">
								每日写作Target
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
							<div className="flex items-center gap-2">
								<Input
									type="number"
									value={writingGoal.dailyTarget}
									onChange={(e) =>
										onWritingGoalChange({
											dailyTarget: Math.max(100, Number(e.target.value)),
										})
									}
									className="h-8"
									min={100}
									step={100}
								/>
								<span className="text-sm text-muted-foreground">字/天</span>
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
});

// ==============================
// FocusMode Component
// ==============================

/**
 * 专注模式组件
 *
 * 提供全屏沉浸式写作体验，包含：
 * - 顶部工具栏（标题、统计、控制按钮）
 * - 打字机模式切换
 * - 写作目标进度
 * - 会话统计
 *
 * 纯展示组件，所有状态通过 props 传入。
 */
export const FocusMode = memo(function FocusMode({
	children,
	wordCount,
	sceneTitle,
	chapterTitle,
	onExit,
	typewriterMode,
	onToggleTypewriterMode,
	onTypewriterModeChange,
	writingGoal,
	onWritingGoalChange,
	todayWordCount,
	session,
}: FocusModeProps) {
	// ESC 退出专注模式
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onExit();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onExit]);

	const progress = calculateProgress(writingGoal, todayWordCount);
	const sessionWords = calculateSessionWords(session);
	const sessionDuration = calculateSessionDuration(session);

	return (
		<div className="fixed inset-0 z-50 bg-background focus-mode-container">
			{/* 顶部工具栏 - 悬浮显示 */}
			<div className="focus-mode-toolbar">
				<div className="flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-border/30">
					{/* 左侧：标题 */}
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						{chapterTitle && <span>{chapterTitle}</span>}
						{chapterTitle && sceneTitle && <span>·</span>}
						{sceneTitle && (
							<span className="font-medium text-foreground">{sceneTitle}</span>
						)}
					</div>

					{/* 中间：Writing Statistics */}
					<div className="flex items-center gap-4">
						{/* 今日进度 */}
						{writingGoal.enabled && (
							<div className="flex items-center gap-2">
								<Target className="size-4 text-muted-foreground" />
								<Progress value={progress} className="w-20 h-1.5" />
								<span className="text-xs tabular-nums text-muted-foreground">
									{todayWordCount}/{writingGoal.dailyTarget}
								</span>
								{progress >= 100 && (
									<Flame className="size-4 text-orange-500" />
								)}
							</div>
						)}

						{/* 本次会话 */}
						{session && (
							<>
								<div className="w-px h-4 bg-border" />
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<Clock className="size-3.5" />
									<span className="text-xs tabular-nums">
										{formatDuration(sessionDuration)}
									</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<TrendingUp className="size-3.5" />
									<span className="text-xs tabular-nums">
										{sessionWords >= 0 ? "+" : ""}
										{sessionWords}
									</span>
								</div>
							</>
						)}

						{/* 当前Word Count */}
						<div className="w-px h-4 bg-border" />
						<span className="text-xs text-muted-foreground">
							{wordCount.toLocaleString()} 字
						</span>
					</div>

					{/* 右侧：控制按钮 */}
					<div className="flex items-center gap-2">
						{/* 打字机模式 */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant={typewriterMode ? "secondary" : "ghost"}
									size="icon"
									className="size-8"
									onClick={onToggleTypewriterMode}
								>
									<AlignCenter className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								Typewriter Mode {typewriterMode ? "(Enabled)" : "(Disabled)"}
							</TooltipContent>
						</Tooltip>

						{/* 设置 */}
						<FocusModeSettings
							typewriterMode={typewriterMode}
							onTypewriterModeChange={onTypewriterModeChange}
							writingGoal={writingGoal}
							onWritingGoalChange={onWritingGoalChange}
						/>

						{/* 退出 */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-8"
									onClick={onExit}
								>
									<X className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>退出专注模式 (ESC)</TooltipContent>
						</Tooltip>
					</div>
				</div>
			</div>

			{/* 编辑器内容 */}
			<div className="h-full overflow-auto pt-14">
				<div className="max-w-3xl mx-auto px-8 py-16">{children}</div>
			</div>
		</div>
	);
});
