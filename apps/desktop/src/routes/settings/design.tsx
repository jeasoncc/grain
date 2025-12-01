import { createFileRoute } from "@tanstack/react-router";
import { Check, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";
import { getDarkThemes, getLightThemes, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/design")({
	component: DesignSettings,
});

function DesignSettings() {
	const { theme: activeTheme, setTheme, currentTheme } = useTheme();
	const lightThemes = getLightThemes();
	const darkThemes = getDarkThemes();

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">外观设置</h3>
				<p className="text-sm text-muted-foreground">
					自定义编辑器的外观和主题
				</p>
			</div>
			<Separator />

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* 左侧：主题选择 */}
				<div className="lg:col-span-5 space-y-6">
					{/* 浅色主题 */}
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<Sun className="size-4 text-muted-foreground" />
							<h2 className="text-sm font-medium">浅色主题</h2>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{lightThemes.map((t) => (
								<ThemeCard
									key={t.key}
									theme={t}
									isActive={activeTheme === t.key}
									onSelect={() => setTheme(t.key)}
								/>
							))}
						</div>
					</section>

					<Separator />

					{/* 深色主题 */}
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<Moon className="size-4 text-muted-foreground" />
							<h2 className="text-sm font-medium">深色主题</h2>
						</div>
						<div className="grid grid-cols-2 gap-3">
							{darkThemes.map((t) => (
								<ThemeCard
									key={t.key}
									theme={t}
									isActive={activeTheme === t.key}
									onSelect={() => setTheme(t.key)}
								/>
							))}
						</div>
					</section>
					

				</div>

				{/* 右侧：预览 */}
				<div className="lg:col-span-7 space-y-4">
					<div className="sticky top-24 space-y-4">
						{/* 主题预览 */}
						<Card className="overflow-hidden border-2 shadow-xl">
							<CardHeader
								className="border-b p-4"
								style={{ background: currentTheme?.colors.sidebar }}
							>
								<div className="flex items-center gap-2">
									<div className="flex gap-1.5">
										<div className="size-3 rounded-full bg-red-500/80" />
										<div className="size-3 rounded-full bg-yellow-500/80" />
										<div className="size-3 rounded-full bg-green-500/80" />
									</div>
									<span
										className="text-xs ml-2"
										style={{ color: currentTheme?.colors.sidebarForeground }}
									>
										主题预览 - {currentTheme?.name}
									</span>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								<div className="flex h-[300px]">
									{/* 模拟侧边栏 */}
									<div
										className="w-48 border-r p-3 space-y-2"
										style={{
											background: currentTheme?.colors.sidebar,
											borderColor: currentTheme?.colors.sidebarBorder,
										}}
									>
										<div
											className="text-xs font-medium px-2 py-1"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											章节列表
										</div>
										<div
											className="text-xs px-2 py-1.5 rounded"
											style={{
												background: currentTheme?.colors.sidebarAccent,
												color: currentTheme?.colors.primary,
											}}
										>
											第一章 开始
										</div>
										<div
											className="text-xs px-2 py-1.5 rounded opacity-70"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											第二章 发展
										</div>
										<div
											className="text-xs px-2 py-1.5 rounded opacity-70"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											第三章 高潮
										</div>
									</div>

									{/* 模拟编辑区 */}
									<div
										className="flex-1 p-6"
										style={{ background: currentTheme?.colors.background }}
									>
										<h2
											className="text-xl font-bold mb-4"
											style={{ color: currentTheme?.colors.foreground }}
										>
											故事的开始
										</h2>
										<p
											className="text-sm leading-relaxed mb-3"
											style={{ color: currentTheme?.colors.foreground }}
										>
											在一个遥远的地方，有一座古老的城堡...
										</p>
										<p
											className="text-sm leading-relaxed"
											style={{ color: currentTheme?.colors.mutedForeground }}
										>
											这里是故事开始的地方，一切都将从这里展开。
										</p>
										<button
											className="mt-4 px-4 py-2 rounded text-sm font-medium"
											style={{
												background: currentTheme?.colors.primary,
												color: currentTheme?.colors.primaryForeground,
											}}
										>
											保存
										</button>
									</div>
								</div>
							</CardContent>
						</Card>

						<p className="text-xs text-muted-foreground text-center">
							实时预览当前主题效果
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

interface ThemeCardProps {
	theme: Theme;
	isActive: boolean;
	onSelect: () => void;
}

function ThemeCard({ theme, isActive, onSelect }: ThemeCardProps) {
	const { colors } = theme;

	return (
		<button
			onClick={onSelect}
			className={cn(
				"relative flex flex-col rounded-lg border-2 overflow-hidden transition-all text-left",
				"hover:shadow-lg hover:scale-[1.02]",
				isActive ? "border-primary ring-2 ring-primary/20" : "border-border",
			)}
		>
			{/* 主题预览 */}
			<div
				className="h-20 w-full flex"
				style={{ background: colors.background }}
			>
				{/* 模拟侧边栏 */}
				<div
					className="w-1/4 h-full border-r"
					style={{
						background: colors.sidebar,
						borderColor: colors.sidebarBorder,
					}}
				/>
				{/* 模拟编辑区 */}
				<div className="flex-1 p-2 flex flex-col gap-1.5">
					<div
						className="h-2 w-3/4 rounded"
						style={{ background: colors.primary }}
					/>
					<div
						className="h-1.5 w-full rounded opacity-60"
						style={{ background: colors.foreground }}
					/>
					<div
						className="h-1.5 w-2/3 rounded opacity-40"
						style={{ background: colors.foreground }}
					/>
					<div
						className="h-1.5 w-4/5 rounded opacity-40"
						style={{ background: colors.foreground }}
					/>
				</div>
			</div>

			{/* 主题信息 */}
			<div className="px-3 py-2" style={{ background: colors.card }}>
				<div
					className="text-sm font-medium"
					style={{ color: colors.cardForeground }}
				>
					{theme.name}
				</div>
				<div
					className="text-xs opacity-60"
					style={{ color: colors.cardForeground }}
				>
					{theme.description}
				</div>
			</div>

			{/* 选中标记 */}
			{isActive && (
				<div
					className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center"
					style={{ background: colors.primary }}
				>
					<Check
						className="size-3"
						style={{ color: colors.primaryForeground }}
					/>
				</div>
			)}
		</button>
	);
}
