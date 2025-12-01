/**
 * 图标选择器组件
 */

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	type IconOption,
	type IconCategory,
	icons,
	iconCategories,
	getAllCategories,
	getIconsByCategory,
	searchIcons,
} from "@/lib/icons";

interface IconPickerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (icon: IconOption) => void;
	selectedIcon?: string;
}

export function IconPicker({
	open,
	onOpenChange,
	onSelect,
	selectedIcon,
}: IconPickerProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState<IconCategory>("book");

	// 获取要显示的图标
	const displayIcons = searchQuery
		? searchIcons(searchQuery)
		: getIconsByCategory(activeCategory);

	const handleSelect = (icon: IconOption) => {
		onSelect(icon);
		onOpenChange(false);
		setSearchQuery("");
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>选择图标</DialogTitle>
					<DialogDescription>
						为你的项目、章节或场景选择一个图标
					</DialogDescription>
				</DialogHeader>

				{/* 搜索框 */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="搜索图标..."
						className="pl-9 pr-9"
					/>
					{searchQuery && (
						<Button
							size="icon"
							variant="ghost"
							className="absolute right-1 top-1/2 -translate-y-1/2 size-6"
							onClick={() => setSearchQuery("")}
						>
							<X className="size-3" />
						</Button>
					)}
				</div>

				{/* 图标网格 */}
				{searchQuery ? (
					// 搜索结果
					<ScrollArea className="h-[400px]">
						<div className="grid grid-cols-8 gap-2 p-2">
							{displayIcons.length > 0 ? (
								displayIcons.map((icon) => (
									<IconButton
										key={icon.key}
										icon={icon}
										isSelected={selectedIcon === icon.key}
										onClick={() => handleSelect(icon)}
									/>
								))
							) : (
								<div className="col-span-8 flex flex-col items-center justify-center py-12 text-muted-foreground">
									<Search className="size-12 mb-3 opacity-20" />
									<p className="text-sm">未找到匹配的图标</p>
								</div>
							)}
						</div>
					</ScrollArea>
				) : (
					// 分类浏览
					<Tabs
						value={activeCategory}
						onValueChange={(v) => setActiveCategory(v as IconCategory)}
					>
						<TabsList className="grid w-full grid-cols-7">
							{getAllCategories().map((category) => (
								<TabsTrigger key={category} value={category} className="text-xs">
									{iconCategories[category].name}
								</TabsTrigger>
							))}
						</TabsList>

						{getAllCategories().map((category) => (
							<TabsContent key={category} value={category} className="mt-4">
								<ScrollArea className="h-[350px]">
									<div className="grid grid-cols-8 gap-2 p-2">
										{getIconsByCategory(category).map((icon) => (
											<IconButton
												key={icon.key}
												icon={icon}
												isSelected={selectedIcon === icon.key}
												onClick={() => handleSelect(icon)}
											/>
										))}
									</div>
								</ScrollArea>
							</TabsContent>
						))}
					</Tabs>
				)}

				{/* 统计信息 */}
				<div className="text-xs text-muted-foreground text-center">
					{searchQuery
						? `找到 ${displayIcons.length} 个图标`
						: `${iconCategories[activeCategory].description} · 共 ${displayIcons.length} 个图标`}
				</div>
			</DialogContent>
		</Dialog>
	);
}

// 图标按钮组件
function IconButton({
	icon,
	isSelected,
	onClick,
}: {
	icon: IconOption;
	isSelected: boolean;
	onClick: () => void;
}) {
	const Icon = icon.icon;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all hover:bg-accent",
				isSelected
					? "border-primary bg-primary/10"
					: "border-transparent hover:border-border",
			)}
			title={icon.description || icon.name}
		>
			<Icon className="size-6" />
			<span className="text-xs mt-1 truncate w-full text-center">
				{icon.name}
			</span>
		</button>
	);
}

// 图标显示组件（用于显示选中的图标）
export function IconDisplay({
	iconKey,
	size = "default",
	className,
}: {
	iconKey?: string;
	size?: "sm" | "default" | "lg";
	className?: string;
}) {
	const icon = icons.find((i) => i.key === iconKey);
	if (!icon) return null;

	const Icon = icon.icon;
	const sizeClass = {
		sm: "size-4",
		default: "size-5",
		lg: "size-6",
	}[size];

	return <Icon className={cn(sizeClass, className)} />;
}

// 图标选择按钮（触发选择器）
export function IconSelectButton({
	iconKey,
	onSelect,
	size = "default",
}: {
	iconKey?: string;
	onSelect: (icon: IconOption) => void;
	size?: "sm" | "default" | "lg";
}) {
	const [open, setOpen] = useState(false);
	const icon = icons.find((i) => i.key === iconKey);
	const Icon = icon?.icon || icons[0].icon;

	const sizeClass = {
		sm: "size-8",
		default: "size-10",
		lg: "size-12",
	}[size];

	const iconSizeClass = {
		sm: "size-4",
		default: "size-5",
		lg: "size-6",
	}[size];

	return (
		<>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className={cn(sizeClass)}
				onClick={() => setOpen(true)}
			>
				<Icon className={iconSizeClass} />
			</Button>

			<IconPicker
				open={open}
				onOpenChange={setOpen}
				onSelect={onSelect}
				selectedIcon={iconKey}
			/>
		</>
	);
}
