import { createFileRoute } from "@tanstack/react-router";
import { Check, Moon, Sun, Folder, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { getDarkThemes, getLightThemes, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/design")({
	component: DesignSettings,
});

function DesignSettings() {
	const { theme: activeTheme, setTheme, currentTheme } = useTheme();
	const iconTheme = useIconTheme();
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
				<div className="lg:col-span-7 space-y-4 min-w-0">
					<div className="sticky top-6 space-y-4">
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
										className="w-48 border-r p-3 space-y-1"
										style={{
											background: currentTheme?.colors.sidebar,
											borderColor: currentTheme?.colors.sidebarBorder,
										}}
									>
										<div
											className="text-xs font-medium px-2 py-1 mb-2 opacity-70"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											Explorer
										</div>
										
										{/* Folder Item */}
										<div
											className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
											style={{
												color: currentTheme?.colors.sidebarForeground,
											}}
										>
											{(() => {
												const Icon = iconTheme.icons.folder.default;
												return <Icon className="size-3.5 shrink-0" style={{ color: currentTheme?.colors.folderColor }} />;
											})()}
											<span className="truncate opacity-90">My Novel</span>
										</div>

										{/* Active File Item */}
										<div
											className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
											style={{
												background: currentTheme?.colors.sidebarAccent,
												color: currentTheme?.colors.primary,
											}}
										>
											{(() => {
												const Icon = iconTheme.icons.file.default;
												return <Icon className="size-3.5 shrink-0" />;
											})()}
											<span className="truncate font-medium">Chapter 1</span>
										</div>

										{/* Inactive File Item */}
										<div
											className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											{(() => {
												const Icon = iconTheme.icons.file.default;
												return <Icon className="size-3.5 shrink-0 opacity-70" />;
											})()}
											<span className="truncate opacity-70">Chapter 2</span>
										</div>
									</div>

									{/* 模拟编辑区 */}
									<div
										className="flex-1 p-8"
										style={{ background: currentTheme?.colors.background }}
									>
										<h2
											className="text-2xl font-bold mb-6"
											style={{ color: currentTheme?.colors.foreground }}
										>
											The Beginning
										</h2>
										<p
											className="text-sm leading-relaxed mb-4"
											style={{ color: currentTheme?.colors.foreground }}
										>
											In a land far away, where the ancient ruins whisper secrets of the past, a lone traveler stood atop the hill...
										</p>
										<p
											className="text-sm leading-relaxed"
											style={{ color: currentTheme?.colors.mutedForeground }}
										>
											The wind howled through the broken pillars, carrying with it the scent of rain and forgotten memories.
										</p>
										<button
											className="mt-8 px-4 py-1.5 rounded text-xs font-medium opacity-90 hover:opacity-100 transition-opacity"
											style={{
												background: currentTheme?.colors.primary,
												color: currentTheme?.colors.primaryForeground,
											}}
										>
											Save Content
										</button>
									</div>
								</div>
							</CardContent>
						</Card>

						<p className="text-xs text-muted-foreground text-center">
							Theme Live Preview
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
				"relative flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left group",
				"hover:shadow-md hover:-translate-y-0.5",
				isActive ? "border-primary ring-2 ring-primary/20 shadow-sm" : "border-border/50",
			)}
		>
			{/* 主题预览 */}
			<div
				className="h-16 w-full flex border-b border-border/10"
				style={{ background: colors.background }}
			>
				{/* 模拟侧边栏 */}
				<div
					className="w-1/4 h-full border-r flex flex-col items-center pt-2 gap-1.5"
					style={{
						background: colors.sidebar,
						borderColor: colors.sidebarBorder,
					}}
				>
					<div 
						className="size-1.5 rounded-sm opacity-50"
						style={{ background: colors.sidebarForeground }}
					/>
					<div 
						className="size-1.5 rounded-sm"
						style={{ background: colors.folderColor || colors.primary }}
					/>
					<div 
						className="size-1.5 rounded-sm opacity-50"
						style={{ background: colors.sidebarForeground }}
					/>
				</div>
				{/* 模拟编辑区 */}
				<div className="flex-1 p-3 flex flex-col gap-2">
					<div
						className="h-2 w-3/4 rounded-full"
						style={{ background: colors.primary, opacity: 0.8 }}
					/>
					<div
						className="h-1.5 w-full rounded-full opacity-40"
						style={{ background: colors.foreground }}
					/>
					<div
						className="h-1.5 w-2/3 rounded-full opacity-20"
						style={{ background: colors.foreground }}
					/>
				</div>
			</div>

			{/* 主题信息 */}
			<div className="px-3 py-2.5 bg-card/50">
				<div
					className="text-xs font-medium"
					style={{ color: colors.cardForeground }}
				>
					{theme.name}
				</div>
			</div>

			{/* 选中标记 */}
			{isActive && (
				<div
					className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center shadow-sm"
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
