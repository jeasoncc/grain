import { createFileRoute } from "@tanstack/react-router";
import { Check, Moon, Sun, Folder, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { getDarkThemes, getLightThemes, type Theme } from "@/lib/themes";
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AVAILABLE_FONTS, useFontSettings } from "@/stores/font";

export const Route = createFileRoute("/settings/design")({
	component: DesignSettings,
});

function DesignSettings() {
	const { theme: activeTheme, setTheme, currentTheme } = useTheme();
	const iconTheme = useIconTheme();
	const lightThemes = getLightThemes();
	const darkThemes = getDarkThemes();
	const { uiFontFamily, setUiFontFamily } = useFontSettings();

	const currentUiFont = AVAILABLE_FONTS.find((f) => f.value === uiFontFamily);

	return (
		<div className="space-y-10 max-w-5xl">
			<div>
				<h3 className="text-lg font-medium">Design</h3>
				<p className="text-sm text-muted-foreground">
					Customize the appearance and theme of the editor.
				</p>
			</div>
			
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
				{/* Left: Theme Selection */}
				<div className="lg:col-span-5 space-y-10">
					{/* Application Font */}
					<div className="space-y-4">
						<h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Typography</h4>
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<div className="text-base font-normal">Application Font</div>
								<p className="text-sm text-muted-foreground">
									The font used for the user interface (sidebar, menus, etc).
								</p>
							</div>
							<div className="w-[240px]">
								<Select value={uiFontFamily} onValueChange={setUiFontFamily}>
									<SelectTrigger>
										<SelectValue placeholder="Select font">
											{currentUiFont?.label || uiFontFamily}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{AVAILABLE_FONTS.map((font) => (
											<SelectItem key={font.value} value={font.value}>
												{font.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					{/* Light Themes */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Sun className="size-4" />
							<h4 className="text-sm font-medium uppercase tracking-wider">Light Themes</h4>
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
					</div>

					{/* Dark Themes */}
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Moon className="size-4" />
							<h4 className="text-sm font-medium uppercase tracking-wider">Dark Themes</h4>
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
					</div>
				</div>

				{/* Right: Preview */}
				<div className="lg:col-span-7 space-y-4 min-w-0">
					<div className="sticky top-6 space-y-4">
						{/* Theme Preview */}
						<div className="rounded-lg border overflow-hidden shadow-sm">
							<div
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
										className="text-xs ml-2 opacity-70"
										style={{ color: currentTheme?.colors.sidebarForeground }}
									>
										Preview - {currentTheme?.name}
									</span>
								</div>
							</div>
							<div className="p-0">
								<div className="flex h-[300px]">
									{/* Sidebar Mock */}
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

									{/* Editor Mock */}
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
							</div>
						</div>
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
				"relative flex flex-col rounded-xl border overflow-hidden transition-all text-left group",
				"hover:shadow-sm hover:-translate-y-0.5",
				isActive ? "border-primary ring-1 ring-primary/20 shadow-sm" : "border-border/50",
			)}
		>
			{/* Theme Preview */}
			<div
				className="h-14 w-full flex border-b border-border/10"
				style={{ background: colors.background }}
			>
				{/* Sidebar Mock */}
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
				{/* Editor Mock */}
				<div className="flex-1 p-2 flex flex-col gap-1.5">
					<div
						className="h-1.5 w-3/4 rounded-full"
						style={{ background: colors.primary, opacity: 0.8 }}
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

			{/* Theme Info */}
			<div className="px-3 py-2 bg-muted/20">
				<div
					className="text-xs font-medium truncate"
					style={{ color: colors.cardForeground }}
				>
					{theme.name}
				</div>
			</div>

			{/* Selected Check */}
			{isActive && (
				<div
					className="absolute top-1.5 right-1.5 size-4 rounded-full flex items-center justify-center shadow-sm"
					style={{ background: colors.primary }}
				>
					<Check
						className="size-2.5"
						style={{ color: colors.primaryForeground }}
					/>
				</div>
			)}
		</button>
	);
}
