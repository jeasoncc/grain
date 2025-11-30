/**
 * 专注模式 - 全屏沉浸式写作体验
 */
import { useEffect } from "react";
import { X, Target, Clock, TrendingUp, Flame, AlignCenter, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useWritingStore } from "@/stores/writing";
import { cn } from "@/lib/utils";

interface FocusModeProps {
	children: React.ReactNode;
	wordCount: number;
	sceneTitle?: string;
	chapterTitle?: string;
	onExit: () => void;
}

export function FocusMode({
	children,
	wordCount,
	sceneTitle,
	chapterTitle,
	onExit,
}: FocusModeProps) {
	const {
		typewriterMode,
		toggleTypewriterMode,
		writingGoal,
		setWritingGoal,
		todayWordCount,
		session,
	} = useWritingStore();

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

	const progress = writingGoal.enabled
		? Math.min(100, (todayWordCount / writingGoal.dailyTarget) * 100)
		: 0;

	const sessionWords = session
		? session.currentWordCount - session.startWordCount
		: 0;

	const sessionDuration = session
		? Math.floor((Date.now() - session.startTime) / 1000)
		: 0;

	const formatDuration = (seconds: number) => {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	};

	return (
		<div className="fixed inset-0 z-50 bg-background focus-mode-container">
			{/* 顶部工具栏 - 悬浮显示 */}
			<div className="focus-mode-toolbar">
				<div className="flex items-center justify-between px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-border/30">
					{/* 左侧：标题 */}
					<div className="flex items-center gap-3 text-sm text-muted-foreground">
						{chapterTitle && <span>{chapterTitle}</span>}
						{chapterTitle && sceneTitle && <span>·</span>}
						{sceneTitle && <span className="font-medium text-foreground">{sceneTitle}</span>}
					</div>

					{/* 中间：写作统计 */}
					<div className="flex items-center gap-4">
						{/* 今日进度 */}
						{writingGoal.enabled && (
							<div className="flex items-center gap-2">
								<Target className="size-4 text-muted-foreground" />
								<Progress value={progress} className="w-20 h-1.5" />
								<span className="text-xs tabular-nums text-muted-foreground">
									{todayWordCount}/{writingGoal.dailyTarget}
								</span>
								{progress >= 100 && <Flame className="size-4 text-orange-500" />}
							</div>
						)}

						{/* 本次会话 */}
						{session && (
							<>
								<div className="w-px h-4 bg-border" />
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<Clock className="size-3.5" />
									<span className="text-xs tabular-nums">{formatDuration(sessionDuration)}</span>
								</div>
								<div className="flex items-center gap-1.5 text-muted-foreground">
									<TrendingUp className="size-3.5" />
									<span className="text-xs tabular-nums">
										{sessionWords >= 0 ? "+" : ""}{sessionWords}
									</span>
								</div>
							</>
						)}

						{/* 当前字数 */}
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
									onClick={toggleTypewriterMode}
								>
									<AlignCenter className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								打字机模式 {typewriterMode ? "(已开启)" : "(已关闭)"}
							</TooltipContent>
						</Tooltip>

						{/* 设置 */}
						<FocusModeSettings />

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
				<div className="max-w-3xl mx-auto px-8 py-16">
					{children}
				</div>
			</div>
		</div>
	);
}

function FocusModeSettings() {
	const {
		writingGoal,
		setWritingGoal,
		typewriterMode,
		setTypewriterMode,
	} = useWritingStore();

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
								onCheckedChange={setTypewriterMode}
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
								每日写作目标
							</Label>
							<Switch
								id="goal-enabled"
								checked={writingGoal.enabled}
								onCheckedChange={(checked: boolean) => setWritingGoal({ enabled: checked })}
							/>
						</div>

						{writingGoal.enabled && (
							<div className="flex items-center gap-2">
								<Input
									type="number"
									value={writingGoal.dailyTarget}
									onChange={(e) =>
										setWritingGoal({
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
}
