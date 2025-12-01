/**
 * 图标主题使用示例
 * 展示如何在实际组件中使用图标主题系统
 */

import { getIconForType, getCurrentIconTheme } from "@/lib/icon-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// 示例数据结构
interface FileItem {
	id: string;
	name: string;
	type: "project" | "chapter" | "scene" | "character" | "world" | "folder" | "file";
	isOpen?: boolean;
	children?: FileItem[];
}

// 示例数据
const exampleData: FileItem[] = [
	{
		id: "1",
		name: "我的小说项目",
		type: "project",
		isOpen: true,
		children: [
			{
				id: "2",
				name: "第一章",
				type: "chapter",
				isOpen: true,
				children: [
					{ id: "3", name: "开场", type: "scene" },
					{ id: "4", name: "相遇", type: "scene" },
				],
			},
			{
				id: "5",
				name: "第二章",
				type: "chapter",
				isOpen: false,
				children: [
					{ id: "6", name: "冲突", type: "scene" },
				],
			},
			{
				id: "7",
				name: "角色设定",
				type: "folder",
				isOpen: true,
				children: [
					{ id: "8", name: "主角", type: "character" },
					{ id: "9", name: "配角", type: "character" },
				],
			},
			{
				id: "10",
				name: "世界观设定",
				type: "world",
			},
		],
	},
];

// 文件树项组件
function FileTreeItem({ item, level = 0 }: { item: FileItem; level?: number }) {
	const [isOpen, setIsOpen] = useState(item.isOpen ?? false);
	const [iconTheme, setIconTheme] = useState(getCurrentIconTheme());

	// 监听图标主题变化
	useEffect(() => {
		const handleThemeChange = () => {
			setIconTheme(getCurrentIconTheme());
		};

		window.addEventListener("icon-theme-changed", handleThemeChange);
		return () => {
			window.removeEventListener("icon-theme-changed", handleThemeChange);
		};
	}, []);

	const hasChildren = item.children && item.children.length > 0;
	const Icon = getIconForType(item.type, isOpen ? "open" : "default");

	return (
		<div>
			<button
				onClick={() => hasChildren && setIsOpen(!isOpen)}
				className={cn(
					"flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-accent transition-colors text-left",
					"group",
				)}
				style={{ paddingLeft: `${level * 16 + 8}px` }}
			>
				{/* 展开/收起图标 */}
				{hasChildren ? (
					isOpen ? (
						<ChevronDown className="size-4 text-muted-foreground shrink-0" />
					) : (
						<ChevronRight className="size-4 text-muted-foreground shrink-0" />
					)
				) : (
					<div className="size-4 shrink-0" />
				)}

				{/* 文件类型图标 */}
				<Icon className="size-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />

				{/* 文件名 */}
				<span className="text-sm truncate">{item.name}</span>

				{/* 类型标签 */}
				<Badge variant="outline" className="ml-auto text-xs">
					{getTypeLabel(item.type)}
				</Badge>
			</button>

			{/* 子项 */}
			{hasChildren && isOpen && (
				<div className="mt-0.5">
					{item.children?.map((child) => (
						<FileTreeItem key={child.id} item={child} level={level + 1} />
					))}
				</div>
			)}
		</div>
	);
}

// 获取类型标签
function getTypeLabel(type: FileItem["type"]): string {
	const labels: Record<FileItem["type"], string> = {
		project: "项目",
		chapter: "章节",
		scene: "场景",
		character: "角色",
		world: "世界观",
		folder: "文件夹",
		file: "文件",
	};
	return labels[type];
}

// 图标网格展示
function IconGrid() {
	const [iconTheme, setIconTheme] = useState(getCurrentIconTheme());

	useEffect(() => {
		const handleThemeChange = () => {
			setIconTheme(getCurrentIconTheme());
		};

		window.addEventListener("icon-theme-changed", handleThemeChange);
		return () => {
			window.removeEventListener("icon-theme-changed", handleThemeChange);
		};
	}, []);

	const types: Array<{
		type: FileItem["type"];
		label: string;
		hasOpen?: boolean;
	}> = [
		{ type: "project", label: "项目", hasOpen: true },
		{ type: "chapter", label: "章节", hasOpen: true },
		{ type: "scene", label: "场景" },
		{ type: "character", label: "角色" },
		{ type: "world", label: "世界观" },
		{ type: "folder", label: "文件夹", hasOpen: true },
		{ type: "file", label: "文件" },
	];

	return (
		<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
			{types.map(({ type, label, hasOpen }) => {
				const DefaultIcon = getIconForType(type, "default");
				const OpenIcon = hasOpen ? getIconForType(type, "open") : null;

				return (
					<Card key={type} className="overflow-hidden">
						<CardContent className="p-4">
							<div className="flex flex-col items-center gap-3">
								<div className="flex gap-3">
									<DefaultIcon className="size-8 text-muted-foreground" />
									{OpenIcon && (
										<OpenIcon className="size-8 text-primary" />
									)}
								</div>
								<div className="text-center">
									<div className="text-sm font-medium">{label}</div>
									<div className="text-xs text-muted-foreground">
										{hasOpen ? "关闭 / 打开" : "默认"}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
}

// 主示例组件
export function IconThemeExample() {
	const [iconTheme, setIconTheme] = useState(getCurrentIconTheme());

	useEffect(() => {
		const handleThemeChange = () => {
			setIconTheme(getCurrentIconTheme());
		};

		window.addEventListener("icon-theme-changed", handleThemeChange);
		return () => {
			window.removeEventListener("icon-theme-changed", handleThemeChange);
		};
	}, []);

	return (
		<div className="space-y-6 p-6">
			{/* 标题 */}
			<div>
				<h1 className="text-2xl font-bold">图标主题示例</h1>
				<p className="text-sm text-muted-foreground mt-1">
					当前主题: {iconTheme.name} - {iconTheme.description}
				</p>
			</div>

			{/* 文件树示例 */}
			<Card>
				<CardHeader>
					<CardTitle>文件树示例</CardTitle>
					<p className="text-sm text-muted-foreground">
						展示如何在文件树中使用图标主题
					</p>
				</CardHeader>
				<CardContent>
					<div className="border rounded-lg p-3 bg-muted/30">
						{exampleData.map((item) => (
							<FileTreeItem key={item.id} item={item} />
						))}
					</div>
				</CardContent>
			</Card>

			{/* 图标网格示例 */}
			<Card>
				<CardHeader>
					<CardTitle>所有图标类型</CardTitle>
					<p className="text-sm text-muted-foreground">
						展示当前主题的所有图标
					</p>
				</CardHeader>
				<CardContent>
					<IconGrid />
				</CardContent>
			</Card>

			{/* 使用提示 */}
			<Card>
				<CardHeader>
					<CardTitle>使用提示</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div>
						<strong>1. 获取图标：</strong>
						<code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
							const Icon = getIconForType("project", "open")
						</code>
					</div>
					<div>
						<strong>2. 使用图标：</strong>
						<code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
							{"<Icon className='size-5' />"}
						</code>
					</div>
					<div>
						<strong>3. 监听变化：</strong>
						<code className="ml-2 px-2 py-1 bg-muted rounded text-xs">
							window.addEventListener("icon-theme-changed", handler)
						</code>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
