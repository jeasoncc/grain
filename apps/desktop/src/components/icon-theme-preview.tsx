/**
 * 图标主题预览组件
 * 展示当前图标主题的所有图标效果
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentIconTheme } from "@/lib/icon-themes";
import { useEffect, useState } from "react";

export function IconThemePreview() {
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

	const ProjectIcon = iconTheme.icons.project.default;
	const ProjectOpenIcon = iconTheme.icons.project.open || ProjectIcon;
	const ChapterIcon = iconTheme.icons.chapter.default;
	const ChapterOpenIcon = iconTheme.icons.chapter.open || ChapterIcon;
	const SceneIcon = iconTheme.icons.scene.default;
	const CharacterIcon = iconTheme.icons.character.default;
	const WorldIcon = iconTheme.icons.world.default;
	const FolderIcon = iconTheme.icons.folder.default;
	const FolderOpenIcon = iconTheme.icons.folder.open || FolderIcon;
	const FileIcon = iconTheme.icons.file.default;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">图标预览</CardTitle>
				<p className="text-xs text-muted-foreground">
					当前主题: {iconTheme.name}
				</p>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* 项目图标 */}
				<div className="flex items-center gap-3">
					<div className="flex gap-2">
						<ProjectIcon className="size-5 text-muted-foreground" />
						<ProjectOpenIcon className="size-5 text-primary" />
					</div>
					<div className="flex-1">
						<div className="text-sm font-medium">项目</div>
						<div className="text-xs text-muted-foreground">
							关闭 / 打开状态
						</div>
					</div>
				</div>

				{/* 章节图标 */}
				<div className="flex items-center gap-3">
					<div className="flex gap-2">
						<ChapterIcon className="size-5 text-muted-foreground" />
						<ChapterOpenIcon className="size-5 text-primary" />
					</div>
					<div className="flex-1">
						<div className="text-sm font-medium">章节</div>
						<div className="text-xs text-muted-foreground">
							关闭 / 打开状态
						</div>
					</div>
				</div>

				{/* 场景图标 */}
				<div className="flex items-center gap-3">
					<SceneIcon className="size-5 text-muted-foreground" />
					<div className="flex-1">
						<div className="text-sm font-medium">场景</div>
						<div className="text-xs text-muted-foreground">
							单个场景文件
						</div>
					</div>
				</div>

				{/* 角色图标 */}
				<div className="flex items-center gap-3">
					<CharacterIcon className="size-5 text-muted-foreground" />
					<div className="flex-1">
						<div className="text-sm font-medium">角色</div>
						<div className="text-xs text-muted-foreground">
							角色信息文件
						</div>
					</div>
				</div>

				{/* 世界观图标 */}
				<div className="flex items-center gap-3">
					<WorldIcon className="size-5 text-muted-foreground" />
					<div className="flex-1">
						<div className="text-sm font-medium">世界观</div>
						<div className="text-xs text-muted-foreground">
							世界观设定文件
						</div>
					</div>
				</div>

				{/* 文件夹图标 */}
				<div className="flex items-center gap-3">
					<div className="flex gap-2">
						<FolderIcon className="size-5 text-muted-foreground" />
						<FolderOpenIcon className="size-5 text-primary" />
					</div>
					<div className="flex-1">
						<div className="text-sm font-medium">文件夹</div>
						<div className="text-xs text-muted-foreground">
							关闭 / 打开状态
						</div>
					</div>
				</div>

				{/* 文件图标 */}
				<div className="flex items-center gap-3">
					<FileIcon className="size-5 text-muted-foreground" />
					<div className="flex-1">
						<div className="text-sm font-medium">文件</div>
						<div className="text-xs text-muted-foreground">
							通用文件
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
