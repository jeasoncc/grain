import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { useIconTheme } from "@/hooks/use-icon-theme";
import { useTheme } from "@/hooks/use-theme";
import { useIconThemeStore } from "@/state/icon-theme.state";
import type { IconTheme } from "@/types/icon-theme";
import { iconThemes } from "@/types/icon-theme";
import { cn } from "@/utils/cn.util";

export const Route = createFileRoute("/settings/icons")({
	component: IconSettings,
});

function IconSettings() {
	const currentIconTheme = useIconTheme();
	const { currentTheme } = useTheme();

	// Apply icon theme
	const handleIconThemeChange = (themeKey: string) => {
		useIconThemeStore.getState().setTheme(themeKey);
		// Trigger re-render
		window.dispatchEvent(new Event("icon-theme-changed"));
	};

	return (
		<div className="space-y-10 max-w-5xl">
			<div>
				<h3 className="text-lg font-medium">Icons</h3>
				<p className="text-sm text-muted-foreground">
					Customize the style and appearance of all icons in the app.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
				{/* Left: Icon Theme Selection */}
				<div className="lg:col-span-5 space-y-10">
					<div className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<Sparkles className="size-4" />
							<h4 className="text-sm font-medium uppercase tracking-wider">
								Icon Themes
							</h4>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{iconThemes.map((theme) => (
								<IconThemeCard
									key={theme.key}
									theme={theme}
									isActive={currentIconTheme.key === theme.key}
									onSelect={() => handleIconThemeChange(theme.key)}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Right: Preview */}
				<div className="lg:col-span-7 space-y-4 min-w-0">
					<div className="sticky top-6 space-y-4">
						{/* Icon Preview Window */}
						<div className="rounded-lg border border-border/40 overflow-hidden shadow-sm">
							<div
								className="border-b border-border/40 p-4"
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
										Preview - {currentIconTheme.name}
									</span>
								</div>
							</div>
							<div className="p-0">
								<div className="flex h-[450px]">
									{/* ActivityBar Mock */}
									<div
										className="w-12 border-r flex flex-col items-center py-3 gap-2"
										style={{
											background: currentTheme?.colors.sidebar,
											borderColor: currentTheme?.colors.sidebarBorder,
										}}
									>
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.library}
											isActive={true}
										/>
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.search}
										/>
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.outline}
										/>
										<div className="h-px w-6 bg-border/20 my-1" />
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.create}
										/>
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.import}
										/>
										<div className="flex-1" />
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.settings}
										/>
									</div>

									{/* Sidebar Mock - File Icons */}
									<div
										className="w-56 border-r p-3 space-y-2"
										style={{
											background: currentTheme?.colors.sidebar,
											borderColor: currentTheme?.colors.sidebarBorder,
										}}
									>
										<div
											className="text-xs font-medium px-2 py-1 mb-2 opacity-70"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											Structure
										</div>

										{/* Project */}
										<FileItem
											icon={currentIconTheme.icons.project.default}
											label="My Novel"
											isOpen={true}
											level={0}
										/>

										{/* Folder */}
										<FileItem
											icon={currentIconTheme.icons.folder.default}
											label="Book 1: The Mist"
											isOpen={true}
											level={1}
										/>

										{/* File */}
										<FileItem
											icon={currentIconTheme.icons.file.default}
											label="Chapter 1.md"
											level={2}
										/>
										<FileItem
											icon={currentIconTheme.icons.file.default}
											label="Chapter 2.md"
											level={2}
											isActive={true}
										/>

										{/* Folder */}
										<FileItem
											icon={currentIconTheme.icons.folder.default}
											label="Book 2: The Storm"
											level={1}
										/>

										{/* Folder */}
										<FileItem
											icon={currentIconTheme.icons.folder.default}
											label="Characters"
											isOpen={true}
											level={1}
										/>

										{/* Character */}
										<FileItem
											icon={currentIconTheme.icons.character.default}
											label="Hero.md"
											level={2}
										/>

										{/* World */}
										<FileItem
											icon={currentIconTheme.icons.world.default}
											label="World.md"
											level={1}
										/>
									</div>

									{/* Editor Mock - Icon Gallery */}
									<div
										className="flex-1 p-6 overflow-y-auto"
										style={{ background: currentTheme?.colors.background }}
									>
										<div className="space-y-8">
											{/* File System Icons */}
											<div className="space-y-3">
												<h3
													className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1"
													style={{
														color: currentTheme?.colors.mutedForeground,
													}}
												>
													File System
												</h3>
												<div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2">
													<ActivityBarIconItem
														icon={currentIconTheme.icons.project.default}
														label="Project"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.folder.default}
														label="Folder"
														color={currentTheme?.colors.folderColor}
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.file.default}
														label="File"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.character.default}
														label="Character"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.world.default}
														label="World"
													/>
												</div>
											</div>

											{/* Interface Icons */}
											<div className="space-y-3">
												<h3
													className="text-xs font-semibold uppercase tracking-wider opacity-50 px-1"
													style={{
														color: currentTheme?.colors.mutedForeground,
													}}
												>
													Interface
												</h3>
												<div className="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-2">
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.library}
														label="Library"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.search}
														label="Search"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.outline}
														label="Outline"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.canvas}
														label="Canvas"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.statistics}
														label="Stats"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.settings}
														label="Settings"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.create}
														label="New"
													/>
													<ActivityBarIconItem
														icon={currentIconTheme.icons.activityBar.import}
														label="Import"
													/>
												</div>
											</div>
										</div>
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

