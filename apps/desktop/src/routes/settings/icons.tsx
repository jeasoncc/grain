import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useIconTheme } from "@/hooks/use-icon-theme";
import {
	applyIconTheme,
	type IconTheme,
	iconThemes,
} from "@/lib/icon-themes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/icons")({
	component: IconSettings,
});

function IconSettings() {
	const currentIconTheme = useIconTheme();
	const { currentTheme } = useTheme();

	// 应用图标主题
	const handleIconThemeChange = (themeKey: string) => {
		applyIconTheme(themeKey);
		// 触发重新渲染
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
							<h4 className="text-sm font-medium uppercase tracking-wider">Icon Themes</h4>
						</div>
						<div className="grid grid-cols-2 gap-3">
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

									{/* Editor Mock - ActivityBar Icons */}
									<div
										className="flex-1 p-6"
										style={{ background: currentTheme?.colors.background }}
									>
										<h2
											className="text-base font-semibold mb-4 flex items-center gap-2"
											style={{ color: currentTheme?.colors.foreground }}
										>
											<Sparkles className="size-4" />
											Icon Preview
										</h2>

										<div className="grid grid-cols-4 gap-3">
											{/* File Tree Icons */}
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

											{/* Activity Bar Icons */}
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

// 图标主题卡片
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
			onClick={onSelect}
			className={cn(
				"relative flex flex-col rounded-xl border overflow-hidden transition-all text-left group",
				"hover:shadow-sm hover:-translate-y-0.5",
				isActive ? "border-primary ring-1 ring-primary/20 shadow-sm" : "border-border/50",
			)}
		>
			{/* 图标预览 */}
			<div className="h-14 w-full flex items-center justify-center gap-4 bg-muted/20 border-b border-border/10">
				<ProjectIcon className="size-5 text-foreground/70" />
				<FolderIcon className="size-5 text-foreground/70" />
				<FileIcon className="size-5 text-foreground/70" />
			</div>

			{/* 主题信息 */}
			<div className="px-3 py-2 bg-muted/20">
				<div className="text-xs font-medium text-card-foreground">
					{theme.name}
				</div>
			</div>

			{/* 选中标记 */}
			{isActive && (
				<div className="absolute top-1.5 right-1.5 size-4 rounded-full flex items-center justify-center shadow-sm"
					style={{ background: "hsl(var(--primary))" }}
				>
					<Check className="size-2.5 text-primary-foreground" />
				</div>
			)}
		</button>
	);
}

// 文件项组件
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
					color: label.includes("Book") || label.includes("Character") ? currentTheme?.colors.folderColor : undefined,
					fill: (label.includes("Book") || label.includes("Character")) && currentTheme?.colors.folderColor ? `${currentTheme.colors.folderColor}1A` : undefined
				}}
			/>
			<span className="truncate">{label}</span>
		</div>
	);
}

// ActivityBar 图标组件（左侧竖条）
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

// ActivityBar 图标项组件（右侧预览网格）
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
		<div
			className="flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors hover:bg-muted/50"
			style={{
				borderColor: currentTheme?.colors.border,
			}}
		>
			<Icon
				className="size-6"
				style={{ 
					color: color || currentTheme?.colors.foreground,
					fill: color ? `${color}1A` : undefined
				}}
			/>
			<span
				className="text-xs text-center"
				style={{ color: currentTheme?.colors.mutedForeground }}
			>
				{label}
			</span>
		</div>
	);
}
