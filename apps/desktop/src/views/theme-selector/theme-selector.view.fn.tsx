/**
 * 主题选择器 View - VS Code 风格
 *
 * 功能：
 * - 主题预览卡片
 * - 系统主题跟随模式
 * - 过渡动画开关
 */

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { memo } from "react";
import type { ThemeMode } from "@/hooks/use-theme";
import { cn } from "@/utils/cn.util";
import { Button } from "@/views/ui/button";
import { Label } from "@/views/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/views/ui/popover";
import { Switch } from "@/views/ui/switch";
import type {
	ThemeCardProps,
	ThemeSelectorViewProps,
} from "./theme-selector.types";

// Mode configuration
const modeConfig: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
	{ mode: "light", icon: Sun, label: "Light" },
	{ mode: "dark", icon: Moon, label: "Dark" },
	{ mode: "system", icon: Monitor, label: "System" },
];

export const ThemeSelectorView = memo(
	({
		theme,
		setTheme,
		currentTheme,
		mode,
		setMode,
		enableTransition,
		setEnableTransition,
		lightThemes,
		darkThemes,
	}: ThemeSelectorViewProps) => {
		return (
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="icon" className="size-7">
						<Palette className="size-3.5" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="end"
					className="w-80 max-h-[500px] overflow-hidden flex flex-col p-3 shadow-2xl border border-border/40 bg-popover/95 backdrop-blur-xl rounded-xl"
				>
					<div className="space-y-4 flex flex-col min-h-0">
						<div className="flex-shrink-0 border-b border-border/40 pb-3">
							<div className="flex items-center justify-between mb-2">
								<h4 className="font-medium text-sm">Theme</h4>
								{currentTheme?.description && (
									<span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
										{currentTheme.name}
									</span>
								)}
							</div>

							{/* 主题模式切换 */}
							<div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg border border-border/20">
								{modeConfig.map(({ mode: m, icon: Icon, label }) => (
									<button
										type="button"
										key={m}
										onClick={() => setMode(m)}
										className={cn(
											"flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200",
											mode === m
												? "bg-background text-foreground shadow-sm ring-1 ring-border/10"
												: "text-muted-foreground hover:text-foreground hover:bg-muted/50",
										)}
									>
										<Icon className="size-3.5" />
										{label}
									</button>
								))}
							</div>
						</div>

						{/* 可滚动的主题列表区域 */}
						<div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 custom-scrollbar py-1">
							{/* Light Themes - Show if mode is light or system */}
							{(mode === "light" || mode === "system") && (
								<div className="animate-in fade-in slide-in-from-left-2 duration-300">
									<div className="flex items-center gap-2 mb-2 px-1">
										<Sun className="size-3 text-muted-foreground/70" />
										<span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
											Light Themes
										</span>
									</div>
									<div className="grid grid-cols-3 gap-2">
										{lightThemes.map((t) => (
											<ThemeCard
												key={t.key}
												theme={t}
												isSelected={t.key === theme}
												onSelect={() => setTheme(t.key)}
											/>
										))}
									</div>
								</div>
							)}

							{/* Dark Themes - Show if mode is dark or system */}
							{(mode === "dark" || mode === "system") && (
								<div className="animate-in fade-in slide-in-from-right-2 duration-300">
									<div className="flex items-center gap-2 mb-2 px-1">
										<Moon className="size-3 text-muted-foreground/70" />
										<span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
											Dark Themes
										</span>
									</div>
									<div className="grid grid-cols-3 gap-2">
										{darkThemes.map((t) => (
											<ThemeCard
												key={t.key}
												theme={t}
												isSelected={t.key === theme}
												onSelect={() => setTheme(t.key)}
											/>
										))}
									</div>
								</div>
							)}
						</div>

						{/* 过渡动画开关 */}
						<div className="flex-shrink-0 flex items-center justify-between pt-3 border-t border-border/40">
							<Label
								htmlFor="theme-transition"
								className="text-xs text-muted-foreground font-normal"
							>
								Enable Transitions
							</Label>
							<Switch
								id="theme-transition"
								checked={enableTransition}
								onCheckedChange={setEnableTransition}
								className="scale-75 origin-right"
							/>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		);
	},
);

ThemeSelectorView.displayName = "ThemeSelectorView";

const ThemeCard = memo(({ theme, isSelected, onSelect }: ThemeCardProps) => {
	const { colors } = theme;

	return (
		<button
			type="button"
			onClick={onSelect}
			title={theme.description}
			className={cn(
				"group relative flex flex-col rounded-xl border overflow-hidden transition-all duration-200 outline-none",
				"hover:scale-[1.02] hover:shadow-md",
				isSelected
					? "border-primary/50 ring-2 ring-primary ring-offset-2 ring-offset-popover shadow-sm"
					: "border-border/40 hover:border-border/80",
			)}
		>
			{/* 主题预览 */}
			<div
				className="h-14 w-full flex"
				style={{ background: colors.background }}
			>
				{/* 模拟侧边栏 */}
				<div
					className="w-1/4 h-full border-r border-black/5 dark:border-white/5"
					style={{ background: colors.sidebar }}
				/>
				{/* 模拟编辑区 */}
				<div className="flex-1 p-2 flex flex-col gap-1.5">
					<div
						className="h-1.5 w-3/4 rounded-full opacity-90"
						style={{ background: colors.primary }}
					/>
					<div
						className="h-1 w-full rounded-full opacity-40"
						style={{ background: colors.foreground }}
					/>
					<div
						className="h-1 w-2/3 rounded-full opacity-20"
						style={{ background: colors.foreground }}
					/>
				</div>
			</div>

			{/* 主题名称 */}
			<div
				className="px-2 py-1.5 text-[10px] font-medium text-center truncate w-full border-t border-black/5 dark:border-white/5"
				style={{
					background: colors.card,
					color: colors.cardForeground,
				}}
			>
				{theme.name}
			</div>

			{/* 选中标记 */}
			{isSelected && (
				<div className="absolute top-1.5 right-1.5 size-3.5 rounded-full bg-primary flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
					<Check className="size-2 text-primary-foreground stroke-[3]" />
				</div>
			)}
		</button>
	);
});

ThemeCard.displayName = "ThemeCard";