// Icon Theme Card
interface IconThemeCardProps {
	theme: IconTheme;
	isActive: boolean;
	onSelect: () => void;
}

function IconThemeCard({ theme, isActive, onSelect }: IconThemeCardProps) {
	const ProjectIcon = theme.icons.project.default;
	const FolderIcon = theme.icons.folder.default;
	const FileIcon = theme.icons.file.default;

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"relative flex flex-col rounded-xl border overflow-hidden transition-all duration-300 text-left group",
				"hover:shadow-lg hover:-translate-y-1 hover:border-primary/50",
				isActive
					? "border-primary ring-2 ring-primary/20 shadow-md bg-accent/5 scale-[1.02]"
					: "border-border/40 bg-card",
			)}
		>
			{/* Icon Preview */}
			<div
				className={cn(
					"h-16 w-full flex items-center justify-center gap-4 border-b border-border/10 transition-colors relative overflow-hidden",
					isActive ? "bg-primary/5" : "bg-muted/30 group-hover:bg-muted/50",
				)}
			>
				{/* Subtle Gradient Overlay */}
				<div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 pointer-events-none" />

				<div className="p-2 rounded-lg bg-background shadow-sm ring-1 ring-border/10 group-hover:scale-110 transition-transform duration-300 relative z-10">
					<ProjectIcon className="size-5 text-foreground/80" />
				</div>
				<div className="p-2 rounded-lg bg-background shadow-sm ring-1 ring-border/10 group-hover:scale-110 transition-transform duration-300 delay-75 relative z-10">
					<FolderIcon className="size-5 text-foreground/80" />
				</div>
				<div className="p-2 rounded-lg bg-background shadow-sm ring-1 ring-border/10 group-hover:scale-110 transition-transform duration-300 delay-150 relative z-10">
					<FileIcon className="size-5 text-foreground/80" />
				</div>
			</div>

			{/* Theme Info */}
			<div
				className={cn(
					"px-4 py-3 transition-colors w-full",
					isActive ? "bg-primary/5" : "bg-transparent",
				)}
			>
				<div className="text-sm font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
					{theme.name}
				</div>
				<p className="text-[10px] text-muted-foreground line-clamp-1 opacity-70">
					{theme.description}
				</p>
			</div>

			{/* Selection Indicator */}
			{isActive && (
				<div
					className="absolute top-2 right-2 size-5 rounded-full flex items-center justify-center shadow-sm animate-in fade-in zoom-in duration-200"
					style={{ background: "hsl(var(--primary))" }}
				>
					<Check className="size-3 text-primary-foreground" />
				</div>
			)}
		</button>
	);
}

// File Item Component
function FileItem({
	icon: Icon,
	label,
	level = 0,
	isOpen = false,
	isActive = false,
}: {
	icon: any;
	label: string;
	level?: number;
	isOpen?: boolean;
	isActive?: boolean;
}) {
	const { currentTheme } = useTheme();

	return (
		<div
			className="flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors"
			style={{
				paddingLeft: `${level * 12 + 8}px`,
				background: isActive
					? currentTheme?.colors.sidebarAccent
					: "transparent",
				color: isActive
					? currentTheme?.colors.primary
					: currentTheme?.colors.sidebarForeground,
			}}
		>
			<Icon
				className="size-4 shrink-0"
				style={{
					color:
						label.includes("Book") || label.includes("Character")
							? currentTheme?.colors.folderColor
							: undefined,
					fill:
						(label.includes("Book") || label.includes("Character")) &&
						currentTheme?.colors.folderColor
							? `${currentTheme.colors.folderColor}1A`
							: undefined,
				}}
			/>
			<span className="truncate">{label}</span>
		</div>
	);
}

// ActivityBar Icon Component (Left vertical bar)
function ActivityBarIcon({
	icon: Icon,
	isActive = false,
}: {
	icon: any;
	isActive?: boolean;
}) {
	const { currentTheme } = useTheme();

	return (
		<div
			className={cn(
				"relative flex size-10 items-center justify-center rounded-lg transition-all",
				isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
			)}
			style={{
				color: isActive
					? currentTheme?.colors.primary
					: currentTheme?.colors.sidebarForeground,
			}}
		>
			{isActive && (
				<div
					className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r"
					style={{ background: currentTheme?.colors.primary }}
				/>
			)}
			<Icon className="size-5" />
		</div>
	);
}

// ActivityBar Icon Item Component (Right preview grid)
function ActivityBarIconItem({
	icon: Icon,
	label,
	color,
}: {
	icon: any;
	label: string;
	color?: string;
}) {
	const { currentTheme } = useTheme();

	return (
		<div className="group flex flex-col items-center justify-center gap-2 p-2 rounded-xl transition-all duration-200 hover:bg-muted/20 hover:scale-105 cursor-default">
			<div className="p-2 rounded-lg bg-muted/10 group-hover:bg-muted/20 transition-colors">
				<Icon
					className="size-5 transition-transform group-hover:-translate-y-0.5 duration-300"
					style={{
						color: color || currentTheme?.colors.foreground,
						fill: color ? `${color}1A` : undefined,
					}}
				/>
			</div>
			<span
				className="text-[10px] font-medium text-center opacity-70 group-hover:opacity-100 transition-opacity"
				style={{ color: currentTheme?.colors.mutedForeground }}
			>
				{label}
			</span>
		</div>
	);
}
