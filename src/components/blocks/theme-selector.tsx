/**
 * 主题选择器 - VS Code 风格
 * 
 * 功能：
 * - 主题预览卡片
 * - 系统主题跟随模式
 * - 过渡动画开关
 */
import { Palette, Check, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { getLightThemes, getDarkThemes, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";

// 模式配置
const modeConfig: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
	{ mode: "light", icon: Sun, label: "浅色" },
	{ mode: "dark", icon: Moon, label: "深色" },
	{ mode: "system", icon: Monitor, label: "跟随系统" },
];

export function ThemeSelector() {
	const { 
		theme, 
		setTheme, 
		currentTheme, 
		mode, 
		setMode, 
		enableTransition, 
		setEnableTransition 
	} = useTheme();

	const lightThemes = getLightThemes();
	const darkThemes = getDarkThemes();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="size-7">
					<Palette className="size-3.5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80">
				<div className="space-y-4">
					<div>
						<h4 className="font-medium text-sm">选择主题</h4>
						<p className="text-xs text-muted-foreground mt-1">
							{currentTheme?.description}
						</p>
					</div>

					{/* 主题模式切换 */}
					<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
						{modeConfig.map(({ mode: m, icon: Icon, label }) => (
							<button
								key={m}
								onClick={() => setMode(m)}
								className={cn(
									"flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all",
									mode === m
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								)}
							>
								<Icon className="size-3.5" />
								{label}
							</button>
						))}
					</div>

					{/* 浅色主题 */}
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Sun className="size-3.5 text-muted-foreground" />
							<span className="text-xs text-muted-foreground font-medium">浅色主题</span>
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

					{/* 深色主题 */}
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Moon className="size-3.5 text-muted-foreground" />
							<span className="text-xs text-muted-foreground font-medium">深色主题</span>
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

					{/* 过渡动画开关 */}
					<div className="flex items-center justify-between pt-2 border-t">
						<Label htmlFor="theme-transition" className="text-xs text-muted-foreground">
							切换过渡动画
						</Label>
						<Switch
							id="theme-transition"
							checked={enableTransition}
							onCheckedChange={setEnableTransition}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface ThemeCardProps {
	theme: Theme;
	isSelected: boolean;
	onSelect: () => void;
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
	const { colors } = theme;

	return (
		<button
			onClick={onSelect}
			title={theme.description}
			className={cn(
				"relative flex flex-col rounded-lg border-2 overflow-hidden transition-all",
				"hover:scale-105 hover:shadow-md",
				isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent"
			)}
		>
			{/* 主题预览 */}
			<div
				className="h-12 w-full flex"
				style={{ background: colors.background }}
			>
				{/* 模拟侧边栏 */}
				<div
					className="w-1/4 h-full"
					style={{ background: colors.sidebar }}
				/>
				{/* 模拟编辑区 */}
				<div className="flex-1 p-1.5 flex flex-col gap-1">
					<div
						className="h-1.5 w-3/4 rounded-full"
						style={{ background: colors.primary }}
					/>
					<div
						className="h-1 w-full rounded-full opacity-50"
						style={{ background: colors.foreground }}
					/>
					<div
						className="h-1 w-2/3 rounded-full opacity-30"
						style={{ background: colors.foreground }}
					/>
				</div>
			</div>

			{/* 主题名称 */}
			<div
				className="px-1.5 py-1 text-[10px] text-center truncate"
				style={{
					background: colors.card,
					color: colors.cardForeground,
				}}
			>
				{theme.name}
			</div>

			{/* 选中标记 */}
			{isSelected && (
				<div className="absolute top-1 right-1 size-4 rounded-full bg-primary flex items-center justify-center">
					<Check className="size-2.5 text-primary-foreground" />
				</div>
			)}
		</button>
	);
}
