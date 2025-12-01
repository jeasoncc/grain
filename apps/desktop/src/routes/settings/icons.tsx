import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
	iconThemes,
	getCurrentIconTheme,
	applyIconTheme,
	type IconTheme,
} from "@/lib/icon-themes";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/icons")({
	component: IconSettings,
});

function IconSettings() {
	const [activeIconTheme, setActiveIconTheme] = useState(() =>
		getCurrentIconTheme().key,
	);
	const [currentIconTheme, setCurrentIconTheme] = useState(getCurrentIconTheme());
	const { currentTheme } = useTheme();

	// 应用图标主题
	const handleIconThemeChange = (themeKey: string) => {
		setActiveIconTheme(themeKey);
		applyIconTheme(themeKey);
		setCurrentIconTheme(getCurrentIconTheme());
		// 触发重新渲染
		window.dispatchEvent(new Event("icon-theme-changed"));
	};

	// 监听图标主题变化
	useEffect(() => {
		const handler = () => {
			setCurrentIconTheme(getCurrentIconTheme());
		};
		window.addEventListener("icon-theme-changed", handler);
		return () => window.removeEventListener("icon-theme-changed", handler);
	}, []);

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">图标设置</h3>
				<p className="text-sm text-muted-foreground">
					自定义应用中所有图标的风格和外观
				</p>
			</div>
			<Separator />

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				{/* 左侧：图标主题选择 */}
				<div className="lg:col-span-5 space-y-6">
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<Sparkles className="size-4 text-muted-foreground" />
							<h2 className="text-sm font-medium">图标主题</h2>
						</div>
						<p className="text-xs text-muted-foreground">
							选择一个图标主题应用到整个应用
						</p>
						<div className="grid grid-cols-2 gap-3">
							{iconThemes.map((theme) => (
								<IconThemeCard
									key={theme.key}
									theme={theme}
									isActive={activeIconTheme === theme.key}
									onSelect={() => handleIconThemeChange(theme.key)}
								/>
							))}
						</div>
					</section>
				</div>

				{/* 右侧：预览 */}
				<div className="lg:col-span-7">
					<div className="sticky top-24 space-y-4">
						{/* 图标预览窗口 */}
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
										图标预览 - {currentIconTheme.name}
									</span>
								</div>
							</CardHeader>
							<CardContent className="p-0">
								<div className="flex h-[450px]">
									{/* 模拟 ActivityBar */}
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
										<ActivityBarIcon
											icon={currentIconTheme.icons.activityBar.characters}
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

									{/* 模拟侧边栏 - 显示文件图标 */}
									<div
										className="w-56 border-r p-3 space-y-2"
										style={{
											background: currentTheme?.colors.sidebar,
											borderColor: currentTheme?.colors.sidebarBorder,
										}}
									>
										<div
											className="text-xs font-medium px-2 py-1 mb-2"
											style={{ color: currentTheme?.colors.sidebarForeground }}
										>
											项目结构
										</div>
										
										{/* 项目 */}
										<FileItem
											icon={currentIconTheme.icons.project.default}
											label="我的小说"
											isOpen={true}
											level={0}
										/>
										
										{/* 章节 */}
										<FileItem
											icon={currentIconTheme.icons.chapter.default}
											label="第一章"
											isOpen={true}
											level={1}
										/>
										
										{/* 场景 */}
										<FileItem
											icon={currentIconTheme.icons.scene.default}
											label="开场.md"
											level={2}
										/>
										<FileItem
											icon={currentIconTheme.icons.scene.default}
											label="相遇.md"
											level={2}
											isActive={true}
										/>
										
										{/* 章节 */}
										<FileItem
											icon={currentIconTheme.icons.chapter.default}
											label="第二章"
											level={1}
										/>
										
										{/* 文件夹 */}
										<FileItem
											icon={currentIconTheme.icons.folder.default}
											label="角色设定"
											isOpen={true}
											level={1}
										/>
										
										{/* 角色 */}
										<FileItem
											icon={currentIconTheme.icons.character.default}
											label="主角.md"
											level={2}
										/>
										
										{/* 世界观 */}
										<FileItem
											icon={currentIconTheme.icons.world.default}
											label="世界观.md"
											level={1}
										/>
									</div>

									{/* 模拟编辑区 - 显示 ActivityBar 图标 */}
									<div
										className="flex-1 p-6"
										style={{ background: currentTheme?.colors.background }}
									>
										<h2
											className="text-base font-semibold mb-4 flex items-center gap-2"
											style={{ color: currentTheme?.colors.foreground }}
										>
											<Sparkles className="size-4" />
											活动栏图标预览
										</h2>
										
										<div className="grid grid-cols-3 gap-3">
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.library}
												label="书库"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.search}
												label="搜索"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.outline}
												label="大纲"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.characters}
												label="角色"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.world}
												label="世界观"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.canvas}
												label="绘图"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.statistics}
												label="统计"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.settings}
												label="设置"
											/>
											<ActivityBarIconItem
												icon={currentIconTheme.icons.activityBar.create}
												label="新建"
											/>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<p className="text-xs text-muted-foreground text-center">
							实时预览当前图标主题效果
						</p>
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
	const ChapterIcon = theme.icons.chapter.default;
	const SceneIcon = theme.icons.scene.default;

	return (
		<button
			onClick={onSelect}
			className={cn(
				"relative flex flex-col rounded-lg border-2 overflow-hidden transition-all text-left",
				"hover:shadow-lg hover:scale-[1.02]",
				isActive ? "border-primary ring-2 ring-primary/20" : "border-border",
			)}
		>
			{/* 图标预览 */}
			<div className="h-16 w-full flex items-center justify-center gap-3 bg-muted/30">
				<ProjectIcon className="size-5 text-muted-foreground" />
				<ChapterIcon className="size-5 text-muted-foreground" />
				<SceneIcon className="size-5 text-muted-foreground" />
			</div>

			{/* 主题信息 */}
			<div className="px-3 py-2 bg-card">
				<div className="text-sm font-medium text-card-foreground">
					{theme.name}
				</div>
				<div className="text-xs text-muted-foreground">
					{theme.description}
				</div>
			</div>

			{/* 选中标记 */}
			{isActive && (
				<div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
					<Check className="size-3 text-primary-foreground" />
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
				background: isActive ? currentTheme?.colors.sidebarAccent : "transparent",
				color: isActive ? currentTheme?.colors.primary : currentTheme?.colors.sidebarForeground,
			}}
		>
			<Icon className="size-4 shrink-0" />
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
				isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
			)}
			style={{
				color: isActive ? currentTheme?.colors.primary : currentTheme?.colors.sidebarForeground,
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
}: {
	icon: any;
	label: string;
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
				style={{ color: currentTheme?.colors.foreground }}
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


